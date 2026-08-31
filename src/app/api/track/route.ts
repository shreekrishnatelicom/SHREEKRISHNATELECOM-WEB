import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Tracking ID is required" }, { status: 400 });
  }

  try {
    const request = await prisma.printRequest.findUnique({
      where: { trackingId: id },
      select: {
        trackingId: true,
        fileName: true,
        status: true,
        colorMode: true,
        copies: true,
        printSide: true,
        pagesPerSheet: true,
        paymentMethod: true,
        price: true,
        razorpayPaymentId: true,
        createdAt: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Tracking ID not found" }, { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error: any) {
    console.error("Track error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
