import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = await req.json();

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Missing required signature verification parameters" },
        { status: 400 }
      );
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
    const text = razorpayOrderId + "|" + razorpayPaymentId;
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      console.error("Razorpay signature verification failed");
      return NextResponse.json(
        { error: "Signature verification failed" },
        { status: 400 }
      );
    }

    // Signature matches, update the print request
    const printRequest = await prisma.printRequest.findFirst({
      where: { razorpayOrderId }
    });

    if (!printRequest) {
      return NextResponse.json(
        { error: "Print request not found for this order ID" },
        { status: 404 }
      );
    }

    const updated = await prisma.printRequest.update({
      where: { id: printRequest.id },
      data: {
        status: "pending", // mark as pending in-queue
        paymentMethod: "online",
        razorpayPaymentId,
        razorpaySignature,
      }
    });

    return NextResponse.json({
      success: true,
      trackingId: updated.trackingId,
      price: updated.price,
    });
  } catch (error: any) {
    console.error("Verification endpoint error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
