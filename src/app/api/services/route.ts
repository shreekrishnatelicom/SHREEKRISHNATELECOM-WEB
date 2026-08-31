import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_SERVICES = [
  { name: "B&W Document Print",       price: "₹2/page",       description: "Standard black & white printing on A4/A3.",      category: "print",      isAvailable: true, hasRequestButton: false, requireImageUpload: false, requestDescription: "" },
  { name: "Color Print",              price: "₹10/page",      description: "Vibrant full-color printing on A4.",             category: "print",      isAvailable: true, hasRequestButton: false, requireImageUpload: false, requestDescription: "" },
  { name: "Double-Side Print",        price: "₹3.5/page",     description: "B&W printing on both sides of the page.",        category: "print",      isAvailable: true, hasRequestButton: false, requireImageUpload: false, requestDescription: "" },
  { name: "Photo Lamination",         price: "₹15/sheet",     description: "Hot lamination for A4, ID cards, certificates.", category: "lamination", isAvailable: true, hasRequestButton: false, requireImageUpload: false, requestDescription: "" },
  { name: "Binding",                  price: "₹30",           description: "Spiral or comb binding for reports and books.",  category: "document",   isAvailable: true, hasRequestButton: false, requireImageUpload: false, requestDescription: "" },
  { name: "Passport Size Photo",      price: "₹40/set (6)",   description: "Instant passport photos, government compliant.", category: "photo",      isAvailable: true, hasRequestButton: true, requireImageUpload: true, requestDescription: "Please upload your photo with a clear background." },
  { name: "Government Form Fill",     price: "₹30",           description: "Fill any government form accurately and fast.",  category: "government", isAvailable: true, hasRequestButton: true, requireImageUpload: false, requestDescription: "Provide details of the form you want filled in notes." },
];

export async function GET() {
  try {
    let services = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
    if (services.length === 0) {
      await prisma.service.createMany({
        data: DEFAULT_SERVICES.map((s, i) => ({
          ...s,
          sortOrder: i + 1,
        })),
      });
      services = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
    }
    return NextResponse.json(services);
  } catch (err) {
    console.error("GET services error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { id, name, description, price, category, icon, isAvailable, sortOrder, hasRequestButton, requireImageUpload, requestDescription, generateReceipt, allowOnlinePayment, allowOfflinePayment } = data;

    if (id) {
      // Update
      const svc = await prisma.service.update({
        where: { id },
        data: {
          name,
          description,
          price: category === "print" ? "" : price,
          category,
          icon: icon || "FileText",
          isAvailable: isAvailable ?? true,
          sortOrder: sortOrder ?? 0,
          hasRequestButton: hasRequestButton ?? false,
          requireImageUpload: requireImageUpload ?? false,
          requestDescription: requestDescription || "",
          generateReceipt: generateReceipt ?? true,
          allowOnlinePayment: allowOnlinePayment ?? true,
          allowOfflinePayment: allowOfflinePayment ?? true,
        } as any,
      });
      return NextResponse.json(svc);
    } else {
      // Create
      const maxOrder = await prisma.service.aggregate({ _max: { sortOrder: true } });
      const svc = await prisma.service.create({
        data: {
          name,
          description,
          price: category === "print" ? "" : price,
          category,
          icon: icon || "FileText",
          isAvailable: isAvailable ?? true,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          hasRequestButton: hasRequestButton ?? false,
          requireImageUpload: requireImageUpload ?? false,
          requestDescription: requestDescription || "",
          generateReceipt: generateReceipt ?? true,
          allowOnlinePayment: allowOnlinePayment ?? true,
          allowOfflinePayment: allowOfflinePayment ?? true,
        } as any,
      });
      return NextResponse.json(svc);
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
