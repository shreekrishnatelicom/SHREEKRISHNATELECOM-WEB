import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Safe EJSON converter for MongoDB price/discount percent
function extractNumber(raw: any): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
  if (typeof raw === "string") { const n = parseFloat(raw); return isNaN(n) ? 0 : n; }
  if (typeof raw === "object") {
    if (raw.$numberDecimal !== undefined) { const n = parseFloat(raw.$numberDecimal); return isNaN(n) ? 0 : n; }
    if (raw.$numberDouble !== undefined)  { const n = parseFloat(raw.$numberDouble);  return isNaN(n) ? 0 : n; }
    if (raw.$numberInt !== undefined)     { const n = parseInt(raw.$numberInt, 10);   return isNaN(n) ? 0 : n; }
    if (raw.$numberLong !== undefined)    { const n = parseInt(raw.$numberLong, 10);  return isNaN(n) ? 0 : n; }
  }
  return 0;
}

// POST validate coupon code
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, message: "Coupon code is required" });
    }

    const cleanCode = code.trim().toUpperCase();

    // Look up coupon
    let coupon = null;
    try {
      if ((prisma as any).coupon) {
        coupon = await (prisma as any).coupon.findUnique({
          where: { code: cleanCode }
        });
      } else {
        throw new Error("Coupon model not in client");
      }
    } catch {
      // Fallback to raw MongoDB command if client is stale
      const rawResult: any = await prisma.$runCommandRaw({
        find: "Coupon",
        filter: { code: cleanCode }
      });
      const docs = rawResult?.cursor?.firstBatch || [];
      if (docs.length > 0) {
        const doc = docs[0];
        coupon = {
          id: doc._id?.$oid || String(doc._id),
          code: doc.code,
          discountPct: extractNumber(doc.discountPct),
          minPrice: extractNumber(doc.minPrice),
          usageLimit: doc.usageLimit !== undefined && doc.usageLimit !== null ? extractNumber(doc.usageLimit) : null,
          usedCount: extractNumber(doc.usedCount),
          isActive: doc.isActive !== false
        };
      }
    }

    if (!coupon) {
      return NextResponse.json({ valid: false, message: "Invalid coupon code" });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ valid: false, message: "This coupon is no longer active" });
    }

    const limit = coupon.usageLimit !== undefined && coupon.usageLimit !== null ? extractNumber(coupon.usageLimit) : null;
    const used = extractNumber(coupon.usedCount);
    if (limit !== null && limit > 0 && used >= limit) {
      return NextResponse.json({ valid: false, message: "This coupon code usage limit has been reached" });
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountPct: coupon.discountPct,
      minPrice: coupon.minPrice || 0,
      usageLimit: limit,
      usedCount: used,
    });


  } catch (error: any) {
    console.error("Failed to validate coupon:", error);
    return NextResponse.json({ valid: false, message: "Failed to validate coupon" }, { status: 500 });
  }
}
