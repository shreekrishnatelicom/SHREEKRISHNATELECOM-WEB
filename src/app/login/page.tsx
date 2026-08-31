"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User as UserIcon } from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

function LoginContent() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && !isRedirecting) {
        setIsRedirecting(true);
        handleAuthSuccess(currentUser).catch((err) => {
          console.error("Failed to renew session on mount:", err);
          setIsRedirecting(false);
          signOut(auth);
        });
      }
    });
    return () => unsubscribe();
  }, [redirectTo, isRedirecting]);

  const handleAuthSuccess = async (user: any) => {
    const token = await user.getIdToken();

    // Send token to backend to set session cookie
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      let errMsg = "Failed to set session";
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          const errorData = await res.json();
          if (errorData.error) {
            errMsg = `${errorData.error}${errorData.details ? `: ${errorData.details}` : ""}`;
          }
        } catch (e) {
          errMsg = `Failed to set session (Status ${res.status})`;
        }
      } else {
        try {
          const text = await res.text();
          // Extract plain text snippet or show status details
          const snippet = text.replace(/<[^>]*>/g, "").trim().slice(0, 150);
          errMsg = `Server Error (${res.status}): ${snippet || res.statusText || "Internal Server Error"}`;
        } catch (e) {
          errMsg = `Failed to set session (${res.status} ${res.statusText || ""})`;
        }
      }
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (redirectTo) {
      window.location.href = redirectTo;
    } else if (data.role === "ADMIN" || user.email === "shreekrishnatelicomraipur@gmail.com") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/dashboard";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "login") {
        setIsRedirecting(true);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(userCredential.user);
      } else {
        setIsRedirecting(true);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Set display name in Firebase
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
        await handleAuthSuccess(userCredential.user);
      }
    } catch (err: any) {
      setIsRedirecting(false);
      console.error("Auth error:", err);
      let friendlyMessage = err.message || "Authentication failed";
      
      if (err.code === "auth/email-already-in-use") {
        friendlyMessage = "This email is already registered. If you previously signed in using Google, please sign in with Google first, then set a password in your dashboard.";
      } else if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        friendlyMessage = "Invalid email or password. If you originally signed up with Google, please sign in with Google first, then set a password in your dashboard.";
      } else if (err.code === "auth/weak-password") {
        friendlyMessage = "Password must be at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address.";
      }
      
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      setIsRedirecting(true);
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await handleAuthSuccess(userCredential.user);
    } catch (err: any) {
      setIsRedirecting(false);
      console.error("Google sign-in error:", err);
      let friendlyMessage = err.message || "Google Sign-In failed";
      
      if (err.code === "auth/popup-closed-by-user") {
        friendlyMessage = "Sign-in popup was closed before completing authentication.";
      } else if (err.code === "auth/cancelled-popup-request") {
        friendlyMessage = "Only one sign-in popup can be opened at a time.";
      }
      
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address to reset password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent!");
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
      setMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-bauhaus-black flex items-center justify-center p-8 relative overflow-hidden">
      {/* Bauhaus decorative elements */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-bauhaus-red opacity-80 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-bauhaus-blue opacity-80 pointer-events-none"></div>
      <div className="absolute top-1/2 right-16 w-32 h-32 rounded-full bg-bauhaus-yellow opacity-60 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-center gap-4 mb-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-bauhaus-white bg-bauhaus-red text-bauhaus-white font-black text-2xl shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            SK
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase text-bauhaus-white tracking-tighter leading-tight">
              Shree Krishna
            </h1>
            <p className="text-bauhaus-yellow font-bold uppercase text-sm tracking-widest">
              Telecom Portal
            </p>
          </div>
        </div>

        <div className="bg-bauhaus-white border-4 border-bauhaus-white shadow-[12px_12px_0px_0px_rgba(230,22,43,1)]">
          {/* Custom Bauhaus Tab Headers */}
          <div className="grid grid-cols-2 border-b-4 border-bauhaus-black">
            <button
              onClick={() => { setMode("login"); setError(null); setMessage(null); }}
              className={`py-4 font-black uppercase tracking-wider text-center transition-colors ${
                mode === "login"
                  ? "bg-bauhaus-blue text-bauhaus-white"
                  : "bg-bauhaus-white text-bauhaus-black hover:bg-gray-100"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("register"); setError(null); setMessage(null); }}
              className={`py-4 font-black uppercase tracking-wider text-center transition-colors ${
                mode === "register"
                  ? "bg-bauhaus-yellow text-bauhaus-black"
                  : "bg-bauhaus-white text-bauhaus-black hover:bg-gray-100"
              }`}
            >
              Register
            </button>
          </div>

          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-bauhaus-red text-bauhaus-white font-bold p-4 border-4 border-bauhaus-black text-sm uppercase">
                ⚠ {error}
              </div>
            )}
            {message && (
              <div className="bg-green-500 text-white font-bold p-4 border-4 border-bauhaus-black text-sm uppercase">
                ✓ {message}
              </div>
            )}

            {mode === "login" ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block font-black uppercase text-sm mb-2 tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                        className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-3 text-lg font-bold outline-none focus:border-bauhaus-blue"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-black uppercase text-sm mb-2 tracking-wider">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full border-4 border-bauhaus-black pl-12 pr-14 py-3 text-lg font-bold outline-none focus:border-bauhaus-blue"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-bauhaus-black"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="text-bauhaus-blue hover:text-bauhaus-red text-sm font-bold mt-2 uppercase inline-block"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-bauhaus-red text-bauhaus-white border-4 border-bauhaus-black py-4 font-black text-xl uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(26,26,26,1)] transition-all"
                  >
                    {isLoading ? "Please wait..." : "Sign In →"}
                  </button>
                </form>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t-4 border-bauhaus-black"></div>
                  <span className="flex-shrink mx-4 font-black text-sm uppercase">OR</span>
                  <div className="flex-grow border-t-4 border-bauhaus-black"></div>
                </div>

                {/* Google Sign-in Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full bg-bauhaus-white text-bauhaus-black border-4 border-bauhaus-black py-4 font-black text-lg uppercase tracking-wider hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(26,26,26,1)] transition-all disabled:opacity-50"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Sign In with Google
                </button>
              </>
            ) : (
              <div className="space-y-6 py-4">
                <p className="text-sm font-bold text-gray-600 uppercase text-center leading-relaxed">
                  Registration is only available via Google account. Click below to continue.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full bg-bauhaus-yellow text-bauhaus-black border-4 border-bauhaus-black py-4 font-black text-lg uppercase tracking-wider hover:bg-yellow-400 transition-colors flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(26,26,26,1)] transition-all disabled:opacity-50"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bauhaus-black flex items-center justify-center p-8">
        <div className="text-bauhaus-white font-black uppercase tracking-widest animate-pulse">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
