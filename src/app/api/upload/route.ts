import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PDFDocument } from "pdf-lib";

function generateTrackingId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "SKT";
  for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

async function getPdfPageCount(buffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { updateMetadata: false });
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error("Error getting PDF page count:", error);
    return 1;
  }
}

function parsePrice(priceStr: string | null | undefined, defaultVal: number): number {
  if (!priceStr) return defaultVal;
  const match = priceStr.match(/[\d.]+/);
  if (match) {
    const val = parseFloat(match[0]);
    return isNaN(val) ? defaultVal : val;
  }
  return defaultVal;
}

/**
 * Safely extract a number from a MongoDB raw query price field.
 * Handles: plain number, string, MongoDB Extended JSON ($numberDecimal,
 * $numberDouble, $numberInt, $numberLong).
 */
function extractMongoPrice(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return isNaN(raw) ? null : raw;
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    return isNaN(n) ? null : n;
  }
  if (typeof raw === "object") {
    // MongoDB Extended JSON formats
    if (raw.$numberDecimal !== undefined) { const n = parseFloat(raw.$numberDecimal); return isNaN(n) ? null : n; }
    if (raw.$numberDouble !== undefined) { const n = parseFloat(raw.$numberDouble); return isNaN(n) ? null : n; }
    if (raw.$numberInt !== undefined)    { const n = parseInt(raw.$numberInt, 10);   return isNaN(n) ? null : n; }
    if (raw.$numberLong !== undefined)   { const n = parseInt(raw.$numberLong, 10);  return isNaN(n) ? null : n; }
  }
  return null;
}

function getMimeTypeByExt(ext: string): string {
  switch (ext) {
    case ".pdf": return "application/pdf";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".bmp": return "image/bmp";
    case ".tiff": return "image/tiff";
    case ".doc": return "application/msword";
    case ".docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xls": return "application/vnd.ms-excel";
    case ".xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default: return "application/octet-stream";
  }
}

