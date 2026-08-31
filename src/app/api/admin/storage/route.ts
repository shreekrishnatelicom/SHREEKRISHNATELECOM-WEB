import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    let totalBytes = 0;
    
    // Sum up size of all files in the Firebase Storage bucket
    try {
      const { getAdminStorage } = await import("@/lib/firebaseAdmin");
      const bucket = getAdminStorage().bucket();
      const [files] = await bucket.getFiles();
      totalBytes = files.reduce((acc: number, file: any) => {
        const size = parseInt(file.metadata?.size || "0", 10);
        return acc + (isNaN(size) ? 0 : size);
      }, 0);
    } catch (storageErr) {
      console.error("Firebase Storage list error:", storageErr);
      throw new Error("Failed to retrieve storage size from Firebase Storage");
    }

    // Firebase Storage Free Tier limit is 5 GB
    const totalStorage = 5 * 1024 * 1024 * 1024; 
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
