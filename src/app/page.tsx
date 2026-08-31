import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Printer, FileText, Star, Phone, MapPin, Clock, MessageSquare, Send } from "lucide-react";
import PublicCalculator from "@/components/PublicCalculator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Cyber Cafe & Online Print Shop in Raipur | Shree Krishna Telecom",
  description: "Looking for a cyber cafe near me in Raipur? Shree Krishna Telecom near main market offers online document printing, Xerox, passport photos, lamination & government form filling.",
  keywords: [
    "cyber cafe near me",
    "cyber cafe Raipur",
    "print shop Raipur",
    "print shop near me",
    "cyber cafe near main market Raipur",
    "best cyber cafe in Raipur",
    "online print shop Raipur",
    "Shree Krishna Telecom",
    "Shree Krishna Telecom Raipur",
    "trusted cyber cafe near main market"
  ],
};

const FacebookIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
import prisma from "@/lib/prisma";
import { getComputedShopStatus } from "@/lib/shopHours";

export const dynamic = "force-dynamic";

async function getPrintingPrices(): Promise<any[]> {
  try {
    if ((prisma as any).printingPrice) {
      return await (prisma as any).printingPrice.findMany({
        orderBy: [
          { serviceType: "asc" },
          { colorMode: "asc" },
          { printSide: "asc" },
          { layout: "asc" }
        ]
      });
    }
  } catch (e) {
    console.warn("Prisma printingPrice property not available on client, trying raw fallback:", e);
  }

  try {
    const rawResult: any = await prisma.$runCommandRaw({
      find: "PrintingPrice",
      sort: { serviceType: 1, colorMode: 1, printSide: 1, layout: 1 }
    });
    if (rawResult && rawResult.cursor && rawResult.cursor.firstBatch) {
      return rawResult.cursor.firstBatch.map((doc: any) => ({
        id: doc._id?.$oid || String(doc._id),
        serviceType: doc.serviceType,
        colorMode: doc.colorMode,
        printSide: doc.printSide,
        layout: doc.layout || "1",
        price: doc.price
      }));
    }
  } catch (rawErr) {
    console.error("Raw database query failed for PrintingPrice:", rawErr);
  }
  return [];
}

