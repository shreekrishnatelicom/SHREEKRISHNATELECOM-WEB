import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid file ID format" }, { status: 400 });
    }

    const fileRecord = await prisma.fileStorage.findUnique({
      where: { id },
    });

    if (!fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    let chunks: any[] = [];
    try {
      if ((prisma as any).fileChunk) {
        chunks = await (prisma as any).fileChunk.findMany({
          where: { fileId: id },
          orderBy: { chunkIndex: "asc" }
        });
      } else {
        throw new Error("Fallback required");
      }
    } catch {
      // Raw MongoDB query fallback
      const rawResult: any = await prisma.$runCommandRaw({
        find: "FileChunk",
        filter: { fileId: { $oid: id } },
        sort: { chunkIndex: 1 }
      });
      if (rawResult && rawResult.cursor && rawResult.cursor.firstBatch) {
        chunks = rawResult.cursor.firstBatch;
      }
    }

    let base64Str = "";
    if (chunks.length > 0) {
      base64Str = chunks.map((c: any) => c.dataStr).join("");
    } else {
      // Fallback for legacy files
      base64Str = fileRecord.dataStr;
    }

    const buffer = Buffer.from(base64Str, "base64");
    
    const headers = new Headers();
    headers.set("Content-Type", fileRecord.contentType);
    headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(fileRecord.filename)}"`);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error("File serving error:", error);
    return NextResponse.json({ error: "Failed to load file" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid file ID format" }, { status: 400 });
    }

    // Delete the file storage entry
    try {
      await prisma.fileStorage.delete({
        where: { id },
      });
    } catch (e) {
      // Ignore if not found/already deleted
    }

    // Delete chunks
    try {
      if ((prisma as any).fileChunk) {
        await (prisma as any).fileChunk.deleteMany({
          where: { fileId: id }
        });
      } else {
        throw new Error("Fallback required");
      }
    } catch {
      await prisma.$runCommandRaw({
        delete: "FileChunk",
        deletes: [
          {
            q: { fileId: { $oid: id } },
            limit: 0
          }
        ]
      });
    }

    // Update the print request to mark the file as deleted
    await prisma.printRequest.updateMany({
      where: { fileUrl: `/api/files/${id}` },
      data: { fileUrl: "/api/files/deleted" }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("File deletion error:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
