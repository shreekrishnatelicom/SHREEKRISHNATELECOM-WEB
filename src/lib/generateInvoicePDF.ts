export interface InvoiceItem {
  description: string;
  specs?: string;
  rate?: string | number;
  quantity: string | number;
  amount: number;
}

export interface PrintOptions {
  files?: string[];
  serviceType?: string;
  colorMode?: string;
  printSide?: string;
  pagesPerSheet?: string | number;
  pageCount?: number;
  copies?: number;
  notes?: string;
}

export interface DetailedItemSpec {
  docName: string;
  serviceType: string;
  colorMode: string;
  printSide: string;
  pagesPerSheet: string | number;
  pageCount: number | string;
  copies: number | string;
  discountPercent?: number | string;
  notes?: string;
}

export interface InvoiceData {
  invoiceType?: string;
  trackingId?: string;
  isOffline?: boolean;
  hideShopEmail?: boolean;
  showSignature?: boolean;
  showCustomerSignature?: boolean;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  date?: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentId?: string;
  items: InvoiceItem[];
  itemSpecs?: DetailedItemSpec[];
  subtotal: number;
  itemDiscountTotal?: number;
  overallDiscountPercent?: number;
  discount?: number;
  totalAmount: number;
  notes?: string;
  printDetails?: PrintOptions;
  shopAddress?: string;
  shopPhone?: string;
  shopEmail?: string;
}

export function getFileTypeLabel(fileName: string): string {
  if (!fileName) return "Document File";
  const cleanName = fileName.trim().toLowerCase();
  const ext = cleanName.split(".").pop() || "";
  
  if (ext === "pdf") return "PDF Document";
  if (["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp"].includes(ext)) return "Image File";
  if (["doc", "docx"].includes(ext)) return "Word Document";
  if (["xls", "xlsx", "csv"].includes(ext)) return "Excel Spreadsheet";
  if (["ppt", "pptx"].includes(ext)) return "PowerPoint Presentation";
  if (["txt", "rtf", "md"].includes(ext)) return "Text Document";
  if (["zip", "rar", "7z"].includes(ext)) return "Archive File";
  return `${ext.toUpperCase() || "Document"} File`;
}

