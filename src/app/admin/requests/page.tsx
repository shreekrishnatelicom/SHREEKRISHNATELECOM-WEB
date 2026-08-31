"use client";

import { useState, useEffect } from "react";
import { Download, CheckCircle, RefreshCcw, XCircle, Eye, Trash2, User, Search, X } from "lucide-react";

type Status = "pending" | "processing" | "completed" | "failed" | "pending-payment";

const parsePrintRequestNotes = (notes: string | null | undefined) => {
  if (!notes) return { customerName: "Unknown", customerEmail: "", customerPhone: "", clientNotes: "" };
  
  const nameMatch = notes.match(/\[Customer Name:\s*([^\]]+)\]/);
  const emailMatch = notes.match(/\[Customer Email:\s*([^\]]+)\]/);
  const phoneMatch = notes.match(/\[Customer Phone:\s*([^\]]+)\]/);
  
  let clientNotes = notes;
  if (nameMatch) clientNotes = clientNotes.replace(nameMatch[0], "");
  if (emailMatch) clientNotes = clientNotes.replace(emailMatch[0], "");
  if (phoneMatch) clientNotes = clientNotes.replace(phoneMatch[0], "");
  clientNotes = clientNotes.trim();
  
  if (clientNotes.startsWith("Notes:")) {
    clientNotes = clientNotes.substring(6).trim();
  } else if (clientNotes.startsWith("\nNotes:")) {
    clientNotes = clientNotes.substring(7).trim();
  }
  
  return {
    customerName: nameMatch ? nameMatch[1].trim() : "Unknown",
    customerEmail: emailMatch ? emailMatch[1].trim() : "",
    customerPhone: phoneMatch ? phoneMatch[1].trim() : "",
    clientNotes: clientNotes
  };
};

interface PrintRequest {
  id: string;
  trackingId: string;
  fileName: string;
  fileUrl: string;
  status: Status;
  colorMode: string;
  copies: number;
  printSide: string;
  pagesPerSheet: number;
  serviceType?: string;
  notes?: string | null;
  price?: number | null;
  paymentMethod?: string;
  razorpayPaymentId?: string | null;
  couponCode?: string | null;
  discountPercent?: number | null;
  createdAt: string;
}


const STATUS_CFG: Record<Status, { cls: string; label: string }> = {
  pending:            { cls: "bg-bauhaus-yellow text-bauhaus-black border-bauhaus-black", label: "Pending" },
  processing:         { cls: "bg-bauhaus-blue text-white border-bauhaus-black",           label: "Processing" },
  completed:          { cls: "bg-green-500 text-white border-green-700",                  label: "Completed" },
  failed:             { cls: "bg-bauhaus-red text-white border-bauhaus-black",            label: "Failed" },
  "pending-payment":  { cls: "bg-orange-200 text-orange-800 border-orange-400 font-medium", label: "Pending Payment" },
};

const parseFiles = (fileUrl: string, fileName: string) => {
  try {
    if (fileUrl.startsWith("[")) {
      const urls: string[] = JSON.parse(fileUrl);
      const names: string[] = JSON.parse(fileName);
      return urls.map((url, idx) => ({
        url,
        name: names[idx] || `File ${idx + 1}`
      }));
    }
  } catch (e) {}
  return [{ url: fileUrl, name: fileName }];
};