function generateReceiptHtml(
  trackingId: string,
  fileName: string,
  colorMode: string,
  copies: number,
  printSide: string,
  pagesPerSheet: number,
  notes: string,
  price: number,
  pageCount: number,
  isServiceRequest: boolean,
  serviceName: string,
) {
  const date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const modeLabel = colorMode === "color" ? "Full Color" : "Black & White";
  const sideLabel = printSide === "double" ? "Double-sided" : "Single-sided";
  const ppsLabel = pagesPerSheet > 1 ? `${pagesPerSheet} pages per sheet` : "1 page per sheet (normal)";

  let fileListHtml = "";
  try {
    if (fileName.startsWith("[")) {
      const names = JSON.parse(fileName);
      fileListHtml = names.map((name: string) => `<div style="font-weight:700;margin-top:2px;">${name}</div>`).join("");
    } else {
      fileListHtml = fileName;
    }
  } catch (e) {
    fileListHtml = fileName;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt — ${trackingId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f4f4f4; display: flex; justify-content: center; padding: 40px 20px; }
    .card { background: white; border: 4px solid #1a1a1a; max-width: 460px; width: 100%; }
    .header { background: #00488f; color: white; padding: 20px 24px; border-bottom: 4px solid #1a1a1a; }
    .header h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; }
    .header p { font-size: 11px; opacity: 0.7; margin-top: 2px; text-transform: uppercase; letter-spacing: 2px; }
    .body { padding: 24px; }
    .tracking { background: #f6c400; border: 4px solid #1a1a1a; padding: 16px; text-align: center; margin-bottom: 20px; }
    .tracking .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #555; }
    .tracking .id  { font-size: 34px; font-family: monospace; font-weight: 900; letter-spacing: 4px; margin-top: 4px; }
    .price-tag { background: #e0162b; color: white; border: 4px solid #1a1a1a; padding: 12px; text-align: center; margin-bottom: 20px; font-size: 24px; font-weight: 900; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
    .row .k { font-weight: 700; text-transform: uppercase; font-size: 10px; color: #888; }
    .row .v { font-weight: 700; }
    .notice { background: #e0162b; color: white; padding: 10px 14px; font-size: 11px; font-weight: 700; text-align: center; text-transform: uppercase; margin-top: 16px; }
    .footer { background: #1a1a1a; color: white; padding: 12px 24px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>Shree Krishna Telecom</h1>
    <p>Request Receipt & Invoice</p>
  </div>
  <div class="body">
    <div class="tracking">
      <div class="lbl">Your Tracking ID</div>
      <div class="id">${trackingId}</div>
    </div>
    <div class="price-tag">
      TOTAL: ₹${price.toFixed(2)}
    </div>
    ${isServiceRequest ? `
      <div class="row"><span class="k">Service Requested</span><span class="v">${serviceName}</span></div>
    ` : `
      <div class="row" style="align-items: flex-start;"><span class="k">File(s)</span><span class="v" style="text-align: right; word-break: break-all; max-width: 70%;">${fileListHtml}</span></div>
      <div class="row"><span class="k">Pages</span><span class="v">${pageCount} page(s)</span></div>
      <div class="row"><span class="k">Print Mode</span><span class="v">${modeLabel}</span></div>
      <div class="row"><span class="k">Print Side</span><span class="v">${sideLabel}</span></div>
      <div class="row"><span class="k">Layout</span><span class="v">${ppsLabel}</span></div>
    `}
    <div class="row"><span class="k">Copies</span><span class="v">${copies}</span></div>
    <div class="row"><span class="k">Status</span><span class="v">Pending — Pay at Shop</span></div>
    <div class="row"><span class="k">Date</span><span class="v">${date}</span></div>
    ${notes ? `<div class="row"><span class="k">Notes</span><span class="v">${notes}</span></div>` : ""}
    <div class="notice">⚠ Show this Tracking ID at the counter to pay & collect</div>
  </div>
  <div class="footer">© ${new Date().getFullYear()} Shree Krishna Telecom</div>
</div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const fileRecordsCreated: string[] = [];
  try {
    const formData = await req.formData();
    
    // Support both multiple files under "files" and single files under "file"
    let uploadedFiles = formData.getAll("files") as File[];
    if (uploadedFiles.length === 0) {
      const singleFile = formData.get("file") as File | null;
      if (singleFile) uploadedFiles = [singleFile];
    }

    const colorMode = (formData.get("colorMode") as string) || "bw";
    const copies = parseInt((formData.get("copies") as string) || "1", 10);
    const printSide = (formData.get("printSide") as string) || "single";
    const pagesPerSheet = parseInt((formData.get("pagesPerSheet") as string) || "1", 10);
    const notes = (formData.get("notes") as string) || "";
    const serviceType = (formData.get("serviceType") as string) || "others";
    const paymentMethod = (formData.get("paymentMethod") as string) || "in-shop";

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 1. File Type and Size Validation
    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".doc", ".docx", ".xls", ".xlsx"];
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/tiff",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    for (const file of uploadedFiles) {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
        return NextResponse.json({ error: `File type for "${file.name}" is not supported.` }, { status: 400 });
      }
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: `File "${file.name}" is too large (max 50MB per file)` }, { status: 400 });
      }
    }

    // 2. Sanitize and Validate numeric inputs
    const copiesVal = Math.max(1, isNaN(copies) ? 1 : copies);
    const pagesPerSheetVal = Math.max(1, isNaN(pagesPerSheet) ? 1 : pagesPerSheet);

    // 3. Save files to FileStorage collection and chunks to FileChunk in parallel
    const uploadPromises = uploadedFiles.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

      // Determine page count
      let filePageCount = 1;
      if (file.type === "application/pdf" || ext === ".pdf") {
        filePageCount = await getPdfPageCount(buffer);
      }

      const fileRecord = await prisma.fileStorage.create({
        data: {
          filename: file.name,
          contentType: file.type || getMimeTypeByExt(ext),
          dataStr: "",
        }
      });
      fileRecordsCreated.push(fileRecord.id);

      const base64Str = buffer.toString("base64");
      const chunkSize = 2 * 1024 * 1024; // 2MB characters chunk size
      const numChunks = Math.ceil(base64Str.length / chunkSize);

      const chunksData = [];
      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(base64Str.length, start + chunkSize);
        const chunkData = base64Str.substring(start, end);
        chunksData.push({
          fileId: fileRecord.id,
          chunkIndex: i,
          dataStr: chunkData,
        });
      }

      // Group into batches of 4 chunks (approx 8MB per batch) to avoid MongoDB 16MB document/query limit
      const batchSize = 4;
      const batches = [];
      for (let i = 0; i < chunksData.length; i += batchSize) {
        batches.push(chunksData.slice(i, i + batchSize));
      }

      const batchPromises = batches.map(async (batch) => {
        try {
          if ((prisma as any).fileChunk) {
            await (prisma as any).fileChunk.createMany({
              data: batch.map(c => ({
                fileId: c.fileId,
                chunkIndex: c.chunkIndex,
                dataStr: c.dataStr,
              }))
            });
          } else {
            throw new Error("Fallback required");
          }
        } catch {
          // Raw MongoDB command fallback
          await prisma.$runCommandRaw({
            insert: "FileChunk",
            documents: batch.map(c => ({
              fileId: { $oid: c.fileId },
              chunkIndex: c.chunkIndex,
              dataStr: c.dataStr,
              createdAt: { $date: new Date().toISOString() }
            }))
          });
        }
      });

      await Promise.all(batchPromises);

      return {
        name: file.name,
        url: `/api/files/${fileRecord.id}`,
        pageCount: filePageCount
      };
    });

    const uploadResults = await Promise.all(uploadPromises);

    const fileNames: string[] = uploadResults.map(r => r.name);
    const fileUrls: string[] = uploadResults.map(r => r.url);
    const totalPageCount = uploadResults.reduce((sum, r) => sum + r.pageCount, 0);

    // 4. Classify Request and Calculate Price
    let isServiceRequest = false;
    let serviceName = "";
    let calculatedPrice = 0.0;

    if (notes.includes("[Service Request:")) {
      isServiceRequest = true;
      const match = notes.match(/\[Service Request:\s*([^\]]+)\]/);
      if (match) {
        serviceName = match[1].trim();
      }
    }

    if (isServiceRequest && serviceName) {
      // Find the service by name
      const svc = await prisma.service.findFirst({
        where: { name: serviceName }
      });
      const basePrice = parsePrice(svc?.price, 0);
      calculatedPrice = basePrice * copiesVal;
    } else {
      // Print Request pricing calculation
      const layoutType = pagesPerSheetVal >= 2 ? "2+" : "1";

      console.log("[PRICE] Looking up price for:", { serviceType, colorMode, printSide, layoutType });

      // Fetch ALL pricing records (same pattern as admin API — guaranteed to work)
      // then filter in JS. This avoids $runCommandRaw filter compatibility issues.
      let allPrices: any[] = [];
      try {
        if ((prisma as any).printingPrice) {
          allPrices = await (prisma as any).printingPrice.findMany();
        }
      } catch { /* stale client — fall through */ }

      if (allPrices.length === 0) {
        try {
          const rawResult: any = await prisma.$runCommandRaw({ find: "PrintingPrice" });
          const docs = rawResult?.cursor?.firstBatch || [];
          allPrices = docs.map((doc: any) => ({
            serviceType: doc.serviceType,
            colorMode: doc.colorMode,
            printSide: doc.printSide,
            layout: doc.layout || "1",
            price: extractMongoPrice(doc.price),
          }));
        } catch (rawErr) {
          console.error("[PRICE] Raw fetch failed:", rawErr);
        }
      }

      console.log("[PRICE] Total pricing records fetched:", allPrices.length);

      // Match: exact layout first, then fall back to layout "1"
      const findMatch = (lt: string) =>
        allPrices.find(
          (p: any) =>
            p.serviceType === serviceType &&
            p.colorMode === colorMode &&
            p.printSide === printSide &&
            p.layout === lt
        );

      const priceRecord = findMatch(layoutType) ?? (layoutType === "2+" ? findMatch("1") : null);

      console.log("[PRICE] Matched record:", priceRecord ?? "none — using fallback");

      const extractedRate = priceRecord ? extractMongoPrice(priceRecord.price) : null;
      const rateVal = extractedRate ?? (
        colorMode === "color"
          ? (printSide === "double" ? (layoutType === "2+" ? 14 : 18) : (layoutType === "2+" ? 8 : 10))
          : (printSide === "double" ? (layoutType === "2+" ? 2.5 : 3.5) : (layoutType === "2+" ? 1.5 : 2))
      );

      const printedSides = Math.ceil(totalPageCount / pagesPerSheetVal);
      const sheets = printSide === "double" ? Math.ceil(printedSides / 2) : printedSides;
      calculatedPrice = Math.round(rateVal * sheets * copiesVal * 100) / 100;

      console.log("[PRICE] Final:", { rateVal, totalPageCount, sheets, copiesVal, calculatedPrice });
    }

    // Coupon code validation & calculation
    const couponCode = (formData.get("couponCode") as string) || "";
    let appliedCouponCode: string | null = null;
    let discountPercent = 0.0;

    if (couponCode && calculatedPrice > 0) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      let coupon: any = null;
      try {
        if ((prisma as any).coupon) {
          coupon = await (prisma as any).coupon.findUnique({
            where: { code: cleanCoupon }
          });
        }
      } catch {}

      if (!coupon) {
        try {
          const rawResult: any = await prisma.$runCommandRaw({
            find: "Coupon",
            filter: { code: cleanCoupon }
          });
          const docs = rawResult?.cursor?.firstBatch || [];
          if (docs.length > 0) {
            const doc = docs[0];
            coupon = {
              code: doc.code,
              discountPct: extractMongoPrice(doc.discountPct) ?? 0,
              minPrice: extractMongoPrice(doc.minPrice) ?? 0,
              isActive: doc.isActive !== false
            };
          }
        } catch (rawErr) {
          console.error("[COUPON] Raw validate failed:", rawErr);
        }
      }

      if (coupon && coupon.isActive) {
        const lim = coupon.usageLimit !== undefined && coupon.usageLimit !== null ? extractMongoPrice(coupon.usageLimit) : null;
        const used = extractMongoPrice(coupon.usedCount) ?? 0;

        if (lim !== null && lim > 0 && used >= lim) {
          console.log(`[COUPON] Code ${cleanCoupon} not applied because user usage limit (${lim}) has been reached (used: ${used})`);
        } else {
          const minPriceLimit = extractMongoPrice(coupon.minPrice) ?? 0;
          if (calculatedPrice < minPriceLimit) {
            console.log(`[COUPON] Code ${cleanCoupon} not applied because calculatedPrice ₹${calculatedPrice} is less than minPrice limit ₹${minPriceLimit}`);
          } else {
            appliedCouponCode = coupon.code;
            discountPercent = coupon.discountPct;
            const discountAmount = Math.round(calculatedPrice * (discountPercent / 100) * 100) / 100;
            calculatedPrice = Math.max(0, Math.round((calculatedPrice - discountAmount) * 100) / 100);
            console.log(`[COUPON] Applied ${coupon.code} (${discountPercent}% off). Discount: ₹${discountAmount}. Final Price: ₹${calculatedPrice}`);
          }
        }
      } else {
        console.log(`[COUPON] Code ${cleanCoupon} was provided but is invalid or inactive`);
      }
    }


    const trackingId = generateTrackingId();

    let userId = null;
    const userToken = req.cookies.get("user_token")?.value;
    if (userToken) {
      try {
        const decoded = Buffer.from(userToken, "base64").toString("utf-8");
        userId = decoded.split(":")[0];
      } catch (e) { }
    }

    // Razorpay Order Creation
    let razorpayOrderId: string | null = null;
    let razorpayKeyId: string | null = null;

    if (paymentMethod === "online" && calculatedPrice > 0) {
      try {
        const keyId = process.env.RAZORPAY_KEY_ID || "";
        const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

        if (keyId && keySecret && keyId !== "rzp_test_placeholder") {
          const Razorpay = require("razorpay");
          const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
          });

          const order = await razorpay.orders.create({
            amount: Math.round(calculatedPrice * 100),
            currency: "INR",
            receipt: trackingId,
          });

          razorpayOrderId = order.id;
          razorpayKeyId = keyId;
        } else {
          console.warn("Razorpay keys missing/placeholder. Simulating order.");
          razorpayOrderId = `order_${Math.random().toString(36).substring(2, 11)}`;
          razorpayKeyId = "rzp_test_placeholder";
        }
      } catch (err) {
        console.error("Razorpay order error:", err);
        throw new Error("Failed to initialize payment gateway");
      }
    }

    // 5. Save PrintRequest (Clean up FileStorage if request creation fails)
    const storeFileNames = fileNames.length === 1 ? fileNames[0] : JSON.stringify(fileNames);
    const storeFileUrls = fileUrls.length === 1 ? fileUrls[0] : JSON.stringify(fileUrls);

    try {
      const dataPayload: any = {
        trackingId,
        fileName: storeFileNames,
        fileUrl: storeFileUrls,
        colorMode,
        copies: copiesVal,
        printSide,
        pagesPerSheet: pagesPerSheetVal,
        serviceType,
        notes: notes || null,
        status: (paymentMethod === "online" && calculatedPrice > 0) ? "pending-payment" : "pending",
        paymentMethod: paymentMethod === "online" ? "online" : "in-shop",
        price: calculatedPrice,
        razorpayOrderId,
        couponCode: appliedCouponCode,
        discountPercent,
        ...(userId && { userId }),
      };

      try {
        await prisma.printRequest.create({ data: dataPayload });
      } catch (err: any) {
        const isMissingFieldErr = err.message && (
          err.message.includes("serviceType") ||
          err.message.includes("couponCode") ||
          err.message.includes("discountPercent")
        );
        if (isMissingFieldErr) {
          console.warn("Stale Prisma Client: Retrying print request creation without new fields.");
          delete dataPayload.serviceType;
          delete dataPayload.couponCode;
          delete dataPayload.discountPercent;
          await prisma.printRequest.create({ data: dataPayload });
        } else {
          throw err;
        }
      }
    } catch (dbErr) {
      throw dbErr;
    }

    // Increment coupon usage count if a coupon was successfully applied
    if (appliedCouponCode) {
      try {
        if ((prisma as any).coupon) {
          await (prisma as any).coupon.update({
            where: { code: appliedCouponCode },
            data: { usedCount: { increment: 1 } }
          });
        } else {
          throw new Error("Fallback required");
        }
      } catch {
        await prisma.$runCommandRaw({
          update: "Coupon",
          updates: [
            {
              q: { code: appliedCouponCode },
              u: { $inc: { usedCount: 1 } }
            }
          ]
        }).catch(() => {});
      }
    }


    const receiptHtml = generateReceiptHtml(
      trackingId,
      storeFileNames,
      colorMode,
      copies,
      printSide,
      pagesPerSheet,
      notes,
      calculatedPrice,
      totalPageCount,
      isServiceRequest,
      serviceName,
    );
    const receiptUrl = `data:text/html;base64,${Buffer.from(receiptHtml).toString("base64")}`;

    return NextResponse.json({
      trackingId,
      receiptUrl,
      price: calculatedPrice,
      pageCount: totalPageCount,
      isServiceRequest,
      serviceName,
      fileName: storeFileNames,
      razorpayOrderId,
      razorpayKeyId,
      amount: Math.round(calculatedPrice * 100),
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    
    // Cleanup any files successfully saved in this request if transaction fails
    for (const fileId of fileRecordsCreated) {
      await prisma.fileStorage.delete({ where: { id: fileId } }).catch(() => {});
      try {
        if ((prisma as any).fileChunk) {
          await (prisma as any).fileChunk.deleteMany({ where: { fileId } }).catch(() => {});
        } else {
          await prisma.$runCommandRaw({
            delete: "FileChunk",
            deletes: [{ q: { fileId: { $oid: fileId } }, limit: 0 }]
          }).catch(() => {});
        }
      } catch {}
    }

    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