export async function generateInvoicePDF(data: InvoiceData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const marginX = 15;
  const rightMargin = pageWidth - marginX; // 195mm
  const isOfflineReceipt = data.isOffline || data.invoiceType === "STORE RECEIPT";

  let currentY = 20;

  // Helper for multi-page pagination
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > 255) {
      doc.addPage();
      currentY = 20;
      return true;
    }
    return false;
  };

  // ── 1. HEADER SECTION (No Logo, Shop Details & Title) ──
  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Shree Krishna Telecom", marginX, currentY);

  doc.setTextColor(0, 72, 143); // #00488f
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("CYBER CAFE & DIGITAL PRINT SERVICES", marginX, currentY + 6);

  // Exact Contact Page Shop Address
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const shopAddr = data.shopAddress || "Near Main Market, Raipur";
  const shopPhone = data.shopPhone || "+91 XXXXX XXXXX";
  const shopEmail = data.shopEmail || "skt@example.com";

  doc.text(`Address: ${shopAddr}`, marginX, currentY + 11);
  if (isOfflineReceipt || data.hideShopEmail) {
    doc.text(`Phone: ${shopPhone}`, marginX, currentY + 15.5);
  } else {
    doc.text(`Phone: ${shopPhone}  |  Email: ${shopEmail}`, marginX, currentY + 15.5);
  }

  // Top Right Title
  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(isOfflineReceipt ? "RECEIPT" : "INVOICE", rightMargin, currentY + 5, { align: "right" });

  // Top Divider Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(marginX, currentY + 20, rightMargin, currentY + 20);

  currentY += 28;

  // ── 2. ADDRESS & METADATA SECTION ─────────────────────────────
  const infoY = currentY;

  // Left Column: Billed To / Customer Info
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BILLED TO", marginX, infoY);

  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(data.customerName || "Valued Customer", marginX, infoY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);

  let custLine = infoY + 11;
  if (data.customerPhone) {
    doc.text(`Phone: ${data.customerPhone}`, marginX, custLine);
    custLine += 4.5;
  }
  if (data.customerEmail && !data.hideShopEmail) {
    doc.text(`Email: ${data.customerEmail}`, marginX, custLine);
    custLine += 4.5;
  }

  // Right Column: Invoice Details
  const metaXLabel = 130;
  const metaXValue = rightMargin;

  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DETAILS", metaXValue, infoY, { align: "right" });

  const drawMetaRow = (label: string, value: string, yPos: number, isHighlight = false) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(label, metaXLabel, yPos);

    doc.setFont("helvetica", isHighlight ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(isHighlight ? 0 : 31, isHighlight ? 72 : 41, isHighlight ? 143 : 55);
    doc.text(value, metaXValue, yPos, { align: "right" });
  };

  let metaY = infoY + 6;
  if (!isOfflineReceipt && data.trackingId) {
    drawMetaRow("Invoice / Tracking No:", data.trackingId, metaY, true);
    metaY += 5;
  }
  drawMetaRow("Issue Date:", data.date || new Date().toLocaleDateString("en-IN"), metaY);
  metaY += 5;
  drawMetaRow("Payment Status:", data.paymentStatus, metaY);
  metaY += 5;
  drawMetaRow("Payment Method:", data.paymentMethod, metaY);
  metaY += 5;
  if (data.paymentId) {
    drawMetaRow("Payment ID:", data.paymentId, metaY);
    metaY += 5;
  }

  currentY = Math.max(custLine, metaY) + 4;

  // ── 3. ITEMIZED PRODUCT TABLE (Multi-Page Supported) ──
  const tableHeaderHeight = 9;

  const drawTableHeader = (yPos: number) => {
    doc.setFillColor(248, 249, 250);
    doc.rect(marginX, yPos, rightMargin - marginX, tableHeaderHeight, "F");

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.4);
    doc.rect(marginX, yPos, rightMargin - marginX, tableHeaderHeight, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);

    doc.text("ITEM / FILE DESCRIPTION", marginX + 4, yPos + 6);
    doc.text("SPECIFICATIONS", marginX + 75, yPos + 6);
    doc.text("QTY / PAGES", 160, yPos + 6, { align: "center" });
    doc.text("AMOUNT", rightMargin - 4, yPos + 6, { align: "right" });
  };

  checkPageBreak(tableHeaderHeight + 15);
  drawTableHeader(currentY);
  currentY += tableHeaderHeight + 6;

  data.items.forEach((item) => {
    if (checkPageBreak(14)) {
      drawTableHeader(currentY);
      currentY += tableHeaderHeight + 6;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(26, 26, 26);

    const desc = item.description.length > 38 ? item.description.substring(0, 36) + "..." : item.description;
    doc.text(desc, marginX + 4, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    const specStr = item.specs || "-";
    const specs = specStr.length > 40 ? specStr.substring(0, 38) + "..." : specStr;
    doc.text(specs, marginX + 75, currentY);

    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text(String(item.quantity), 160, currentY, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 26, 26);
    doc.text(`Rs. ${item.amount.toFixed(2)}`, rightMargin - 4, currentY, { align: "right" });

    currentY += 4;
    doc.setDrawColor(243, 244, 246);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY, rightMargin, currentY);

    currentY += 6;
  });

  // ── 4. ORDER CONFIGURATION & SPECIFICATIONS BOX ───────────
  const itemSpecs = data.itemSpecs;
  const pd = data.printDetails;

  if ((itemSpecs && itemSpecs.length > 0) || pd || data.notes) {
    currentY += 2;

    if (itemSpecs && itemSpecs.length > 0) {
      checkPageBreak(25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 72, 143);
      doc.text("FULL ORDER CONFIGURATION & SPECIFICATIONS", marginX, currentY + 4);
      currentY += 7;

      itemSpecs.forEach((spec) => {
        const hasNote = Boolean(spec.notes);
        const boxHeight = hasNote ? 25 : 21;

        if (checkPageBreak(boxHeight + 4)) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(0, 72, 143);
          doc.text("SPECIFICATIONS (CONTINUED)", marginX, currentY + 4);
          currentY += 7;
        }

        doc.setFillColor(250, 250, 250);
        doc.rect(marginX, currentY, rightMargin - marginX, boxHeight, "F");

        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.4);
        doc.rect(marginX, currentY, rightMargin - marginX, boxHeight, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(0, 72, 143);
        doc.text(`DOCUMENT: ${spec.docName}`, marginX + 4, currentY + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);

        const col1X = marginX + 4;
        const col2X = marginX + 95;
        let sLine = currentY + 10;

        doc.text(`Color Mode: ${spec.colorMode}`, col1X, sLine);
        doc.text(`Print Side: ${spec.printSide}`, col2X, sLine);

        sLine += 4.5;
        doc.text(`Pages Per Sheet: ${spec.pagesPerSheet}`, col1X, sLine);
        doc.text(`Quantity: ${spec.pageCount} Doc Pages x ${spec.copies} Copies`, col2X, sLine);

        sLine += 4.5;
        doc.text(`Payment Method: ${data.paymentMethod}`, col1X, sLine);
        doc.text(`Payment Status: ${data.paymentStatus}`, col2X, sLine);

        if (hasNote) {
          sLine += 4.5;
          doc.setFont("helvetica", "bold");
          doc.setTextColor(180, 83, 9);
          doc.text(`Special Notes: ${spec.notes}`, col1X, sLine);
        }

        currentY += boxHeight + 3;
      });
    } else {
      const specBoxHeight = 44;
      checkPageBreak(specBoxHeight + 6);

      doc.setFillColor(250, 250, 250);
      doc.rect(marginX, currentY, rightMargin - marginX, specBoxHeight, "F");

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.4);
      doc.rect(marginX, currentY, rightMargin - marginX, specBoxHeight, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 72, 143);
      doc.text("FULL ORDER CONFIGURATION & SPECIFICATIONS", marginX + 4, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(55, 65, 81);

      let sLine = currentY + 12;
      const col1X = marginX + 4;
      const col2X = marginX + 95;

      if (pd?.files && pd.files.length > 0) {
        const fileText = pd.files.join(", ");
        const displayFiles = fileText.length > 42 ? fileText.substring(0, 40) + "..." : fileText;
        doc.text(`Uploaded Files (${pd.files.length}): ${displayFiles}`, col1X, sLine);
      } else {
        doc.text(`Uploaded Files: Document Attachment`, col1X, sLine);
      }

      doc.text(`Service Type: ${pd?.serviceType || "Others / Standard"}`, col2X, sLine);

      sLine += 5;
      doc.text(`Color Mode: ${pd?.colorMode || "Black & White"}`, col1X, sLine);
      doc.text(`Print Side: ${pd?.printSide || "Single Side"}`, col2X, sLine);

      sLine += 5;
      doc.text(`Pages Per Sheet: ${pd?.pagesPerSheet || "1 Page / Sheet"}`, col1X, sLine);
      const pCount = pd?.pageCount ? `${pd.pageCount} Doc Pages` : "1 Doc Page";
      const cCount = pd?.copies ? `${pd.copies} Copies` : "1 Copy";
      doc.text(`Quantity: ${pCount} x ${cCount}`, col2X, sLine);

      sLine += 5;
      doc.text(`Payment Method: ${data.paymentMethod}`, col1X, sLine);
      doc.text(`Payment Status: ${data.paymentStatus}`, col2X, sLine);

      if (data.notes || pd?.notes) {
        sLine += 5;
        const noteStr = data.notes || pd?.notes || "";
        const displayNotes = noteStr.length > 80 ? noteStr.substring(0, 78) + "..." : noteStr;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 83, 9);
        doc.text(`Special Notes: ${displayNotes}`, col1X, sLine);
      }

      currentY += specBoxHeight + 6;
    }
  }

  // ── 5. FULL WIDTH SUMMARY & TOTALS BAR ─────────────────────────
  checkPageBreak(35);
  currentY += 4;

  // Subtotal Row
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(107, 114, 128);
  doc.text("Subtotal:", marginX + 4, currentY);

  doc.setTextColor(26, 26, 26);
  doc.text(`Rs. ${data.subtotal.toFixed(2)}`, rightMargin - 4, currentY, { align: "right" });

  if (data.itemDiscountTotal && data.itemDiscountTotal > 0) {
    currentY += 5;
    doc.setTextColor(220, 38, 38);
    doc.text("Item Discounts:", marginX + 4, currentY);
    doc.text(`-Rs. ${data.itemDiscountTotal.toFixed(2)}`, rightMargin - 4, currentY, { align: "right" });
  }

  if (data.overallDiscountPercent && data.overallDiscountPercent > 0) {
    currentY += 5;
    const baseForOverall = data.subtotal - (data.itemDiscountTotal || 0);
    const overallAmt = (baseForOverall * data.overallDiscountPercent) / 100;
    doc.setTextColor(220, 38, 38);
    doc.text(`Overall Discount (${data.overallDiscountPercent}%):`, marginX + 4, currentY);
    doc.text(`-Rs. ${overallAmt.toFixed(2)}`, rightMargin - 4, currentY, { align: "right" });
  } else if (data.discount && data.discount > 0 && !data.itemDiscountTotal) {
    currentY += 5;
    doc.setTextColor(220, 38, 38);
    doc.text("Discount:", marginX + 4, currentY);
    doc.text(`-Rs. ${data.discount.toFixed(2)}`, rightMargin - 4, currentY, { align: "right" });
  }

  // Full-width Total Bar
  currentY += 8;
  const barWidth = rightMargin - marginX;
  doc.setFillColor(26, 26, 26);
  doc.rect(marginX, currentY - 5, barWidth, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(246, 196, 0); // Bauhaus Yellow
  doc.text("TOTAL AMOUNT", marginX + 6, currentY + 2.5);

  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(`Rs. ${data.totalAmount.toFixed(2)}`, rightMargin - 6, currentY + 2.5, { align: "right" });

  // ── 6. SIGNATURE & FOOTER SECTION ─────────────────────────────
  checkPageBreak(45);
  
  const footerY = 265;
  const sigY = footerY - 21; // Always position signature cleanly at the bottom above footer (244mm)

  if (isOfflineReceipt || data.showSignature) {
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.4);
    
    if (data.showCustomerSignature) {
      doc.line(marginX + 5, sigY, marginX + 60, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      doc.text("Customer Signature", marginX + 32.5, sigY + 4, { align: "center" });
    }

    doc.line(rightMargin - 60, sigY, rightMargin - 5, sigY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Authorized Signatory / Stamp", rightMargin - 32.5, sigY + 4, { align: "center" });
  }

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(marginX, footerY - 8, rightMargin, footerY - 8);

  // Counter instruction box
  doc.setFillColor(248, 249, 250);
  doc.rect(marginX, footerY - 4, rightMargin - marginX, 16, "F");
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.rect(marginX, footerY - 4, rightMargin - marginX, 16, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 72, 143);
  const counterText = isOfflineReceipt
    ? "THANK YOU FOR YOUR VISIT! HAVE A GREAT DAY."
    : data.paymentStatus.toLowerCase().includes("paid")
    ? "SHOW THIS INVOICE AT SHOP COUNTER TO COLLECT YOUR DOCUMENTS"
    : "SHOW TRACKING ID / INVOICE AT COUNTER TO PAY & COLLECT YOUR PRINTS";
  doc.text(counterText, pageWidth / 2, footerY + 2, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`Shree Krishna Telecom | ${shopAddr} | Phone: ${shopPhone}`, pageWidth / 2, footerY + 8, { align: "center" });

  // Save PDF
  if (isOfflineReceipt || !data.trackingId) {
    const cleanCust = (data.customerName || "Offline").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`SKT-Store-Receipt-${cleanCust}.pdf`);
  } else {
    doc.save(`SKT-Invoice-${data.trackingId}.pdf`);
  }
}


