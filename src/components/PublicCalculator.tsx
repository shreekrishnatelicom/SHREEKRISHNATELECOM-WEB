"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

interface PrintingPrice {
  id: string;
  serviceType: string;
  colorMode: string;
  printSide: string;
  layout?: string;
  price: number;
}

interface PublicCalculatorProps {
  prices: PrintingPrice[];
}

export default function PublicCalculator({ prices }: PublicCalculatorProps) {
  const [serviceType, setServiceType] = useState<"study-material" | "others">("others");
  const [colorMode, setColorMode] = useState<"bw" | "color">("bw");
  const [printSide, setPrintSide] = useState<"single" | "double">("single");
  const [pagesPerSheet, setPagesPerSheet] = useState(1);
  const [pageCount, setPageCount] = useState<number | "">(1);
  const [copies, setCopies] = useState<number | "">(1);

  const layoutType = pagesPerSheet >= 2 ? "2+" : "1";

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
  
  const numericPageCount = pageCount === "" ? 0 : pageCount;
  const numericCopies = copies === "" ? 0 : copies;
  
  const printedSides = Math.ceil(numericPageCount / pagesPerSheet);
  const sheets = printSide === "double" ? Math.ceil(printedSides / 2) : printedSides;
  const totalAmount = rate * sheets * numericCopies;

  return (
    <div className="border-4 border-bauhaus-black bg-bauhaus-white p-6 text-bauhaus-black mt-8 shadow-[4px_4px_0_0_#1a1a1a]" suppressHydrationWarning>
      <div className="flex items-center gap-2 border-b-2 border-bauhaus-black pb-2 mb-4">
        <Calculator className="w-5 h-5 text-bauhaus-red" />
        <h3 className="font-black uppercase text-base tracking-wider">Quick Price Estimator</h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Service Type */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 tracking-wider text-gray-500">Service Category</label>
            <select
              value={serviceType}
              onChange={(e: any) => setServiceType(e.target.value)}
              className="w-full border-2 border-bauhaus-black p-2 font-bold outline-none text-xs bg-white"
              suppressHydrationWarning
            >
              <option value="others">Others / Standard</option>
              <option value="study-material">Study Material</option>
            </select>
          </div>

          {/* Color Mode */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 tracking-wider text-gray-500">Color Mode</label>
            <select
              value={colorMode}
              onChange={(e: any) => setColorMode(e.target.value)}
              className="w-full border-2 border-bauhaus-black p-2 font-bold outline-none text-xs bg-white"
              suppressHydrationWarning
            >
              <option value="bw">Black & White</option>
              <option value="color">Full Color</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Print Side */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 tracking-wider text-gray-500">Print Side</label>
            <select
              value={printSide}
              onChange={(e: any) => setPrintSide(e.target.value)}
              className="w-full border-2 border-bauhaus-black p-2 font-bold outline-none text-xs bg-white"
              suppressHydrationWarning
            >
              <option value="single">Single Sided</option>
              <option value="double">Double Sided</option>
            </select>
          </div>

          {/* Pages per set / sheet (1-20 slider) */}
          <div>
            <label className="flex justify-between items-center text-[10px] font-black uppercase mb-1 tracking-wider text-gray-500">
              <span>Pages Per Sheet</span>
              <span className="bg-bauhaus-black text-bauhaus-yellow px-1 font-black text-xs font-mono">{pagesPerSheet}</span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={pagesPerSheet}
              onChange={(e) => setPagesPerSheet(parseInt(e.target.value, 10))}
              className="w-full accent-bauhaus-red h-2 bg-gray-200 border border-bauhaus-black rounded-none appearance-none cursor-pointer"
              suppressHydrationWarning
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Total Pages */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 tracking-wider text-gray-500">Document Pages</label>
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
              className="w-full border-2 border-bauhaus-black p-2 font-bold outline-none text-xs"
              suppressHydrationWarning
            />
          </div>

          {/* Copies */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 tracking-wider text-gray-500">Copies</label>
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
              className="w-full border-2 border-bauhaus-black p-2 font-bold outline-none text-xs"
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* Live Calculation Output */}
        <div className="bg-bauhaus-black text-white p-4 border-2 border-bauhaus-black text-center mt-2 flex flex-col items-center w-full">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 text-[10px] uppercase font-bold text-gray-400 mb-2 font-mono">
            <span>Rate: ₹{rate.toFixed(2)}</span>
            <span>Sheets: {sheets}</span>
            <span>Copies: {copies}</span>
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-black text-bauhaus-yellow break-all max-w-full">
            Est. Price: ₹{totalAmount.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
