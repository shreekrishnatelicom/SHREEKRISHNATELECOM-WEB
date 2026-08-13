import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear session cookies
  response.cookies.delete("admin_token");
  response.cookies.delete("user_token");
  
  return response;
}

// Support DELETE as well for compatibility
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("admin_token");
  response.cookies.delete("user_token");
  return response;
}
