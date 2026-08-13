"use client";

import { useState } from "react";
import { Search, Package, CheckCircle, Clock, XCircle } from "lucide-react";

type RequestStatus = "pending" | "processing" | "completed" | "failed";

interface TrackData {
  trackingId: string;
  fileName: string;
  status: RequestStatus;
  colorMode: string;
  createdAt: string;
}

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState("");
  const [result, setResult] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/track?id=${encodeURIComponent(trackingId.trim())}`);
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
  };

  const getStatusDisplay = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return { icon: <Clock className="w-12 h-12 text-bauhaus-yellow" />, text: "Pending / Waiting for Payment", bg: "bg-bauhaus-yellow/20", border: "border-bauhaus-yellow" };
      case "processing":
        return { icon: <Package className="w-12 h-12 text-bauhaus-blue" />, text: "Printing in Progress", bg: "bg-bauhaus-blue/20", border: "border-bauhaus-blue" };
      case "completed":
        return { icon: <CheckCircle className="w-12 h-12 text-green-600" />, text: "Completed / Ready for Pickup", bg: "bg-green-100", border: "border-green-600" };
      case "failed":
        return { icon: <XCircle className="w-12 h-12 text-bauhaus-red" />, text: "Failed / Cancelled", bg: "bg-bauhaus-red/20", border: "border-bauhaus-red" };
      default:
        return { icon: <Search className="w-12 h-12" />, text: "Unknown Status", bg: "bg-gray-100", border: "border-gray-500" };
    }
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
          <div className="mt-8 bg-bauhaus-red text-bauhaus-white font-bold p-4 border-4 border-bauhaus-black">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className={`border-4 border-bauhaus-black p-4 sm:p-8 bg-bauhaus-white bauhaus-shadow`}>
          <h2 className="text-2xl font-black uppercase mb-6 border-b-4 border-bauhaus-black pb-2">Status Result</h2>
          
          <div className={`border-4 ${getStatusDisplay(result.status).border} ${getStatusDisplay(result.status).bg} p-6 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 mb-8`}>
            <div className="shrink-0">
              {getStatusDisplay(result.status).icon}
            </div>
            <div>
              <p className="font-bold text-gray-600 uppercase text-sm mb-1">Current Status</p>
              <p className="text-xl sm:text-2xl font-black uppercase">{getStatusDisplay(result.status).text}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-medium text-base sm:text-lg">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">Tracking ID</p>
              <p className="font-mono font-bold text-lg sm:text-xl break-all">{result.trackingId}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">Date</p>
              <p className="text-sm sm:text-base">{new Date(result.createdAt).toLocaleString()}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-gray-500 text-sm font-bold uppercase">File Name</p>
              <p className="break-all font-semibold">{result.fileName}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">Color Mode</p>
              <p>{result.colorMode === "color" ? "Color Print" : "Black & White"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
