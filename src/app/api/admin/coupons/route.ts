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

// GET all coupons
export async function GET() {
  try {
    let coupons: any[] = [];
    try {
      if ((prisma as any).coupon) {
        coupons = await (prisma as any).coupon.findMany({
          orderBy: { createdAt: "desc" }
        });
      } else {
        throw new Error("Coupon model not in client");
      }
    } catch {
      // Fallback to raw MongoDB command if client is stale
      const rawResult: any = await prisma.$runCommandRaw({
        find: "Coupon",
        sort: { createdAt: -1 }
      });
      if (rawResult && rawResult.cursor && rawResult.cursor.firstBatch) {
        coupons = rawResult.cursor.firstBatch.map((doc: any) => ({
          id: doc._id?.$oid || String(doc._id),
          code: doc.code,
          discountPct: extractNumber(doc.discountPct),
          minPrice: extractNumber(doc.minPrice),
          usageLimit: doc.usageLimit !== undefined && doc.usageLimit !== null ? extractNumber(doc.usageLimit) : null,
          usedCount: doc.usedCount !== undefined ? extractNumber(doc.usedCount) : 0,
          isActive: doc.isActive !== false,
          createdAt: doc.createdAt?.$date || doc.createdAt,
          updatedAt: doc.updatedAt?.$date || doc.updatedAt
        }));
      }
    }


    return NextResponse.json(coupons);
  } catch (error: any) {
    console.error("Failed to fetch coupons:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { code, discountPct, minPrice, usageLimit, isActive } = await req.json();

    // Validate coupon code: 6 chars, alphanumeric only
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }
    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
      return NextResponse.json({ error: "Coupon code must be exactly 6 characters (letters and numbers only)" }, { status: 400 });
    }

    // Validate discount percentage: 1 - 100
    const pct = parseFloat(discountPct);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      return NextResponse.json({ error: "Discount percentage must be between 1 and 100" }, { status: 400 });
    }

    // Parse and validate minPrice (default to 0.0)
    const minP = parseFloat(minPrice || "0");
    if (isNaN(minP) || minP < 0) {
      return NextResponse.json({ error: "Minimum price must be a positive number" }, { status: 400 });
    }

    // Parse usage limit (null if unlimited/empty/invalid)
    let parsedUsageLimit: number | null = null;
    if (usageLimit !== undefined && usageLimit !== null && usageLimit !== "") {
      const lim = parseInt(String(usageLimit), 10);
      if (isNaN(lim) || lim <= 0) {
        return NextResponse.json({ error: "User limit must be a positive whole number (e.g. 10)" }, { status: 400 });
      }
      parsedUsageLimit = lim;
    }

    const activeState = isActive !== false;

    // Check for duplicates
    let existing = null;
    try {
      if ((prisma as any).coupon) {
        existing = await (prisma as any).coupon.findUnique({
          where: { code: cleanCode }
        });
      } else {
        throw new Error("Coupon model not in client");
      }
    } catch {
      const rawResult: any = await prisma.$runCommandRaw({
        find: "Coupon",
        filter: { code: cleanCode }
      });
      const docs = rawResult?.cursor?.firstBatch || [];
      if (docs.length > 0) {
        existing = docs[0];
      }
    }

    if (existing) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 });
    }

    // Insert new coupon
    let newCoupon = null;
    try {
      if ((prisma as any).coupon) {
        newCoupon = await (prisma as any).coupon.create({
          data: {
            code: cleanCode,
            discountPct: pct,
            minPrice: minP,
            usageLimit: parsedUsageLimit,
            usedCount: 0,
            isActive: activeState
          }
        });
      } else {
        throw new Error("Coupon model not in client");
      }
    } catch {
      // Raw fallback
      await prisma.$runCommandRaw({
        insert: "Coupon",
        documents: [
          {
            code: cleanCode,
            discountPct: pct,
            minPrice: minP,
            usageLimit: parsedUsageLimit,
            usedCount: 0,
            isActive: activeState,
            createdAt: { $date: new Date().toISOString() },
            updatedAt: { $date: new Date().toISOString() }
          }
        ]
      });
      newCoupon = { code: cleanCode, discountPct: pct, minPrice: minP, usageLimit: parsedUsageLimit, usedCount: 0, isActive: activeState };
    }


    return NextResponse.json(newCoupon);
  } catch (error: any) {
    console.error("Failed to create coupon:", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}

// DELETE coupon
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
    }

    try {
      if ((prisma as any).coupon) {
        await (prisma as any).coupon.delete({
          where: { id }
        });
      } else {
        throw new Error("Coupon model not in client");
      }
    } catch {
      // Raw fallback
      await prisma.$runCommandRaw({
        delete: "Coupon",
        deletes: [
          {
            q: { _id: { $oid: id } },
            limit: 1
          }
        ]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete coupon:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
