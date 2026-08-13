import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const announcement = await prisma.announcementBar.findFirst({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(announcement || null);
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, isActive, color } = await req.json();
    const existing = await prisma.announcementBar.findFirst();
    
    let result;
    if (existing) {
      result = await prisma.announcementBar.update({
        where: { id: existing.id },
        data: { message, isActive, color },
      });
    } else {
      result = await prisma.announcementBar.create({
        data: { message, isActive, color },
      });
    }

    // Force revalidation of the layout cache so that the announcement bar updates globally in real-time
    revalidatePath("/", "layout");

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}
