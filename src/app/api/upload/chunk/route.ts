import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { action } = body;

      if (action === "init") {
        const { filename, contentType: fileType } = body;
        if (!filename) {
          return NextResponse.json({ error: "Missing filename" }, { status: 400 });
        }

        // Create the FileStorage record
        const fileRecord = await prisma.fileStorage.create({
          data: {
            filename,
            contentType: fileType || "application/octet-stream",
            dataStr: "", // Remaining empty since chunks are saved in FileChunk
          },
        });

        return NextResponse.json({ success: true, fileId: fileRecord.id });
      }

      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const action = formData.get("action") as string;
      const fileId = formData.get("fileId") as string;
      const chunkIndexStr = formData.get("chunkIndex") as string;
      const chunkFile = formData.get("chunk") as File;

      if (action !== "upload" || !fileId || !chunkIndexStr || !chunkFile) {
        return NextResponse.json({ error: "Missing required upload parameters" }, { status: 400 });
      }

      const chunkIndex = parseInt(chunkIndexStr, 10);
      if (isNaN(chunkIndex)) {
        return NextResponse.json({ error: "Invalid chunkIndex" }, { status: 400 });
      }

      // Read chunk binary and convert to base64
      const arrayBuffer = await chunkFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const dataStr = buffer.toString("base64");

      // Save chunk in FileChunk collection
      try {
        if ((prisma as any).fileChunk) {
          await (prisma as any).fileChunk.create({
            data: {
              fileId,
              chunkIndex,
              dataStr,
            },
          });
        } else {
          throw new Error("Fallback required");
        }
      } catch {
        // Raw MongoDB query fallback
        await prisma.$runCommandRaw({
          insert: "FileChunk",
          documents: [
            {
              fileId: { $oid: fileId },
              chunkIndex,
              dataStr,
              createdAt: { $date: new Date().toISOString() },
            },
          ],
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 400 });
  } catch (error: any) {
    console.error("Chunk upload error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
