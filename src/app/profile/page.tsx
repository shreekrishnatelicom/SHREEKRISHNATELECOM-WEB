"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
  signOut,
} from "firebase/auth";
import {
  User as UserIcon,
  Phone as PhoneIcon,
  Mail as MailIcon,
  Lock as LockIcon,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Profile Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  
  // Password Form States
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Status states
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFbUser(currentUser);
      if (currentUser) {
        // Check if password provider is linked in Firebase
        const hasPwd = currentUser.providerData.some(
          (p) => p.providerId === "password"
        );
        setHasPassword(hasPwd);

        // Fetch DB user profile
        try {
          const res = await fetch("/api/auth/profile");
          if (res.ok) {
            const data = await res.json();
            setName(data.name || "");
            setPhone(data.phone || "");
            setEmail(data.email || "");
          } else {
            console.error("Failed to load user profile from DB");
          }
        } catch (err) {
          console.error("Error loading user profile:", err);
        }
      } else {
        // If not logged in, redirect to login
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser) return;

    setProfileSuccess(null);
    setProfileError(null);
    setUpdatingProfile(true);

    const trimmedPhone = phone.trim();
    if (trimmedPhone.length < 10) {
      setProfileError("Please enter a valid 10-digit phone number.");
      setUpdatingProfile(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: trimmedPhone,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update profile.");
      }

      setProfileSuccess("Profile details updated successfully!");
    } catch (err: any) {
      console.error(err);
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser) return;

    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setUpdatingPassword(true);

    try {
      // Reauthenticate user if they already have a password set
      if (hasPassword) {
        if (!currentPassword) {
          setPasswordError("Current password is required.");
          setUpdatingPassword(false);
          return;
        }
        const credential = EmailAuthProvider.credential(fbUser.email!, currentPassword);
        await reauthenticateWithCredential(fbUser, credential);
      }

      // Update password in Firebase
      await updatePassword(fbUser, newPassword);
      setPasswordSuccess("Password updated successfully!");
      setHasPassword(true);

      // Reset fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        setPasswordError("Incorrect current password.");
      } else if (err.code === "auth/requires-recent-login") {
        setPasswordError("For security reasons, please log out and sign back in before modifying your password.");
      } else {
        setPasswordError(err.message || "Failed to update password.");
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!fbUser) return;

    setDeleteError(null);
    setDeletingAccount(true);

    try {
      // 1. Delete user from database via API
      const res = await fetch("/api/auth/profile", {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete account from server.");
      }

      // 2. Delete user from Firebase Auth
      try {
        await deleteUser(fbUser);
      } catch (firebaseErr: any) {
        // If it requires recent login, show warning
        if (firebaseErr.code === "auth/requires-recent-login") {
          throw new Error("This action requires a recent sign-in. Please log out, log back in, and try deleting your account again.");
        }
        throw firebaseErr;
      }

      // 3. Complete logout and redirect to home
      await signOut(auth);
      await fetch("/api/auth/logout", { method: "POST" });
      
      setShowDeleteModal(false);
      window.location.href = "/";
    } catch (err: any) {
      console.error("Account deletion error:", err);
      setDeleteError(err.message || "Failed to delete account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bauhaus-white flex items-center justify-center p-8">
        <p className="font-black uppercase tracking-widest text-gray-400 animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  const isAdmin = fbUser?.email === "shreekrishnatelicomraipur@gmail.com";
  const dashboardUrl = isAdmin ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen bg-bauhaus-white py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* Back Link */}
        <Link href={dashboardUrl} className="inline-flex items-center gap-2 font-black uppercase text-sm text-bauhaus-blue hover:text-bauhaus-red transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Page Title */}
        <div className="bg-bauhaus-blue text-bauhaus-white border-4 border-bauhaus-black p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <h1 className="text-3xl font-black uppercase">My Profile</h1>
          <p className="text-xs text-bauhaus-yellow font-bold uppercase tracking-widest mt-1">Manage Account Settings & Credentials</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white border-4 border-bauhaus-black p-8 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
          <h3 className="text-xl font-black uppercase mb-4 border-b-4 border-bauhaus-black pb-2">Profile Details</h3>
          
          {profileError && (
            <div className="bg-bauhaus-red text-bauhaus-white font-bold p-4 border-4 border-bauhaus-black text-xs uppercase mb-6 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          {profileSuccess && (
            <div className="bg-green-500 text-white font-bold p-4 border-4 border-bauhaus-black text-xs uppercase mb-6 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Phone Number</label>
                <div className="relative">
                  <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    pattern="[0-9]{10}"
                    className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-black uppercase text-xs mb-2 tracking-wider">Email Address (Locked)</label>
              <div className="relative">
                <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-3 text-sm font-bold outline-none bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updatingProfile}
              className="bg-bauhaus-blue text-white border-4 border-bauhaus-black px-6 py-3 font-black text-sm uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(26,26,26,1)] transition-all disabled:opacity-50"
            >
              {updatingProfile ? "Updating Details..." : "Update Details"}
            </button>
          </form>
        </div>

        {/* Password Card */}
        <div className="bg-white border-4 border-bauhaus-black p-8 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
          <div className="flex items-center gap-3 border-b-4 border-bauhaus-black pb-2 mb-4">
            <KeyRound className="w-6 h-6 text-bauhaus-red shrink-0" />
            <h3 className="text-xl font-black uppercase">
              {hasPassword ? "Change Password" : "Set Password"}
            </h3>
          </div>

          <p className="text-xs font-bold text-gray-500 uppercase leading-relaxed mb-6">
            {hasPassword
              ? "Update your login credentials. You will need to provide your current password."
              : "You currently login through Google. Set a password below so you can also login using your email and password."}
          </p>

          {passwordError && (
            <div className="bg-bauhaus-red text-bauhaus-white font-bold p-4 border-4 border-bauhaus-black text-xs uppercase mb-6 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="bg-green-500 text-white font-bold p-4 border-4 border-bauhaus-black text-xs uppercase mb-6 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-6">
            {hasPassword && (
              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Current Password</label>
                <div className="relative">
                  <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required={hasPassword}
                    className="w-full border-4 border-bauhaus-black pl-12 pr-14 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-bauhaus-black"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">
                  {hasPassword ? "New Password" : "Password"}
                </label>
                <div className="relative">
                  <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Min 6 characters"
                    className="w-full border-4 border-bauhaus-black pl-12 pr-14 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue"
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
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    placeholder="Re-type new password"
                    className="w-full border-4 border-bauhaus-black pl-12 pr-14 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-bauhaus-black"
                  >
                    {showConfirmNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="bg-bauhaus-blue text-white border-4 border-bauhaus-black px-6 py-3 font-black text-sm uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(26,26,26,1)] transition-all disabled:opacity-50"
            >
              {updatingPassword ? "Setting Password..." : hasPassword ? "Update Password" : "Set Password"}
            </button>
          </form>
        </div>

        {/* Delete Account Card */}
        <div className="bg-bauhaus-red/10 border-4 border-bauhaus-red p-8 shadow-[8px_8px_0px_0px_rgba(230,22,43,1)]">
          <h3 className="text-xl font-black uppercase text-bauhaus-red mb-2">Delete Account</h3>
          <p className="text-xs font-bold text-gray-600 uppercase leading-relaxed mb-6">
            Permanently delete your account and all associated order history. This action is irreversible.
          </p>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="bg-bauhaus-red text-white border-4 border-bauhaus-black px-6 py-3 font-black text-sm uppercase tracking-wider hover:bg-red-700 transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(26,26,26,1)] transition-all flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div 
          onClick={() => setShowDeleteModal(false)}
          className="fixed inset-0 bg-bauhaus-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-bauhaus-white border-4 border-bauhaus-black shadow-[12px_12px_0px_0px_rgba(230,22,43,1)] max-w-md w-full p-8 relative animate-[scaleUp_0.2s_ease-out] cursor-default"
          >
            <div className="flex items-center gap-3 mb-4 border-b-4 border-bauhaus-black pb-4">
              <AlertTriangle className="w-8 h-8 text-bauhaus-red shrink-0" />
              <h3 className="text-2xl font-black uppercase text-bauhaus-black">
                Confirm Deletion
              </h3>
            </div>

            <p className="text-xs font-bold text-gray-600 mb-6 uppercase leading-relaxed">
              ⚠️ WARNING: This will permanently delete your account, including all of your order history. This action cannot be undone. Are you sure you want to proceed?
            </p>

            {deleteError && (
              <div className="bg-bauhaus-red text-bauhaus-white font-bold p-4 border-4 border-bauhaus-black text-xs uppercase mb-6 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                className="flex-1 bg-white hover:bg-gray-100 text-bauhaus-black border-4 border-bauhaus-black py-3 font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 bg-bauhaus-red text-bauhaus-white border-4 border-bauhaus-black py-3 font-black text-sm uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(26,26,26,1)] transition-all"
              >
                {deletingAccount ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
