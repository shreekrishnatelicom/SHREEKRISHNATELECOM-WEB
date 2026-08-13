import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const aggFileStorage: any = await prisma.$runCommandRaw({
      aggregate: "FileStorage",
      pipeline: [
        { $project: { length: { $strLenBytes: "$dataStr" } } },
        { $group: { _id: null, totalBytes: { $sum: "$length" } } }
      ],
      cursor: {}
    });

    let aggFileChunk: any = null;
    try {
      aggFileChunk = await prisma.$runCommandRaw({
        aggregate: "FileChunk",
        pipeline: [
          { $project: { length: { $strLenBytes: "$dataStr" } } },
          { $group: { _id: null, totalBytes: { $sum: "$length" } } }
        ],
        cursor: {}
      });
    } catch (e) {
      console.warn("FileChunk aggregation failed, possibly due to un-indexed collection:", e);
    }

    let totalB64Length = 0;
    if (aggFileStorage && aggFileStorage.cursor && aggFileStorage.cursor.firstBatch && aggFileStorage.cursor.firstBatch.length > 0) {
      totalB64Length += aggFileStorage.cursor.firstBatch[0].totalBytes || 0;
    }
    if (aggFileChunk && aggFileChunk.cursor && aggFileChunk.cursor.firstBatch && aggFileChunk.cursor.firstBatch.length > 0) {
      totalB64Length += aggFileChunk.cursor.firstBatch[0].totalBytes || 0;
    }

    const totalBytes = Math.round((totalB64Length * 3) / 4);

    const totalStorage = 500 * 1024 * 1024; // 500 MB in bytes
    const usedStorage = totalBytes;
    const availableStorage = Math.max(0, totalStorage - usedStorage);
    const usedPercentage = Math.min(100, (usedStorage / totalStorage) * 100);

    return NextResponse.json({
      success: true,
      totalStorage,
      usedStorage,
      availableStorage,
      usedPercentage
    });
  } catch (error: any) {
    console.error("GET storage error:", error);
    return NextResponse.json(
      { error: "Failed to calculate storage size", details: String(error) },
      { status: 500 }
    );
  }
}
