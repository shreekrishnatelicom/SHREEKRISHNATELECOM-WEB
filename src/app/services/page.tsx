import Link from "next/link";
import { Printer, ArrowRight } from "lucide-react";
import prisma from "@/lib/prisma";
import ServicesClientPage from "@/components/ServicesClientPage";

export const dynamic = "force-dynamic";

const DEFAULT_SERVICES = [
  { id: "d1", name: "B&W Document Print",       price: "₹2/page",       description: "Standard black & white printing on A4/A3.",      category: "print",      isAvailable: true, hasRequestButton: false, requireImageUpload: false, requestDescription: "" },
  { id: "d2", name: "Color Print",              price: "₹10/page",      description: "Vibrant full-color printing on A4.",             category: "print",      isAvailable: true, hasRequestButton: false, requireImageUpload: false, requestDescription: "" },
  { id: "d3", name: "Double-Side Print",        price: "₹3.5/page",     description: "B&W printing on both sides of the page.",        category: "print",      isAvailable: true, hasRequestButton: false, requireImageUpload: false, requestDescription: "" },
  { id: "d4", name: "Photo Lamination",         price: "₹15/sheet",     description: "Hot lamination for A4, ID cards, certificates.", category: "lamination", isAvailable: true, hasRequestButton: false, requireImageUpload: false, requestDescription: "" },
  { id: "d5", name: "Binding",                  price: "₹30",           description: "Spiral or comb binding for reports and books.",  category: "document",   isAvailable: true, hasRequestButton: false, requireImageUpload: false, requestDescription: "" },
  { id: "d6", name: "Passport Size Photo",      price: "₹40/set (6)",   description: "Instant passport photos, government compliant.", category: "photo",      isAvailable: true, hasRequestButton: true, requireImageUpload: true, requestDescription: "Please upload your photo with a clear background." },
  { id: "d7", name: "Government Form Fill",     price: "₹30",           description: "Fill any government form accurately and fast.",  category: "government", isAvailable: true, hasRequestButton: true, requireImageUpload: false, requestDescription: "Provide details of the form you want filled in notes." },
];

export default async function ServicesPage() {
  const dbServices = await prisma.service.findMany({
    where: { isAvailable: true },
    orderBy: { sortOrder: "asc" },
  });

  const rawServices = dbServices.length > 0 ? dbServices : DEFAULT_SERVICES;

  // Cast services to the type with request attributes default value
  const services = rawServices.map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    price: s.price,
    category: s.category,
    isAvailable: s.isAvailable,
    hasRequestButton: s.hasRequestButton ?? false,
    requireImageUpload: s.requireImageUpload ?? false,
    requestDescription: s.requestDescription || "",
  }));

  // Unique categories
  const categoriesMap: Record<string, boolean> = {};
  services.forEach((s) => {
    categoriesMap[s.category || "other"] = true;
  });
  const categories = Object.keys(categoriesMap);

  return (
    <div>
      {/* Header */}
      <section className="bg-bauhaus-blue text-bauhaus-white py-14 px-6 border-b-4 border-bauhaus-black">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black uppercase tracking-widest text-bauhaus-yellow mb-2">Everything You Need</p>
          <h1 className="text-5xl md:text-6xl font-black uppercase leading-none mb-4">Our Services</h1>
          <p className="text-lg opacity-80 max-w-xl">
            From printing and lamination to government forms and passport photos — we have it all under one roof.
          </p>
        </div>
      </section>

      {/* Print CTA Banner */}
      <div className="bg-bauhaus-yellow border-b-4 border-bauhaus-black py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-black uppercase">📄 Upload your document online — no pen drive needed!</p>
          <Link href="/print" className="shrink-0 bg-bauhaus-black text-bauhaus-white border-4 border-bauhaus-black px-5 py-2 font-bold uppercase text-sm hover:bg-bauhaus-blue transition-colors flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print Online <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <ServicesClientPage services={services} categories={categories} />

      {/* Bottom CTA */}
      <section className="bg-bauhaus-black text-bauhaus-white py-14 px-6 border-t-4 border-bauhaus-black text-center">
        <h2 className="text-3xl font-black uppercase mb-3">Don't See What You Need?</h2>
        <p className="opacity-70 mb-6">Visit us in-store or contact us — we offer many more services!</p>
        <Link href="/contact" className="inline-flex items-center gap-2 bg-bauhaus-yellow text-bauhaus-black border-4 border-bauhaus-yellow px-7 py-3 font-black uppercase hover:bg-bauhaus-white transition-colors">
          Contact Us <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}
