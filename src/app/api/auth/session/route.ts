import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // Verify the ID token first
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Check if the user exists in our DB. If not, auto-register them.
    let dbUser = await prisma.user.findUnique({ where: { firebaseUid: decodedToken.uid } });
    
    if (!dbUser) {
      const email = decodedToken.email || "";
      const name = decodedToken.name || email.split("@")[0] || "User";
      const isAdmin = email === "shreekrishnatelicomraipur@gmail.com";
      
      dbUser = await prisma.user.create({
        data: {
          firebaseUid: decodedToken.uid,
          email,
          name,
          role: isAdmin ? "ADMIN" : "USER"
        }
      });
    }

    // Create session cookie based on the ID token
    // Using a custom JWT/Cookie for simplicity in Edge middleware.
    // In production, consider Firebase session cookies (which require 5 min recent login)
    // But since middleware in Edge can't run firebase-admin, we stick to our lightweight cookie
    
    const sessionToken = Buffer.from(`${dbUser.id}:${Date.now()}:skt-secret-2024`).toString("base64");
    
    const response = NextResponse.json({ success: true, role: dbUser.role });
    
    response.cookies.set(dbUser.role === "ADMIN" ? "admin_token" : "user_token", sessionToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Session creation error:", error);
    const isAuthError = typeof error?.code === "string" && error.code.startsWith("auth/");
    return NextResponse.json(
      {
        error: isAuthError ? "Invalid token" : "Session creation failed",
        details: error?.message || String(error),
        code: error?.code ? String(error.code) : undefined
      },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
