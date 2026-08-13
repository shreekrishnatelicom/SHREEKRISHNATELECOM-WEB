"use client";

import { useState, useEffect } from "react";
import { Save, Megaphone, Eye, EyeOff } from "lucide-react";

const COLOR_OPTIONS = [
  { value: "bauhaus-red", label: "Red", bg: "bg-bauhaus-red", text: "text-white" },
  { value: "bauhaus-blue", label: "Blue", bg: "bg-bauhaus-blue", text: "text-white" },
  { value: "bauhaus-yellow", label: "Yellow", bg: "bg-bauhaus-yellow", text: "text-black" },
  { value: "bauhaus-black", label: "Black", bg: "bg-bauhaus-black", text: "text-white" },
];

export default function AnnouncementAdmin() {
  const [message, setMessage] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [color, setColor] = useState("bauhaus-red");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/announcement")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setMessage(data.message || "");
          setIsActive(data.isActive ?? true);
          setColor(data.color || "bauhaus-red");
        }
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, isActive, color }),
      });
      if (res.ok) setSaved(true);
    } catch {}
    setIsSaving(false);
  };

  const selectedColorOption = COLOR_OPTIONS.find((c) => c.value === color)!;

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-black uppercase mb-2 border-b-4 border-bauhaus-black pb-4">Announcement Bar</h1>
      <p className="text-gray-500 mb-8">This bar appears at the very top of every page on the site.</p>

      {isLoading ? (
        <p className="font-bold uppercase text-gray-400">Loading...</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          {/* Live Preview */}
          <div>
            <p className="font-black uppercase text-sm mb-2 text-gray-600">Live Preview</p>
            <div
              className={`w-full border-4 border-bauhaus-black p-3 text-center font-bold text-sm uppercase tracking-wider ${selectedColorOption.bg} ${selectedColorOption.text} ${!isActive ? "opacity-40 line-through" : ""}`}
            >
              {message || "Your announcement will appear here..."}
            </div>
          </div>

          <div className="bg-bauhaus-white border-4 border-bauhaus-black p-8 space-y-6">
            {/* Message */}
            <div>
              <label className="block font-black uppercase text-sm mb-2 tracking-wider">Message Text</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your announcement here..."
                rows={3}
                className="w-full border-4 border-bauhaus-black p-4 text-base font-medium outline-none focus:border-bauhaus-blue resize-none"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block font-black uppercase text-sm mb-3 tracking-wider">Bar Color</label>
              <div className="flex gap-3 flex-wrap">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setColor(opt.value)}
                    className={`px-5 py-2 font-bold border-4 transition-all ${opt.bg} ${opt.text} ${color === opt.value ? "border-bauhaus-black scale-105" : "border-transparent opacity-70 hover:opacity-100"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black uppercase text-sm tracking-wider">Visibility</p>
                <p className="text-gray-500 text-sm">{isActive ? "Bar is currently visible to all users" : "Bar is hidden from users"}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`flex items-center gap-2 px-6 py-3 font-bold border-4 border-bauhaus-black transition-colors ${isActive ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}
              >
                {isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                {isActive ? "Visible" : "Hidden"}
              </button>
            </div>

            {saved && (
              <div className="bg-green-400 border-4 border-bauhaus-black p-3 font-bold uppercase text-sm">
                ✓ Announcement saved successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-3 bg-bauhaus-yellow border-4 border-bauhaus-black px-8 py-4 font-black uppercase hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving ? "Saving..." : "Save Announcement"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
