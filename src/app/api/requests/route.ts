import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

async function cleanupOldFiles() {
  try {
    // 1. Clean up completed/failed requests older than 24 hours (delete files)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldRequests = await prisma.printRequest.findMany({
      where: {
        status: { in: ["completed", "failed"] },
        updatedAt: { lt: oneDayAgo },
        NOT: {
          fileUrl: {
            endsWith: "deleted"
          }
        }
      }
    });

    for (const req of oldRequests) {
      let urls: string[] = [];
      try {
        if (req.fileUrl.startsWith("[")) {
          urls = JSON.parse(req.fileUrl);
        } else {
          urls = [req.fileUrl];
        }
      } catch (e) {
        urls = [req.fileUrl];
      }

      for (const url of urls) {
        const fileId = url.split("/").pop();
        if (fileId && /^[0-9a-fA-F]{24}$/.test(fileId)) {
          try {
            await prisma.fileStorage.delete({ where: { id: fileId } });
          } catch (e) {}
          try {
            if ((prisma as any).fileChunk) {
              await (prisma as any).fileChunk.deleteMany({ where: { fileId } });
            } else {
              await prisma.$runCommandRaw({
                delete: "FileChunk",
                deletes: [{ q: { fileId: { $oid: fileId } }, limit: 0 }]
              });
            }
          } catch (e) {}
        }
      }

      await prisma.printRequest.update({
        where: { id: req.id },
        data: { fileUrl: "/api/files/deleted" }
      });
    }

    // 2. Delete pending-payment print requests older than 15 minutes (failed/cancelled checkouts)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const expiredRequests = await prisma.printRequest.findMany({
      where: {
        status: "pending-payment",
        createdAt: { lt: fifteenMinsAgo }
      }
    });

    for (const req of expiredRequests) {
      let urls: string[] = [];
      try {
        if (req.fileUrl.startsWith("[")) {
          urls = JSON.parse(req.fileUrl);
        } else if (req.fileUrl && req.fileUrl.startsWith("/api/files/")) {
          urls = [req.fileUrl];
        }
      } catch (e) {
        if (req.fileUrl && req.fileUrl.startsWith("/api/files/")) {
          urls = [req.fileUrl];
        }
      }

      for (const url of urls) {
        const fileId = url.split("/").pop();
        if (fileId && /^[0-9a-fA-F]{24}$/.test(fileId)) {
          try {
            await prisma.fileStorage.delete({ where: { id: fileId } });
          } catch (e) {}
          try {
            if ((prisma as any).fileChunk) {
              await (prisma as any).fileChunk.deleteMany({ where: { fileId } });
            } else {
              await prisma.$runCommandRaw({
                delete: "FileChunk",
                deletes: [{ q: { fileId: { $oid: fileId } }, limit: 0 }]
              });
            }
          } catch (e) {}
        }
      }

      try {
        await prisma.printRequest.delete({
          where: { id: req.id }
        });
      } catch (e) {}
    }
  } catch (error) {
    console.error("Cleanup task error:", error);
  }
}

export async function GET() {
  try {
    await cleanupOldFiles();
    const requests = await prisma.printRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const updatedRequest = await prisma.printRequest.update({
      where: { id },
      data: { status },
    });

    await cleanupOldFiles();

    return NextResponse.json(updatedRequest);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
