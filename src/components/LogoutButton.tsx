"use client";

import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center gap-2 bg-bauhaus-red text-bauhaus-white px-4 py-2 font-bold uppercase border-4 border-bauhaus-black hover:bg-red-700 transition-colors disabled:opacity-50"
    >
      <LogOut className="w-4 h-4" /> {isLoading ? "Signing Out..." : "Sign Out"}
    </button>
  );
}
