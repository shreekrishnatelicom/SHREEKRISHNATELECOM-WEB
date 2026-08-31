"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Printer, Palette, BookOpen, Layers, Edit3, Globe, Camera, Stamp, X, Upload, FileImage, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import Script from "next/script";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import { upload } from "@vercel/blob/client";

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; textColor: string }> = {
  print:       { label: "Printing",               icon: Printer,  color: "bg-bauhaus-blue",   textColor: "text-white" },
  document:    { label: "Document Services",       icon: FileTextIcon, color: "bg-bauhaus-black",  textColor: "text-white" },
  photo:       { label: "Photo Services",          icon: Camera,   color: "bg-bauhaus-red",    textColor: "text-white" },
  government:  { label: "Government Services",     icon: Stamp,    color: "bg-bauhaus-yellow", textColor: "text-black" },
  lamination:  { label: "Lamination",              icon: Layers,   color: "bg-bauhaus-blue",   textColor: "text-white" },
  form:        { label: "Form Filling",            icon: Edit3,    color: "bg-bauhaus-black",  textColor: "text-white" },
  other:       { label: "Other Services",          icon: Globe,    color: "bg-gray-800",       textColor: "text-white" },
};

function FileTextIcon(props: any) {
  return <Layers {...props} />;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  isAvailable: boolean;
  hasRequestButton: boolean;
  requireImageUpload: boolean;
  requestDescription: string;
  generateReceipt?: boolean;
  allowOnlinePayment?: boolean;
  allowOfflinePayment?: boolean;
}

interface Props {
  services: Service[];
  categories: string[];
}

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

