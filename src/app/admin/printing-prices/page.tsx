"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Save, X, Tag } from "lucide-react";

interface PrintingPrice {
  id: string;
  serviceType: string;
  colorMode: string;
  printSide: string;
  layout: string;
  price: number;
}

const SERVICE_TYPES = [
  { value: "study-material", label: "Study Material" },
  { value: "others",         label: "Others" },
];

const COLOR_MODES = [
  { value: "bw",    label: "Black & White" },
  { value: "color", label: "Color" },
];

const PRINT_SIDES = [
  { value: "single", label: "Single Side" },
  { value: "double", label: "Double Side" },
];

const LAYOUTS = [
  { value: "1",  label: "1 Page / Sheet (Normal)" },
  { value: "2+", label: "2+ Pages / Sheet (Multi)" },
];

const EMPTY = {
  serviceType: "study-material",
  colorMode: "bw",
  printSide: "single",
  layout: "1",
  price: "",
};

export default function AdminPrintingPrices() {
  const [prices, setPrices] = useState<PrintingPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editId, setEditId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<typeof EMPTY | any>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    const res = await fetch("/api/admin/printing-prices");
    if (res.ok) setPrices(await res.json());
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (p: PrintingPrice) => {
    setForm({
      serviceType: p.serviceType,
      colorMode: p.colorMode,
      printSide: p.printSide,
      layout: p.layout || "1",
      price: String(p.price),
    });
    setEditId(p.id);
  };

  const startNew = () => {
    setForm(EMPTY);
    setEditId("new");
  };

  const cancel = () => { setEditId(null); };

  const save = async () => {
    if (form.price === "" || isNaN(parseFloat(form.price))) return;
    setIsSaving(true);
    const body = editId === "new" ? form : { id: editId, ...form };
    const res = await fetch("/api/admin/printing-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await load();
      setEditId(null);
    } else {
      alert("Failed to save price. A price for this combination might already exist.");
    }
    setIsSaving(false);
  };

  const deletePrice = async (id: string) => {
    await fetch("/api/admin/printing-prices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setPrices((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirm(null);
  };

  const getLabel = (value: string, opts: { value: string; label: string }[]) => {
    return opts.find((o) => o.value === value)?.label || value;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 border-b-4 border-bauhaus-black pb-4 gap-4">
        <h1 className="text-4xl font-black uppercase">Printing Prices</h1>
        <button
          onClick={startNew}
          className="flex items-center gap-2 bg-bauhaus-yellow border-4 border-bauhaus-black px-5 py-3 font-black uppercase hover:bg-yellow-400 transition-colors"
        >
          <Plus className="w-5 h-5" /> Add Price
        </button>
      </div>

      {/* Add / Edit Form */}
      {editId !== null && (
        <div className="mb-8 border-4 border-bauhaus-black bg-bauhaus-white p-6 shadow-[6px_6px_0_0_#1a1a1a]">
          <h2 className="text-xl font-black uppercase mb-5 border-b-4 border-bauhaus-black pb-2">
            {editId === "new" ? "Add Printing Price" : "Edit Printing Price"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block text-xs font-black uppercase mb-1 tracking-wider">Service Type *</label>
              <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue bg-white">
                {SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1 tracking-wider">Color Mode *</label>
              <select value={form.colorMode} onChange={(e) => setForm({ ...form, colorMode: e.target.value })} className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue bg-white">
                {COLOR_MODES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1 tracking-wider">Print Side *</label>
              <select value={form.printSide} onChange={(e) => setForm({ ...form, printSide: e.target.value })} className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue bg-white">
                {PRINT_SIDES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1 tracking-wider">Pages Per Sheet *</label>
              <select value={form.layout} onChange={(e) => setForm({ ...form, layout: e.target.value })} className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue bg-white">
                {LAYOUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1 tracking-wider">Price per Page (₹) *</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border-4 border-bauhaus-black p-3 font-bold outline-none focus:border-bauhaus-blue" placeholder="e.g. 2.0" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={isSaving || form.price === ""} className="flex items-center gap-2 bg-bauhaus-blue text-white border-4 border-bauhaus-black px-6 py-3 font-black uppercase hover:bg-blue-800 disabled:opacity-50 transition-colors">
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button onClick={cancel} className="flex items-center gap-2 border-4 border-bauhaus-black px-6 py-3 font-black uppercase hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="font-bold uppercase text-gray-400">Loading prices...</p>
      ) : prices.length === 0 ? (
        <div className="border-4 border-dashed border-bauhaus-black p-12 text-center">
          <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-black uppercase text-gray-400">No prices set yet. Click "Add Price" to get started.</p>
        </div>
      ) : (
        <div className="border-4 border-bauhaus-black overflow-x-auto bg-bauhaus-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bauhaus-black text-bauhaus-white border-b-4 border-bauhaus-black font-black uppercase text-xs">
                <th className="p-4">Service Type</th>
                <th className="p-4">Color Mode</th>
                <th className="p-4">Print Side</th>
                <th className="p-4">Pages Per Sheet</th>
                <th className="p-4">Price per Page</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-bauhaus-black font-bold uppercase text-sm">
              {prices.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 border-2 border-bauhaus-black ${
                      p.serviceType === "study-material" ? "bg-bauhaus-yellow text-black" : "bg-bauhaus-blue text-white"
                    }`}>
                      {getLabel(p.serviceType, SERVICE_TYPES)}
                    </span>
                  </td>
                  <td className="p-4">{getLabel(p.colorMode, COLOR_MODES)}</td>
                  <td className="p-4 capitalize">{getLabel(p.printSide, PRINT_SIDES)} Side</td>
                  <td className="p-4 capitalize">{getLabel(p.layout || "1", LAYOUTS)}</td>
                  <td className="p-4 font-mono font-black text-lg">₹{p.price.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(p)} className="p-2 border-2 border-bauhaus-black hover:bg-bauhaus-yellow transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (deleteConfirm === p.id) deletePrice(p.id);
                          else setDeleteConfirm(p.id);
                        }}
                        className={`p-2 border-2 border-bauhaus-black transition-colors ${
                          deleteConfirm === p.id ? "bg-bauhaus-red text-white" : "hover:bg-bauhaus-red hover:text-white"
                        }`}
                        title={deleteConfirm === p.id ? "Click again to confirm" : "Delete"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
