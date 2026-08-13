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
      allowOnlinePayment, allowOfflinePayment
    } = data;

    let settings;
    const payload = { 
      isOpen, phone, email, location, mapLink, whatsapp, telegram, facebook, instagram,
      priceStarting, priceBwSingle, priceBwDouble, priceColorSingle, priceColorDouble,
      allowOnlinePayment: allowOnlinePayment ?? true,
      allowOfflinePayment: allowOfflinePayment ?? true
    };

    if (id) {
      settings = await prisma.shopSettings.update({
        where: { id },
        data: payload,
      });
    } else {
      const existing = await prisma.shopSettings.findFirst();
      if (existing) {
        settings = await prisma.shopSettings.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        settings = await prisma.shopSettings.create({
          data: payload,
        });
      }
    }

    // Force revalidation of the layout cache so that settings update globally in real-time
    revalidatePath("/", "layout");

    return NextResponse.json(settings);
  } catch (error) {
    console.error("POST settings error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