export default async function Home() {
  const [homePage, services, featuredServices, settings, printingPrices] = await Promise.all([
    prisma.page.findUnique({ where: { slug: "home" } }),
    prisma.service.findMany({ where: { isAvailable: true }, orderBy: { sortOrder: "asc" }, take: 6 }),
    prisma.service.findMany({ where: { isAvailable: true }, orderBy: { sortOrder: "asc" }, take: 3 }),
    prisma.shopSettings.findFirst().then(async (s) => {
      if (s) return s;
      try {
        return await prisma.shopSettings.create({
          data: {
            isOpen: true,
            phone: "+91 XXXXX XXXXX",
            email: "skt@example.com",
            location: "Near Main Market, Raipur",
            mapLink: "",
            whatsapp: "",
            telegram: "",
            facebook: "",
            instagram: "",
            priceStarting: "₹2/page",
            priceBwSingle: "₹2 / page",
            priceBwDouble: "₹3.5 / page",
            priceColorSingle: "₹10 / page",
            priceColorDouble: "₹18 / page",
          },
        });
      } catch {
        // Fallback for concurrent requests in development/seeding
        return {
          id: "default",
          isOpen: true,
          phone: "+91 XXXXX XXXXX",
          email: "skt@example.com",
          location: "Near Main Market, Raipur",
          mapLink: "",
          whatsapp: "",
          telegram: "",
          facebook: "",
          instagram: "",
          priceStarting: "₹2/page",
          priceBwSingle: "₹2 / page",
          priceBwDouble: "₹3.5 / page",
          priceColorSingle: "₹10 / page",
          priceColorDouble: "₹18 / page",
        };
      }
    }),
    getPrintingPrices()
  ]);

  const defaultPrices = [
    { serviceType: "others", colorMode: "bw", printSide: "single", price: 2.0 },
    { serviceType: "others", colorMode: "bw", printSide: "double", price: 3.5 },
    { serviceType: "others", colorMode: "color", printSide: "single", price: 10.0 },
    { serviceType: "others", colorMode: "color", printSide: "double", price: 18.0 },
    { serviceType: "study-material", colorMode: "bw", printSide: "single", price: 1.5 },
    { serviceType: "study-material", colorMode: "bw", printSide: "double", price: 2.5 },
    { serviceType: "study-material", colorMode: "color", printSide: "single", price: 8.0 },
    { serviceType: "study-material", colorMode: "color", printSide: "double", price: 14.0 },
  ];

  const pricesList = printingPrices && printingPrices.length > 0 ? printingPrices : defaultPrices;

  const title = homePage?.title || "Fast & Reliable Print Services";
  const content = homePage?.content || "Welcome to Shree Krishna Telecom — your trusted local cyber cafe for document printing, internet access, lamination, passport photos, and government services.";
  const heroImage = homePage?.imageUrl || "/hero.png";

  const stats = [
    { value: "5000+", label: "Documents Printed" },
    { value: "10+", label: "Services Offered" },
    { value: "Same Day", label: "Turnaround" },
    { value: settings.priceStarting || "₹2/page", label: "Starting Price" },
  ];

  const testimonials = [
    { name: "Rajesh K.", text: "Very fast service! Got my passport photos and prints done in 10 minutes.", stars: 5 },
    { name: "Priya M.", text: "Best place for government form filling. The staff is extremely helpful.", stars: 5 },
    { name: "Suresh D.", text: "Affordable prices and excellent quality. My go-to shop for all printing needs.", stars: 5 },
  ];

  const computedStatus = getComputedShopStatus(settings as any);

  return (
    <div className="flex flex-col">
      {/* ─── SHOP OPEN/CLOSED BANNER ─── */}
      <div className={`py-4 px-6 border-b-4 border-bauhaus-black font-black uppercase text-center text-sm tracking-wider flex items-center justify-center gap-2.5 ${
        computedStatus.isOpen ? "bg-green-500 text-white" : "bg-bauhaus-red text-bauhaus-white"
      }`}>
        <span className="w-3 h-3 rounded-full bg-current animate-pulse"></span>
        {computedStatus.isOpen 
          ? `We are OPEN NOW (${computedStatus.hoursText}) — Walk-ins & Online Orders Welcome` 
          : `We are currently ${computedStatus.statusText} — Upload online anytime!`}
      </div>

      {/* ─── HERO ─── */}
      <section className="relative flex flex-col md:flex-row min-h-[580px] border-b-4 border-bauhaus-black">
        <div className="flex-1 p-8 md:p-14 flex flex-col justify-center bg-bauhaus-blue text-bauhaus-white border-b-4 md:border-b-0 md:border-r-4 border-bauhaus-black">
          <div className="flex gap-2 mb-5">
            <span className="h-1.5 w-14 bg-bauhaus-red block"></span>
            <span className="h-1.5 w-8 bg-bauhaus-yellow block"></span>
            <span className="h-1.5 w-4 bg-white/50 block"></span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-5">{title}</h1>
          <p className="text-lg md:text-xl font-medium mb-8 opacity-90 max-w-lg leading-relaxed">{content}</p>
          
          <div className="flex flex-wrap gap-3">
            <Link href="/print" className="bg-bauhaus-yellow text-bauhaus-black border-4 border-bauhaus-black px-7 py-3 font-bold uppercase inline-flex items-center gap-2 hover:translate-x-0.5 hover:translate-y-0.5 transition-transform">
              <Printer className="w-5 h-5" /> Print Now <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/services" className="bg-transparent text-bauhaus-white border-4 border-bauhaus-white px-7 py-3 font-bold uppercase hover:bg-bauhaus-white hover:text-bauhaus-black transition-colors">
              Our Services
            </Link>
          </div>

          {/* Social Links inside Hero */}
          {(settings.whatsapp || settings.telegram || settings.facebook || settings.instagram) && (
            <div className="flex flex-wrap gap-3 mt-8 border-t-2 border-white/20 pt-6">
              {settings.whatsapp && (
                <a href={settings.whatsapp} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 border-2 border-bauhaus-black font-black text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0_0_#1a1a1a] transition-all">
                  <MessageSquare className="w-4 h-4" /> WhatsApp
                </a>
              )}
              {settings.telegram && (
                <a href={settings.telegram} target="_blank" rel="noopener noreferrer" className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 border-2 border-bauhaus-black font-black text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0_0_#1a1a1a] transition-all">
                  <Send className="w-3.5 h-3.5" /> Telegram
                </a>
              )}
              {settings.facebook && (
                <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 border-2 border-bauhaus-black font-black text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0_0_#1a1a1a] transition-all">
                  <FacebookIcon className="w-3.5 h-3.5" /> Facebook
                </a>
              )}
              {settings.instagram && (
                <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 border-2 border-bauhaus-black font-black text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0_0_#1a1a1a] transition-all">
                  <InstagramIcon className="w-3.5 h-3.5" /> Instagram
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex-none md:flex-1 relative w-full h-[300px] sm:h-[450px] md:h-auto bg-bauhaus-red">
          <Image src={heroImage} alt="Shree Krishna Telecom" fill className="object-cover" priority />
          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-bauhaus-yellow border-t-4 border-bauhaus-black"></div>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b-4 border-bauhaus-black bg-bauhaus-black gap-1">
        {stats.map((s, i) => (
          <div key={s.label} className={`p-5 text-center ${i % 2 === 0 ? "bg-bauhaus-black text-bauhaus-white" : "bg-bauhaus-yellow text-bauhaus-black"}`}>
            <p className="text-2xl md:text-3xl font-black">{s.value}</p>
            <p className="text-xs font-bold uppercase tracking-wider opacity-80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── SERVICES PREVIEW ─── */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-bauhaus-red mb-1">What We Offer</p>
            <h2 className="text-4xl font-black uppercase">Our Services</h2>
          </div>
          <Link href="/services" className="hidden sm:flex items-center gap-2 font-bold uppercase text-sm border-4 border-bauhaus-black px-5 py-3 hover:bg-bauhaus-black hover:text-bauhaus-yellow transition-colors">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(featuredServices.length > 0 ? featuredServices : [
            { id: "1", name: "Document Printing", price: "₹2/page", description: "B&W and color prints from your phone or PDF", category: "print" },
            { id: "2", name: "Lamination", price: "₹15/page", description: "Hot lamination for ID cards and documents", category: "document" },
            { id: "3", name: "Passport Photo", price: "₹40/set", description: "Instant passport size photos, govt compliant", category: "photo" },
          ]).map((svc: any, i) => (
            <div key={svc.id} className={`border-4 border-bauhaus-black p-6 group hover:translate-x-0.5 hover:translate-y-0.5 transition-transform ${i === 0 ? "bg-bauhaus-red text-bauhaus-white" : i === 1 ? "bg-bauhaus-black text-bauhaus-white" : "bg-bauhaus-white"}`}>
              <div className="flex items-start justify-between mb-4">
                <FileText className="w-8 h-8 shrink-0" />
                <span className="font-mono font-black text-lg">{svc.price}</span>
              </div>
              <h3 className="text-xl font-black uppercase mb-2">{svc.name}</h3>
              <p className="text-sm opacity-80 leading-relaxed">{svc.description}</p>
            </div>
          ))}
        </div>

        <div className="sm:hidden mt-6 text-center">
          <Link href="/services" className="inline-flex items-center gap-2 font-bold uppercase border-4 border-bauhaus-black px-6 py-3">
            View All Services <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="bg-bauhaus-black text-bauhaus-white py-16 px-6 md:px-12 border-t-4 border-b-4 border-bauhaus-black">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black uppercase tracking-widest text-bauhaus-yellow mb-1">Simple Process</p>
          <h2 className="text-4xl font-black uppercase mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-4 border-bauhaus-white">
            {[
              { num: "01", color: "bg-bauhaus-red", title: "Upload", body: "Upload your PDF or images from any device. No pen drive needed." },
              { num: "02", color: "bg-bauhaus-blue", title: "Customize", body: "Choose options, page layout, number of copies, single or double side." },
              { num: "03", color: "bg-bauhaus-yellow text-bauhaus-black", title: "Pay & Collect", body: "Come to the shop, show your Tracking ID, pay at the counter, collect your order." },
            ].map((step, i) => (
              <div key={step.num} className={`p-8 border-b-4 md:border-b-0 md:border-r-4 border-bauhaus-white last:border-0 ${step.color}`}>
                <span className="text-5xl font-black opacity-50 block mb-4">{step.num}</span>
                <h3 className="text-2xl font-black uppercase mb-3">{step.title}</h3>
                <p className="opacity-80 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/print" className="inline-flex items-center gap-3 bg-bauhaus-yellow text-bauhaus-black border-4 border-bauhaus-yellow px-8 py-4 font-black uppercase text-lg hover:bg-bauhaus-white transition-colors">
              <Printer className="w-6 h-6" /> Start a Print Request
            </Link>
          </div>
        </div>
      </section>

      {/* ─── PRINT HIGHLIGHT ─── */}
      <section className="py-16 px-6 md:px-12 border-b-4 border-bauhaus-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-bauhaus-red mb-1">Featured Service</p>
            <h2 className="text-4xl font-black uppercase mb-4">Online Document Upload</h2>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              Upload your documents or images directly from your phone or computer. No need to bring a pen drive. 
              Choose your settings, get a tracking ID, and pay when you come to collect.
            </p>
            <ul className="space-y-2 mb-8">
              {[
                "Black & White or Full Color",
                "Single-sided or Double-sided",
                "1, 2 or 4 pages per sheet",
                "Multiple copies",
                "Support for both PDFs and Image Files",
                "Auto-downloadable receipt with Tracking ID",
              ].map((feat) => (
                <li key={feat} className="flex items-center gap-3 font-bold">
                  <span className="h-2 w-2 bg-bauhaus-red block shrink-0"></span>
                  {feat}
                </li>
              ))}
            </ul>
            <Link href="/print" className="inline-flex items-center gap-2 bg-bauhaus-red text-bauhaus-white border-4 border-bauhaus-black px-7 py-3 font-bold uppercase hover:bg-red-700 transition-colors">
              Upload Document <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="flex-1 border-4 border-bauhaus-black bg-bauhaus-black p-8 text-bauhaus-white">
            <p className="text-xs font-black uppercase tracking-widest text-bauhaus-yellow mb-4">Print Pricing</p>
            <div className="space-y-6">
              {/* Group 1: Standard Print */}
              <div>
                <h4 className="text-xs font-black uppercase text-bauhaus-blue tracking-widest border-b-2 border-bauhaus-blue pb-1 mb-3">
                  Standard Documents (Others)
                </h4>
                <div className="space-y-2">
                  {pricesList.filter((p: any) => p.serviceType === "others").map((p: any) => (
                    <div key={`${p.colorMode}-${p.printSide}-${p.layout || "1"}`} className="flex justify-between items-center border-b border-gray-800 pb-1 text-sm font-bold uppercase">
                      <span className="opacity-80 font-medium text-xs md:text-sm">
                        {p.colorMode === "color" ? "Color" : "B&W"} ({p.printSide === "double" ? "Double" : "Single"} Side){(p.layout || "1") === "2+" && " (2+ Pages/Sheet)"}
                      </span>
                      <span className="font-black text-bauhaus-yellow">₹{p.price.toFixed(2)} / page</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 2: Study Material */}
              <div>
                <h4 className="text-xs font-black uppercase text-green-500 tracking-widest border-b-2 border-green-500 pb-1 mb-3">
                  Study Materials (Syllabus, Books, Notes)
                </h4>
                <div className="space-y-2">
                  {pricesList.filter((p: any) => p.serviceType === "study-material").map((p: any) => (
                    <div key={`${p.colorMode}-${p.printSide}-${p.layout || "1"}`} className="flex justify-between items-center border-b border-gray-800 pb-1 text-sm font-bold uppercase">
                      <span className="opacity-80 font-medium text-xs md:text-sm">
                        {p.colorMode === "color" ? "Color" : "B&W"} ({p.printSide === "double" ? "Double" : "Single"} Side){(p.layout || "1") === "2+" && " (2+ Pages/Sheet)"}
                      </span>
                      <span className="font-black text-bauhaus-yellow">₹{p.price.toFixed(2)} / page</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Quick Price Estimator */}
            <PublicCalculator prices={pricesList} />
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-16 px-6 md:px-12 bg-gray-50 border-b-4 border-bauhaus-black">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black uppercase tracking-widest text-bauhaus-blue mb-1">Customer Reviews</p>
          <h2 className="text-4xl font-black uppercase mb-10">What People Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="border-4 border-bauhaus-black bg-bauhaus-white p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-bauhaus-yellow text-bauhaus-yellow" />
                  ))}
                </div>
                <p className="text-base italic mb-4 leading-relaxed text-gray-700">"{t.text}"</p>
                <p className="font-black uppercase text-sm">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QUICK INFO ─── */}
      <section className="py-12 px-6 md:px-12 border-b-4 border-bauhaus-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              icon: MapPin, 
              title: "Location", 
              lines: ["Shree Krishna Telecom", settings.location], 
              action: settings.mapLink ? (
                <a href={settings.mapLink} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-bauhaus-blue uppercase hover:underline mt-2 inline-block">
                  View on Google Maps →
                </a>
              ) : null
            },
            { 
              icon: Clock, 
              title: "Hours", 
              lines: [
                `${(settings as any).openDays || "Mon - Sun"}: ${computedStatus.hoursText}`,
                computedStatus.isOpen ? "🟢 OPEN NOW" : "🔴 CLOSED NOW"
              ] 
            },
            { 
              icon: Phone, 
              title: "Contact", 
              lines: [settings.phone, settings.email, "Walk-ins welcome!"] 
            },
          ].map((info) => (
            <div key={info.title} className="flex gap-4 items-start border-4 border-bauhaus-black p-6 bg-bauhaus-white">
              <info.icon className="w-8 h-8 shrink-0 text-bauhaus-red mt-0.5" />
              <div>
                <h3 className="font-black uppercase mb-2">{info.title}</h3>
                {info.lines.map((l) => <p key={l} className="text-gray-600 text-sm font-semibold">{l}</p>)}
                {info.action}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="bg-bauhaus-red text-bauhaus-white py-14 px-6 border-b-4 border-bauhaus-black text-center">
        <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">Need a Print or Service?</h2>
        <p className="text-xl mb-8 opacity-90">Walk in or upload online — we're ready to help!</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/print" className="bg-bauhaus-yellow text-bauhaus-black border-4 border-bauhaus-black px-8 py-4 font-black uppercase text-lg hover:scale-105 transition-transform">
            Upload & Print
          </Link>
          <Link href="/contact" className="bg-bauhaus-white text-bauhaus-black border-4 border-bauhaus-black px-8 py-4 font-black uppercase text-lg hover:scale-105 transition-transform">
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
