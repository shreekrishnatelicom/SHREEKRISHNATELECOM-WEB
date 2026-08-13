import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import AnnouncementBar from "@/components/AnnouncementBar";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import Link from "next/link";
import prisma from "@/lib/prisma";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shree Krishna Telecom | Cyber Cafe & Print Service in Raipur",
  description: "Your trusted local cyber cafe in Raipur for high-quality document printing, scanning, lamination, custom documents, passport size photos, and online government services.",
  keywords: [
    "cyber cafe raipur",
    "print shop raipur",
    "online document printing",
    "photocopy shop near me",
    "passport photo raipur",
    "lamination services",
    "shree krishna telecom",
    "fast printing raipur",
    "government form filling"
  ],
  authors: [{ name: "Shree Krishna Telecom" }],
  robots: "index, follow",
  openGraph: {
    title: "Shree Krishna Telecom | Cyber Cafe & Print Service in Raipur",
    description: "Your trusted local cyber cafe in Raipur for high-quality printing, scanning, lamination, and online government services.",
    type: "website",
    locale: "en_IN",
    siteName: "Shree Krishna Telecom",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shree Krishna Telecom | Cyber Cafe & Print Service",
    description: "Your trusted local cyber cafe in Raipur for high-quality printing, scanning, lamination, and online government services.",
  }
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

  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-bauhaus-white text-bauhaus-black flex flex-col`}>
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
            <Link href="/login" className="text-gray-600 text-xs font-bold uppercase hover:text-bauhaus-yellow transition-colors">Admin / Portal →</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
