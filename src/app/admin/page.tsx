import prisma from "@/lib/prisma";
import Link from "next/link";
import { Printer, FileText, Megaphone, Clock, Package, Layers, Tag, Calculator } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [
    pendingPrint,
    pendingOther,
    processingPrint,
    processingOther,
    completedPrint,
    completedOther,
    totalPrint,
    totalOther,
    latestRequests,
  ] = await Promise.all([
    prisma.printRequest.count({
      where: {
        status: "pending",
        OR: [
          { notes: null },
          { notes: { not: { contains: "Service Request:" } } }
        ]
      }
    }),
    prisma.printRequest.count({
      where: {
        status: "pending",
        notes: { contains: "Service Request:" }
      }
    }),
    prisma.printRequest.count({
      where: {
        status: "processing",
        OR: [
          { notes: null },
          { notes: { not: { contains: "Service Request:" } } }
        ]
      }
    }),
    prisma.printRequest.count({
      where: {
        status: "processing",
        notes: { contains: "Service Request:" }
      }
    }),
    prisma.printRequest.count({
      where: {
        status: "completed",
        OR: [
          { notes: null },
          { notes: { not: { contains: "Service Request:" } } }
        ]
      }
    }),
    prisma.printRequest.count({
      where: {
        status: "completed",
        notes: { contains: "Service Request:" }
      }
    }),
    prisma.printRequest.count({
      where: {
        OR: [
          { notes: null },
          { notes: { not: { contains: "Service Request:" } } }
        ]
      }
    }),
    prisma.printRequest.count({
      where: {
        notes: { contains: "Service Request:" }
      }
    }),
    prisma.printRequest.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const stats = [
    {
      label: "Pending",
      count: pendingPrint + pendingOther,
      subText: `Print: ${pendingPrint} | Other: ${pendingOther}`,
      bg: "bg-bauhaus-yellow",
      text: "text-bauhaus-black",
    },
    {
      label: "Processing",
      count: processingPrint + processingOther,
      subText: `Print: ${processingPrint} | Other: ${processingOther}`,
      bg: "bg-bauhaus-blue",
      text: "text-bauhaus-white",
    },
    {
      label: "Completed",
      count: completedPrint + completedOther,
      subText: `Print: ${completedPrint} | Other: ${completedOther}`,
      bg: "bg-green-500",
      text: "text-bauhaus-white",
    },
    {
      label: "Total",
      count: totalPrint + totalOther,
      subText: `Print: ${totalPrint} | Other: ${totalOther}`,
      bg: "bg-bauhaus-black",
      text: "text-bauhaus-white",
    },
  ];

  const quickLinks = [
    { href: "/admin/announcement", label: "Edit Announcement", icon: Megaphone, color: "bg-bauhaus-red text-bauhaus-white" },
    { href: "/admin/pages", label: "Edit Page Content", icon: FileText, color: "bg-bauhaus-blue text-bauhaus-white" },
    { href: "/admin/services", label: "Manage Services", icon: Package, color: "bg-bauhaus-black text-bauhaus-white" },
    { href: "/admin/printing-prices", label: "Print Prices", icon: Tag, color: "bg-bauhaus-yellow text-bauhaus-black" },
    { href: "/admin/calculator", label: "Store Calculator", icon: Calculator, color: "bg-bauhaus-blue text-bauhaus-white" },
    { href: "/admin/requests", label: "Print Requests", icon: Printer, color: "bg-bauhaus-yellow text-bauhaus-black" },
    { href: "/admin/other-requests", label: "Other Requests", icon: Layers, color: "bg-green-500 text-bauhaus-white" },
  ];

  return (
    <div>
      <h1 className="text-4xl font-black uppercase mb-8 border-b-4 border-bauhaus-black pb-4">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className={`border-4 border-bauhaus-black p-6 ${s.bg} ${s.text} shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]`}>
            <p className="text-sm font-bold uppercase mb-1 opacity-80">{s.label}</p>
            <p className="text-5xl font-black">{s.count}</p>
            {s.subText && <p className="text-[10px] font-mono font-bold mt-1 opacity-90">{s.subText}</p>}
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <h2 className="text-2xl font-black uppercase mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
        {quickLinks.map((ql) => (
          <Link key={ql.href} href={ql.href} className={`border-4 border-bauhaus-black p-5 flex items-center gap-4 font-black uppercase hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_#1a1a1a] transition-all min-h-[84px] ${ql.color}`}>
            <ql.icon className="w-7 h-7 shrink-0" />
            <span className="text-sm tracking-tight truncate leading-tight" title={ql.label}>{ql.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Requests */}
      <h2 className="text-2xl font-black uppercase mb-4">Recent Requests</h2>
      <div className="bg-bauhaus-white border-4 border-bauhaus-black">
        {latestRequests.length === 0 ? (
          <p className="p-6 text-gray-400 font-bold uppercase text-sm">No requests yet.</p>
        ) : (
          latestRequests.map((r, i) => (
            <div key={r.id} className={`flex items-center justify-between p-4 gap-4 ${i < latestRequests.length - 1 ? "border-b-4 border-bauhaus-black" : ""}`}>
              <div className="flex items-center gap-4">
                <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="font-mono font-black">{r.trackingId}</p>
                  <p className="text-sm text-gray-500">
                    {r.notes?.includes("[Service Request:")
                      ? `Service: ${r.notes.match(/\[Service Request:\s*([^\]]+)\]/)?.[1] || "Other Request"}`
                      : r.fileName}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 text-xs font-black uppercase border-2 border-bauhaus-black ${
                r.status === "pending" ? "bg-bauhaus-yellow" :
                r.status === "processing" ? "bg-bauhaus-blue text-white" :
                r.status === "completed" ? "bg-green-500 text-white" :
                "bg-bauhaus-red text-white"
              }`}>
                {r.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
