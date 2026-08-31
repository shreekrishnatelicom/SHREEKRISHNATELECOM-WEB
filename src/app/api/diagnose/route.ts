import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: {
        present: !!process.env.DATABASE_URL,
        length: process.env.DATABASE_URL?.length || 0,
        prefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.split(":")[0] : null,
      },
      FIREBASE_PROJECT_ID: {
        present: !!process.env.FIREBASE_PROJECT_ID,
        value: process.env.FIREBASE_PROJECT_ID || null,
      },
      FIREBASE_CLIENT_EMAIL: {
        present: !!process.env.FIREBASE_CLIENT_EMAIL,
        value: process.env.FIREBASE_CLIENT_EMAIL ? `${process.env.FIREBASE_CLIENT_EMAIL.slice(0, 5)}...${process.env.FIREBASE_CLIENT_EMAIL.slice(-5)}` : null,
      },
      FIREBASE_PRIVATE_KEY: {
        present: !!process.env.FIREBASE_PRIVATE_KEY,
        length: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
        hasNewlines: process.env.FIREBASE_PRIVATE_KEY?.includes("\n") || false,
        hasEscapedNewlines: process.env.FIREBASE_PRIVATE_KEY?.includes("\\n") || false,
        hasQuotes: (process.env.FIREBASE_PRIVATE_KEY?.trim()?.startsWith('"') && process.env.FIREBASE_PRIVATE_KEY?.trim()?.endsWith('"')) || false,
      }
    },
    checks: {}
  };

  // Test Database Connection
  try {
    const userCount = await prisma.user.count();
    diagnostics.checks.database = {
      status: "success",
      message: "Database connection successful",
      userCount
    };
  } catch (error: any) {
    diagnostics.checks.database = {
      status: "fail",
      error: error.message || String(error),
      code: error.code || null
    };
  }

  // Test Firebase Admin Initialization
  try {
    const adminAuth = getAdminAuth();
    diagnostics.checks.firebaseAdminInit = {
      status: "success",
      message: "Firebase Admin initialized successfully",
    };
  } catch (error: any) {
    diagnostics.checks.firebaseAdminInit = {
      status: "fail",
      error: error.message || String(error),
      code: error.code || null
    };
  }

  return NextResponse.json(diagnostics);
}