export default function AdminRequests() {
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Helper to group requests by date categories
  const groupRequestsByDate = (reqs: PrintRequest[]) => {
    const groups: {
      today: PrintRequest[];
      yesterday: PrintRequest[];
      older: PrintRequest[];
    } = {
      today: [],
      yesterday: [],
      older: [],
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    reqs.forEach((req) => {
      const reqDate = new Date(req.createdAt);
      if (reqDate >= todayStart) {
        groups.today.push(req);
      } else if (reqDate >= yesterdayStart) {
        groups.yesterday.push(req);
      } else {
        groups.older.push(req);
      }
    });

    return groups;
  };

  const handleDeleteFile = async (reqId: string, fileUrl: string) => {
    const fileId = fileUrl.split("/").pop();
    if (!fileId || !/^[0-9a-fA-F]{24}$/.test(fileId)) return;

    if (!confirm("Are you sure you want to delete this file from the server? This action cannot be undone, but request history will be saved.")) {
      return;
    }

    setIsDeleting(reqId);
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setRequests((prev) => prev.map((r) => {
          if (r.id !== reqId) return r;
          let newFileUrl = r.fileUrl;
          let newFileName = r.fileName;
          try {
            if (r.fileUrl.startsWith("[")) {
              const urls: string[] = JSON.parse(r.fileUrl);
              const names: string[] = JSON.parse(r.fileName);
              const filteredIndices = urls
                .map((url, idx) => ({ url, idx }))
                .filter(item => !item.url.includes(fileId))
                .map(item => item.idx);
              if (filteredIndices.length === 0) {
                newFileUrl = "/api/files/deleted";
                newFileName = "deleted";
              } else {
                newFileUrl = JSON.stringify(filteredIndices.map(idx => urls[idx]));
                newFileName = JSON.stringify(filteredIndices.map(idx => names[idx]));
              }
            } else {
              newFileUrl = "/api/files/deleted";
              newFileName = "deleted";
            }
          } catch (e) {
            newFileUrl = "/api/files/deleted";
            newFileName = "deleted";
          }
          return { ...r, fileUrl: newFileUrl, fileName: newFileName };
        }));
        window.dispatchEvent(new CustomEvent("storage-update"));
      } else {
        alert("Failed to delete file.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete file.");
    } finally {
      setIsDeleting(null);
    }
  };

  const load = async () => {
    setIsLoading(true);
    const res = await fetch("/api/requests");
    if (res.ok) {
      const data: PrintRequest[] = await res.json();
      setRequests(data.filter((r) => !r.notes?.includes("[Service Request:")));
    }
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: Status) => {
    setIsUpdating(id);
    const res = await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    setIsUpdating(null);
  };

  const filtered = requests.filter((req) => {
    const statusMatch = filter === "all" || req.status === filter;
    if (!statusMatch) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const { customerName, customerEmail, customerPhone, clientNotes } = parsePrintRequestNotes(req.notes);

    return (
      req.trackingId.toLowerCase().includes(query) ||
      req.fileName.toLowerCase().includes(query) ||
      customerName.toLowerCase().includes(query) ||
      customerEmail.toLowerCase().includes(query) ||
      customerPhone.toLowerCase().includes(query) ||
      (clientNotes && clientNotes.toLowerCase().includes(query)) ||
      (req.serviceType && req.serviceType.toLowerCase().includes(query))
    );
  });

  const grouped = groupRequestsByDate(filtered);
  const hasResults = grouped.today.length > 0 || grouped.yesterday.length > 0 || grouped.older.length > 0;

  const renderRequestItem = (req: PrintRequest) => {
    const cfg = STATUS_CFG[req.status] || { cls: "bg-gray-100 text-gray-800 border-gray-300", label: req.status || "Unknown" };
    const { customerName, customerEmail, customerPhone, clientNotes } = parsePrintRequestNotes(req.notes);
    return (
      <div key={req.id} className="bg-white border-4 border-bauhaus-black p-5 shadow-[3px_3px_0_0_#1a1a1a]">
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <span className="font-mono font-black text-xl">{req.trackingId}</span>
          <span className={`px-2 py-0.5 text-xs font-black uppercase border-2 ${cfg.cls}`}>{cfg.label}</span>
          <span className={`px-2 py-0.5 text-xs font-bold border border-gray-300 ${req.colorMode === "color" ? "bg-bauhaus-yellow" : "bg-gray-100"}`}>
            {req.colorMode === "color" ? "Color" : "B&W"}
          </span>
          {req.copies > 1 && <span className="px-2 py-0.5 text-xs font-bold bg-bauhaus-blue text-white">×{req.copies}</span>}
          <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 border border-gray-300 capitalize">{req.printSide}-sided</span>
          {req.pagesPerSheet > 1 && <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 border border-gray-300">{req.pagesPerSheet}-in-1</span>}
          <span className={`px-2 py-0.5 text-xs font-black uppercase border border-bauhaus-black ${
            req.serviceType === "study-material" ? "bg-bauhaus-yellow text-black" : "bg-bauhaus-blue text-white"
          }`}>
            {req.serviceType === "study-material" ? "Study Material" : "Others"}
          </span>
          <span className="px-2 py-0.5 text-xs font-bold bg-bauhaus-yellow border border-bauhaus-black flex items-center gap-1 text-black font-black">
            <User className="w-3.5 h-3.5" /> {customerName} {customerEmail && `(${customerEmail})`} {customerPhone && ` • Phone: ${customerPhone}`}
          </span>
          {req.price !== undefined && req.price !== null && (
            <span className="px-2 py-0.5 text-xs font-black bg-bauhaus-red text-white border-2 border-bauhaus-black">
              ₹{req.price}
            </span>
          )}
          {(req.status as string) === "pending-payment" ? (
            <span className="px-2 py-0.5 text-xs font-black bg-amber-400 text-black border-2 border-bauhaus-black uppercase" title="Customer initialized online checkout but payment is not verified yet">
              🟡 Payment Pending (Awaiting Online Payment)
            </span>
          ) : (req.status as string) === "failed" ? (
            <span className="px-2 py-0.5 text-xs font-black bg-bauhaus-red text-white border-2 border-bauhaus-black uppercase">
              🔴 Payment Failed
            </span>
          ) : req.razorpayPaymentId || req.paymentMethod === "razorpay" || (req.paymentMethod === "online" && (req.status as string) !== "pending-payment") ? (
            <span className="px-2 py-0.5 text-xs font-black bg-green-500 text-white border-2 border-bauhaus-black uppercase" title={`Payment ID: ${req.razorpayPaymentId || "Verified"}`}>
              🟢 Paid Online {req.razorpayPaymentId ? `(${req.razorpayPaymentId})` : ""}
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-black bg-orange-400 text-black border-2 border-bauhaus-black uppercase">
              🏪 Pay at Shop
            </span>
          )}
          {req.couponCode && (
            <span className="px-2 py-0.5 text-xs font-black bg-green-100 text-green-800 border-2 border-green-800 uppercase">
              🎟 Coupon: {req.couponCode} ({req.discountPercent}% OFF)
            </span>
          )}
        </div>


        <div className="space-y-2 mb-3">
          {parseFiles(req.fileUrl, req.fileName).map((file, idx) => {
            const isFileDeleted = file.url.endsWith("deleted");
            return (
              <div key={idx} className="flex flex-wrap items-center justify-between border border-gray-200 p-2.5 bg-gray-50 gap-2">
                <span className="font-medium text-gray-700 text-sm break-all flex-1 pr-3">{file.name}</span>
                <div className="flex items-center gap-2">
                  {isFileDeleted ? (
                    <span className="px-2 py-1 text-[10px] font-black uppercase border border-dashed border-gray-400 text-gray-400 bg-gray-100">
                      Deleted
                    </span>
                  ) : (
                    <>
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        onClick={() => {
                          if (req.status !== "completed") {
                            updateStatus(req.id, "completed");
                          }
                        }}
                        className="flex items-center gap-1.5 bg-bauhaus-blue text-white px-3 py-1.5 font-bold uppercase text-[10px] border border-bauhaus-black hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </a>
                      <a href={file.url} download className="flex items-center gap-1.5 bg-bauhaus-black text-white px-3 py-1.5 font-bold uppercase text-[10px] border border-bauhaus-black hover:bg-gray-800 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                      <button 
                        onClick={() => handleDeleteFile(req.id, file.url)} 
                        disabled={isDeleting === req.id}
                        className="flex items-center gap-1.5 bg-bauhaus-red text-white px-3 py-1.5 font-bold uppercase text-[10px] border border-bauhaus-black hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {clientNotes && <p className="text-xs text-gray-600 bg-gray-50 border-l-4 border-gray-300 p-2 my-2 font-medium">Note: {clientNotes}</p>}
        <p className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleString("en-IN")}</p>

        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => updateStatus(req.id, "processing")} disabled={isUpdating === req.id || req.status === "processing"} title="Mark Processing" className="p-2 border-2 border-bauhaus-black hover:bg-bauhaus-blue hover:text-white transition-colors disabled:opacity-30">
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button onClick={() => updateStatus(req.id, "completed")} disabled={isUpdating === req.id || req.status === "completed"} title="Mark Completed" className="p-2 border-2 border-bauhaus-black hover:bg-green-500 hover:text-white transition-colors disabled:opacity-30">
            <CheckCircle className="w-4 h-4" />
          </button>
          <button onClick={() => updateStatus(req.id, "failed")} disabled={isUpdating === req.id || req.status === "failed"} title="Mark Failed" className="p-2 border-2 border-bauhaus-black hover:bg-bauhaus-red hover:text-white transition-colors disabled:opacity-30">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderRequestGroup = (title: string, list: PrintRequest[], colorCls: string) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-4">
        <div className={`flex items-center gap-2 border-l-4 ${colorCls} pl-3 py-1 my-6`}>
          <h2 className="text-lg font-black uppercase tracking-wider text-gray-700">{title}</h2>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 border border-gray-300 font-bold rounded-full font-black">
            {list.length} {list.length === 1 ? "request" : "requests"}
          </span>
        </div>
        <div className="space-y-4">
          {list.map(renderRequestItem)}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 border-b-4 border-bauhaus-black pb-4 gap-4">
        <h1 className="text-4xl font-black uppercase">Print Requests</h1>
        <button onClick={load} className="bg-bauhaus-black text-white px-4 py-2 font-bold uppercase border-2 border-bauhaus-black hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm">
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Tracking ID, name, email, phone, file..."
            className="w-full border-4 border-bauhaus-black pl-12 pr-12 py-3 text-sm font-bold uppercase placeholder:text-gray-400 outline-none focus:border-bauhaus-blue bg-white shadow-[4px_4px_0_0_#1a1a1a] transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 border-2 border-bauhaus-black bg-white hover:bg-bauhaus-red hover:text-white p-0.5 text-gray-500 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "pending-payment", "pending", "processing", "completed", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 font-bold uppercase text-xs border-4 border-bauhaus-black transition-all ${filter === f ? "bg-bauhaus-black text-white" : "bg-white hover:bg-gray-100"}`}
          >
            {f}{f !== "all" && ` (${requests.filter((r) => r.status === f).length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="font-bold uppercase text-gray-400 text-sm">Loading...</p>
      ) : (
        <div className="space-y-8">
          {!hasResults ? (
            <div className="p-10 text-center border-4 border-dashed border-bauhaus-black bg-white font-bold text-gray-400 uppercase text-sm">
              No matching print requests found.
            </div>
          ) : (
            <>
              {renderRequestGroup("Today", grouped.today, "border-bauhaus-red")}
              {renderRequestGroup("Yesterday", grouped.yesterday, "border-bauhaus-blue")}
              {renderRequestGroup("Older Requests", grouped.older, "border-gray-400")}
            </>
          )}
        </div>
      )}
    </div>
  );
}
