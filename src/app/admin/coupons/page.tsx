"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Ticket, Percent } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discountPct: number;
  minPrice: number;
  isActive: boolean;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [code, setCode] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [minPrice, setMinPrice] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      if (res.ok) {
        setCoupons(await res.json());
      }
    } catch (err) {
      console.error("Failed to load coupons", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError("Coupon code is required");
      return;
    }
    if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
      setError("Coupon code must be exactly 6 characters (letters and numbers only)");
      return;
    }

    const pct = parseFloat(discountPct);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      setError("Discount percentage must be a number between 1 and 100");
      return;
    }

    const minP = parseFloat(minPrice || "0");
    if (isNaN(minP) || minP < 0) {
      setError("Minimum price must be a positive number");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanCode,
          discountPct: pct,
          minPrice: minP,
          isActive
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCode("");
        setDiscountPct("");
        setMinPrice("0");
        setIsActive(true);
        setShowAddForm(false);
        await loadCoupons();
      } else {
        setError(data.error || "Failed to add coupon");
      }
    } catch (err) {
      setError("Network error. Failed to save coupon.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert("Failed to delete coupon");
      }
    } catch (err) {
      alert("Failed to delete coupon");
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8 border-b-4 border-bauhaus-black pb-4 gap-4">
        <div className="flex items-center gap-3">
          <Ticket className="w-10 h-10 text-bauhaus-blue" />
          <h1 className="text-4xl font-black uppercase">Coupon Codes</h1>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setError(null);
          }}
          className="flex items-center gap-2 bg-bauhaus-yellow border-4 border-bauhaus-black px-5 py-3 font-black uppercase hover:bg-yellow-400 transition-colors shadow-[2px_2px_0_0_#1a1a1a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <Plus className="w-5 h-5" /> {showAddForm ? "Hide Form" : "Create Coupon"}
        </button>
      </div>

      {/* Add Coupon Form */}
      {showAddForm && (
        <div className="mb-8 border-4 border-bauhaus-black bg-bauhaus-white p-6 shadow-[6px_6px_0_0_#1a1a1a]">
          <h2 className="text-xl font-black uppercase mb-5 border-b-4 border-bauhaus-black pb-2">
            Create Coupon Code
          </h2>
          <form onSubmit={handleAddCoupon}>
            {error && (
              <div className="mb-4 border-4 border-bauhaus-black bg-bauhaus-red/10 p-3 font-bold text-bauhaus-red">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div>
                <label className="block text-xs font-black uppercase mb-1 tracking-wider">
                  Coupon Code * (6 Alphanumerics)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="E.g. SAVE20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1 tracking-wider">
                  Discount Percentage * (1 - 100)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    placeholder="E.g. 15"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    className="w-full border-4 border-bauhaus-black p-3 pr-10 font-bold outline-none focus:border-bauhaus-blue"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Percent className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1 tracking-wider">
                  Minimum Order Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="E.g. 50"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 border-4 border-bauhaus-black p-3 font-black uppercase w-full bg-white select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 accent-bauhaus-blue cursor-pointer"
                  />
                  Coupon is Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="border-4 border-bauhaus-black px-5 py-2.5 font-black uppercase bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="border-4 border-bauhaus-black bg-bauhaus-blue text-white px-6 py-2.5 font-black uppercase hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Coupon"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Coupons Table List */}
      <div className="border-4 border-bauhaus-black bg-bauhaus-white shadow-[6px_6px_0_0_#1a1a1a] overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center font-black uppercase tracking-wider">
            Loading coupons...
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-10 text-center font-black uppercase tracking-wider text-gray-400">
            No coupon codes created yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bauhaus-black text-bauhaus-white text-[11px] font-black uppercase tracking-wider">
                  <th className="p-4 border-r border-gray-800">Coupon Code</th>
                  <th className="p-4 border-r border-gray-800">Discount</th>
                  <th className="p-4 border-r border-gray-800">Min. Price Requirement</th>
                  <th className="p-4 border-r border-gray-800">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-4 divide-bauhaus-black">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 border-r-4 border-bauhaus-black">
                      <span className="font-mono font-black text-lg bg-bauhaus-yellow/30 px-2.5 py-1 border-2 border-bauhaus-black">
                        {coupon.code}
                      </span>
                    </td>
                    <td className="p-4 border-r-4 border-bauhaus-black font-black text-base">
                      {coupon.discountPct}% OFF
                    </td>
                    <td className="p-4 border-r-4 border-bauhaus-black font-black text-base text-gray-700">
                      {coupon.minPrice && coupon.minPrice > 0 ? `₹${coupon.minPrice.toFixed(2)}` : "None"}
                    </td>
                    <td className="p-4 border-r-4 border-bauhaus-black">
                      <span
                        className={`inline-block border-2 border-bauhaus-black px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_0_#1a1a1a] ${
                          coupon.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-bauhaus-red/10 text-bauhaus-red"
                        }`}
                      >
                        {coupon.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        className="bg-bauhaus-red/10 border-2 border-bauhaus-red text-bauhaus-red p-2 hover:bg-bauhaus-red hover:text-white transition-colors"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

