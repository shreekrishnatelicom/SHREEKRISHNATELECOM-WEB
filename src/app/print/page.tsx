"use client";

import { useState, useEffect } from "react";
import { Upload, File as FileIcon, CheckCircle, Printer, Palette, BookOpen, User as UserIcon, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import Script from "next/script";
import { PDFDocument } from "pdf-lib";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { app } from "@/lib/firebase";
import { generateInvoicePDF, getFileTypeLabel } from "@/lib/generateInvoicePDF";

type ColorMode = "bw" | "color";
type PrintSide = "single" | "double";
type PagesPerSheet = number;

function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.error || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload."));
    };

    xhr.send(formData);
  });
}

async function detectPdfPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
    return pdfDoc.getPageCount();
  } catch (err) {
    console.error("Error parsing PDF page count:", err);
    return 1;
  }
}

export default function PrintService() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  const [files, setFiles]             = useState<File[]>([]);
  const [serviceType, setServiceType] = useState<"study-material" | "others">("others");
  const [colorMode, setColorMode]     = useState<ColorMode>("bw");
  const [copies, setCopies]           = useState<number | "">(1);
  const [printSide, setPrintSide]     = useState<PrintSide>("single");
  const [pagesPerSheet, setPagesPerSheet] = useState<number>(1);
  const [notes, setNotes]             = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId]   = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [isDragging, setIsDragging]   = useState(false);

  // Print Payment states
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "in-shop">("in-shop");
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [shopSettings, setShopSettings] = useState<{ location?: string; phone?: string; email?: string }>({});

  // Pricing table for live estimate
  const [pricingTable, setPricingTable] = useState<any[]>([]);
  const [confirmedPrice, setConfirmedPrice] = useState<number | null>(null);

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPct: number; minPrice: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [filePageCounts, setFilePageCounts] = useState<Record<string, number>>({});


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setName(currentUser.displayName || currentUser.email?.split("@")[0] || "");
        setEmail(currentUser.email || "");

        // Fetch DB user profile to get phone number
        try {
          const res = await fetch("/api/auth/profile");
          if (res.ok) {
            const data = await res.json();
            setName(data.name || currentUser.displayName || "");
            setPhone(data.phone || "");
          }
        } catch (e) {
          console.error("Failed to load user profile phone:", e);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          const online = data.allowOnlinePayment ?? true;
          const offline = data.allowOfflinePayment ?? true;
          setOnlineEnabled(online);
          setOfflineEnabled(offline);
          setShopSettings({
            location: data.location,
            phone: data.phone,
            email: data.email,
          });
          
          if (online && !offline) {
            setPaymentMethod("online");
          } else {
            setPaymentMethod("in-shop");
          }
        }
      } catch (err) {
        console.error("Failed to load payment settings:", err);
      }
    };
    fetchPaymentSettings();
  }, []);

  // Fetch pricing table for live price estimate
  useEffect(() => {
    fetch("/api/admin/printing-prices")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => Array.isArray(data) ? setPricingTable(data) : [])
      .catch(() => {});
  }, []);

  // Scroll to top when trackingId is set (successful submission)
  useEffect(() => {
    if (trackingId) {
      window.scrollTo({ top: 0, behavior: "instant" as any });
    }
  }, [trackingId]);

  // Compute base price (before coupon)
  const estimatedBasePrice = (() => {
    if (files.length === 0) return null;
    const copiesNum = Number(copies) || 1;
    const layoutType = pagesPerSheet >= 2 ? "2+" : "1";

    // Find matching rate from pricing table (fallback to hardcoded defaults)
    let rate: number | null = null;
    if (pricingTable.length > 0) {
      const match = pricingTable.find(
        (p) => p.serviceType === serviceType && p.colorMode === colorMode && p.printSide === printSide && p.layout === layoutType
      ) || pricingTable.find(
        (p) => p.serviceType === serviceType && p.colorMode === colorMode && p.printSide === printSide && p.layout === "1"
      );
      if (match) rate = match.price;
    }
    if (rate === null) {
      // Fallback defaults
      if (colorMode === "color") {
        rate = printSide === "double" ? (layoutType === "2+" ? 14 : 18) : (layoutType === "2+" ? 8 : 10);
      } else {
        rate = printSide === "double" ? (layoutType === "2+" ? 2.5 : 3.5) : (layoutType === "2+" ? 1.5 : 2);
      }
    }

    let estimatedPages = 0;
    files.forEach((f) => {
      estimatedPages += filePageCounts[f.name] || 1;
    });

    const printedSides = Math.ceil(estimatedPages / pagesPerSheet);
    const sheets = printSide === "double" ? Math.ceil(printedSides / 2) : printedSides;
    return Math.round(rate * sheets * copiesNum * 100) / 100;
  })();

  // Compute estimated price after coupon discount
  const estimatedPrice = (() => {
    const base = estimatedBasePrice;
    if (base === null) return null;
    if (appliedCoupon) {
      if (appliedCoupon.minPrice && base < appliedCoupon.minPrice) {
        return base;
      }
      const discount = Math.round(base * (appliedCoupon.discountPct / 100) * 100) / 100;
      return Math.max(0, Math.round((base - discount) * 100) / 100);
    }
    return base;
  })();

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode })
      });
      const data = await res.json();
      if (data.valid) {
        const currentBase = estimatedBasePrice || 0;
        if (data.minPrice && currentBase < data.minPrice) {
          setCouponError(`This coupon requires a minimum order of ₹${data.minPrice.toFixed(2)} (Current: ₹${currentBase.toFixed(2)})`);
          setAppliedCoupon(null);
        } else {
          setAppliedCoupon({ code: data.code, discountPct: data.discountPct, minPrice: data.minPrice });
          setConfirmedPrice(null);
        }
      } else {
        setCouponError(data.message || "Invalid coupon");
        setAppliedCoupon(null);
      }
    } catch (err) {
      setCouponError("Validation failed");
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };


  const triggerFileInput = () => {
    document.getElementById("file-input-element")?.click();
  };


  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles: File[] = [];
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

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
      if (!allowedMimeTypes.includes(f.type) && !allowedExtensions.includes(ext)) {
        setError(`File "${f.name}" is not supported. Supported: PDF, Images, Word, Excel.`);
        return;
      }
      if (f.size > 50 * 1024 * 1024) {
        setError(`File "${f.name}" is too large. Max size is 50MB per file.`);
        return;
      }
      newFiles.push(f);
    }
    setError(null);
    setConfirmedPrice(null);
    setFiles((prev) => [...prev, ...newFiles]);

    // Asynchronously detect page counts
    newFiles.forEach((file) => {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (file.type === "application/pdf" || ext === ".pdf") {
        detectPdfPageCount(file).then((count) => {
          setFilePageCounts((prev) => ({
            ...prev,
            [file.name]: count,
          }));
        });
      } else {
        setFilePageCounts((prev) => ({
          ...prev,
          [file.name]: 1,
        }));
      }
    });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setPagesPerSheet(val);
  };

  const downloadReceipt = async (data: any) => {
    try {
      let fileList: string[] = [];
      let fileNameDisplay = data.fileName;
      try {
        if (data.fileName && data.fileName.startsWith("[")) {
          fileList = JSON.parse(data.fileName);
          fileNameDisplay = fileList.join(", ");
        } else if (data.fileName) {
          fileList = [data.fileName];
        }
      } catch (e) {
        fileNameDisplay = data.fileName;
      }
      if (fileList.length === 0 && files.length > 0) {
        fileList = files.map(f => f.name);
      }

      const isOnline = paymentMethod === "online";
      const finalPrice = data.price || 0;
      const fileNames = fileNameDisplay || (files.length > 0 ? files.map(f => f.name).join(", ") : "Document.pdf");
      const activeFileList = fileList.length > 0 ? fileList : [fileNames];

      // Divide total price among files for individual line items
      const perFilePrice = finalPrice / activeFileList.length;

      const invoiceItems = activeFileList.map((fn, idx) => {
        const pagesForFile = filePageCounts[fn] || Math.max(1, Math.round((data.pageCount || 1) / activeFileList.length));
        return {
          description: `${idx + 1}. ${fn}`,
          specs: `${colorMode === "color" ? "Full Color" : "B&W"} • ${printSide === "double" ? "Double Side" : "Single Side"}${pagesPerSheet > 1 ? ` • ${pagesPerSheet}-in-1` : ""}`,
          quantity: `${pagesForFile} pgs x ${copies || 1} qty`,
          amount: perFilePrice,
        };
      });

      await generateInvoicePDF({
        invoiceType: "INVOICE",
        trackingId: data.trackingId,
        customerName: name || "Customer",
        customerPhone: phone || undefined,
        customerEmail: email || undefined,
        paymentStatus: isOnline ? "Paid (Online via Razorpay)" : "Pending (Pay at Shop Counter)",
        paymentMethod: isOnline ? "Online Payment (Razorpay)" : "Pay at Shop (Cash/UPI)",
        paymentId: data.paymentId,
        items: invoiceItems,
        printDetails: {
          files: activeFileList,
          serviceType: serviceType === "study-material" ? "Study Material (Syllabus, notes, books)" : "Others / Standard (Regular document print)",
          colorMode: colorMode === "color" ? "Full Color (Vibrant, premium)" : "Black & White (Standard)",
          printSide: printSide === "double" ? "Double Side (Print on both sides)" : "Single Side (Print on one side only)",
          pagesPerSheet: pagesPerSheet > 1 ? `${pagesPerSheet} Pages / Sheet` : "1 Page / Sheet",
          pageCount: data.pageCount || 1,
          copies: Number(copies) || 1,
          notes: notes || undefined,
        },
        subtotal: finalPrice,
        discount: appliedCoupon ? (confirmedPrice ? Math.max(0, confirmedPrice - finalPrice) : 0) : 0,
        totalAmount: finalPrice,
        notes: notes || undefined,
        shopAddress: shopSettings.location,
        shopPhone: shopSettings.phone,
        shopEmail: shopSettings.email,
      });
    } catch (pdfErr) {
      console.error("PDF generation failed:", pdfErr);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) { setError("Please select at least one file."); return; }
    if (!name.trim()) { setError("Please enter your name."); return; }
    setIsSubmitting(true);
    setError(null);

    // Prepend customer name, email and phone to notes field
    const finalNotes = `[Customer Name: ${name}] [Customer Email: ${email}] [Customer Phone: ${phone}]${notes ? `\nNotes: ${notes}` : ""}`;

    try {
      setUploadProgress(0);

      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      const loadedSizes = new Array(files.length).fill(0);
      const storage = getStorage(app);

      const uploadPromises = files.map(async (file, index) => {
        const fileRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        return new Promise<string>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const percentage = snapshot.totalBytes > 0 
                ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 
                : 0;
              loadedSizes[index] = (percentage / 100) * file.size;
              const currentTotalLoaded = loadedSizes.reduce((sum, l) => sum + l, 0);
              const overallPercentage = Math.round((currentTotalLoaded / totalSize) * 100);
              setUploadProgress(overallPercentage);
            },
            (error) => {
              reject(error);
            },
            async () => {
              try {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadUrl);
              } catch (err) {
                reject(err);
              }
            }
          );
        });
      });

      const uploadUrls = await Promise.all(uploadPromises);
      setUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrls: uploadUrls,
          fileNames: files.map(f => f.name),
          colorMode,
          copies: String(copies),
          printSide,
          pagesPerSheet: String(pagesPerSheet),
          serviceType,
          paymentMethod,
          notes: finalNotes,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to submit request");
      }

      const data = await res.json();

      // Handle Razorpay Online payment flow
      if (paymentMethod === "online" && data.razorpayOrderId) {
        // Show confirmed price before opening Razorpay
        setConfirmedPrice(data.price ?? 0);
        const options = {
          key: data.razorpayKeyId,
          amount: data.amount,
          currency: "INR",
          name: "Shree Krishna Telecom",
          description: `Print Request - ${data.trackingId}`,
          order_id: data.razorpayOrderId,
          handler: async function (response: any) {
            setIsSubmitting(true);
            setIsVerifyingPayment(true);
            try {
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });
              
              if (!verifyRes.ok) {
                const verifyData = await verifyRes.json();
                throw new Error(verifyData.error || "Payment verification failed.");
              }
              
              setTrackingId(data.trackingId);
              downloadReceipt({
                ...data,
                paymentId: response.razorpay_payment_id,
              });
            } catch (err: any) {
              setUploadProgress(null);
              setError(err.message || "Payment verification failed. Please contact support.");
            } finally {
              setIsSubmitting(false);
              setIsVerifyingPayment(false);
            }
          },
          prefill: {
            name: name,
            email: email,
            contact: phone,
          },
          notes: {
            trackingId: data.trackingId,
          },
          theme: {
            color: "#00488f",
          },
          modal: {
            ondismiss: async function() {
              setIsSubmitting(false);
              setError("Payment was cancelled. Request not completed.");
              try {
                await fetch("/api/payment/cancel", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ razorpayOrderId: data.razorpayOrderId })
                });
              } catch (e) {
                console.error("Failed to cancel payment draft:", e);
              }
            }
          }
        };

        if (data.razorpayKeyId === "rzp_test_placeholder") {
          const simulate = confirm(
            `Razorpay is in Test/Simulated Mode.\nClick OK to simulate a successful payment for Tracking ID: ${data.trackingId}.\nClick Cancel to simulate a cancelled checkout.`
          );
          if (simulate) {
            setIsSubmitting(true);
            setIsVerifyingPayment(true);
            const mockPaymentId = `pay_${Math.random().toString(36).substring(2, 11)}`;
            try {
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpayPaymentId: mockPaymentId,
                  razorpayOrderId: data.razorpayOrderId,
                  razorpaySignature: "mock_signature_for_test",
                }),
              });
              if (!verifyRes.ok) throw new Error("Payment verification failed.");
              setTrackingId(data.trackingId);
              downloadReceipt({
                ...data,
                paymentId: mockPaymentId,
              });
            } catch (err: any) {
              setUploadProgress(null);
              setError("Mock payment verification failed.");
            } finally {
              setIsSubmitting(false);
              setIsVerifyingPayment(false);
            }
          } else {
            setIsSubmitting(false);
            setError("Simulated payment cancelled.");
            try {
              await fetch("/api/payment/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ razorpayOrderId: data.razorpayOrderId })
              });
            } catch (e) {
              console.error("Failed to cancel payment draft:", e);
            }
          }
          return;
        }

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      }

      // Offline flow directly sets success
      setTrackingId(data.trackingId);
      downloadReceipt(data);
    } catch (err: any) {
      setUploadProgress(null);
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };


  const Step = ({ n, label, color }: { n: string; label: string; color: string }) => (
    <div className={`flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg font-black uppercase mb-3 sm:mb-4 ${color}`}>
      <span className={`border-2 sm:border-4 border-bauhaus-black w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center font-black text-xs sm:text-sm shrink-0 ${color}`}>{n}</span>
      <span>{label}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 p-8 bg-bauhaus-white">
        <div className="loader" />
        <p className="font-bold uppercase text-gray-400 text-sm tracking-widest">Checking credentials...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8 bg-bauhaus-white">
        <div className="max-w-md w-full border-4 border-bauhaus-black bg-bauhaus-white shadow-[8px_8px_0_0_#1a1a1a] p-8 text-center">
          <Printer className="w-16 h-16 mx-auto text-bauhaus-red mb-6" />
          <h2 className="text-3xl font-black uppercase mb-4">Need Login to Print</h2>
          <p className="text-gray-600 font-bold mb-8">
            You need to log in to submit a print request.
          </p>
          <Link
            href="/login?redirect=/print"
            className="block w-full bg-bauhaus-blue text-bauhaus-white border-4 border-bauhaus-black py-4 font-black uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-[4px_4px_0_0_#1a1a1a] active:translate-x-1 active:translate-y-1 active:shadow-none text-center"
          >
            Go to Login Page
          </Link>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setTrackingId(null);
    setFiles([]);
    setCopies(1);
    setServiceType("others");
    setColorMode("bw");
    setPrintSide("single");
    setPagesPerSheet(1);
    setNotes("");
    setError(null);
    setIsSubmitting(false);
    setIsVerifyingPayment(false);
    setUploadProgress(null);
    setConfirmedPrice(null);
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  if (trackingId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-lg w-full border-4 border-bauhaus-black bg-bauhaus-white shadow-[10px_10px_0_0_#1a1a1a] text-center">
          <div className="bg-green-500 border-b-4 border-bauhaus-black p-4 sm:p-8">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-white" />
          </div>
          <div className="p-4 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-black uppercase mb-2">Request Submitted!</h1>
            <p className="text-gray-500 mb-6 text-sm sm:text-base">Come to the shop, show your Tracking ID, pay and collect.</p>
            <div className="bg-bauhaus-yellow border-4 border-bauhaus-black p-3 sm:p-5 mb-4 sm:mb-6">
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-600 mb-1 sm:mb-2">Tracking ID</p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-mono font-black break-words">{trackingId}</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4 sm:mb-6 text-xs sm:text-sm">
              <div className="bg-gray-100 border-2 border-bauhaus-black p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold mb-0.5 sm:mb-1">Mode</p>
                <p className="font-black">{colorMode === "color" ? "Color" : "B&W"}</p>
              </div>
              <div className="bg-gray-100 border-2 border-bauhaus-black p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold mb-0.5 sm:mb-1">Copies</p>
                <p className="font-black">{copies}</p>
              </div>
              <div className="bg-gray-100 border-2 border-bauhaus-black p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold mb-0.5 sm:mb-1">Side</p>
                <p className="font-black capitalize">{printSide}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-6">📄 Receipt auto-downloaded to your device.</p>
            <div className="flex gap-2 sm:gap-3">
              <Link href={`/track?id=${trackingId}`} className="flex-1 bg-bauhaus-black text-bauhaus-white border-4 border-bauhaus-black py-2.5 sm:py-3 font-bold uppercase text-xs sm:text-sm text-center hover:bg-gray-800 transition-colors">
                Track
              </Link>
              <button onClick={resetForm} className="flex-1 border-4 border-bauhaus-black py-2.5 sm:py-3 font-bold uppercase text-xs sm:text-sm hover:bg-gray-100 transition-colors">
                New Request
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Page Header */}
      <div className="flex items-center gap-3 sm:gap-4 bg-bauhaus-blue text-bauhaus-white border-4 border-bauhaus-black p-4 sm:p-6 mb-0">
        <Printer className="w-8 h-8 sm:w-10 sm:h-10 shrink-0" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase leading-none">Print Request</h1>
          <p className="text-xs sm:text-sm opacity-70 mt-0.5">Upload PDF → Choose options → Pay in shop</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-4 border-t-0 border-bauhaus-black bg-bauhaus-white p-4 sm:p-8 space-y-5 sm:space-y-8 shadow-[8px_8px_0_0_#1a1a1a]"
      >
        {error && (
          <div className="bg-bauhaus-red text-bauhaus-white font-bold p-4 border-4 border-bauhaus-black text-sm uppercase flex items-center gap-2">
            ⚠ {error}
          </div>
        )}

        {/* 1. Customer Details */}
        <div>
          <Step n="1" label="Your Details" color="bg-bauhaus-yellow text-black" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Full Name"
                required
                className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-2.5 sm:py-3 text-base sm:text-lg font-bold outline-none focus:border-bauhaus-blue bg-white"
              />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">@</span>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-2.5 sm:py-3 text-base sm:text-lg font-bold outline-none bg-gray-100 text-gray-500 cursor-not-allowed"
                title="Email address is locked and cannot be edited"
              />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">#</span>
              <input
                type="tel"
                value={phone}
                readOnly
                placeholder="Phone Number"
                className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-2.5 sm:py-3 text-base sm:text-lg font-bold outline-none bg-gray-100 text-gray-500 cursor-not-allowed"
                title="Phone number is locked and cannot be edited"
              />
            </div>
          </div>
        </div>

        {/* 2. Upload Files */}
        <div>
          <Step n="2" label="Upload Files" color="bg-bauhaus-red text-white" />
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => { if (files.length === 0) triggerFileInput(); }}
            className={`relative border-4 border-dashed p-4 sm:p-8 text-center cursor-pointer transition-all ${isDragging ? "border-bauhaus-blue bg-blue-50 scale-[1.01]" : "border-bauhaus-black hover:bg-gray-50"}`}
          >
            <input
              id="file-input-element"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.doc,.docx,.xls,.xlsx"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            {files.length > 0 ? (
              <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                <p className="font-bold text-sm uppercase text-gray-500 mb-1 text-left">Selected Files ({files.length}):</p>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-left">
                  {files.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between border-2 border-bauhaus-black bg-white p-3 shadow-[2px_2px_0_0_#1a1a1a]">
                      <div className="flex items-center gap-3 truncate flex-1 min-w-0 pr-3">
                        <FileIcon className="w-6 h-6 text-bauhaus-blue shrink-0" />
                        <div className="truncate min-w-0 font-bold">
                          <p className="text-sm truncate">{f.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {(f.size / 1024 / 1024).toFixed(2)} MB
                            {(f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) && (
                              <span className="ml-2 font-bold text-bauhaus-blue">
                                • {filePageCounts[f.name] !== undefined ? `${filePageCounts[f.name]} pages` : "Analyzing pages..."}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const fileToRemove = files[idx];
                          setFiles((prev) => prev.filter((_, i) => i !== idx));
                          if (fileToRemove) {
                            setFilePageCounts((prev) => {
                              const updated = { ...prev };
                              delete updated[fileToRemove.name];
                              return updated;
                            });
                          }
                        }}
                        className="bg-bauhaus-red text-white p-1 hover:bg-red-700 transition-colors border border-bauhaus-black shadow-[1px_1px_0_0_#1a1a1a]"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="bg-bauhaus-black text-white border-2 border-bauhaus-black px-4 py-2 text-xs font-bold uppercase hover:bg-gray-800 transition-colors"
                  >
                    + Add More Files
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFiles([]);
                      setFilePageCounts({});
                    }}
                    className="border-2 border-bauhaus-black px-4 py-2 text-xs font-bold uppercase hover:bg-gray-100 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4">
                <Upload className="w-12 h-12 mb-3 text-gray-300" />
                <p className="font-bold uppercase">Drag & Drop or Click to Browse</p>
                <p className="text-xs text-gray-400 mt-1">PDF, Photos, Word, Excel • Max 50MB per file</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Service Type */}
        <div>
          <Step n="3" label="Service Type" color="bg-bauhaus-black text-white" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: "others",         label: "Others / Standard", sub: "Regular document print" },
              { val: "study-material", label: "Study Material",    sub: "Syllabus, notes, books (Discounts)" },
            ].map((opt) => (
              <label key={opt.val} className={`border-4 cursor-pointer p-3 sm:p-5 text-center font-black uppercase transition-all ${serviceType === opt.val ? "bg-bauhaus-black text-white border-bauhaus-black shadow-[4px_4px_0_0_#e0162b]" : "border-bauhaus-black bg-gray-50 hover:bg-gray-100"}`}>
                <input type="radio" name="serviceType" value={opt.val} checked={serviceType === opt.val} onChange={() => setServiceType(opt.val as any)} className="hidden" />
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2" />
                <p className="text-xs sm:text-sm font-black">{opt.label}</p>
                <p className="text-[9px] sm:text-xs font-medium opacity-60 normal-case mt-0.5">{opt.sub}</p>
              </label>
            ))}
          </div>
        </div>

        {/* 4. Color Mode */}
        <div>
          <Step n="4" label="Color Mode" color="bg-bauhaus-blue text-white" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: "bw",    label: "Black & White", sub: "Standard, affordable" },
              { val: "color", label: "Full Color",    sub: "Vibrant, premium" },
            ].map((opt) => (
              <label key={opt.val} className={`border-4 cursor-pointer p-3 sm:p-5 text-center font-black uppercase transition-all ${colorMode === opt.val ? (opt.val === "bw" ? "bg-bauhaus-black text-white border-bauhaus-black shadow-[4px_4px_0_0_#e0162b]" : "bg-bauhaus-yellow border-bauhaus-black shadow-[4px_4px_0_0_#1a1a1a]") : "border-bauhaus-black bg-gray-50 hover:bg-gray-100"}`}>
                <input type="radio" name="colorMode" value={opt.val} checked={colorMode === opt.val as ColorMode} onChange={() => setColorMode(opt.val as ColorMode)} className="hidden" />
                <Palette className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2" />
                <p className="text-xs sm:text-sm font-black">{opt.label}</p>
                <p className="text-[9px] sm:text-xs font-medium opacity-60 normal-case mt-0.5">{opt.sub}</p>
              </label>
            ))}
          </div>
        </div>

        {/* 5. Print Side */}
        <div>
          <Step n="5" label="Print Side" color="bg-bauhaus-yellow text-black" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: "single", label: "Single Side", sub: "Print on one side only", icon: BookOpen },
              { val: "double", label: "Double Side", sub: "Print on both sides", icon: BookOpen },
            ].map((opt) => (
              <label key={opt.val} className={`border-4 cursor-pointer p-3 sm:p-5 text-center font-black uppercase transition-all ${printSide === opt.val ? "bg-bauhaus-blue text-white border-bauhaus-black shadow-[4px_4px_0_0_#1a1a1a]" : "border-bauhaus-black bg-gray-50 hover:bg-gray-100"}`}>
                <input type="radio" name="printSide" value={opt.val} checked={printSide === opt.val as PrintSide} onChange={() => setPrintSide(opt.val as PrintSide)} className="hidden" />
                <opt.icon className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2" />
                <p className="text-xs sm:text-sm font-black">{opt.label}</p>
                <p className="text-[9px] sm:text-xs font-medium opacity-60 normal-case mt-0.5">{opt.sub}</p>
              </label>
            ))}
          </div>
        </div>

        {/* 6. Pages Per Sheet */}
        <div>
          <Step n="6" label="Pages Per Sheet" color="bg-bauhaus-black text-white" />
          <p className="text-xs text-gray-500 -mt-2 mb-4">
            Adjust the slider to choose how many document pages to print on each physical sheet.
          </p>
          <div className="border-4 border-bauhaus-black p-4 sm:p-6 bg-gray-50 space-y-3 sm:space-y-4 shadow-[4px_4px_0_0_#1a1a1a]">
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase text-xs sm:text-sm">Layout Choice:</span>
              <span className="bg-bauhaus-yellow text-bauhaus-black border-2 border-bauhaus-black px-2 py-0.5 sm:px-3 sm:py-1 font-black text-base sm:text-xl">
                {pagesPerSheet} {pagesPerSheet === 1 ? "Page" : "Pages"} / Sheet
              </span>
            </div>
            
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={pagesPerSheet}
              onChange={handleSliderChange}
              className="w-full accent-bauhaus-red h-3 bg-gray-200 border-2 border-bauhaus-black rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-bauhaus-red [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bauhaus-black"
            />
            
            <div className="flex justify-between font-mono font-black text-[10px] sm:text-xs text-gray-500 px-1">
              <span>1 page</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20 pages / sheet</span>
            </div>
          </div>
        </div>

        {/* 7. Number of Copies */}
        <div>
          <Step n="7" label="Number of Copies" color="bg-bauhaus-red text-white" />
          <div className="flex items-center gap-3 sm:gap-4">
            <button type="button" onClick={() => setCopies(Math.max(1, (Number(copies) || 1) - 1))} className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-bauhaus-black bg-bauhaus-white font-black text-xl sm:text-2xl hover:bg-gray-100 transition-colors">−</button>
            <input
              type="number"
              min="1"
              max="999"
              value={copies}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setCopies("");
                } else {
                  const parsed = parseInt(val, 10);
                  setCopies(isNaN(parsed) ? "" : Math.max(1, Math.min(999, parsed)));
                }
              }}
              onBlur={() => {
                if (copies === "" || copies < 1) {
                  setCopies(1);
                }
              }}
              className="w-16 h-10 sm:w-20 sm:h-12 border-4 border-bauhaus-black bg-bauhaus-yellow font-black text-xl sm:text-2xl text-center outline-none focus:bg-white"
            />
            <button type="button" onClick={() => setCopies(Math.min(999, (Number(copies) || 1) + 1))} className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-bauhaus-black bg-bauhaus-white font-black text-xl sm:text-2xl hover:bg-gray-100 transition-colors">+</button>
          </div>
        </div>

        {/* 8. Special Notes */}
        <div>
          <Step n="8" label="Special Notes (Optional)" color="bg-bauhaus-blue text-white" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions? e.g. 'Print only pages 3–5', 'Staple in corner', etc."
            rows={3}
            className="w-full border-4 border-bauhaus-black p-4 text-sm font-medium outline-none focus:border-bauhaus-blue resize-none"
          />
        </div>

        {/* Payment Method Selector */}
        {(onlineEnabled || offlineEnabled) && (
          <div className="border-4 border-bauhaus-black p-4 sm:p-6 bg-gray-50 space-y-3 sm:space-y-4 shadow-[4px_4px_0_0_#1a1a1a]">
            <div className="flex items-center gap-2 border-b-2 border-bauhaus-black pb-2 mb-2">
              <span className="font-black uppercase text-xs sm:text-sm">💳 Select Payment Method</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offlineEnabled && (
                <label className={`border-4 cursor-pointer p-2.5 sm:p-4 text-center font-black uppercase transition-all ${
                  paymentMethod === "in-shop" 
                    ? "bg-bauhaus-black text-white border-bauhaus-black shadow-[3px_3px_0_0_#e0162b]" 
                    : "border-bauhaus-black bg-white hover:bg-gray-50 text-black"
                }`}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="in-shop" 
                    checked={paymentMethod === "in-shop"} 
                    onChange={() => setPaymentMethod("in-shop")} 
                    className="hidden" 
                  />
                  <p className="text-xs sm:text-sm font-black">Pay at Shop</p>
                  <p className="text-[9px] sm:text-[10px] font-medium opacity-60 normal-case mt-0.5">Pay cash/UPI at counter</p>
                </label>
              )}

              {onlineEnabled && (
                <label className={`border-4 cursor-pointer p-2.5 sm:p-4 text-center font-black uppercase transition-all ${
                  paymentMethod === "online" 
                    ? "bg-bauhaus-black text-white border-bauhaus-black shadow-[3px_3px_0_0_#e0162b]" 
                    : "border-bauhaus-black bg-white hover:bg-gray-50 text-black"
                }`}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="online" 
                    checked={paymentMethod === "online"} 
                    onChange={() => setPaymentMethod("online")} 
                    className="hidden" 
                  />
                  <p className="text-xs sm:text-sm font-black">Online Payment</p>
                  <p className="text-[9px] sm:text-[10px] font-medium opacity-60 normal-case mt-0.5">Pay now via Razorpay</p>
                </label>
              )}
            </div>
            
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2 font-medium">
              {paymentMethod === "online" 
                ? "⚡ Pay securely using Cards, NetBanking, UPI, or Wallets." 
                : "🏪 Show tracking ID at the counter to pay and collect prints."}
            </p>
          </div>
        )}

        {/* Coupon Code section */}
        {files.length > 0 && (
          <div className="border-4 border-bauhaus-black p-4 sm:p-6 bg-gray-50 space-y-2.5 sm:space-y-3 shadow-[4px_4px_0_0_#1a1a1a]">
            <div className="flex items-center gap-2 border-b-2 border-bauhaus-black pb-2 mb-2">
              <span className="font-black uppercase text-xs sm:text-sm">🎟 Have a Coupon Code?</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                placeholder="6-DIGIT CODE"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase().slice(0, 6));
                  setCouponError(null);
                }}
                disabled={isValidatingCoupon || !!appliedCoupon}
                className="flex-1 min-w-0 border-4 border-bauhaus-black p-2.5 sm:p-3 font-mono font-black uppercase text-center sm:text-left text-sm sm:text-base outline-none bg-white focus:border-bauhaus-blue disabled:bg-gray-100"
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponCode("");
                    setConfirmedPrice(null);
                  }}
                  className="shrink-0 bg-bauhaus-red text-white border-4 border-bauhaus-black py-2.5 sm:py-3 px-4 sm:px-6 font-black uppercase text-xs sm:text-sm hover:bg-red-700 transition-all shadow-[2px_2px_0_0_#1a1a1a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center min-h-[40px] sm:min-h-[48px]"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={isValidatingCoupon || !couponCode.trim()}
                  className="shrink-0 bg-bauhaus-blue text-white border-4 border-bauhaus-black py-2.5 sm:py-3 px-4 sm:px-6 font-black uppercase text-xs sm:text-sm hover:bg-blue-600 transition-all disabled:opacity-50 shadow-[2px_2px_0_0_#1a1a1a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center min-h-[40px] sm:min-h-[48px]"
                >
                  {isValidatingCoupon ? "Checking..." : "Apply Coupon"}
                </button>
              )}
            </div>
            {couponError && (
              <p className="text-xs font-bold text-bauhaus-red">{couponError}</p>
            )}
            {appliedCoupon && (() => {
              const isBelowMin = appliedCoupon.minPrice && estimatedBasePrice !== null && (estimatedBasePrice < appliedCoupon.minPrice);
              if (isBelowMin) {
                return (
                  <p className="text-xs font-black text-bauhaus-red uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                    ⚠️ Coupon Code not applied: Requires min. order of ₹{appliedCoupon.minPrice.toFixed(2)} (Current: ₹{estimatedBasePrice?.toFixed(2)})
                  </p>
                );
              }
              return (
                <p className="text-xs font-black text-green-700 uppercase tracking-wider flex items-center gap-1.5">
                  🎉 Coupon Applied: {appliedCoupon.code} ({appliedCoupon.discountPct}% OFF!)
                </p>
              );
            })()}
          </div>
        )}

        {/* Price Summary */}
        {files.length > 0 && (
          <div className="border-4 border-bauhaus-black bg-bauhaus-yellow p-4 sm:p-5 shadow-[4px_4px_0_0_#1a1a1a]">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-600 mb-0.5">Estimated Total</p>
                <p className="text-2xl sm:text-3xl font-black">
                  {confirmedPrice !== null
                    ? <span className="text-green-800">₹{confirmedPrice.toFixed(2)} <span className="text-base font-bold">(Confirmed)</span></span>
                    : estimatedPrice !== null
                    ? `₹${estimatedPrice.toFixed(2)}`
                    : "—"}
                </p>
                {appliedCoupon && estimatedBasePrice !== null && (!appliedCoupon.minPrice || estimatedBasePrice >= appliedCoupon.minPrice) && (
                  <p className="text-[10px] text-green-800 font-black uppercase tracking-wider mt-1.5 bg-green-100 inline-block px-2 py-0.5 border-2 border-green-800 shadow-[1px_1px_0_0_#065f46]">
                    Discount applied ({appliedCoupon.discountPct}% off)
                  </p>
                )}
                <p className="text-[10px] text-gray-600 mt-1.5">
                  {confirmedPrice !== null
                    ? "Exact amount charged after page count"
                    : (() => {
                        const totalPages = files.reduce((sum, f) => sum + (filePageCounts[f.name] || 1), 0);
                        const isAnalyzing = files.some(f => (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) && filePageCounts[f.name] === undefined);
                        if (isAnalyzing) {
                          return "Analyzing PDF pages... price will update shortly";
                        }
                        return `Price calculated for ${totalPages} page${totalPages === 1 ? "" : "s"}`;
                      })()}
                </p>
              </div>
              <div className="text-right text-[10px] sm:text-xs font-bold uppercase text-gray-600 space-y-0.5">
                <p>{colorMode === "color" ? "🎨 Color" : "⬛ B&W"} · {printSide === "double" ? "Double-side" : "Single-side"}</p>
                <p>{pagesPerSheet > 1 ? `${pagesPerSheet} pages/sheet` : "Normal layout"} · {Number(copies) || 1} cop{(Number(copies) || 1) === 1 ? "y" : "ies"}</p>
                <p className="normal-case text-[9px] sm:text-[10px] text-gray-500">{serviceType === "study-material" ? "Study Material rate" : "Standard rate"}</p>
              </div>
            </div>
          </div>
        )}



        {/* Upload Progress Bar */}
        {uploadProgress !== null && (
          <div className="w-full bg-gray-200 border-4 border-bauhaus-black h-8 relative mb-4">
            <div 
              className="bg-bauhaus-blue h-full transition-all duration-100 animate-pulse" 
              style={{ width: `${uploadProgress}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-black uppercase text-black mix-blend-difference">
              {uploadProgress < 90 ? (
                `Uploading: ${uploadProgress}%`
              ) : uploadProgress < 100 ? (
                "Processing & saving files... please wait"
              ) : (
                "Upload Complete! 100%"
              )}
            </span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || files.length === 0 || isVerifyingPayment}
          className="w-full bg-bauhaus-red text-bauhaus-white border-4 border-bauhaus-black py-3.5 sm:py-5 font-black text-lg sm:text-xl uppercase tracking-widest disabled:opacity-40 hover:bg-red-700 transition-colors flex items-center justify-center gap-3 shadow-[4px_4px_0_0_#1a1a1a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          {(isSubmitting || isVerifyingPayment) ? (
            <>
              <div className="loader" style={{ color: '#fff' }} />
              <span>{isVerifyingPayment ? "Verifying Payment..." : "Uploading..."}</span>
            </>
          ) : (
            <>
              <Printer className="w-6 h-6" />
              Submit Print Request
            </>
          )}
        </button>
      </form>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    </div>
  );
}
