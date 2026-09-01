import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { del } from "@vercel/blob";

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
          where: { fileId: id }
        });
      } else {
        throw new Error("Fallback required");
      }
    } catch {
      // Raw MongoDB query fallback
      const rawResult: any = await prisma.$runCommandRaw({
        find: "FileChunk",
        filter: {
          $or: [
            { fileId: { $oid: id } },
            { fileId: id }
          ]
        }
      });
      if (rawResult && rawResult.cursor && rawResult.cursor.firstBatch) {
        chunks = rawResult.cursor.firstBatch;
      }
    }

    // Sort in-memory in JavaScript
    chunks.sort((a: any, b: any) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0));

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

    if (id === "vercel-blob" || id === "cloud-storage") {
      const url = req.nextUrl.searchParams.get("url");
      if (!url) {
        return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
      }


      // Delete from Vercel Blob if it's a vercel URL (legacy support)
      if (url.includes("vercel-storage.com")) {
        try {
          await del(url);
          console.log("Deleted legacy Vercel Blob:", url);
        } catch (err) {
          console.error("Error deleting legacy Vercel Blob:", err);
        }
      }

      // Update the print request to mark the file as deleted
      const requestsToUpdate = await prisma.printRequest.findMany({
        where: {
          fileUrl: {
            contains: url
          }
        }
      });

      for (const request of requestsToUpdate) {
        let newFileUrl = request.fileUrl;
        let newFileName = request.fileName;

        try {
          if (request.fileUrl.startsWith("[")) {
            const urls: string[] = JSON.parse(request.fileUrl);
            const names: string[] = JSON.parse(request.fileName);

            const filteredIndices = urls
              .map((u, idx) => ({ u, idx }))
              .filter(item => !item.u.includes(url))
              .map(item => item.idx);

            if (filteredIndices.length === 0) {
              newFileUrl = "/api/files/deleted";
              newFileName = "deleted";
            } else {
              const filteredUrls = filteredIndices.map(idx => urls[idx]);
              const filteredNames = filteredIndices.map(idx => names[idx]);
              newFileUrl = JSON.stringify(filteredUrls);
              newFileName = JSON.stringify(filteredNames);
            }
          } else if (request.fileUrl === url) {
            newFileUrl = "/api/files/deleted";
            newFileName = "deleted";
          }
        } catch (e) {
          newFileUrl = "/api/files/deleted";
          newFileName = "deleted";
        }

        await prisma.printRequest.update({
          where: { id: request.id },
          data: { fileUrl: newFileUrl, fileName: newFileName }
        });
      }

      return NextResponse.json({ success: true });
    }

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
    const targetUrl = `/api/files/${id}`;
    const requestsToUpdate = await prisma.printRequest.findMany({
      where: {
        fileUrl: {
          contains: targetUrl
        }
      }
    });

    for (const req of requestsToUpdate) {
      let newFileUrl = req.fileUrl;
      let newFileName = req.fileName;

      try {
        if (req.fileUrl.startsWith("[")) {
          const urls: string[] = JSON.parse(req.fileUrl);
          const names: string[] = JSON.parse(req.fileName);
          
          const filteredIndices = urls
            .map((url, idx) => ({ url, idx }))
            .filter(item => !item.url.includes(id))
            .map(item => item.idx);
            
          if (filteredIndices.length === 0) {
            newFileUrl = "/api/files/deleted";
            newFileName = "deleted";
          } else {
            const filteredUrls = filteredIndices.map(idx => urls[idx]);
            const filteredNames = filteredIndices.map(idx => names[idx]);
            newFileUrl = JSON.stringify(filteredUrls);
            newFileName = JSON.stringify(filteredNames);
          }
        } else if (req.fileUrl === targetUrl) {
          newFileUrl = "/api/files/deleted";
          newFileName = "deleted";
        }
      } catch (e) {
        newFileUrl = "/api/files/deleted";
        newFileName = "deleted";
      }

      await prisma.printRequest.update({
        where: { id: req.id },
        data: { fileUrl: newFileUrl, fileName: newFileName }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("File deletion error:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

