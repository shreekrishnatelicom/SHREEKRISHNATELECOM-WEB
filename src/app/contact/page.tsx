import { MapPin, Phone, Clock, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
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
    <div>
      {/* Hero */}
      <section className="bg-bauhaus-black text-bauhaus-white py-16 px-6 border-b-4 border-bauhaus-black">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black uppercase tracking-widest text-bauhaus-yellow mb-2">Get In Touch</p>
          <h1 className="text-5xl md:text-6xl font-black uppercase leading-none mb-4">Contact Us</h1>
          <p className="text-xl opacity-80 max-w-xl">
            Walk in, call us, or send a message. We're always happy to help!
          </p>
        </div>
      </section>

      {/* Info Grid */}
      <section className="py-14 px-6 border-b-4 border-bauhaus-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: MapPin, title: "Address", color: "bg-bauhaus-red text-white",
              lines: ["Shree Krishna Telecom", settings.location, ""],
            },
            {
              icon: Phone, title: "Phone", color: "bg-bauhaus-blue text-white",
              lines: [settings.phone, "Available for calls", "Walk-ins welcome!"],
            },
            {
              icon: Mail, title: "Email", color: "bg-bauhaus-yellow text-black",
              lines: [settings.email, "", "Reply within 24h"],
            },
            {
              icon: Clock, title: "Hours", color: "bg-bauhaus-black text-white border-bauhaus-white",
              lines: ["Mon–Sat: 9AM–9PM", "Sunday: 10AM–7PM", settings.isOpen ? "🟢 Currently Open" : "🔴 Currently Closed"],
            },
          ].map((info) => (
            <div key={info.title} className="border-4 border-bauhaus-black overflow-hidden">
              <div className={`flex items-center gap-3 p-4 border-b-4 border-bauhaus-black ${info.color}`}>
                <info.icon className="w-6 h-6 shrink-0" />
                <h3 className="font-black uppercase">{info.title}</h3>
              </div>
              <div className="p-5 bg-bauhaus-white h-full">
                {info.lines.map((l, i) => (
                  <p key={i} className={`${i === 0 ? "font-bold" : "text-gray-500"} text-sm leading-relaxed truncate`}>{l || <br />}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Map Section */}
      <section className="py-14 px-6 bg-gray-50 border-b-4 border-bauhaus-black">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-black uppercase mb-6">Find Us</h2>
          <div className="border-4 border-bauhaus-black bg-bauhaus-black p-8 text-bauhaus-white">
            <div className="text-center">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-bauhaus-yellow" />
              <p className="font-black uppercase text-xl">Shree Krishna Telecom</p>
              <p className="text-gray-400 text-sm mt-1">{settings.location}</p>
              <a
                href={settings.mapLink || "https://maps.google.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 bg-bauhaus-yellow text-bauhaus-black border-4 border-bauhaus-yellow px-5 py-2 font-bold uppercase text-sm hover:bg-white transition-colors"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-14 px-6 border-b-4 border-bauhaus-black">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-black uppercase mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4 max-w-3xl">
            {[
              { q: "Do I need to bring a pen drive to print?", a: "No! You can upload your PDF directly from our website and come with just your Tracking ID." },
              { q: "How long does printing take?", a: "Usually 2–5 minutes. Walk in, show your tracking ID, pay, and collect your prints immediately." },
              { q: "What size paper do you print on?", a: "We support A4 (standard), A3, and legal size paper for all print jobs." },
              { q: "Do you offer same-day lamination?", a: "Yes! Lamination is done instantly while you wait. No appointment needed." },
              { q: "Can you help with government forms?", a: "Absolutely. We assist with Aadhaar, PAN, railway tickets, and many other government applications." },
            ].map((faq, i) => (
              <div key={i} className="border-4 border-bauhaus-black bg-bauhaus-white">
                <div className="flex items-start gap-4 p-5">
                  <span className="font-mono font-black text-bauhaus-red text-xl w-6 shrink-0">Q</span>
                  <div>
                    <p className="font-bold">{faq.q}</p>
                    <p className="text-gray-600 text-sm mt-2 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Print CTA */}
      <section className="py-12 px-6 text-center">
        <h2 className="text-3xl font-black uppercase mb-3">Ready to Print?</h2>
        <p className="text-gray-600 mb-6">Upload your document online in seconds.</p>
        <Link href="/print" className="inline-flex items-center gap-2 bg-bauhaus-red text-bauhaus-white border-4 border-bauhaus-black px-8 py-4 font-black uppercase hover:bg-red-700 transition-colors">
          Start Print Request <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}
