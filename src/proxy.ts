import { NextRequest, NextResponse } from "next/server";

// Simple token validation - checks if the cookie exists and has the right format
function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return false;
    const timestamp = parseInt(parts[1]);
    if (isNaN(timestamp)) return false;
    // Token valid for 8 hours
    if (Date.now() - timestamp > 8 * 60 * 60 * 1000) return false;
    if (parts[2] !== "skt-secret-2024") return false;
    return true;
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin routes
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("admin_token")?.value;
    if (!isValidToken(token)) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, req.url));
    }
  }

  // Protect /dashboard
  if (pathname.startsWith("/dashboard")) {
    const userToken = req.cookies.get("user_token")?.value;
    // Allow admins to also view user dashboard if needed, or strictly check user_token
    const adminToken = req.cookies.get("admin_token")?.value;
    
    if (!isValidToken(userToken) && !isValidToken(adminToken)) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
