import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    let settings = await prisma.shopSettings.findFirst();
    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: {
          isOpen: true,
          phone: "+91 XXXXX XXXXX",
          email: "skt@example.com",
          location: "Near Main Market, Raipur",
          mapLink: "",
          whatsapp: "",
          telegram: "",
          facebook: "",
          instagram: "",
          priceStarting: "₹2/page",
          priceBwSingle: "₹2 / page",
          priceBwDouble: "₹3.5 / page",
          priceColorSingle: "₹10 / page",
          priceColorDouble: "₹18 / page",
          allowOnlinePayment: true,
          allowOfflinePayment: true,
        },
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { 
      id, isOpen, phone, email, location, mapLink, whatsapp, telegram, facebook, instagram,
      priceStarting, priceBwSingle, priceBwDouble, priceColorSingle, priceColorDouble,
      allowOnlinePayment, allowOfflinePayment,
      openTime, closeTime, openDays, autoStatus
    } = data;

    const existing = await prisma.shopSettings.findFirst();
    const payload: any = { 
      ...(isOpen !== undefined && { isOpen }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(location !== undefined && { location }),
      ...(mapLink !== undefined && { mapLink }),
      ...(whatsapp !== undefined && { whatsapp }),
      ...(telegram !== undefined && { telegram }),
      ...(facebook !== undefined && { facebook }),
      ...(instagram !== undefined && { instagram }),
      ...(priceStarting !== undefined && { priceStarting }),
      ...(priceBwSingle !== undefined && { priceBwSingle }),
      ...(priceBwDouble !== undefined && { priceBwDouble }),
      ...(priceColorSingle !== undefined && { priceColorSingle }),
      ...(priceColorDouble !== undefined && { priceColorDouble }),
      ...(openTime !== undefined && { openTime }),
      ...(closeTime !== undefined && { closeTime }),
      ...(openDays !== undefined && { openDays }),
      ...(autoStatus !== undefined && { autoStatus }),
    };

    if (allowOnlinePayment !== undefined) {
      payload.allowOnlinePayment = allowOnlinePayment;
    } else if (existing) {
      payload.allowOnlinePayment = existing.allowOnlinePayment;
    }

    if (allowOfflinePayment !== undefined) {
      payload.allowOfflinePayment = allowOfflinePayment;
    } else if (existing) {
      payload.allowOfflinePayment = existing.allowOfflinePayment;
    }

    let settings;
    if (id || existing?.id) {
      settings = await prisma.shopSettings.update({
        where: { id: id || existing!.id },
        data: payload,
      });
    } else {
      settings = await prisma.shopSettings.create({
        data: {
          ...payload,
          allowOnlinePayment: allowOnlinePayment ?? true,
          allowOfflinePayment: allowOfflinePayment ?? true,
        },
      });
    }

    // Force revalidation of the layout cache so that settings update globally in real-time
    revalidatePath("/", "layout");

    return NextResponse.json(settings);
  } catch (error) {
    console.error("POST settings error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
