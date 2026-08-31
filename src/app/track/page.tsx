"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Package, CheckCircle, Clock, XCircle, IndianRupee, CreditCard, Store, AlertCircle } from "lucide-react";

type RequestStatus = "pending" | "processing" | "completed" | "failed";

interface TrackData {
  trackingId: string;
  fileName: string;
  status: RequestStatus;
  colorMode: string;
  copies: number;
  printSide: string;
  pagesPerSheet: number;
  paymentMethod: string;
  price: number;
  razorpayPaymentId: string | null;
  createdAt: string;
}

function TrackContent() {
  const searchParams = useSearchParams();
  const [trackingId, setTrackingId] = useState("");
  const [result, setResult] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTrackingData = useCallback(async (idToSearch: string) => {
    const cleanId = idToSearch.trim();
    if (!cleanId) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/track?id=${encodeURIComponent(cleanId)}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Tracking ID not found.");
        }
        throw new Error("Failed to fetch tracking data.");
      }
      
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const queryId = searchParams.get("id") || searchParams.get("trackingId");
    if (queryId) {
      const formattedId = queryId.trim().toUpperCase();
      setTrackingId(formattedId);
      fetchTrackingData(formattedId);
    }
  }, [searchParams, fetchTrackingData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrackingData(trackingId);
  };

  const getStatusDisplay = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return { icon: <Clock className="w-10 h-10 text-bauhaus-yellow" />, text: "Pending", sub: "Waiting to be processed", bg: "bg-bauhaus-yellow/20", border: "border-bauhaus-yellow" };
      case "processing":
        return { icon: <Package className="w-10 h-10 text-bauhaus-blue" />, text: "Printing in Progress", sub: "Your document is being printed", bg: "bg-bauhaus-blue/20", border: "border-bauhaus-blue" };
      case "completed":
        return { icon: <CheckCircle className="w-10 h-10 text-green-600" />, text: "Completed", sub: "Ready for pickup!", bg: "bg-green-50", border: "border-green-500" };
      case "failed":
        return { icon: <XCircle className="w-10 h-10 text-bauhaus-red" />, text: "Failed / Cancelled", sub: "Please contact the shop", bg: "bg-bauhaus-red/10", border: "border-bauhaus-red" };
      default:
        return { icon: <Search className="w-10 h-10" />, text: "Unknown", sub: "", bg: "bg-gray-100", border: "border-gray-400" };
    }
  };

  const isPaid = (data: TrackData): boolean => {
    const isOnlinePaid =
      (data.paymentMethod === "razorpay" || data.paymentMethod === "online") &&
      !!data.razorpayPaymentId;
    if (isOnlinePaid) return true;
    if (data.paymentMethod === "in-shop" && data.status === "completed") return true;
    return false;
  };

  const getPaymentLabel = (data: TrackData) => {
    if (data.paymentMethod === "razorpay" || data.paymentMethod === "online") return "Online (Razorpay)";
    if (data.paymentMethod === "in-shop") return "Pay at Shop";
    return data.paymentMethod;
  };

  const formatFileName = (name: string) => {
    if (name.startsWith("[")) {
      try { return JSON.parse(name).join(", "); } catch { return name; }
    }
    return name;
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 my-6 sm:my-12">
      <div className="border-4 border-bauhaus-black bg-bauhaus-white p-4 sm:p-8 bauhaus-shadow mb-8">
        <h1 className="text-3xl sm:text-4xl font-black uppercase border-b-4 border-bauhaus-black pb-4 mb-8">
          Track Your Print
        </h1>
        
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Enter Tracking ID (e.g., A1B2C3D4)"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
            className="flex-1 border-4 border-bauhaus-black p-4 font-bold text-lg sm:text-xl outline-none focus:border-bauhaus-blue w-full"
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="bg-bauhaus-red text-bauhaus-white border-4 border-bauhaus-black px-8 py-4 font-black uppercase hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-base sm:text-lg w-full sm:w-auto shrink-0"
          >
            {isLoading ? "Searching..." : <><Search /> Track</>}
          </button>
        </form>

        {error && (
          <div className="mt-6 bg-bauhaus-red text-bauhaus-white font-bold p-4 border-4 border-bauhaus-black flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {result && (() => {
        const statusInfo = getStatusDisplay(result.status);
        const paid = isPaid(result);
        return (
          <div className="border-4 border-bauhaus-black bg-bauhaus-white bauhaus-shadow divide-y-4 divide-bauhaus-black">

            {/* Status */}
            <div className={`p-6 ${statusInfo.bg} flex flex-col sm:flex-row items-center sm:items-start gap-4`}>
              <div className="shrink-0">{statusInfo.icon}</div>
              <div className="text-center sm:text-left">
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Print Status</p>
                <p className="text-2xl font-black uppercase">{statusInfo.text}</p>
                <p className="text-sm text-gray-600 mt-1">{statusInfo.sub}</p>
              </div>
            </div>

            {/* Payment */}
            <div className={`p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 ${paid ? "bg-green-50" : "bg-bauhaus-yellow/20"}`}>
              <div className="flex items-center gap-3">
                <IndianRupee className={`w-8 h-8 shrink-0 ${paid ? "text-green-600" : "text-yellow-600"}`} />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-0.5">Payment</p>
                  <p className={`text-xl font-black uppercase ${paid ? "text-green-700" : "text-bauhaus-black"}`}>
                    {paid ? "✓ Paid" : "⚠ Payment Pending"}
                  </p>
                  {!paid && result.paymentMethod === "in-shop" && (
                    <p className="text-sm text-gray-600 mt-0.5">Pay at the shop when you collect your print.</p>
                  )}
                </div>
              </div>
              <div className="sm:ml-auto text-left sm:text-right">
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-0.5">Amount</p>
                <p className="text-3xl font-black">{result.price > 0 ? `₹${result.price.toFixed(2)}` : "—"}</p>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Tracking ID</p>
                <p className="font-mono font-black text-lg break-all">{result.trackingId}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Date</p>
                <p className="font-semibold">{new Date(result.createdAt).toLocaleString()}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">File(s)</p>
                <p className="font-semibold break-all">{formatFileName(result.fileName)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Color Mode</p>
                <p className="font-semibold">{result.colorMode === "color" ? "🎨 Color Print" : "⬛ Black & White"}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Copies</p>
                <p className="font-semibold">{result.copies}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Print Side</p>
                <p className="font-semibold">{result.printSide === "double" ? "Double-sided" : "Single-sided"}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Pages per Sheet</p>
                <p className="font-semibold">{result.pagesPerSheet}</p>
              </div>
            </div>

            {/* Payment method */}
            <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                {result.paymentMethod === "razorpay" || result.paymentMethod === "online"
                  ? <CreditCard className="w-6 h-6 text-bauhaus-blue shrink-0" />
                  : <Store className="w-6 h-6 shrink-0" />}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-0.5">Payment Method</p>
                  <p className="font-bold">{getPaymentLabel(result)}</p>
                </div>
              </div>
              {result.razorpayPaymentId && (
                <div className="sm:ml-auto min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-0.5">Payment ID</p>
                  <p className="font-mono text-sm break-all">{result.razorpayPaymentId}</p>
                </div>
              )}
            </div>

          </div>
        );
      })()}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto p-8 my-12 text-center font-black uppercase text-gray-500 animate-pulse">
        Loading Tracker...
      </div>
    }>
      <TrackContent />
    </Suspense>
  );
}

