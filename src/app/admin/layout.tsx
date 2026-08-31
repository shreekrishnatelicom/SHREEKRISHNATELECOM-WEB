"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Printer, LogOut, Megaphone, Package, Settings, Layers, Tag, Calculator, X, Ticket } from "lucide-react";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [storage, setStorage] = useState<{
    usedStorage: number;
    totalStorage: number;
    availableStorage: number;
    usedPercentage: number;
  } | null>(null);

  const fetchStorage = async () => {
    try {
      const res = await fetch("/api/admin/storage");
      if (res.ok) {
        const data = await res.json();
        setStorage(data);
      }
    } catch (err) {
      console.error("Failed to load storage status", err);
    }
  };

  useEffect(() => {
    fetchStorage();
    // Refresh storage every 30 seconds
    const interval = setInterval(fetchStorage, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  useEffect(() => {
    // Close sidebar on path change (navigation)
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Firebase signout error:", e);
    }
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const navSections = [
    {
      title: "System",
      items: [
        { href: "/admin",              label: "Dashboard",         icon: LayoutDashboard },
        { href: "/admin/announcement", label: "Announcement Bar",  icon: Megaphone },
        { href: "/admin/pages",        label: "Edit Pages",        icon: FileText },
        { href: "/admin/settings",     label: "Settings",          icon: Settings },
      ]
    },
    {
      title: "Store & Pricing",
      items: [
        { href: "/admin/services",     label: "Manage Services",   icon: Package },
        { href: "/admin/printing-prices", label: "Printing Prices", icon: Tag },
        { href: "/admin/coupons",      label: "Coupons",           icon: Ticket },
        { href: "/admin/calculator",   label: "Store Calculator",  icon: Calculator },
      ]
    },
    {
      title: "Queue Requests",
      items: [
        { href: "/admin/requests",     label: "Print Requests",    icon: Printer },
        { href: "/admin/other-requests", label: "Other Requests",  icon: Layers },
      ]
    }
  ];


  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-bauhaus-white text-bauhaus-black relative">
      
      {/* Mobile Top Header Bar */}
      <div className="md:hidden bg-bauhaus-black text-bauhaus-white border-b-4 border-bauhaus-red flex items-center justify-between p-4 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="border-2 border-bauhaus-white p-1 hover:bg-white/10"
            title="Open Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-black uppercase text-sm tracking-tight">Admin Menu</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-bauhaus-white bg-bauhaus-red flex items-center justify-center text-[10px] font-black">
            SK
          </div>
          <span className="text-xs text-bauhaus-yellow font-bold uppercase tracking-wider">Shree Krishna</span>
        </div>
      </div>

      {/* Sidebar Backdrop Overlay on Mobile */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static top-0 left-0 bottom-0 z-50 
        w-64 bg-bauhaus-black text-bauhaus-white 
        flex flex-col shrink-0 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Mobile Sidebar Close Button */}
        <div className="md:hidden flex justify-end p-3 bg-bauhaus-black border-b border-gray-800">
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="border-2 border-gray-700 p-1 text-gray-400 hover:text-white"
            title="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 border-b-4 border-bauhaus-red flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-bauhaus-white bg-bauhaus-red text-bauhaus-white font-black text-sm">
            SK
          </div>
          <div>
            <p className="text-base font-black uppercase tracking-tight leading-none">Admin Panel</p>
            <p className="text-xs text-bauhaus-yellow font-bold uppercase tracking-widest">Shree Krishna</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navSections.map((section, idx) => (
            <div key={section.title} className="space-y-1">
              {idx > 0 && <div className="border-t border-gray-800 my-2 pt-2" style={{ borderColor: '#262626' }} />}
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 px-3 mb-1">
                {section.title}
              </p>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 font-bold text-sm p-3 transition-all border-l-4 ${isActive ? "bg-bauhaus-red text-bauhaus-white border-bauhaus-yellow" : "text-gray-300 hover:bg-white/10 hover:text-white border-transparent"}`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {storage && (
          <div className="p-4 mx-3 my-2 border-2 border-gray-700 bg-gray-900/50 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
              Storage Usage
            </p>
            <div className="flex justify-between text-xs font-black mb-1">
              <span>{formatSize(storage.usedStorage)} / 500 MB</span>
              <span className={storage.usedPercentage > 85 ? "text-bauhaus-red" : "text-bauhaus-yellow"}>
                {storage.usedPercentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden border border-black">
              <div
                className={`h-full transition-all duration-500 ${
                  storage.usedPercentage > 85 ? "bg-bauhaus-red" :
                  storage.usedPercentage > 50 ? "bg-bauhaus-yellow" :
                  "bg-bauhaus-blue"
                }`}
                style={{ width: `${storage.usedPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="p-3 border-t-4 border-gray-700 shrink-0 space-y-2">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 font-bold text-sm p-3 w-full text-left text-gray-400 hover:bg-white/10 hover:text-white transition-colors border-l-4 border-transparent"
          >
            <LogOut className="w-5 h-5" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
          <a
            href="https://blackleafwebstudio.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-bauhaus-yellow text-bauhaus-black font-black text-[11px] py-1.5 px-2 uppercase tracking-wider hover:bg-yellow-400 border border-bauhaus-black transition-colors rounded-sm"
          >
            Developed by Blackleaf Web Studio ⚡
          </a>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 bg-gray-50 overflow-auto">
        {children}
      </main>
    </div>
  );
}
