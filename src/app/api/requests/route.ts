import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

async function cleanupOldFiles() {
  try {
    // 24 hours ago timestamp
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Find requests with status completed/failed and modified/updated older than 24 hours
    // that still have a valid fileUrl pointing to /api/files/
    const oldRequests = await prisma.printRequest.findMany({
      where: {
        status: { in: ["completed", "failed"] },
        updatedAt: { lt: oneDayAgo },
        fileUrl: { startsWith: "/api/files/" }
      }
    });

    for (const req of oldRequests) {
      const fileId = req.fileUrl.split("/").pop();
      if (fileId && /^[0-9a-fA-F]{24}$/.test(fileId)) {
        try {
          await prisma.fileStorage.delete({
            where: { id: fileId }
          });
        } catch (e) {
          // If already deleted or not found, ignore
        }
      }
      // Update request fileUrl to end with "deleted"
      await prisma.printRequest.update({
        where: { id: req.id },
        data: { fileUrl: "/api/files/deleted" }
      });
    }
  } catch (error) {
    console.error("File cleanup error:", error);
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
