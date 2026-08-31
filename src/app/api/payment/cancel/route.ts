import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { razorpayOrderId } = await req.json();

    if (!razorpayOrderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    const printRequest = await prisma.printRequest.findFirst({
      where: { razorpayOrderId }
    });

    if (!printRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only allow canceling if it's pending payment
    if (printRequest.status !== "pending-payment") {
      return NextResponse.json({ error: "Request cannot be cancelled at this stage" }, { status: 400 });
    }

    // Delete associated files
    let urls: string[] = [];
    try {
      if (printRequest.fileUrl.startsWith("[")) {
        urls = JSON.parse(printRequest.fileUrl);
      } else if (printRequest.fileUrl && printRequest.fileUrl.startsWith("/api/files/")) {
        urls = [printRequest.fileUrl];
      }
    } catch (e) {
      if (printRequest.fileUrl && printRequest.fileUrl.startsWith("/api/files/")) {
        urls = [printRequest.fileUrl];
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

    // Decrement coupon used count if coupon was applied
    if (printRequest.couponCode) {
      try {
        if ((prisma as any).coupon) {
          await (prisma as any).coupon.updateMany({
            where: { code: printRequest.couponCode, usedCount: { gt: 0 } },
            data: { usedCount: { decrement: 1 } }
          });
        } else {
          await prisma.$runCommandRaw({
            update: "Coupon",
            updates: [
              {
                q: { code: printRequest.couponCode, usedCount: { $gt: 0 } },
                u: { $inc: { usedCount: -1 } }
              }
            ]
          }).catch(() => {});
        }
      } catch (e) {}
    }

    // Delete print request
    await prisma.printRequest.delete({
      where: { id: printRequest.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel endpoint error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
