"use client";

import { useState, useEffect } from "react";
import { Save, ChevronDown, Image as ImageIcon } from "lucide-react";

const PAGES = [
  { slug: "home", label: "🏠 Home Page" },
  { slug: "about", label: "ℹ️ About Us" },
  { slug: "services", label: "🛠️ Services" },
  { slug: "contact", label: "📞 Contact" },
  { slug: "terms", label: "📜 Terms & Conditions" },
  { slug: "privacy", label: "🔒 Privacy Policy" },
  { slug: "refund", label: "💸 Refund Policy" },
];

interface PageData {
  title: string;
  content: string;
  imageUrl?: string;
}

export default function EditPages() {
  const [selectedSlug, setSelectedSlug] = useState("home");
  const [pageData, setPageData] = useState<PageData>({ title: "", content: "", imageUrl: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadPage = async (slug: string) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/pages?slug=${slug}`);
      if (res.ok) {
        const data = await res.json();
        setPageData({
          title: data.title || "",
          content: data.content || "",
          imageUrl: data.imageUrl || "",
        });
      }
    } catch { }
    setIsLoading(false);
  };

  useEffect(() => {
    loadPage(selectedSlug);
  }, [selectedSlug]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: selectedSlug, ...pageData }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Page saved successfully!" });
    } catch {
      setMessage({ type: "error", text: "Failed to save page." });
    }
    setIsSaving(false);
  };

  const currentPage = PAGES.find((p) => p.slug === selectedSlug)!;

  return (
    <div className="max-w-4xl">
      <h1 className="text-4xl font-black uppercase mb-2 border-b-4 border-bauhaus-black pb-4">Edit Pages</h1>
      <p className="text-gray-500 mb-8">Select a page and update its title, content, and optional image.</p>

      {/* Page Selector */}
      <div className="flex flex-wrap gap-3 mb-8">
        {PAGES.map((page) => (
          <button
            key={page.slug}
            type="button"
            onClick={() => setSelectedSlug(page.slug)}
            className={`px-5 py-3 font-bold border-4 border-bauhaus-black transition-all text-sm uppercase ${
              selectedSlug === page.slug
                ? "bg-bauhaus-blue text-bauhaus-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
                : "bg-bauhaus-white hover:bg-gray-100"
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center font-bold text-gray-400 border-4 border-bauhaus-black">
          Loading {currentPage.label}...
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-bauhaus-white border-4 border-bauhaus-black p-8 space-y-6">
          <div className="border-l-8 border-bauhaus-blue pl-4 mb-6">
            <h2 className="text-2xl font-black uppercase">{currentPage.label}</h2>
            <p className="text-sm text-gray-500 font-bold uppercase">/{selectedSlug}</p>
          </div>

          {/* Title */}
          <div>
            <label className="block font-black uppercase text-sm mb-2 tracking-wider">Page Title / Headline</label>
            <input
              type="text"
              value={pageData.title}
              onChange={(e) => setPageData({ ...pageData, title: e.target.value })}
              placeholder="Enter headline..."
              className="w-full border-4 border-bauhaus-black p-4 text-xl font-bold outline-none focus:border-bauhaus-blue"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="block font-black uppercase text-sm mb-2 tracking-wider">Body Text / Description</label>
            <textarea
              value={pageData.content}
              onChange={(e) => setPageData({ ...pageData, content: e.target.value })}
              placeholder="Enter page content..."
              rows={8}
              className="w-full border-4 border-bauhaus-black p-4 text-base font-medium outline-none focus:border-bauhaus-blue resize-y"
              required
            />
          </div>

          {/* Image URL (Only for Home Page) */}
          {selectedSlug === "home" && (
            <div>
              <label className="flex items-center gap-2 font-black uppercase text-sm mb-2 tracking-wider">
                <ImageIcon className="w-4 h-4" />
                Hero Image URL <span className="text-gray-400 normal-case text-xs">(optional)</span>
              </label>
              <input
                type="url"
                value={pageData.imageUrl || ""}
                onChange={(e) => setPageData({ ...pageData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full border-4 border-bauhaus-black p-4 text-base outline-none focus:border-bauhaus-blue"
              />
              {pageData.imageUrl && (
                <div className="mt-3 border-4 border-bauhaus-black overflow-hidden bg-gray-100 flex items-center justify-center max-w-md h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pageData.imageUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                </div>
              )}
            </div>
          )}

          {message && (
            <div
              className={`p-4 font-bold border-4 border-bauhaus-black ${
                message.type === "success" ? "bg-green-400" : "bg-bauhaus-red text-bauhaus-white"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-3 bg-bauhaus-yellow border-4 border-bauhaus-black px-8 py-4 font-black uppercase hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSaving ? "Saving..." : `Save ${currentPage.label}`}
          </button>
        </form>
      )}
    </div>
  );
}
