"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser, EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { User, Phone, Lock, Mail, Eye, EyeOff, AlertTriangle, KeyRound } from "lucide-react";

export default function OnboardingOverlay() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [hasPassword, setHasPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        // Check if password provider is linked in Firebase
        const hasPwd = currentUser.providerData.some(
          (p) => p.providerId === "password"
        );
        setHasPassword(hasPwd);

        // Fetch DB user profile to check if phone is completed
        try {
          const res = await fetch("/api/auth/profile");
          if (res.ok) {
            const data = await res.json();
            setDbUser(data);
            setName(data.name || currentUser.displayName || "");
            
            // If phone is missing in DB, we must show the overlay
            if (!data.phone) {
              setShowOverlay(true);
            } else {
              setShowOverlay(false);
            }
          }
        } catch (err) {
          console.error("Failed to check onboarding profile:", err);
        }
      } else {
        setDbUser(null);
        setShowOverlay(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setError(null);

    // Phone validation
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setError("Phone number is required.");
      return;
    }
    if (trimmedPhone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    // Password validation (only if not already set)
    if (!hasPassword) {
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setSubmitting(true);

    try {
      // 1. Link password credential to Firebase Auth if they don't have one set
      if (!hasPassword) {
        const credential = EmailAuthProvider.credential(firebaseUser.email!, password);
        try {
          await linkWithCredential(firebaseUser, credential);
        } catch (firebaseErr: any) {
          // If the credential is already linked, we can proceed. Otherwise throw error.
          if (firebaseErr.code !== "auth/provider-already-linked") {
            throw new Error(`Firebase Auth error: ${firebaseErr.message || "Failed to set account password."}`);
          }
        }
      }

      // 2. Update Name & Phone in database
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: trimmedPhone,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save profile details.");
      }

      // Onboarding successfully completed
      setShowOverlay(false);
      
      // Force reload page to refresh context
      window.location.reload();
    } catch (err: any) {
      console.error("Onboarding error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !showOverlay) return null;

  return (
    <div className="fixed inset-0 bg-bauhaus-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-bauhaus-white border-4 border-bauhaus-black shadow-[12px_12px_0px_0px_rgba(230,22,43,1)] max-w-lg w-full p-8 my-8 relative animate-[scaleUp_0.3s_ease-out]">
        
        {/* Header banner */}
        <div className="flex items-center gap-3 mb-6 border-b-4 border-bauhaus-black pb-4">
          <KeyRound className="w-8 h-8 text-bauhaus-red shrink-0" />
          <div>
            <h3 className="text-2xl font-black uppercase text-bauhaus-black leading-none">
              Complete Profile
            </h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
              One more step to enter the portal
            </p>
          </div>
        </div>

        <p className="text-xs font-bold text-gray-600 mb-6 uppercase leading-relaxed bg-bauhaus-yellow/20 border-l-4 border-bauhaus-yellow p-3">
          💡 Welcome! Since you logged in using Google, please complete your profile details below to continue.
        </p>

        {error && (
          <div className="bg-bauhaus-red text-bauhaus-white font-bold p-4 border-4 border-bauhaus-black text-sm uppercase mb-6 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block font-black uppercase text-xs mb-2 tracking-wider">Full Name *</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Full Name"
                required
                className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue bg-white"
              />
            </div>
          </div>

          {/* Email Address - locked */}
          <div>
            <label className="block font-black uppercase text-xs mb-2 tracking-wider">Email Address (Locked)</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={firebaseUser?.email || ""}
                disabled
                className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-3 text-sm font-bold outline-none bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block font-black uppercase text-xs mb-2 tracking-wider">Phone Number *</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                required
                pattern="[0-9]{10}"
                className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue bg-white"
              />
            </div>
          </div>

          {/* Password (if password provider is not yet set) */}
          {!hasPassword && (
            <>
              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Set Account Password *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    className="w-full border-4 border-bauhaus-black pl-12 pr-14 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-bauhaus-black"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    required
                    className="w-full border-4 border-bauhaus-black pl-12 pr-14 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-bauhaus-black"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-bauhaus-red text-bauhaus-white border-4 border-bauhaus-black py-4 font-black text-lg uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(26,26,26,1)] transition-all"
          >
            {submitting ? "Saving Profile..." : "Complete Profile →"}
          </button>
        </form>
      </div>
    </div>
  );
}
