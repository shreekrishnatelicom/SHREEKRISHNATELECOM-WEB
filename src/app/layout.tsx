import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import AnnouncementBar from "@/components/AnnouncementBar";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Suspense } from "react";
import RouteLoader from "@/components/RouteLoader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://shreekrishnatelecom.store"),
  title: {
    default: "Shree Krishna Telecom | Cyber Cafe & Online Print Service in Raipur",
    template: "%s | Shree Krishna Telecom",
  },
  description: "Raipur's premier cyber cafe & online print store. Order document printing, scanning, lamination, passport size photos, xerox & online government services fast at shreekrishnatelecom.store.",
  keywords: [
    // 1. Homepage
    "cyber cafe near me",
    "cyber cafe Raipur",
    "print shop Raipur",
    "print shop near me",
    "cyber cafe near main market Raipur",
    "best cyber cafe in Raipur",
    "online print shop Raipur",
    "Shree Krishna Telecom",
    "Shree Krishna Telecom Raipur",
    "trusted cyber cafe near main market",
    // 2. Services Page
    "document printing shop Raipur",
    "photocopy shop near me",
    "xerox shop near me",
    "xerox shop Raipur",
    "photocopy shop Raipur",
    "printing service near main market",
    "internet cafe Raipur",
    "cyber cafe open now Raipur",
    "best cyber cafe rates Raipur",
    "Shree Krishna Telecom near main market",
    // 3. Print Online / Upload Page
    "online document printing",
    "upload document for printing online",
    "print without pen drive",
    "print from mobile phone shop",
    "upload PDF and print near me",
    "online cyber cafe order Raipur",
    "digital print order Raipur",
    "print and collect same day",
    "PDF print online Raipur",
    "same day printing service",
    // 4. Track Order Page
    "track my print order",
    "online print order tracking",
    "cyber cafe with online upload",
    "Shree Krishna Telecom online print",
    "urgent print near me",
    "print PDF online Raipur",
    "document print and pickup Raipur",
    "instant order tracking cyber cafe",
    "Shree Krishna Telecom contact number",
    "Shree Krishna Telecom timings",
    // 5. B&W / Color Printing Page
    "black and white printing near me",
    "color printing service Raipur",
    "double side printing shop",
    "cheap printing per page Raipur",
    "A4 print shop near me",
    "bulk document printing Raipur",
    "printout shop near me",
    "cheapest printing shop Raipur",
    "printing rate list Raipur",
    "low cost color printing Raipur",
    // 6. Student / Study Material Printing Page
    "student notes printing Raipur",
    "book printing shop Raipur",
    "resume printing near me",
    "certificate printing Raipur",
    "affordable photocopy shop",
    "cheap government form filling",
    "best value print shop Raipur",
    "budget friendly print shop",
    "best price per page printing",
    "affordable passport photo price",
    // 7. Passport Photo Page
    "passport size photo Raipur",
    "passport photo near me",
    "passport photo studio Raipur",
    "instant passport photo",
    "digital passport photo Raipur",
    "stamp size photo Raipur",
    "photo studio near main market",
    "ID photo print shop",
    "visa photo Raipur",
    "photo print same day Raipur",
    // 8. Lamination & Binding Page
    "lamination near me",
    "document lamination Raipur",
    "ID card lamination shop",
    "spiral binding near me",
    "certificate lamination Raipur",
    "lamination services near me",
    "binding shop Raipur",
    "laminate documents near main market",
    "Shree Krishna Telecom print",
    "Shree Krishna Telecom reviews",
    // 9. Government Services / Forms Page
    "Aadhaar card correction Raipur",
    "Aadhaar card update near me",
    "PAN card apply online Raipur",
    "PAN card correction shop",
    "government form filling near me",
    "online form filling service Raipur",
    "Ayushman card apply Raipur",
    "ration card apply online",
    "voter ID correction Raipur",
    "CSC center near me",
    // 10. Blog / FAQ Page
    "where to print documents in Raipur",
    "how to apply PAN card near main market",
    "nearest cyber cafe open now",
    "best place for passport photo in Raipur",
    "where can I print online in Raipur",
    "how to fill Aadhaar form Raipur",
    "cheapest place to print PDF Raipur",
    "same day passport photo shop near me",
    "birth certificate apply online",
    "income certificate Raipur"
  ],
  authors: [{ name: "Shree Krishna Telecom", url: "https://shreekrishnatelecom.store" }],
  creator: "Shree Krishna Telecom",
  publisher: "Shree Krishna Telecom",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://shreekrishnatelecom.store",
  },
  openGraph: {
    title: "Shree Krishna Telecom | Cyber Cafe & Online Print Store in Raipur",
    description: "Order document printing, scanning, lamination, passport size photos, xerox & online government form filling services directly at shreekrishnatelecom.store.",
    url: "https://shreekrishnatelecom.store",
    siteName: "Shree Krishna Telecom",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shree Krishna Telecom | Cyber Cafe & Print Store",
    description: "Raipur's top cyber cafe for online document printing, lamination, photos & government services at shreekrishnatelecom.store.",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const dbSettings = await prisma.shopSettings.findFirst();
  const settings = dbSettings || {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Shree Krishna Telecom",
    "image": "https://shreekrishnatelecom.store/hero.png",
    "@id": "https://shreekrishnatelecom.store",
    "url": "https://shreekrishnatelecom.store",
    "telephone": settings.phone,
    "email": settings.email,
    "priceRange": "₹",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": settings.location,
      "addressLocality": "Raipur",
      "addressRegion": "Chhattisgarh",
      "addressCountry": "IN"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      "opens": "09:00",
      "closes": "21:00"
    },
    "sameAs": [
      settings.facebook,
      settings.instagram,
      settings.whatsapp,
      settings.telegram
    ].filter(Boolean)
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-bauhaus-white text-bauhaus-black flex flex-col`}>
        <Suspense fallback={null}>
          <RouteLoader />
        </Suspense>
        <AnnouncementBar />
        <Header />
        <OnboardingOverlay />
        <main className="flex-1">{children}</main>
        <footer className="border-t-4 border-bauhaus-black bg-bauhaus-black text-bauhaus-white">
          <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full border-4 border-bauhaus-white bg-bauhaus-red flex items-center justify-center font-black text-sm">SK</div>
                <div>
                  <p className="font-black uppercase leading-none">Shree Krishna</p>
                  <p className="text-xs text-bauhaus-yellow font-bold uppercase tracking-widest">Telecom</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-4">Your trusted local cyber cafe for print, internet, and government services.</p>
              
              {/* Dynamic Social Links */}
              {(settings.whatsapp || settings.telegram || settings.facebook || settings.instagram) && (
                <div className="flex gap-2">
                  {settings.whatsapp && (
                    <a href={settings.whatsapp} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-700 text-white p-2 border border-bauhaus-white text-xs uppercase font-black" title="WhatsApp">
                      WA
                    </a>
                  )}
                  {settings.telegram && (
                    <a href={settings.telegram} target="_blank" rel="noopener noreferrer" className="bg-sky-500 hover:bg-sky-600 text-white p-2 border border-bauhaus-white text-xs uppercase font-black" title="Telegram">
                      TG
                    </a>
                  )}
                  {settings.facebook && (
                    <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white p-2 border border-bauhaus-white text-xs uppercase font-black" title="Facebook">
                      FB
                    </a>
                  )}
                  {settings.instagram && (
                    <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="bg-pink-600 hover:bg-pink-700 text-white p-2 border border-bauhaus-white text-xs uppercase font-black" title="Instagram">
                      IG
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Links */}
            <div>
              <p className="font-black uppercase text-sm mb-4 text-bauhaus-yellow">Quick Links</p>
              <div className="space-y-2">
                {[
                  { href: "/",         label: "Home" },
                  { href: "/services", label: "Services" },
                  { href: "/print",    label: "Print Online" },
                  { href: "/track",    label: "Track Order" },
                  { href: "/about",    label: "About Us" },
                  { href: "/contact",  label: "Contact" },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="block text-gray-400 text-sm hover:text-bauhaus-yellow transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="font-black uppercase text-sm mb-4 text-bauhaus-yellow">Contact</p>
              <div className="space-y-2 text-gray-400 text-sm font-semibold">
                <p>📍 {settings.location}</p>
                <p>📞 {settings.phone}</p>
                <p>✉️ {settings.email}</p>
                <p>🕘 Mon–Sat: 9AM–9PM ({settings.isOpen ? "🟢 OPEN" : "🔴 CLOSED"})</p>
              </div>
            </div>
          </div>

          <div className="border-t-4 border-gray-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <p className="text-gray-500 text-xs font-bold uppercase">© {new Date().getFullYear()} Shree Krishna Telecom</p>
              <div className="hidden sm:flex gap-3">
                <span className="h-3 w-3 bg-bauhaus-red rounded-full block"></span>
                <span className="h-3 w-3 bg-bauhaus-blue rounded-full block"></span>
                <span className="h-3 w-3 bg-bauhaus-yellow rounded-full block"></span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs font-bold uppercase text-gray-500">
              <Link href="/terms" className="hover:text-bauhaus-yellow transition-colors">Terms & Conditions</Link>
              <span className="text-gray-700">|</span>
              <Link href="/privacy" className="hover:text-bauhaus-yellow transition-colors">Privacy Policy</Link>
              <span className="text-gray-700">|</span>
              <Link href="/refund" className="hover:text-bauhaus-yellow transition-colors">Refund Policy</Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase">
              
              <a
                href="https://blackleafwebstudio.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-bauhaus-yellow text-bauhaus-black font-black px-2.5 py-1 text-xs uppercase tracking-wider hover:bg-yellow-400 border border-bauhaus-black shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] transition-all inline-flex items-center gap-1"
              >
                Developed by Blackleaf Web Studio ⚡
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
