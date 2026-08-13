import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function generateTrackingId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "SKT";
  for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

function getPdfPageCount(buffer: Buffer): number {
  const str = buffer.toString("ascii");
  const matches = str.match(/\/Type\s*\/Page\b/g);
  if (matches) {
    return matches.length;
  }

  const countMatches = str.match(/\/Count\s+(\d+)/g);
  if (countMatches) {
    for (const m of countMatches) {
      const match = m.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (val > 0) return val;
      }
    }
  }
  return 1;
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

    // 3. Save files to FileStorage collection and chunks to FileChunk
    const fileNames: string[] = [];
    const fileUrls: string[] = [];
    let totalPageCount = 0;

    for (const file of uploadedFiles) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

      // Determine page count
      let filePageCount = 1;
      if (file.type === "application/pdf" || ext === ".pdf") {
        filePageCount = getPdfPageCount(buffer);
      }
      totalPageCount += filePageCount;

      const fileRecord = await prisma.fileStorage.create({
        data: {
          filename: file.name,
          contentType: file.type || getMimeTypeByExt(ext),
          dataStr: "",
        }
      });
      fileRecordsCreated.push(fileRecord.id);

      const base64Str = buffer.toString("base64");
      const chunkSize = 10 * 1024 * 1024; // 10MB characters chunk size
      const numChunks = Math.ceil(base64Str.length / chunkSize);

      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(base64Str.length, start + chunkSize);
        const chunkData = base64Str.substring(start, end);

        try {
          if ((prisma as any).fileChunk) {
            await (prisma as any).fileChunk.create({
              data: {
                fileId: fileRecord.id,
                chunkIndex: i,
                dataStr: chunkData,
              }
            });
          } else {
            throw new Error("Fallback required");
          }
        } catch {
          // Raw MongoDB command fallback
          await prisma.$runCommandRaw({
            insert: "FileChunk",
            documents: [
              {
                fileId: { $oid: fileRecord.id },
                chunkIndex: i,
                dataStr: chunkData,
                createdAt: { $date: new Date().toISOString() }
              }
            ]
          });
        }
      }

      fileNames.push(file.name);
      fileUrls.push(`/api/files/${fileRecord.id}`);
    }

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
      let priceRecord = null;
      try {
        if ((prisma as any).printingPrice) {
          priceRecord = await (prisma as any).printingPrice.findFirst({
            where: { serviceType, colorMode, printSide, layout: layoutType }
          });
          if (!priceRecord && layoutType === "2+") {
            priceRecord = await (prisma as any).printingPrice.findFirst({
              where: { serviceType, colorMode, printSide, layout: "1" }
            });
          }
        }
      } catch (e) {
        console.warn("Prisma printingPrice client property not available, using raw query:", e);
      }

      if (!priceRecord) {
        try {
          let rawResult: any = await prisma.$runCommandRaw({
            find: "PrintingPrice",
            filter: { serviceType, colorMode, printSide, layout: layoutType }
          });
          let docs = (rawResult as any)?.cursor?.firstBatch || [];
          if (docs.length > 0) {
            priceRecord = docs[0];
          } else if (layoutType === "2+") {
            rawResult = await prisma.$runCommandRaw({
              find: "PrintingPrice",
              filter: { serviceType, colorMode, printSide, layout: "1" }
            });
            docs = (rawResult as any)?.cursor?.firstBatch || [];
            if (docs.length > 0) {
              priceRecord = docs[0];
            }
          }
        } catch (rawErr) {
          console.error("Raw upload query failed:", rawErr);
        }
      }

      const rateVal = priceRecord?.price ?? (
        colorMode === "color"
          ? (printSide === "double" ? (layoutType === "2+" ? 14 : 18) : (layoutType === "2+" ? 8 : 10))
          : (printSide === "double" ? (layoutType === "2+" ? 2.5 : 3.5) : (layoutType === "2+" ? 1.5 : 2))
      );

      const printedSides = Math.ceil(totalPageCount / pagesPerSheetVal);
      const sheets = printSide === "double" ? Math.ceil(printedSides / 2) : printedSides;
      calculatedPrice = rateVal * sheets * copiesVal;
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
        status: paymentMethod === "online" ? "pending-payment" : "pending",
        paymentMethod: paymentMethod === "online" ? "online" : "in-shop",
        price: calculatedPrice,
        razorpayOrderId,
        ...(userId && { userId }),
      };

      try {
        await prisma.printRequest.create({ data: dataPayload });
      } catch (err: any) {
        if (err.message && err.message.includes("serviceType")) {
          console.warn("Stale Prisma Client: Retrying print request creation without serviceType field.");
          delete dataPayload.serviceType;
          await prisma.printRequest.create({ data: dataPayload });
        } else {
          throw err;
        }
      }
    } catch (dbErr) {
      throw dbErr;
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
