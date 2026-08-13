import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Safe dynamic lookup helper
async function getPricesRaw(): Promise<any[]> {
  try {
    const rawResult: any = await prisma.$runCommandRaw({
      find: "PrintingPrice",
      sort: { serviceType: 1, colorMode: 1, printSide: 1, layout: 1 }
    });
    if (rawResult && rawResult.cursor && rawResult.cursor.firstBatch) {
      return rawResult.cursor.firstBatch.map((doc: any) => ({
        id: doc._id?.$oid || String(doc._id),
        serviceType: doc.serviceType,
        colorMode: doc.colorMode,
        printSide: doc.printSide,
        layout: doc.layout || "1",
        price: doc.price
      }));
    }
  } catch (err) {
    console.error("Raw fetch failed:", err);
  }
  return [];
}

export async function GET() {
  try {
    let prices: any[] = [];
    try {
      if ((prisma as any).printingPrice) {
        prices = await (prisma as any).printingPrice.findMany({
          orderBy: [
            { serviceType: "asc" },
            { colorMode: "asc" },
            { printSide: "asc" },
            { layout: "asc" }
          ]
        });
      } else {
        prices = await getPricesRaw();
      }
    } catch {
      prices = await getPricesRaw();
    }

    if (prices.length === 0) {
      const defaults = [
        { serviceType: "others", colorMode: "bw", printSide: "single", layout: "1", price: 2.0 },
        { serviceType: "others", colorMode: "bw", printSide: "single", layout: "2+", price: 1.5 },
        { serviceType: "others", colorMode: "bw", printSide: "double", layout: "1", price: 3.5 },
        { serviceType: "others", colorMode: "bw", printSide: "double", layout: "2+", price: 2.5 },
        { serviceType: "others", colorMode: "color", printSide: "single", layout: "1", price: 10.0 },
        { serviceType: "others", colorMode: "color", printSide: "single", layout: "2+", price: 8.0 },
        { serviceType: "others", colorMode: "color", printSide: "double", layout: "1", price: 18.0 },
        { serviceType: "others", colorMode: "color", printSide: "double", layout: "2+", price: 14.0 },
        { serviceType: "study-material", colorMode: "bw", printSide: "single", layout: "1", price: 1.5 },
        { serviceType: "study-material", colorMode: "bw", printSide: "single", layout: "2+", price: 1.0 },
        { serviceType: "study-material", colorMode: "bw", printSide: "double", layout: "1", price: 2.5 },
        { serviceType: "study-material", colorMode: "bw", printSide: "double", layout: "2+", price: 2.0 },
        { serviceType: "study-material", colorMode: "color", printSide: "single", layout: "1", price: 8.0 },
        { serviceType: "study-material", colorMode: "color", printSide: "single", layout: "2+", price: 6.0 },
        { serviceType: "study-material", colorMode: "color", printSide: "double", layout: "1", price: 14.0 },
        { serviceType: "study-material", colorMode: "color", printSide: "double", layout: "2+", price: 11.0 },
      ];

      try {
        if ((prisma as any).printingPrice) {
          await (prisma as any).printingPrice.createMany({ data: defaults });
        } else {
          await prisma.$runCommandRaw({
            insert: "PrintingPrice",
            documents: defaults
          });
        }
      } catch {
        await prisma.$runCommandRaw({
          insert: "PrintingPrice",
          documents: defaults
        });
      }

      try {
        if ((prisma as any).printingPrice) {
          prices = await (prisma as any).printingPrice.findMany({
            orderBy: [
              { serviceType: "asc" },
              { colorMode: "asc" },
              { printSide: "asc" },
              { layout: "asc" }
            ]
          });
        } else {
          prices = await getPricesRaw();
        }
      } catch {
        prices = await getPricesRaw();
      }
    } else {
      // Auto migration for existing databases: if we have prices but none with layout: "2+"
      const hasMulti = prices.some(p => p.layout === "2+");
      if (!hasMulti) {
        const newMultiRecords = prices.map(p => {
          const key = `${p.serviceType}_${p.colorMode}_${p.printSide}`;
          const defaultMultiPrice = {
            "others_bw_single": 1.5,
            "others_bw_double": 2.5,
            "others_color_single": 8.0,
            "others_color_double": 14.0,
            "study-material_bw_single": 1.0,
            "study-material_bw_double": 2.0,
            "study-material_color_single": 6.0,
            "study-material_color_double": 11.0,
          }[key] ?? p.price; // fallback to same price

          return {
            serviceType: p.serviceType,
            colorMode: p.colorMode,
            printSide: p.printSide,
            layout: "2+",
            price: defaultMultiPrice
          };
        });

        try {
          if ((prisma as any).printingPrice) {
            await (prisma as any).printingPrice.createMany({ data: newMultiRecords });
          } else {
            await prisma.$runCommandRaw({
              insert: "PrintingPrice",
              documents: newMultiRecords
            });
          }
        } catch (err) {
          console.error("Failed to seed multi-page layouts:", err);
        }

        // Re-fetch prices
        try {
          if ((prisma as any).printingPrice) {
            prices = await (prisma as any).printingPrice.findMany({
              orderBy: [
                { serviceType: "asc" },
                { colorMode: "asc" },
                { printSide: "asc" },
                { layout: "asc" }
              ]
            });
          } else {
            prices = await getPricesRaw();
          }
        } catch {
          prices = await getPricesRaw();
        }
      }
    }

    return NextResponse.json(prices);
  } catch (error) {
    console.error("GET printing-prices error:", error);
    return NextResponse.json({ error: "Failed to fetch printing prices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, serviceType, colorMode, printSide, layout, price } = body;

    const layoutVal = layout || "1";

    if (!serviceType || !colorMode || !printSide || !layoutVal || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const priceVal = parseFloat(price);

    try {
      if ((prisma as any).printingPrice) {
        if (id) {
          const updated = await (prisma as any).printingPrice.update({
            where: { id },
            data: { serviceType, colorMode, printSide, layout: layoutVal, price: priceVal }
          });
          return NextResponse.json(updated);
        } else {
          const record = await (prisma as any).printingPrice.upsert({
            where: {
              serviceType_colorMode_printSide_layout: { serviceType, colorMode, printSide, layout: layoutVal }
            },
            update: { price: priceVal },
            create: { serviceType, colorMode, printSide, layout: layoutVal, price: priceVal }
          });
          return NextResponse.json(record);
        }
      } else {
        throw new Error("Fallback required");
      }
    } catch {
      // Raw Fallback
      if (id) {
        await prisma.$runCommandRaw({
          update: "PrintingPrice",
          updates: [
            {
              q: { _id: { $oid: id } },
              u: { $set: { serviceType, colorMode, printSide, layout: layoutVal, price: priceVal } }
            }
          ]
        });
        return NextResponse.json({ id, serviceType, colorMode, printSide, layout: layoutVal, price: priceVal });
      } else {
        const existing = await prisma.$runCommandRaw({
          find: "PrintingPrice",
          filter: { serviceType, colorMode, printSide, layout: layoutVal }
        });
        const docs = (existing as any)?.cursor?.firstBatch || [];
        if (docs.length > 0) {
          const docId = docs[0]._id?.$oid || String(docs[0]._id);
          await prisma.$runCommandRaw({
            update: "PrintingPrice",
            updates: [
              {
                q: { _id: docs[0]._id },
                u: { $set: { price: priceVal } }
              }
            ]
          });
          return NextResponse.json({ id: docId, serviceType, colorMode, printSide, layout: layoutVal, price: priceVal });
        } else {
          await prisma.$runCommandRaw({
            insert: "PrintingPrice",
            documents: [{ serviceType, colorMode, printSide, layout: layoutVal, price: priceVal }]
          });
          // Retrieve newly added to get generated ID
          const createdList = await getPricesRaw();
          const newlyAdded = createdList.find(c => c.serviceType === serviceType && c.colorMode === colorMode && c.printSide === printSide && c.layout === layoutVal);
          return NextResponse.json(newlyAdded || { serviceType, colorMode, printSide, layout: layoutVal, price: priceVal });
        }
      }
    }
  } catch (error) {
    console.error("POST printing-prices error:", error);
    return NextResponse.json({ error: "Failed to save printing price" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
      if ((prisma as any).printingPrice) {
        await (prisma as any).printingPrice.delete({
          where: { id }
        });
      } else {
        throw new Error("Fallback required");
      }
    } catch {
      await prisma.$runCommandRaw({
        delete: "PrintingPrice",
        deletes: [
          {
            q: { _id: { $oid: id } },
            limit: 1
          }
        ]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE printing-prices error:", error);
    return NextResponse.json({ error: "Failed to delete printing price" }, { status: 500 });
  }
}
