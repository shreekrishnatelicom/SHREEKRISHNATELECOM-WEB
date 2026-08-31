import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function getUserIdFromCookie(req: NextRequest) {
  const token = req.cookies.get("user_token")?.value || req.cookies.get("admin_token")?.value;
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    return decoded.split(":")[0];
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = getUserIdFromCookie(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: "Server error", details: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const userId = getUserIdFromCookie(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, phone } = await req.json();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update profile", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromCookie(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete user from db
    await prisma.user.delete({
      where: { id: userId },
    });

    // Clear cookies
    const response = NextResponse.json({ success: true, message: "Account deleted successfully" });
    
    // Clear cookies on the response object
    response.cookies.set("user_token", "", { maxAge: 0, path: "/" });
    response.cookies.set("admin_token", "", { maxAge: 0, path: "/" });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete account", details: error.message }, { status: 500 });
  }
}
