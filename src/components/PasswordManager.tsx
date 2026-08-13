"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  linkWithCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  User,
} from "firebase/auth";
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, KeyRound, X } from "lucide-react";

export default function PasswordManager() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Modal Form states
  const [modalNewPassword, setModalNewPassword] = useState("");
  const [modalConfirmPassword, setModalConfirmPassword] = useState("");
  const [showModalNewPassword, setShowModalNewPassword] = useState(false);
  const [showModalConfirmPassword, setShowModalConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check if "password" provider is linked
        const hasPwdProvider = currentUser.providerData.some(
          (provider) => provider.providerId === "password"
        );
        setHasPassword(hasPwdProvider);

        // Check if signed in with Google
        const isGoogleUser = currentUser.providerData.some(
          (provider) => provider.providerId === "google.com"
        );

        // Show modal if logged in via Google, no password set, and not prompted yet in this session
        if (isGoogleUser && !hasPwdProvider && !sessionStorage.getItem("skt-pass-prompted")) {
          setShowModal(true);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCloseModal = () => {
    setShowModal(false);
    sessionStorage.setItem("skt-pass-prompted", "true");
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setModalError(null);

    if (modalNewPassword.length < 6) {
      setModalError("Password must be at least 6 characters long.");
      return;
    }

    if (modalNewPassword !== modalConfirmPassword) {
      setModalError("Passwords do not match.");
      return;
    }

    setModalSubmitting(true);

    try {
      const credential = EmailAuthProvider.credential(user.email!, modalNewPassword);
      await linkWithCredential(user, credential);
      setHasPassword(true);
      setShowModal(false);
      sessionStorage.setItem("skt-pass-prompted", "true");
      setSuccess("Password successfully set! You can now log in using either Google or your email and password.");
    } catch (err: any) {
      console.error("Modal password setting error:", err);
      setModalError(err.message || "Failed to set password. Please try again.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      if (!hasPassword) {
        // User logged in via Google and wants to set their first password
        const credential = EmailAuthProvider.credential(user.email!, newPassword);
        await linkWithCredential(user, credential);
        setHasPassword(true);
        setSuccess("Password successfully set! You can now log in using either Google or your email and password.");
      } else {
        // User has a password and wants to change it
        if (!oldPassword) {
          setError("Please enter your current password.");
          setSubmitting(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email!, oldPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        setSuccess("Password successfully updated!");
      }

      // Reset form fields
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Password update error:", err);
      // Make error message user friendly
      if (err.code === "auth/wrong-password") {
        setError("The current password you entered is incorrect.");
      } else if (err.code === "auth/requires-recent-login") {
        setError("For security reasons, please log out and log back in before changing your password.");
      } else {
        setError(err.message || "Failed to update password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border-4 border-bauhaus-black p-8 max-w-xl mx-auto mt-12 animate-pulse">
        <div className="h-6 bg-gray-200 w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-100 w-full mb-3"></div>
        <div className="h-10 bg-gray-100 w-full"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      {/* Modal Popup for Google Users without password */}
      {showModal && (
        <div className="fixed inset-0 bg-bauhaus-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bauhaus-white border-4 border-bauhaus-black shadow-[12px_12px_0px_0px_rgba(230,22,43,1)] max-w-md w-full p-8 relative animate-[fadeIn_0.2s_ease-out]">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 border-2 border-bauhaus-black p-1 bg-bauhaus-white hover:bg-bauhaus-red hover:text-white transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6 border-b-4 border-bauhaus-black pb-4">
              <KeyRound className="w-8 h-8 text-bauhaus-red shrink-0" />
              <h3 className="text-xl font-black uppercase text-bauhaus-black">
                Set Account Password
              </h3>
            </div>

            <p className="text-xs font-bold text-gray-600 mb-6 uppercase leading-relaxed">
              You logged in through Google! Please set a password below so that you can also sign in with your email and password.
            </p>

            {modalError && (
              <div className="bg-bauhaus-red text-bauhaus-white font-bold p-4 border-4 border-bauhaus-black text-xs uppercase mb-6 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-6">
              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showModalNewPassword ? "text" : "password"}
                    value={modalNewPassword}
                    onChange={(e) => setModalNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    className="w-full border-4 border-bauhaus-black pl-12 pr-14 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalNewPassword(!showModalNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-bauhaus-black"
                  >
                    {showModalNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showModalConfirmPassword ? "text" : "password"}
                    value={modalConfirmPassword}
                    onChange={(e) => setModalConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    required
                    className="w-full border-4 border-bauhaus-black pl-12 pr-14 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalConfirmPassword(!showModalConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-bauhaus-black"
                  >
                    {showModalConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-white hover:bg-gray-100 text-bauhaus-black border-4 border-bauhaus-black py-3 font-black text-sm uppercase tracking-wider transition-all"
                >
                  Later
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="flex-1 bg-bauhaus-red text-bauhaus-white border-4 border-bauhaus-black py-3 font-black text-sm uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(26,26,26,1)] transition-all"
                >
                  {modalSubmitting ? "Setting..." : "Set Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main card representation */}
      <div className="bg-white border-4 border-bauhaus-black shadow-[8px_8px_0px_0px_rgba(230,22,43,1)] p-8 max-w-xl mx-auto mt-12">
        <div className="flex items-center gap-3 mb-6 border-b-4 border-bauhaus-black pb-4">
          <KeyRound className="w-8 h-8 text-bauhaus-red shrink-0" />
          <h3 className="text-2xl font-black uppercase text-bauhaus-black">
            {hasPassword ? "Change Password" : "Set Account Password"}
          </h3>
        </div>

        <p className="text-sm font-bold text-gray-600 mb-6 uppercase">
          {hasPassword
            ? "Update your login credentials. You will need to provide your current password."
            : "You currently login through Google. Set a password below so you can also login using your email and password."}
        </p>

        {error && (
          <div className="bg-bauhaus-red text-bauhaus-white font-bold p-4 border-4 border-bauhaus-black text-sm uppercase mb-6 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-500 text-white font-bold p-4 border-4 border-bauhaus-black text-sm uppercase mb-6 flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {hasPassword && (
            <div>
              <label className="block font-black uppercase text-sm mb-2 tracking-wider">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  required={hasPassword}
                  className="w-full border-4 border-bauhaus-black pl-12 pr-14 py-3 text-lg font-bold outline-none focus:border-bauhaus-blue"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-bauhaus-black"
                >
                  {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block font-black uppercase text-sm mb-2 tracking-wider">
              {hasPassword ? "New Password" : "Password"}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                className="w-full border-4 border-bauhaus-black pl-12 pr-14 py-3 text-lg font-bold outline-none focus:border-bauhaus-blue"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-bauhaus-black"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-black uppercase text-sm mb-2 tracking-wider">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                required
                className="w-full border-4 border-bauhaus-black pl-12 pr-14 py-3 text-lg font-bold outline-none focus:border-bauhaus-blue"
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-bauhaus-blue text-bauhaus-white border-4 border-bauhaus-black py-4 font-black text-xl uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(26,26,26,1)] transition-all"
          >
            {submitting ? "Updating..." : hasPassword ? "Update Password →" : "Set Password →"}
          </button>
        </form>
      </div>
    </>
  );
}
