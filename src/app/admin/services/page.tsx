"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Save, X, ToggleLeft, ToggleRight, Package, FileUp } from "lucide-react";

const CATEGORIES = [
  { value: "print",      label: "Printing" },
  { value: "lamination", label: "Lamination" },
  { value: "document",   label: "Document Services" },
  { value: "photo",      label: "Photo Services" },
  { value: "government", label: "Government Services" },
  { value: "form",       label: "Form Filling" },
  { value: "other",      label: "Other" },
];

const CATEGORY_COLOR: Record<string, string> = {
  print:      "bg-bauhaus-blue text-white",
  lamination: "bg-bauhaus-blue text-white",
  document:   "bg-bauhaus-black text-white",
  photo:      "bg-bauhaus-red text-white",
  government: "bg-bauhaus-yellow text-black",
  form:       "bg-bauhaus-black text-white",
  other:      "bg-gray-700 text-white",
};

interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  isAvailable: boolean;
  sortOrder: number;
  hasRequestButton: boolean;
  requireImageUpload: boolean;
  requestDescription: string;
  generateReceipt?: boolean;
  allowOnlinePayment?: boolean;
  allowOfflinePayment?: boolean;
}

const EMPTY: Omit<Service, "id" | "sortOrder"> = {
  name: "", description: "", price: "", category: "print", isAvailable: true,
  hasRequestButton: false, requireImageUpload: false, requestDescription: "",
  generateReceipt: true,
  allowOnlinePayment: true,
  allowOfflinePayment: true,
};

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editId, setEditId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Print Payment Settings States
  const [onlinePay, setOnlinePay] = useState(true);
  const [offlinePay, setOfflinePay] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [resServices, resSettings] = await Promise.all([
        fetch("/api/services"),
        fetch("/api/settings")
      ]);
      if (resServices.ok) setServices(await resServices.json());
      if (resSettings.ok) {
        const settingsData = await resSettings.json();
        setOnlinePay(settingsData.allowOnlinePayment ?? true);
        setOfflinePay(settingsData.allowOfflinePayment ?? true);
        setSettingsId(settingsData.id || null);
      }
    } catch (err) {
      console.error("Failed to load admin services data:", err);
    }
    setIsLoading(false);
  };

  const savePaymentSettings = async (online: boolean, offline: boolean) => {
    setIsUpdatingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: settingsId,
          allowOnlinePayment: online,
          allowOfflinePayment: offline,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOnlinePay(updated.allowOnlinePayment ?? true);
        setOfflinePay(updated.allowOfflinePayment ?? true);
        setSettingsId(updated.id || null);
      }
    } catch (err) {
      console.error("Failed to save payment settings:", err);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (svc: Service) => {
    setForm({
      name: svc.name,
      description: svc.description,
      price: svc.price,
      category: svc.category,
      isAvailable: svc.isAvailable,
      hasRequestButton: svc.hasRequestButton,
      requireImageUpload: svc.requireImageUpload,
      requestDescription: svc.requestDescription || "",
      generateReceipt: svc.generateReceipt ?? true,
      allowOnlinePayment: svc.allowOnlinePayment ?? true,
      allowOfflinePayment: svc.allowOfflinePayment ?? true,
    });
    setEditId(svc.id);
  };

  const startNew = () => {
    setForm(EMPTY);
    setEditId("new");
  };

  const cancel = () => { setEditId(null); };

  const save = async () => {
    if (!form.name || (!form.price && form.category !== "print") || !form.category) return;
    setIsSaving(true);
    const body = editId === "new" ? form : { id: editId, ...form };
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { await load(); setEditId(null); }
    setIsSaving(false);
  };

  const toggleAvailable = async (svc: Service) => {
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...svc, isAvailable: !svc.isAvailable }),
    });
    setServices((prev) => prev.map((s) => s.id === svc.id ? { ...s, isAvailable: !s.isAvailable } : s));
  };

  const deleteSvc = async (id: string) => {
    await fetch("/api/services", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setServices((prev) => prev.filter((s) => s.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 border-b-4 border-bauhaus-black pb-4 gap-4">
        <h1 className="text-4xl font-black uppercase">Manage Services</h1>
        <button
          onClick={startNew}
          className="flex items-center gap-2 bg-bauhaus-yellow border-4 border-bauhaus-black px-5 py-3 font-black uppercase hover:bg-yellow-400 transition-colors"
        >
          <Plus className="w-5 h-5" /> Add Service
        </button>
      </div>

      {/* Print Payment Settings Card */}
      <div className="mb-8 border-4 border-bauhaus-black bg-bauhaus-white p-6 shadow-[6px_6px_0_0_#1a1a1a]">
        <h2 className="text-xl font-black uppercase mb-4 border-b-4 border-bauhaus-black pb-2 text-bauhaus-blue flex items-center gap-2">
          💳 Print Request Payment Methods
        </h2>
        <p className="text-xs text-gray-500 mb-4 font-semibold uppercase">
          Enable or disable payment options for print requests. These options will be shown to users during checkout.
        </p>
        <div className="flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUpdatingSettings}
              onClick={() => {
                const newVal = !onlinePay;
                setOnlinePay(newVal);
                savePaymentSettings(newVal, offlinePay);
              }}
              className={`flex items-center gap-2 font-bold px-4 py-3 border-4 border-bauhaus-black transition-colors ${
                onlinePay ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {onlinePay ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              Online Payment (Razorpay)
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUpdatingSettings}
              onClick={() => {
                const newVal = !offlinePay;
                setOfflinePay(newVal);
                savePaymentSettings(onlinePay, newVal);
              }}
              className={`flex items-center gap-2 font-bold px-4 py-3 border-4 border-bauhaus-black transition-colors ${
                offlinePay ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {offlinePay ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              Offline Payment (Pay in Shop)
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Form */}
      {editId !== null && (
        <div className="mb-8 border-4 border-bauhaus-black bg-bauhaus-white p-6 shadow-[6px_6px_0_0_#1a1a1a]">
          <h2 className="text-xl font-black uppercase mb-5 border-b-4 border-bauhaus-black pb-2">
            {editId === "new" ? "Add New Service" : "Edit Service"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-black uppercase mb-1 tracking-wider">Service Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue" placeholder="e.g. B&W Print" />
            </div>
            {form.category !== "print" && (
              <div>
                <label className="block text-xs font-black uppercase mb-1 tracking-wider">Price *</label>
                <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue" placeholder="e.g. ₹2/page or ₹50" />
              </div>
            )}
            <div>
              <label className="block text-xs font-black uppercase mb-1 tracking-wider">Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue bg-white">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1 tracking-wider">Available?</label>
                <button type="button" onClick={() => setForm({ ...form, isAvailable: !form.isAvailable })} className={`flex items-center gap-2 font-bold px-4 py-3 border-4 border-bauhaus-black transition-colors ${form.isAvailable ? "bg-green-500 text-white" : "bg-gray-200"}`}>
                  {form.isAvailable ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  {form.isAvailable ? "Available" : "Unavailable"}
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase mb-1 tracking-wider">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border-4 border-bauhaus-black p-3 font-medium outline-none focus:border-bauhaus-blue resize-none" placeholder="Brief description of the service" />
            </div>

            {/* Service Request Options */}
            <div className="md:col-span-2 border-t-4 border-bauhaus-black pt-4 mt-2">
              <h3 className="font-black uppercase text-sm mb-4 text-bauhaus-blue">Request Button Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1 tracking-wider">Show Request Button?</label>
                  <button type="button" onClick={() => setForm({ ...form, hasRequestButton: !form.hasRequestButton })} className={`flex items-center gap-2 font-bold px-4 py-3 border-4 border-bauhaus-black transition-colors w-full ${form.hasRequestButton ? "bg-bauhaus-blue text-white" : "bg-gray-200"}`}>
                    {form.hasRequestButton ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    {form.hasRequestButton ? "Enabled" : "Disabled"}
                  </button>
                </div>

                {form.hasRequestButton && (
                  <div>
                    <label className="block text-xs font-black uppercase mb-1 tracking-wider">Generate Receipt & Tracking ID?</label>
                    <button type="button" onClick={() => setForm({ ...form, generateReceipt: !form.generateReceipt })} className={`flex items-center gap-2 font-bold px-4 py-3 border-4 border-bauhaus-black transition-colors w-full ${form.generateReceipt ? "bg-green-500 text-white" : "bg-gray-200"}`}>
                      {form.generateReceipt ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      {form.generateReceipt ? "Yes, generate receipt" : "No receipt / tracking"}
                    </button>
                  </div>
                )}

                {form.hasRequestButton && (
                  <div>
                    <label className="block text-xs font-black uppercase mb-1 tracking-wider">Require File/Image Upload?</label>
                    <button type="button" onClick={() => setForm({ ...form, requireImageUpload: !form.requireImageUpload })} className={`flex items-center gap-2 font-bold px-4 py-3 border-4 border-bauhaus-black transition-colors w-full ${form.requireImageUpload ? "bg-bauhaus-red text-white" : "bg-gray-200"}`}>
                      {form.requireImageUpload ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      {form.requireImageUpload ? "Yes, require file/image" : "No, only instructions"}
                    </button>
                  </div>
                )}

                {form.hasRequestButton && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black uppercase mb-1 tracking-wider">Request Instructions / Description</label>
                    <textarea value={form.requestDescription} onChange={(e) => setForm({ ...form, requestDescription: e.target.value })} rows={2} className="w-full border-4 border-bauhaus-black p-3 font-medium outline-none focus:border-bauhaus-blue resize-none" placeholder="e.g. Please upload your picture (white background) and enter quantity." />
                  </div>
                )}

                {form.hasRequestButton && (
                  <div className="md:col-span-2 border-t-4 border-bauhaus-black pt-4 mt-2">
                    <h4 className="font-black uppercase text-xs mb-3 text-bauhaus-red">Allowed Payment Methods for this Service</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase mb-1 tracking-wider">Allow Online Payment? (Razorpay)</label>
                        <button type="button" onClick={() => setForm({ ...form, allowOnlinePayment: !form.allowOnlinePayment })} className={`flex items-center gap-2 font-bold px-4 py-3 border-4 border-bauhaus-black transition-colors w-full ${form.allowOnlinePayment ? "bg-green-500 text-white" : "bg-gray-200"}`}>
                          {form.allowOnlinePayment ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          {form.allowOnlinePayment ? "Yes, allow online" : "No, disable online"}
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase mb-1 tracking-wider">Allow Offline Payment? (Pay at Shop)</label>
                        <button type="button" onClick={() => setForm({ ...form, allowOfflinePayment: !form.allowOfflinePayment })} className={`flex items-center gap-2 font-bold px-4 py-3 border-4 border-bauhaus-black transition-colors w-full ${form.allowOfflinePayment ? "bg-green-500 text-white" : "bg-gray-200"}`}>
                          {form.allowOfflinePayment ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          {form.allowOfflinePayment ? "Yes, allow offline" : "No, disable offline"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={isSaving || !form.name || !form.price} className="flex items-center gap-2 bg-bauhaus-blue text-white border-4 border-bauhaus-black px-6 py-3 font-black uppercase hover:bg-blue-800 disabled:opacity-50 transition-colors">
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button onClick={cancel} className="flex items-center gap-2 border-4 border-bauhaus-black px-6 py-3 font-black uppercase hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="font-bold uppercase text-gray-400">Loading services...</p>
      ) : services.length === 0 ? (
        <div className="border-4 border-dashed border-bauhaus-black p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-black uppercase text-gray-400">No services yet. Click "Add Service" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => (
            <div key={svc.id} className={`border-4 border-bauhaus-black bg-bauhaus-white flex flex-col sm:flex-row gap-4 p-5 items-start sm:items-center ${!svc.isAvailable ? "opacity-50" : ""}`}>
              {/* Category badge */}
              <span className={`px-3 py-1 text-xs font-black uppercase border-2 border-bauhaus-black shrink-0 ${CATEGORY_COLOR[svc.category] || "bg-gray-700 text-white"}`}>
                {CATEGORIES.find((c) => c.value === svc.category)?.label || svc.category}
              </span>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black uppercase">{svc.name}</p>
                  {svc.hasRequestButton && (
                    <span className="bg-bauhaus-blue text-white px-2 py-0.5 font-bold uppercase text-[9px] border border-bauhaus-black shrink-0">
                      Requestable
                    </span>
                  )}
                  {svc.hasRequestButton && svc.generateReceipt === false && (
                    <span className="bg-gray-500 text-white px-2 py-0.5 font-bold uppercase text-[9px] border border-bauhaus-black shrink-0">
                      No Receipt
                    </span>
                  )}
                  {svc.hasRequestButton && svc.requireImageUpload && (
                    <span className="bg-bauhaus-red text-white px-2 py-0.5 font-bold uppercase text-[9px] border border-bauhaus-black shrink-0 flex items-center gap-1">
                      <FileUp className="w-2.5 h-2.5" /> Upload
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{svc.description}</p>
              </div>

              {/* Price */}
              {svc.category !== "print" && (
                <span className="font-mono font-black text-lg bg-bauhaus-yellow border-2 border-bauhaus-black px-3 py-1 shrink-0">
                  {svc.price}
                </span>
              )}

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <button onClick={() => toggleAvailable(svc)} title={svc.isAvailable ? "Hide" : "Show"} className={`p-2.5 border-2 border-bauhaus-black transition-colors ${svc.isAvailable ? "hover:bg-gray-200" : "bg-green-100 hover:bg-green-200"}`}>
                  {svc.isAvailable ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                </button>
                <button onClick={() => startEdit(svc)} className="p-2.5 border-2 border-bauhaus-black hover:bg-bauhaus-yellow transition-colors">
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirm === svc.id) deleteSvc(svc.id);
                    else setDeleteConfirm(svc.id);
                  }}
                  className={`p-2.5 border-2 border-bauhaus-black transition-colors ${deleteConfirm === svc.id ? "bg-bauhaus-red text-white" : "hover:bg-bauhaus-red hover:text-white"}`}
                  title={deleteConfirm === svc.id ? "Click again to confirm" : "Delete"}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
