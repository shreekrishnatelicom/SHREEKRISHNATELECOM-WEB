"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Printer, Menu, X, LogIn, User, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/track", label: "Track Order" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isAdmin = user?.email === "shreekrishnatelicomraipur@gmail.com";
  const dashboardUrl = isAdmin ? "/admin" : "/dashboard";

  return (
    <>
      {/* Mobile Menu Backdrop Overlay */}
      {menuOpen && (
        <div 
          onClick={() => setMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 z-40 transition-opacity"
        />
      )}

      <header className="border-b-4 border-bauhaus-black bg-bauhaus-yellow sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3 shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-bauhaus-black bg-bauhaus-red text-bauhaus-white font-black text-lg group-hover:bg-bauhaus-blue transition-colors">
            SK
          </div>
          <div className="leading-none">
            <p className="text-xl font-black uppercase tracking-tighter text-bauhaus-black">Shree Krishna</p>
            <p className="text-xs font-bold uppercase tracking-widest text-bauhaus-black/70">Telecom</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 font-bold text-sm uppercase tracking-wide">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 hover:bg-bauhaus-black hover:text-bauhaus-yellow transition-colors border-2 border-transparent hover:border-bauhaus-black"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          <Link
            href="/print"
            className="hidden md:flex items-center gap-2 bg-bauhaus-black text-bauhaus-yellow border-4 border-bauhaus-black px-4 py-2 font-bold uppercase text-sm hover:bg-bauhaus-red hover:text-bauhaus-white transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print Now
          </Link>
          
          {!mounted || !user ? (
            <Link
              href="/login"
              className="hidden md:flex items-center gap-1 bg-bauhaus-white border-4 border-bauhaus-black px-3 py-2 font-bold uppercase text-xs hover:bg-bauhaus-blue hover:text-bauhaus-white transition-colors"
              title="User / Admin Login"
            >
              <LogIn className="h-4 w-4" />
              <span>Login / Portal</span>
            </Link>
          ) : (
            <>
              <Link
                href={dashboardUrl}
                className="hidden md:flex items-center gap-1 bg-bauhaus-white border-4 border-bauhaus-black px-3 py-2 font-bold uppercase text-xs hover:bg-bauhaus-yellow transition-colors"
                title="My Dashboard"
              >
                <span>{isAdmin ? "Admin Panel" : "Dashboard"}</span>
              </Link>
              <Link
                href="/profile"
                className="hidden md:flex items-center gap-1 bg-bauhaus-white border-4 border-bauhaus-black px-3 py-2 font-bold uppercase text-xs hover:bg-bauhaus-yellow transition-colors"
                title="My Profile"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="hidden md:flex items-center gap-1 bg-bauhaus-red text-bauhaus-white border-4 border-bauhaus-black px-3 py-2 font-bold uppercase text-xs hover:bg-red-700 transition-colors disabled:opacity-50"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
                <span>{isLoggingOut ? "Leaving..." : "Logout"}</span>
              </button>
            </>
          )}

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden border-4 border-bauhaus-black p-2 bg-bauhaus-white hover:bg-bauhaus-red hover:text-bauhaus-white transition-colors"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 border-t-4 border-b-4 border-bauhaus-black bg-bauhaus-white z-50 shadow-xl max-h-[calc(100vh-80px)] overflow-y-auto">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block px-6 py-4 font-bold uppercase border-b-2 border-gray-200 hover:bg-bauhaus-yellow transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/print"
            onClick={() => setMenuOpen(false)}
            className="block px-6 py-4 font-bold uppercase border-b-2 border-gray-200 bg-bauhaus-black text-bauhaus-yellow hover:bg-bauhaus-red hover:text-bauhaus-white transition-colors flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Now
          </Link>
          {!mounted || !user ? (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block px-6 py-4 font-bold uppercase bg-bauhaus-black text-bauhaus-yellow"
            >
              → Login / Portal
            </Link>
          ) : (
            <>
              <Link
                href={dashboardUrl}
                onClick={() => setMenuOpen(false)}
                className="block px-6 py-4 font-bold uppercase bg-bauhaus-blue text-bauhaus-white border-b-2 border-bauhaus-black"
              >
                → {isAdmin ? "Admin Panel" : "My Dashboard"}
              </Link>
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="block px-6 py-4 font-bold uppercase bg-bauhaus-yellow text-bauhaus-black border-b-2 border-bauhaus-black"
              >
                → My Profile
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                disabled={isLoggingOut}
                className="w-full text-left block px-6 py-4 font-bold uppercase bg-bauhaus-red text-bauhaus-white disabled:opacity-50"
              >
                → {isLoggingOut ? "Leaving..." : "Logout"}
              </button>
            </>
          )}
        </div>
      )}
    </header>
    </>
  );
}

