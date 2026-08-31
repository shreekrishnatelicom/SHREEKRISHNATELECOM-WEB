"use client";

import { useState, useEffect } from "react";
import { Calculator, Download, User, RefreshCw, Plus, Trash2, FileText, AlertCircle, Percent, CheckCircle2, Clock } from "lucide-react";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";

interface PrintingPrice {
  id: string;
  serviceType: string;
  colorMode: string;
  printSide: string;
  layout?: string;
  price: number;
}

interface PrintItem {
  id: string;
  docName: string; // Optional document name input
  serviceType: "study-material" | "others";
  colorMode: "bw" | "color";
  printSide: "single" | "double";
  pagesPerSheet: number | "";
  pageCount: number | "";
  copies: number | "";
  discountPercent: number | ""; // Optional per-item discount %
  notes: string;
}

export default function StoreCalculator() {
  const [prices, setPrices] = useState<PrintingPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shopSettings, setShopSettings] = useState<{ location?: string; phone?: string; email?: string }>({});

  // Customer Details & Validation
  const [customerName, setCustomerName] = useState("");
  const [nameError, setNameError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"Paid" | "Pending / Not Paid">("Paid");

  // Overall Discount Percentage (Optional)
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number | "">("");

  // Document items array for multi-print support
  const [items, setItems] = useState<PrintItem[]>([
    {
      id: "item-1",
      docName: "",
      serviceType: "others",
      colorMode: "bw",
      printSide: "single",
      pagesPerSheet: 1,
      pageCount: 1,
      copies: 1,
      discountPercent: "",
      notes: "",
    },
  ]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [priceRes, settingsRes] = await Promise.all([
        fetch("/api/admin/printing-prices"),
        fetch("/api/settings"),
      ]);
      if (priceRes.ok) setPrices(await priceRes.json());
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setShopSettings({ location: sData.location, phone: sData.phone, email: sData.email });
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const addItem = () => {
    const nextIndex = items.length + 1;
    const newItem: PrintItem = {
      id: `item-${Date.now()}-${nextIndex}`,
      docName: "",
      serviceType: "others",
      colorMode: "bw",
      printSide: "single",
      pagesPerSheet: 1,
      pageCount: 1,
      copies: 1,
      discountPercent: "",
      notes: "",
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = <K extends keyof PrintItem>(id: string, key: K, value: PrintItem[K]) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  // Price & Discount calculation per item
  const getItemCalculation = (item: PrintItem) => {
    const numericPagesPerSheet = item.pagesPerSheet === "" ? 1 : item.pagesPerSheet;
    const layoutType = numericPagesPerSheet >= 2 ? "2+" : "1";

    const activePriceRecord =
      prices.find(
        (p) =>
          p.serviceType === item.serviceType &&
          p.colorMode === item.colorMode &&
          p.printSide === item.printSide &&
          (p.layout || "1") === layoutType
      ) ||
      prices.find(
        (p) =>
          p.serviceType === item.serviceType &&
          p.colorMode === item.colorMode &&
          p.printSide === item.printSide &&
          (p.layout || "1") === "1"
      );

    const rate =
      activePriceRecord?.price ??
      (item.colorMode === "color"
        ? item.printSide === "double"
          ? layoutType === "2+"
            ? 14
            : 18
          : layoutType === "2+"
          ? 8
          : 10
        : item.printSide === "double"
        ? layoutType === "2+"
          ? 2.5
          : 3.5
        : layoutType === "2+"
        ? 1.5
        : 2);

    const numericPages = item.pageCount === "" ? 0 : item.pageCount;
    const numericCopies = item.copies === "" ? 0 : item.copies;

    const printedSides = Math.ceil(numericPages / numericPagesPerSheet);
    const sheets = item.printSide === "double" ? Math.ceil(printedSides / 2) : printedSides;
    
    const grossAmount = rate * sheets * numericCopies;
    const itemDiscPct = item.discountPercent === "" ? 0 : Math.max(0, Math.min(100, Number(item.discountPercent)));
    const itemDiscAmount = (grossAmount * itemDiscPct) / 100;
    const netAmount = Math.max(0, grossAmount - itemDiscAmount);

    return { rate, sheets, numericCopies, grossAmount, itemDiscPct, itemDiscAmount, netAmount };
  };

  // Grand totals across all items
  const rawSubtotal = items.reduce((sum, item) => sum + getItemCalculation(item).grossAmount, 0);
  const totalItemDiscount = items.reduce((sum, item) => sum + getItemCalculation(item).itemDiscAmount, 0);
  const subtotalAfterItemDiscounts = rawSubtotal - totalItemDiscount;

  const validOverallDiscPct = overallDiscountPercent === "" ? 0 : Math.max(0, Math.min(100, Number(overallDiscountPercent)));
  const overallDiscountAmount = (subtotalAfterItemDiscounts * validOverallDiscPct) / 100;
  const grandTotal = Math.max(0, subtotalAfterItemDiscounts - overallDiscountAmount);
  const totalDiscountAmount = totalItemDiscount + overallDiscountAmount;

  // Generate Receipt PDF
  const generateReceipt = async () => {
    if (!customerName.trim()) {
      setNameError("Customer Name is mandatory for generating offline receipt!");
      return;
    }
    setNameError("");

    try {
      const mappedItems = items.map((item, idx) => {
        const effectiveDocName = item.docName.trim() || `print-${idx + 1}`;
        const calc = getItemCalculation(item);
        const discTag = calc.itemDiscPct > 0 ? ` (${calc.itemDiscPct}% Disc)` : "";
        return {
          description: `${effectiveDocName} (${
            item.serviceType === "study-material" ? "Study Material" : "Standard Print"
          })`,
          specs: `${item.colorMode === "color" ? "Full Color" : "B&W"}, ${
            item.printSide === "double" ? "Double Side" : "Single Side"
          }${Number(item.pagesPerSheet) > 1 ? `, ${item.pagesPerSheet}-in-1` : ""}${discTag}`,
          quantity: `${item.pageCount || 1} pgs x ${item.copies || 1} qty`,
          amount: calc.netAmount,
        };
      });

      const itemSpecs = items.map((item, idx) => {
        const effectiveDocName = item.docName.trim() || `print-${idx + 1}`;
        const calc = getItemCalculation(item);
        return {
          docName: effectiveDocName,
          serviceType: item.serviceType === "study-material" ? "Study Material" : "Standard Print",
          colorMode: item.colorMode === "color" ? "Full Color" : "Black & White (Standard)",
          printSide: item.printSide === "double" ? "Double Side (Print on both sides)" : "Single Side (Print on one side only)",
          pagesPerSheet: `${item.pagesPerSheet || 1} Page / Sheet`,
          pageCount: item.pageCount || 1,
          copies: item.copies || 1,
          discountPercent: calc.itemDiscPct > 0 ? `${calc.itemDiscPct}%` : undefined,
          notes: item.notes || undefined,
        };
      });

      const allNotes = items
        .map((i, idx) => {
          const name = i.docName.trim() || `print-${idx + 1}`;
          return i.notes ? `${name}: ${i.notes}` : null;
        })
        .filter(Boolean)
        .join(" | ");

      await generateInvoicePDF({
        invoiceType: "STORE RECEIPT",
        isOffline: true,
        hideShopEmail: true,
        showSignature: true,
        showCustomerSignature: false,
        customerName: customerName.trim(),
        paymentStatus: paymentStatus,
        paymentMethod: "offline",
        shopAddress: shopSettings.location,
        shopPhone: shopSettings.phone,
        shopEmail: shopSettings.email,
        items: mappedItems,
        itemSpecs: itemSpecs,
        subtotal: rawSubtotal,
        itemDiscountTotal: totalItemDiscount > 0 ? totalItemDiscount : undefined,
        overallDiscountPercent: validOverallDiscPct > 0 ? validOverallDiscPct : undefined,
        discount: totalDiscountAmount > 0 ? totalDiscountAmount : undefined,
        totalAmount: grandTotal,
        notes: allNotes || undefined,
      });
    } catch (pdfErr) {
      console.error("PDF generation failed:", pdfErr);
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setNameError("");
    setPaymentStatus("Paid");
    setOverallDiscountPercent("");
    setItems([
      {
        id: "item-1",
        docName: "",
        serviceType: "others",
        colorMode: "bw",
        printSide: "single",
        pagesPerSheet: 1,
        pageCount: 1,
        copies: 1,
        discountPercent: "",
        notes: "",
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b-4 border-bauhaus-black pb-4">
        <h1 className="text-3xl sm:text-4xl font-black uppercase flex items-center gap-3">
          <Calculator className="w-9 h-9 sm:w-10 sm:h-10 text-bauhaus-blue" /> Store Calculator
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={addItem}
            className="flex items-center gap-2 bg-bauhaus-yellow text-bauhaus-black border-4 border-bauhaus-black px-4 py-2 font-black uppercase hover:bg-white transition-colors text-sm shadow-[3px_3px_0_0_#1a1a1a]"
          >
            <Plus className="w-4 h-4" /> Add Print Document
          </button>
          <button
            onClick={resetForm}
            className="flex items-center gap-2 border-4 border-bauhaus-black px-4 py-2 font-black uppercase hover:bg-gray-100 transition-colors text-sm shadow-[3px_3px_0_0_#1a1a1a]"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Customer Info & Document Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details Box */}
          <div className="border-4 border-bauhaus-black bg-bauhaus-white p-6 shadow-[5px_5px_0_0_#1a1a1a] space-y-4">
            <h2 className="text-lg font-black uppercase border-b-2 border-bauhaus-black pb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-bauhaus-blue" /> Offline Customer & Payment Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1 tracking-wider">
                  Customer Name <span className="text-bauhaus-red">* Required</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (nameError) setNameError("");
                    }}
                    className={`w-full border-4 ${
                      nameError ? "border-bauhaus-red bg-red-50" : "border-bauhaus-black"
                    } p-3 pl-10 font-bold outline-none focus:border-bauhaus-blue`}
                    placeholder="e.g. Ramesh Kumar"
                  />
                  <User className="absolute left-3.5 top-4 w-5 h-5 text-gray-400" />
                </div>
                {nameError && (
                  <div className="flex items-center gap-1.5 text-bauhaus-red text-xs font-black mt-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{nameError}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1 tracking-wider">
                  Payment Status <span className="text-gray-400 font-normal">(Default: Paid)</span>
                </label>
                <div className="relative">
                  <select
                    value={paymentStatus}
                    onChange={(e: any) => setPaymentStatus(e.target.value)}
                    className={`w-full border-4 border-bauhaus-black p-3 font-bold outline-none bg-white ${
                      paymentStatus === "Paid" ? "text-green-700" : "text-amber-600"
                    }`}
                  >
                    <option value="Paid">Paid (Default)</option>
                    <option value="Pending / Not Paid">Pending / Not Paid</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Document Print Items List */}
          {items.map((item, index) => {
            const defaultDocName = `print-${index + 1}`;
            const calc = getItemCalculation(item);

            return (
              <div
                key={item.id}
                className="border-4 border-bauhaus-black bg-bauhaus-white p-6 shadow-[5px_5px_0_0_#1a1a1a] space-y-4"
              >
                {/* Item Header */}
                <div className="flex items-center justify-between border-b-2 border-bauhaus-black pb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-bauhaus-black text-bauhaus-yellow px-2.5 py-1 text-xs font-black uppercase">
                      Doc #{index + 1}
                    </span>
                    <h3 className="font-black uppercase text-base truncate max-w-[200px] sm:max-w-xs">
                      {item.docName.trim() || defaultDocName}
                    </h3>
                  </div>

                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="flex items-center gap-1 text-bauhaus-red hover:bg-red-50 p-1.5 border-2 border-bauhaus-red font-black text-xs uppercase transition-colors"
                      title="Remove Document"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>

                {/* Optional Document Name */}
                <div>
                  <label className="block text-xs font-black uppercase mb-1 tracking-wider">
                    Document Name / Type <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={item.docName}
                      onChange={(e) => updateItem(item.id, "docName", e.target.value)}
                      className="w-full border-4 border-bauhaus-black p-3 pl-10 font-bold outline-none focus:border-bauhaus-blue"
                      placeholder={`Auto name: ${defaultDocName}`}
                    />
                    <FileText className="absolute left-3.5 top-4 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase mb-1 tracking-wider">Service Type</label>
                    <select
                      value={item.serviceType}
                      onChange={(e: any) => updateItem(item.id, "serviceType", e.target.value)}
                      className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none bg-white"
                    >
                      <option value="others">Others / Standard</option>
                      <option value="study-material">Study Material</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase mb-1 tracking-wider">Color Mode</label>
                    <select
                      value={item.colorMode}
                      onChange={(e: any) => updateItem(item.id, "colorMode", e.target.value)}
                      className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none bg-white"
                    >
                      <option value="bw">Black & White</option>
                      <option value="color">Color</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase mb-1 tracking-wider">Print Side</label>
                    <select
                      value={item.printSide}
                      onChange={(e: any) => updateItem(item.id, "printSide", e.target.value)}
                      className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none bg-white"
                    >
                      <option value="single">Single Side</option>
                      <option value="double">Double Side</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex justify-between items-center text-xs font-black uppercase mb-1 tracking-wider">
                      <span>Pages Per Sheet</span>
                      <span className="bg-bauhaus-black text-bauhaus-yellow px-2 py-0.5 font-black text-xs font-mono">
                        {item.pagesPerSheet || 1}
                      </span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={item.pagesPerSheet === "" ? 1 : item.pagesPerSheet}
                        onChange={(e) => updateItem(item.id, "pagesPerSheet", parseInt(e.target.value, 10))}
                        className="flex-1 accent-bauhaus-red h-2 bg-gray-200 border border-bauhaus-black rounded-none appearance-none cursor-pointer"
                      />
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={item.pagesPerSheet}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            updateItem(item.id, "pagesPerSheet", "");
                          } else {
                            const parsed = parseInt(val, 10);
                            updateItem(
                              item.id,
                              "pagesPerSheet",
                              isNaN(parsed) ? "" : Math.max(1, Math.min(20, parsed))
                            );
                          }
                        }}
                        onBlur={() => {
                          if (item.pagesPerSheet === "" || (item.pagesPerSheet as number) < 1) {
                            updateItem(item.id, "pagesPerSheet", 1);
                          } else if ((item.pagesPerSheet as number) > 20) {
                            updateItem(item.id, "pagesPerSheet", 20);
                          }
                        }}
                        className="w-16 border-4 border-bauhaus-black p-1 font-bold text-center outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Counts & Item Discount */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase mb-1 tracking-wider">Total Pages</label>
                    <input
                      type="number"
                      min="1"
                      value={item.pageCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          updateItem(item.id, "pageCount", "");
                        } else {
                          const parsed = parseInt(val, 10);
                          updateItem(item.id, "pageCount", isNaN(parsed) ? "" : parsed);
                        }
                      }}
                      onBlur={() => {
                        if (item.pageCount === "" || (item.pageCount as number) < 1) {
                          updateItem(item.id, "pageCount", 1);
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
                      value={item.copies}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          updateItem(item.id, "copies", "");
                        } else {
                          const parsed = parseInt(val, 10);
                          updateItem(item.id, "copies", isNaN(parsed) ? "" : parsed);
                        }
                      }}
                      onBlur={() => {
                        if (item.copies === "" || (item.copies as number) < 1) {
                          updateItem(item.id, "copies", 1);
                        }
                      }}
                      className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase mb-1 tracking-wider">
                      Item Discount (%) <span className="text-gray-400 font-normal">(Opt)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPercent}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            updateItem(item.id, "discountPercent", "");
                          } else {
                            const parsed = parseFloat(val);
                            updateItem(
                              item.id,
                              "discountPercent",
                              isNaN(parsed) ? "" : Math.max(0, Math.min(100, parsed))
                            );
                          }
                        }}
                        placeholder="0%"
                        className="w-full border-4 border-bauhaus-black p-3 pr-8 font-bold outline-none focus:border-bauhaus-blue"
                      />
                      <Percent className="absolute right-3 top-4 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Item Summary & Subtotal */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-100 p-2.5 border-2 border-bauhaus-black text-xs font-bold gap-2">
                  <span>
                    Rate: ₹{calc.rate.toFixed(2)}/pg | {calc.sheets} sheets × {calc.numericCopies} copies
                  </span>
                  <div className="flex items-center gap-2 font-black font-mono text-sm">
                    {calc.itemDiscPct > 0 ? (
                      <>
                        <span className="line-through text-gray-400 text-xs">₹{calc.grossAmount.toFixed(2)}</span>
                        <span className="text-bauhaus-red text-xs">(-{calc.itemDiscPct}%)</span>
                        <span className="text-bauhaus-blue text-base">₹{calc.netAmount.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-bauhaus-blue text-base">Subtotal: ₹{calc.netAmount.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-black uppercase mb-1 tracking-wider">
                    Notes / Instructions <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={item.notes}
                    onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                    rows={2}
                    className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue"
                    placeholder="e.g. Spiral binding required"
                  />
                </div>
              </div>
            );
          })}

          {/* Add Item Action Card */}
          <button
            onClick={addItem}
            className="w-full border-4 border-dashed border-bauhaus-black bg-bauhaus-yellow/20 hover:bg-bauhaus-yellow/40 p-4 font-black uppercase flex items-center justify-center gap-2 transition-colors text-sm shadow-[3px_3px_0_0_#1a1a1a]"
          >
            <Plus className="w-5 h-5" /> Add Another Print Document
          </button>
        </div>

        {/* Right column: Live calculation receipt panel */}
        <div>
          <div className="border-4 border-bauhaus-black bg-bauhaus-black text-bauhaus-white p-6 shadow-[5px_5px_0_0_#1a1a1a] sticky top-6 space-y-4">
            <h2 className="text-lg font-black uppercase text-bauhaus-yellow tracking-widest text-center border-b border-gray-800 pb-2">
              Bill Preview
            </h2>

            {/* Customer & Status Summary */}
            <div className="border-b border-gray-800 pb-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest block">CUSTOMER</span>
                <span className="font-black text-white text-sm truncate max-w-[150px]">
                  {customerName.trim() || <span className="text-bauhaus-red italic">Name Required</span>}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest block">STATUS</span>
                <span className={`text-xs font-black px-2 py-0.5 border ${
                  paymentStatus === "Paid"
                    ? "bg-green-950 text-green-400 border-green-700"
                    : "bg-amber-950 text-amber-400 border-amber-700"
                }`}>
                  {paymentStatus === "Paid" ? "✓ PAID" : "⏱ PENDING"}
                </span>
              </div>
            </div>

            {/* Document Breakdown */}
            <div className="space-y-3 font-bold text-xs max-h-52 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const docName = item.docName.trim() || `print-${idx + 1}`;
                const calc = getItemCalculation(item);
                return (
                  <div key={item.id} className="border-b border-gray-800/60 pb-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-bauhaus-yellow font-black truncate max-w-[130px]">{docName}</span>
                      <span className="font-mono text-white">₹{calc.netAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>{calc.sheets} sheets x {calc.numericCopies} qty</span>
                      {calc.itemDiscPct > 0 ? (
                        <span className="text-bauhaus-red">(-{calc.itemDiscPct}%)</span>
                      ) : (
                        <span>₹{calc.rate.toFixed(2)}/pg</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Totals */}
            <div className="border-t border-gray-800 pt-3 space-y-2 text-xs font-bold">
              <div className="flex justify-between text-gray-300">
                <span>SUBTOTAL:</span>
                <span className="font-mono">₹{rawSubtotal.toFixed(2)}</span>
              </div>

              {totalItemDiscount > 0 && (
                <div className="flex justify-between text-bauhaus-red">
                  <span>ITEM DISCOUNTS:</span>
                  <span className="font-mono">-₹{totalItemDiscount.toFixed(2)}</span>
                </div>
              )}

              {/* Overall Discount Input */}
              <div className="pt-2 border-t border-gray-800">
                <label className="block text-[11px] text-bauhaus-yellow uppercase font-black mb-1">
                  Overall Bill Discount (%) <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={overallDiscountPercent}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setOverallDiscountPercent("");
                      } else {
                        const parsed = parseFloat(val);
                        setOverallDiscountPercent(isNaN(parsed) ? "" : Math.max(0, Math.min(100, parsed)));
                      }
                    }}
                    placeholder="e.g. 10%"
                    className="w-full bg-gray-900 border-2 border-gray-700 text-white p-2 pr-8 font-bold outline-none focus:border-bauhaus-yellow text-xs"
                  />
                  <Percent className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>

              {validOverallDiscPct > 0 && (
                <div className="flex justify-between text-bauhaus-red">
                  <span>OVERALL DISCOUNT ({validOverallDiscPct}%):</span>
                  <span className="font-mono">-₹{overallDiscountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="border-t border-gray-800 pt-4 text-center">
              <span className="text-xs text-bauhaus-yellow uppercase block mb-1 font-black tracking-wider">
                GRAND TOTAL ({items.length} {items.length === 1 ? "Doc" : "Docs"})
              </span>
              <span className="text-xl sm:text-2xl md:text-3xl font-black text-white bg-bauhaus-red border-2 border-bauhaus-black px-4 py-2 inline-block break-all max-w-full shadow-[2px_2px_0_0_#fff]">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            {/* Action */}
            <div className="border-t border-gray-800 pt-4">
              <button
                onClick={generateReceipt}
                className="w-full flex items-center justify-center gap-2 bg-bauhaus-yellow text-bauhaus-black border-4 border-bauhaus-yellow p-3.5 font-black uppercase hover:bg-white hover:border-white transition-colors text-sm shadow-[3px_3px_0_0_#fff]"
              >
                <Download className="w-5 h-5" /> Generate Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
