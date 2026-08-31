import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    let totalBytes = 0;
    
    // Page through all blobs in Vercel Blob to sum up their sizes
    try {
      let hasMore = true;
      let cursor: string | undefined = undefined;
      
      while (hasMore) {
        const listResult: any = await list({ cursor });
        totalBytes += listResult.blobs.reduce((acc: number, blob: any) => acc + blob.size, 0);
        hasMore = listResult.hasMore;
        cursor = listResult.cursor;
      }
    } catch (blobErr) {
      console.error("Vercel Blob list error:", blobErr);
      throw new Error("Failed to retrieve storage size from Vercel Blob");
    }

    // Vercel Blob Hobby Plan limit is 250MB
    const totalStorage = 250 * 1024 * 1024; 
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
