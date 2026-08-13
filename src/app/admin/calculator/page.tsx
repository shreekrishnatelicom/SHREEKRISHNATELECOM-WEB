"use client";

import { useState, useEffect } from "react";
import { Calculator, Download, User, RefreshCw } from "lucide-react";

interface PrintingPrice {
  id: string;
  serviceType: string;
  colorMode: string;
  printSide: string;
  layout?: string;
  price: number;
}

export default function StoreCalculator() {
  const [prices, setPrices] = useState<PrintingPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [serviceType, setServiceType] = useState<"study-material" | "others">("others");
  const [colorMode, setColorMode] = useState<"bw" | "color">("bw");
  const [printSide, setPrintSide] = useState<"single" | "double">("single");
  const [pagesPerSheet, setPagesPerSheet] = useState<number | "">(1);
  const [pageCount, setPageCount] = useState<number | "">(1);
  const [copies, setCopies] = useState<number | "">(1);
  const [notes, setNotes] = useState("");

  const loadPrices = async () => {
    setIsLoading(true);
    const res = await fetch("/api/admin/printing-prices");
    if (res.ok) setPrices(await res.json());
    setIsLoading(false);
  };

  useEffect(() => {
    loadPrices();
  }, []);

  // Calculate price
  const numericPagesPerSheet = pagesPerSheet === "" ? 1 : pagesPerSheet;
  const layoutType = numericPagesPerSheet >= 2 ? "2+" : "1";

  const activePriceRecord = prices.find(
    (p) =>
      p.serviceType === serviceType &&
      p.colorMode === colorMode &&
      p.printSide === printSide &&
      (p.layout || "1") === layoutType
  ) || prices.find(
    (p) =>
      p.serviceType === serviceType &&
      p.colorMode === colorMode &&
      p.printSide === printSide &&
      (p.layout || "1") === "1"
  );

  const rate = activePriceRecord?.price ?? (
    colorMode === "color"
      ? (printSide === "double" ? (layoutType === "2+" ? 14 : 18) : (layoutType === "2+" ? 8 : 10))
      : (printSide === "double" ? (layoutType === "2+" ? 2.5 : 3.5) : (layoutType === "2+" ? 1.5 : 2))
  );
  
  const numericPages = pageCount === "" ? 0 : pageCount;
  const numericCopies = copies === "" ? 0 : copies;

  const printedSides = Math.ceil(numericPages / numericPagesPerSheet);
  const sheets = printSide === "double" ? Math.ceil(printedSides / 2) : printedSides;
  const totalAmount = rate * sheets * numericCopies;

  // Generate Receipt PDF
  const generateReceipt = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a6",
      });

      // Generate a mock tracking ID for manual store orders
      const randHex = Math.floor(100000 + Math.random() * 900000);
      const transactionId = `MAN-${randHex}`;

      // Draw card border
      doc.setDrawColor(26, 26, 26);
      doc.setLineWidth(1.5);
      doc.rect(2, 2, 101, 144);

      // Blue Header banner
      doc.setFillColor(0, 72, 143);
      doc.rect(2.75, 2.75, 99.5, 20, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("SHREE KRISHNA TELECOM", 52.5, 10, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("IN-STORE BILL & INVOICE", 52.5, 15, { align: "center" });

      // Yellow Tracking ID area
      doc.setFillColor(246, 196, 0);
      doc.rect(10, 28, 85, 22, "F");
      doc.setDrawColor(26, 26, 26);
      doc.setLineWidth(1);
      doc.rect(10, 28, 85, 22, "D");

      doc.setTextColor(85, 85, 85);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("TRANSACTION ID", 52.5, 34, { align: "center" });

      doc.setTextColor(26, 26, 26);
      doc.setFont("courier", "bold");
      doc.setFontSize(18);
      doc.text(transactionId, 52.5, 43, { align: "center" });

      // Red Price box
      doc.setFillColor(224, 22, 43);
      doc.rect(10, 54, 85, 12, "F");
      doc.rect(10, 54, 85, 12, "D");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`TOTAL AMOUNT: Rs. ${totalAmount.toFixed(2)}`, 52.5, 61.5, { align: "center" });

      // Details list
      doc.setTextColor(26, 26, 26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);

      let y = 74;
      const drawRow = (label: string, value: string) => {
        doc.setTextColor(136, 136, 136);
        doc.setFont("helvetica", "bold");
        doc.text(label.toUpperCase(), 12, y);

        doc.setTextColor(26, 26, 26);
        doc.setFont("helvetica", "bold");
        const valText = value.length > 25 ? value.substring(0, 22) + "..." : value;
        doc.text(valText, 93, y, { align: "right" });

        doc.setDrawColor(238, 238, 238);
        doc.setLineWidth(0.2);
        doc.line(10, y + 2, 95, y + 2);
        y += 7;
      };

      drawRow("Customer Name", customerName || "Walk-in Customer");
      drawRow("Service Type", serviceType === "study-material" ? "Study Material" : "Others");
      drawRow("Color Mode", colorMode === "color" ? "Full Color" : "Black & White");
      drawRow("Print Side", printSide === "double" ? "Double-sided" : "Single-sided");
      drawRow("Layout", Number(pagesPerSheet) > 1 ? `${pagesPerSheet}-in-1` : "Normal");
      drawRow("Doc Pages", `${pageCount} pages`);
      drawRow("Copies", String(copies));
      drawRow("Date", new Date().toLocaleDateString("en-IN"));
      if (notes) {
        drawRow("Notes", notes);
      }

      // Warning Footer Banner
      doc.setFillColor(26, 26, 26);
      doc.rect(10, 126, 85, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text("PAID AT THE STORE COUNTER", 52.5, 131.2, { align: "center" });

      doc.save(`SKT-Receipt-${transactionId}.pdf`);
    } catch (pdfErr) {
      console.error("PDF generation failed:", pdfErr);
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setServiceType("others");
    setColorMode("bw");
    setPrintSide("single");
    setPagesPerSheet(1);
    setPageCount(1);
    setCopies(1);
    setNotes("");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 border-b-4 border-bauhaus-black pb-4">
        <h1 className="text-4xl font-black uppercase flex items-center gap-3">
          <Calculator className="w-10 h-10" /> Store Calculator
        </h1>
        <button
          onClick={resetForm}
          className="flex items-center gap-2 border-4 border-bauhaus-black px-4 py-2 font-black uppercase hover:bg-gray-100 transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Reset Form
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border-4 border-bauhaus-black bg-bauhaus-white p-6 shadow-[5px_5px_0_0_#1a1a1a] space-y-4">
            <h2 className="text-lg font-black uppercase mb-3 border-b-2 border-bauhaus-black pb-1">
              Print Specification
            </h2>

            {/* Customer Details */}
            <div>
              <label className="block text-xs font-black uppercase mb-1 tracking-wider">Customer Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border-4 border-bauhaus-black p-3 pl-10 font-bold outline-none focus:border-bauhaus-blue"
                  placeholder="e.g. Ramesh Kumar"
                />
                <User className="absolute left-3.5 top-4 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Grid options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1 tracking-wider">Service Type</label>
                <select
                  value={serviceType}
                  onChange={(e: any) => setServiceType(e.target.value)}
                  className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none bg-white"
                >
                  <option value="others">Others / Standard</option>
                  <option value="study-material">Study Material</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1 tracking-wider">Color Mode</label>
                <select
                  value={colorMode}
                  onChange={(e: any) => setColorMode(e.target.value)}
                  className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none bg-white"
                >
                  <option value="bw">Black & White</option>
                  <option value="color">Color</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1 tracking-wider">Print Side</label>
                <select
                  value={printSide}
                  onChange={(e: any) => setPrintSide(e.target.value)}
                  className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none bg-white"
                >
                  <option value="single">Single Side</option>
                  <option value="double">Double Side</option>
                </select>
              </div>

              <div>
                <label className="flex justify-between items-center text-xs font-black uppercase mb-1 tracking-wider">
                  <span>Pages Per Sheet</span>
                  <span className="bg-bauhaus-black text-bauhaus-yellow px-2 py-0.5 font-black text-xs font-mono">{pagesPerSheet}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={pagesPerSheet === "" ? 1 : pagesPerSheet}
                    onChange={(e) => setPagesPerSheet(parseInt(e.target.value, 10))}
                    className="flex-1 accent-bauhaus-red h-2 bg-gray-200 border border-bauhaus-black rounded-none appearance-none cursor-pointer"
                  />
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={pagesPerSheet}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setPagesPerSheet("");
                      } else {
                        const parsed = parseInt(val, 10);
                        setPagesPerSheet(isNaN(parsed) ? "" : Math.max(1, Math.min(20, parsed)));
                      }
                    }}
                    onBlur={() => {
                      if (pagesPerSheet === "" || pagesPerSheet < 1) {
                        setPagesPerSheet(1);
                      } else if (pagesPerSheet > 20) {
                        setPagesPerSheet(20);
                      }
                    }}
                    className="w-16 border-4 border-bauhaus-black p-1 font-bold text-center outline-none bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1 tracking-wider">Total Pages</label>
                <input
                  type="number"
                  min="1"
                  value={pageCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setPageCount("");
                    } else {
                      const parsed = parseInt(val, 10);
                      setPageCount(isNaN(parsed) ? "" : parsed);
                    }
                  }}
                  onBlur={() => {
                    if (pageCount === "" || pageCount < 1) {
                      setPageCount(1);
                    }
                  }}
                  className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1 tracking-wider">Number of Copies</label>
                <input
                  type="number"
                  min="1"
                  value={copies}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setCopies("");
                    } else {
                      const parsed = parseInt(val, 10);
                      setCopies(isNaN(parsed) ? "" : parsed);
                    }
                  }}
                  onBlur={() => {
                    if (copies === "" || copies < 1) {
                      setCopies(1);
                    }
                  }}
                  className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-black uppercase mb-1 tracking-wider">Notes / Instructions</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue"
                placeholder="e.g. Spiral binding required"
              />
            </div>
          </div>
        </div>

        {/* Right column: Live calculation receipt panel */}
        <div>
          <div className="border-4 border-bauhaus-black bg-bauhaus-black text-bauhaus-white p-6 shadow-[5px_5px_0_0_#1a1a1a] sticky top-6">
            <h2 className="text-lg font-black uppercase mb-4 text-bauhaus-yellow tracking-widest text-center border-b border-gray-800 pb-2">
              Bill Preview
            </h2>

            <div className="space-y-4 font-bold text-sm">
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>RATE PER PAGE</span>
                <span className="font-mono text-white text-base">₹{rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>TOTAL SHEETS</span>
                <span className="font-mono text-white text-base">{sheets} sheets</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>COPIES</span>
                <span className="font-mono text-white text-base">×{copies}</span>
              </div>

              <div className="border-t border-gray-800 pt-4 text-center">
                <span className="text-xs text-bauhaus-yellow uppercase block mb-1">TOTAL AMOUNT</span>
                <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white bg-bauhaus-red border-2 border-bauhaus-black px-4 py-2 inline-block break-all max-w-full">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-gray-800 pt-4 space-y-3">
                <button
                  onClick={generateReceipt}
                  className="w-full flex items-center justify-center gap-2 bg-bauhaus-yellow text-bauhaus-black border-4 border-bauhaus-yellow p-3 font-black uppercase hover:bg-white hover:border-white transition-colors"
                >
                  <Download className="w-5 h-5" /> Generate Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
