import Link from "next/link";
import { Users, Target, Award, MapPin, Phone, Clock, ArrowRight } from "lucide-react";

export default function AboutPage() {
  const team = [
    { name: "Owner / Manager", role: "Shree Krishna Telecom", initial: "SK" },
    { name: "Print Specialist", role: "Printing & Lamination", initial: "PS" },
    { name: "Govt. Services", role: "Form Filling & Documentation", initial: "GS" },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-bauhaus-red text-bauhaus-white py-16 px-6 border-b-4 border-bauhaus-black">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black uppercase tracking-widest text-bauhaus-yellow mb-2">Since 2010</p>
          <h1 className="text-5xl md:text-6xl font-black uppercase leading-none mb-4">About Us</h1>
          <p className="text-xl opacity-90 max-w-2xl">
            Shree Krishna Telecom is your trusted neighborhood cyber cafe and print center, serving the community for over a decade.
          </p>
        </div>
      </section>

      {/* Mission + Values */}
      <section className="py-14 px-6 max-w-7xl mx-auto border-b-4 border-bauhaus-black">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <Target className="w-8 h-8 text-bauhaus-red" />
              <h2 className="text-3xl font-black uppercase">Our Mission</h2>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              We believe everyone deserves fast, affordable, and reliable access to printing and digital services — without the hassle.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed">
              From a simple photocopy to a complex government form, we treat every customer's need with care and professionalism.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Affordable", desc: "Lowest prices in the area", color: "bg-bauhaus-yellow" },
              { label: "Reliable", desc: "Same-day service guarantee", color: "bg-bauhaus-blue text-white" },
              { label: "Fast", desc: "In and out in minutes", color: "bg-bauhaus-red text-white" },
              { label: "Trusted", desc: "1000s of satisfied customers", color: "bg-bauhaus-black text-white" },
            ].map((v) => (
              <div key={v.label} className={`border-4 border-bauhaus-black p-5 ${v.color}`}>
                <p className="font-black uppercase text-lg mb-1">{v.label}</p>
                <p className="text-sm opacity-80">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-14 px-6 bg-gray-50 border-b-4 border-bauhaus-black">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-black uppercase mb-6 border-l-8 border-bauhaus-red pl-4">Our Story</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { year: "2010", title: "Founded", desc: "Started as a small internet cafe with 5 computers and a single printer." },
              { year: "2015", title: "Expanded", desc: "Added government services, lamination, and passport photo services." },
              { year: "2024", title: "Online", desc: "Launched online PDF upload — customers can now print without a pen drive." },
            ].map((item) => (
              <div key={item.year} className="border-4 border-bauhaus-black bg-bauhaus-white p-6">
                <span className="text-4xl font-black text-bauhaus-red block mb-2">{item.year}</span>
                <h3 className="text-xl font-black uppercase mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-14 px-6 border-b-4 border-bauhaus-black">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-black uppercase mb-8">Our Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {team.map((member, i) => (
              <div key={member.name} className="border-4 border-bauhaus-black text-center overflow-hidden">
                <div className={`py-10 text-bauhaus-white text-5xl font-black ${i === 0 ? "bg-bauhaus-blue" : i === 1 ? "bg-bauhaus-red" : "bg-bauhaus-black"}`}>
                  {member.initial}
                </div>
                <div className="p-5">
                  <p className="font-black uppercase">{member.name}</p>
                  <p className="text-sm text-gray-500 mt-1">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-6 text-center">
        <h2 className="text-3xl font-black uppercase mb-4">Visit Us Today</h2>
        <p className="text-gray-600 mb-6">Walk in any time during business hours — no appointment needed.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/services" className="bg-bauhaus-blue text-bauhaus-white border-4 border-bauhaus-black px-7 py-3 font-bold uppercase hover:bg-blue-800 transition-colors">
            View Services
          </Link>
          <Link href="/contact" className="bg-bauhaus-yellow border-4 border-bauhaus-black px-7 py-3 font-bold uppercase hover:bg-yellow-400 transition-colors flex items-center gap-2">
            Contact Us <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