export default function ServicesClientPage({ services, categories }: Props) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Modal Request States
  const [activeSvc, setActiveSvc] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Service Request Payment states
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "in-shop">("in-shop");
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [shopSettings, setShopSettings] = useState<{ location?: string; phone?: string; email?: string }>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      setCurrentUser(usr);
      if (usr) {
        try {
          const res = await fetch("/api/auth/profile");
          if (res.ok) {
            const data = await res.json();
            setName(data.name || usr.displayName || "");
            setEmail(data.email || usr.email || "");
            setPhone(data.phone || "");
          }
        } catch (e) {
          console.error("Failed to load user profile in services client page:", e);
        }
      }
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

  useEffect(() => {
    if (activeSvc) {
      const isOnlineAllowed = onlineEnabled && (activeSvc.allowOnlinePayment ?? true);
      const isOfflineAllowed = offlineEnabled && (activeSvc.allowOfflinePayment ?? true);
      if (isOnlineAllowed && !isOfflineAllowed) {
        setPaymentMethod("online");
      } else if (!isOnlineAllowed && isOfflineAllowed) {
        setPaymentMethod("in-shop");
      } else {
        // Default to in-shop if both are allowed
        setPaymentMethod("in-shop");
      }
    }
  }, [activeSvc, onlineEnabled, offlineEnabled]);

  // Scroll modal container to top when trackingId is set
  useEffect(() => {
    if (trackingId && modalRef.current) {
      modalRef.current.scrollTo({ top: 0, behavior: "instant" as any });
    }
  }, [trackingId]);

  const handleRequestClick = (svc: Service) => {
    if (!currentUser) {
      router.push(`/login?redirect=/services`);
      return;
    }
    setActiveSvc(svc);
    setNotes("");
    setUploadFile(null);
    setTrackingId(null);
    setError(null);
  };

  const handleFileDrop = (f: File | null) => {
    if (!f) return;
    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];
    if (!allowed.includes(f.type)) {
      setError("Please upload an image (JPEG, PNG, WEBP) or a PDF file.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File is too large. Max size is 50MB for database storage.");
      return;
    }
    setError(null);
    setUploadFile(f);
  };

  const downloadServiceReceipt = async (data: any, paymentId?: string) => {
    if (!activeSvc || activeSvc.generateReceipt === false) return;
    try {
      const isOnline = paymentMethod === "online";
      const finalPrice = Number(data.price) || 0;

      await generateInvoicePDF({
        invoiceType: "SERVICE INVOICE",
        trackingId: data.trackingId,
        customerName: name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "Customer",
        customerPhone: phone || undefined,
        customerEmail: email || currentUser?.email || undefined,
        paymentStatus: isOnline ? "Paid (Online)" : "Pending (Pay at Counter)",
        paymentMethod: isOnline ? "Online (Razorpay)" : "Pay at Shop (Cash/UPI)",
        paymentId: paymentId,
        items: [
          {
            description: activeSvc.name,
            specs: activeSvc.category ? `Category: ${activeSvc.category}${uploadFile ? `, File: ${uploadFile.name}` : ""}` : "Digital Service",
            rate: activeSvc.price || "Standard",
            quantity: 1,
            amount: finalPrice,
          },
        ],
        subtotal: finalPrice,
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

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSvc) return;
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (activeSvc.requireImageUpload && !uploadFile) {
      setError("Please upload the required file/image.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let fileToUpload = uploadFile;
    if (!fileToUpload) {
      const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      try {
        const response = await fetch(`data:image/png;base64,${base64Png}`);
        const blob = await response.blob();
        fileToUpload = new File([blob], "request_placeholder.png", { type: "image/png" });
      } catch (err) {
        setError("Failed to initialize request payload.");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      setUploadProgress(0);
      const blobResult = await upload(fileToUpload.name, fileToUpload, {
        access: "public",
        handleUploadUrl: "/api/upload/vercel-blob",
        onUploadProgress: (progressEvent) => {
          setUploadProgress(progressEvent.percentage);
        }
      });
      setUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const finalNotes = `[Service Request: ${activeSvc.name}] [Customer Name: ${name}] [Customer Email: ${email}] [Customer Phone: ${phone}]${notes ? `\nNotes: ${notes}` : ""}`;

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrls: [blobResult.url],
          fileNames: [fileToUpload.name],
          colorMode: "color",
          copies: "1",
          printSide: "single",
          pagesPerSheet: "1",
          paymentMethod,
          notes: finalNotes,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to submit request");
      }

      const data = await res.json();

      // Handle Razorpay Online payment flow for service request
      if (paymentMethod === "online" && data.razorpayOrderId) {
        const options = {
          key: data.razorpayKeyId,
          amount: data.amount,
          currency: "INR",
          name: "Shree Krishna Telecom",
          description: `Service Request - ${activeSvc.name}`,
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
              downloadServiceReceipt(data, response.razorpay_payment_id);
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
            serviceName: activeSvc.name,
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
              downloadServiceReceipt(data, mockPaymentId);
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
      downloadServiceReceipt(data);
    } catch (err: any) {
      setUploadProgress(null);
      console.error(err);
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setUploadProgress(null);
      if (paymentMethod !== "online") {
        setIsSubmitting(false);
      }
    }
  };


  // Group by category
  const grouped = services.reduce<Record<string, Service[]>>((acc, svc) => {
    const cat = svc.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(svc);
    return acc;
  }, {});

  return (
    <div>
      {/* Category Sections */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 space-y-16">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat] || CATEGORY_META["other"];
          const Icon = meta.icon;
          const svcList = grouped[cat] || [];
          if (svcList.length === 0) return null;

          return (
            <section key={cat}>
              {/* Category Header */}
              <div className={`flex items-center gap-4 border-4 border-bauhaus-black p-5 mb-6 ${meta.color} ${meta.textColor}`}>
                <Icon className="w-8 h-8 shrink-0" />
                <h2 className="text-2xl font-black uppercase">{meta.label}</h2>
              </div>

              {/* Service Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {svcList.map((svc) => (
                  <div key={svc.id} className="border-4 border-bauhaus-black bg-bauhaus-white p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-black uppercase text-lg leading-tight flex-1 pr-3">{svc.name}</h3>
                        {svc.category !== "print" && (
                          <span className="font-mono font-black text-base bg-bauhaus-yellow border-2 border-bauhaus-black px-2 py-0.5 shrink-0 whitespace-nowrap">
                            {svc.price}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed mb-6">{svc.description}</p>
                    </div>

                    <div>
                      {svc.hasRequestButton ? (
                        <button
                          onClick={() => handleRequestClick(svc)}
                          className="w-full text-center bg-bauhaus-red hover:bg-red-700 text-bauhaus-white border-4 border-bauhaus-black py-2.5 font-bold uppercase text-xs tracking-wider transition-all"
                        >
                          Request Service →
                        </button>
                      ) : cat === "print" ? (
                        <Link href="/print" className="block w-full text-center bg-bauhaus-blue hover:bg-blue-700 text-bauhaus-white border-4 border-bauhaus-black py-2.5 font-bold uppercase text-xs tracking-wider transition-all">
                          Upload & Print →
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Request Modal */}
      {activeSvc && (
        <div 
          onClick={() => setActiveSvc(null)}
          className="fixed inset-0 bg-bauhaus-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-bauhaus-white border-4 border-bauhaus-black shadow-[12px_12px_0px_0px_rgba(230,22,43,1)] max-w-lg w-full p-4 sm:p-8 relative max-h-[90vh] overflow-y-auto cursor-default"
          >
            <button
              onClick={() => setActiveSvc(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 border-2 border-bauhaus-black p-1 bg-white hover:bg-bauhaus-red hover:text-white transition-colors z-10"
              title="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {trackingId ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-green-500 mb-4 animate-[scaleUp_0.3s_ease-out]" />
                <h3 className="text-xl sm:text-2xl font-black uppercase mb-2">Request Submitted!</h3>
                
                {activeSvc.generateReceipt !== false ? (
                  <>
                    <p className="text-xs text-gray-500 mb-6 uppercase font-bold">Show your Tracking ID at the counter to pay & collect</p>
                    
                    <div className="bg-bauhaus-yellow border-4 border-bauhaus-black p-3 sm:p-5 mb-4 sm:mb-6">
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-600 mb-1">Tracking ID</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-mono font-black break-words">{trackingId}</p>
                    </div>

                    <p className="text-xs text-gray-400 mb-6 font-bold uppercase">📄 Receipt auto-downloaded to your device.</p>
                  </>
                ) : (
                  <p className="text-gray-600 font-bold mb-8 uppercase">Your request for {activeSvc.name} has been successfully sent.</p>
                )}
                
                <button
                  onClick={() => setActiveSvc(null)}
                  className="w-full bg-bauhaus-black text-white border-4 border-bauhaus-black py-3.5 font-black uppercase text-sm hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="space-y-6">
                <div className="border-b-4 border-bauhaus-black pb-4">
                  <span className="px-3 py-1 text-xs font-black uppercase border-2 border-bauhaus-black bg-bauhaus-yellow">
                    {activeSvc.price}
                  </span>
                  <h3 className="text-2xl font-black uppercase text-bauhaus-black mt-2">
                    Request {activeSvc.name}
                  </h3>
                </div>

                {activeSvc.requestDescription && (
                  <p className="text-xs font-bold text-bauhaus-blue uppercase leading-relaxed bg-blue-50 border-l-4 border-bauhaus-blue p-3">
                    💡 {activeSvc.requestDescription}
                  </p>
                )}

                {error && (
                  <div className="bg-bauhaus-red text-bauhaus-white font-bold p-4 border-4 border-bauhaus-black text-xs uppercase flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Name, Email & Phone Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-black uppercase text-xs mb-2 tracking-wider">Your Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      className="w-full border-4 border-bauhaus-black p-3 text-sm font-bold outline-none focus:border-bauhaus-blue bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-black uppercase text-xs mb-2 tracking-wider">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full border-4 border-bauhaus-black p-3 text-sm font-bold outline-none bg-gray-100 text-gray-500 cursor-not-allowed"
                      title="Email address is locked and cannot be edited"
                    />
                  </div>
                  <div>
                    <label className="block font-black uppercase text-xs mb-2 tracking-wider">Phone Number *</label>
                    <input
                      type="tel"
                      value={phone}
                      readOnly
                      className="w-full border-4 border-bauhaus-black p-3 text-sm font-bold outline-none bg-gray-100 text-gray-500 cursor-not-allowed"
                      title="Phone number is locked and cannot be edited"
                    />
                  </div>
                </div>

                {/* Image Upload dropzone */}
                {activeSvc.requireImageUpload && (
                  <div>
                    <label className="block font-black uppercase text-xs mb-2 tracking-wider">Upload Image / File *</label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileDrop(e.dataTransfer.files[0]); }}
                      className={`relative border-4 border-dashed p-6 text-center cursor-pointer transition-all ${
                        isDragging ? "border-bauhaus-blue bg-blue-50" : "border-bauhaus-black hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileDrop(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required={activeSvc.requireImageUpload}
                      />
                      {uploadFile ? (
                        <div className="flex flex-col items-center">
                          <FileImage className="w-10 h-10 mb-2 text-bauhaus-blue" />
                          <p className="font-bold text-xs truncate max-w-xs">{uploadFile.name}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <span className="mt-2 text-[10px] font-bold uppercase text-green-600 bg-green-50 border border-green-300 px-2 py-0.5">✓ Ready</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="w-10 h-10 mb-2 text-gray-300" />
                          <p className="font-bold text-xs uppercase">Drag & Drop or Browse</p>
                          <p className="text-[10px] text-gray-400 mt-1">Images or PDFs only • Max 50MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block font-black uppercase text-xs mb-2 tracking-wider">Instructions / Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter quantity or specific details..."
                    rows={3}
                    className="w-full border-4 border-bauhaus-black p-3 text-sm font-medium outline-none focus:border-bauhaus-blue resize-none"
                  />
                  {/* Payment Method Selector */}
                  {activeSvc && ((onlineEnabled && (activeSvc.allowOnlinePayment ?? true)) || (offlineEnabled && (activeSvc.allowOfflinePayment ?? true))) && (
                    <div className="border-4 border-bauhaus-black p-5 bg-gray-50 space-y-4">
                      <div className="flex items-center gap-2 border-b-2 border-bauhaus-black pb-2">
                        <span className="font-black uppercase text-xs">💳 Select Payment Method</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {offlineEnabled && (activeSvc.allowOfflinePayment ?? true) && (
                          <label className={`border-4 cursor-pointer p-3 text-center font-black uppercase transition-all ${
                            paymentMethod === "in-shop" 
                              ? "bg-bauhaus-black text-white border-bauhaus-black shadow-[2px_2px_0_0_#e0162b]" 
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
                            <p className="text-xs">Pay at Shop</p>
                          </label>
                        )}

                        {onlineEnabled && (activeSvc.allowOnlinePayment ?? true) && (
                          <label className={`border-4 cursor-pointer p-3 text-center font-black uppercase transition-all ${
                            paymentMethod === "online" 
                              ? "bg-bauhaus-black text-white border-bauhaus-black shadow-[2px_2px_0_0_#e0162b]" 
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
                            <p className="text-xs">Online Payment</p>
                          </label>
                        )}
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

                  <button
                    type="submit"
                    disabled={isSubmitting || isVerifyingPayment}
                    className="w-full bg-bauhaus-red text-bauhaus-white border-4 border-bauhaus-black py-4 font-black text-lg uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(26,26,26,1)] transition-all"
                  >
                    {isVerifyingPayment ? "Verifying Payment..." : isSubmitting ? "Submitting Request..." : "Submit Service Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    </div>
  );
}
