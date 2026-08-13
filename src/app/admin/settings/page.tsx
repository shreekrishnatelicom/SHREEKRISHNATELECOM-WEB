"use client";

import { useEffect, useState } from "react";
import PasswordManager from "@/components/PasswordManager";
import { Store, Phone, Mail, MapPin, MessageSquare, Send, Save, AlertTriangle, CheckCircle2 } from "lucide-react";

const FacebookIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface ShopSettings {
  id: string;
  isOpen: boolean;
  phone: string;
  email: string;
  location: string;
  mapLink: string;
  whatsapp: string;
  telegram: string;
  facebook: string;
  instagram: string;
  priceStarting: string;
  priceBwSingle: string;
  priceBwDouble: string;
  priceColorSingle: string;
  priceColorDouble: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [isOpen, setIsOpen] = useState(true);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [telegram, setTelegram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");

  const [priceStarting, setPriceStarting] = useState("₹2/page");
  const [priceBwSingle, setPriceBwSingle] = useState("₹2 / page");
  const [priceBwDouble, setPriceBwDouble] = useState("₹3.5 / page");
  const [priceColorSingle, setPriceColorSingle] = useState("₹10 / page");
  const [priceColorDouble, setPriceColorDouble] = useState("₹18 / page");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data: ShopSettings = await res.json();
        setSettings(data);
        setIsOpen(data.isOpen);
        setPhone(data.phone);
        setEmail(data.email);
        setLocation(data.location);
        setMapLink(data.mapLink);
        setWhatsapp(data.whatsapp);
        setTelegram(data.telegram);
        setFacebook(data.facebook);
        setInstagram(data.instagram);
        setPriceStarting(data.priceStarting || "₹2/page");
        setPriceBwSingle(data.priceBwSingle || "₹2 / page");
        setPriceBwDouble(data.priceBwDouble || "₹3.5 / page");
        setPriceColorSingle(data.priceColorSingle || "₹10 / page");
        setPriceColorDouble(data.priceColorDouble || "₹18 / page");
      } else {
        throw new Error("Failed to load settings");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load shop settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: settings?.id,
          isOpen,
          phone,
          email,
          location,
          mapLink,
          whatsapp,
          telegram,
          facebook,
          instagram,
          priceStarting,
          priceBwSingle,
          priceBwDouble,
          priceColorSingle,
          priceColorDouble,
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      
      const updatedData = await res.json();
      setSettings(updatedData);
      setSuccess("Shop settings saved successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <h1 className="text-4xl font-black uppercase mb-8 border-b-4 border-bauhaus-black pb-4">Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Shop & Contact settings */}
        <div className="bg-white border-4 border-bauhaus-black shadow-[8px_8px_0px_0px_rgba(43,76,126,1)] p-8">
          <div className="flex items-center gap-3 mb-6 border-b-4 border-bauhaus-black pb-4">
            <Store className="w-8 h-8 text-bauhaus-blue shrink-0" />
            <h3 className="text-2xl font-black uppercase text-bauhaus-black">Shop & Contact Info</h3>
          </div>

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

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 w-1/3"></div>
              <div className="h-12 bg-gray-100 w-full"></div>
              <div className="h-12 bg-gray-100 w-full"></div>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Shop Status Toggle */}
              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Shop Status</label>
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className={`w-full py-4 px-6 border-4 border-bauhaus-black font-black uppercase text-lg text-center transition-all ${
                    isOpen 
                      ? "bg-green-500 text-white shadow-[4px_4px_0_0_#1a1a1a]" 
                      : "bg-bauhaus-red text-white shadow-[4px_4px_0_0_#1a1a1a]"
                  }`}
                >
                  🟢 Shop is {isOpen ? "OPEN" : "CLOSED"}
                </button>
              </div>

              {/* Phone */}
              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Physical Location / Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Near Main Market, Raipur"
                    required
                    className="w-full border-4 border-bauhaus-black pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue"
                  />
                </div>
              </div>

              {/* Google Maps Link */}
              <div>
                <label className="block font-black uppercase text-xs mb-2 tracking-wider">Google Maps Link (Share URL)</label>
                <input
                  type="text"
                  value={mapLink}
                  onChange={(e) => setMapLink(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="w-full border-4 border-bauhaus-black px-4 py-3 text-sm font-bold outline-none focus:border-bauhaus-blue"
                />
              </div>

              {/* Home Page Print Pricing Section */}
              <div className="border-t-4 border-bauhaus-black pt-6">
                <h4 className="font-black uppercase text-sm mb-4 tracking-wider text-bauhaus-blue">Home Page Print Pricing</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Starting Price */}
                  <div className="md:col-span-2">
                    <label className="block font-bold text-xs mb-1 uppercase">Starting Price Stat (e.g. ₹2/page)</label>
                    <input
                      type="text"
                      value={priceStarting}
                      onChange={(e) => setPriceStarting(e.target.value)}
                      placeholder="₹2/page"
                      required
                      className="w-full border-2 border-bauhaus-black px-4 py-2.5 text-xs font-bold outline-none focus:border-bauhaus-blue"
                    />
                  </div>

                  {/* B&W Single side */}
                  <div>
                    <label className="block font-bold text-xs mb-1 uppercase">B&W (Single side) Price</label>
                    <input
                      type="text"
                      value={priceBwSingle}
                      onChange={(e) => setPriceBwSingle(e.target.value)}
                      placeholder="₹2 / page"
                      required
                      className="w-full border-2 border-bauhaus-black px-4 py-2.5 text-xs font-bold outline-none focus:border-bauhaus-blue"
                    />
                  </div>

                  {/* B&W Double side */}
                  <div>
                    <label className="block font-bold text-xs mb-1 uppercase">B&W (Double side) Price</label>
                    <input
                      type="text"
                      value={priceBwDouble}
                      onChange={(e) => setPriceBwDouble(e.target.value)}
                      placeholder="₹3.5 / page"
                      required
                      className="w-full border-2 border-bauhaus-black px-4 py-2.5 text-xs font-bold outline-none focus:border-bauhaus-blue"
                    />
                  </div>

                  {/* Color Single side */}
                  <div>
                    <label className="block font-bold text-xs mb-1 uppercase">Color (Single side) Price</label>
                    <input
                      type="text"
                      value={priceColorSingle}
                      onChange={(e) => setPriceColorSingle(e.target.value)}
                      placeholder="₹10 / page"
                      required
                      className="w-full border-2 border-bauhaus-black px-4 py-2.5 text-xs font-bold outline-none focus:border-bauhaus-blue"
                    />
                  </div>

                  {/* Color Double side */}
                  <div>
                    <label className="block font-bold text-xs mb-1 uppercase">Color (Double side) Price</label>
                    <input
                      type="text"
                      value={priceColorDouble}
                      onChange={(e) => setPriceColorDouble(e.target.value)}
                      placeholder="₹18 / page"
                      required
                      className="w-full border-2 border-bauhaus-black px-4 py-2.5 text-xs font-bold outline-none focus:border-bauhaus-blue"
                    />
                  </div>
                </div>
              </div>

              {/* Social Media Section */}
              <div className="border-t-4 border-bauhaus-black pt-6">
                <h4 className="font-black uppercase text-sm mb-4 tracking-wider text-bauhaus-blue">Social & Contact Links</h4>
                <div className="space-y-4">
                  {/* WhatsApp */}
                  <div>
                    <label className="block font-bold text-xs mb-1 uppercase">WhatsApp Chat Link or Number</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="https://wa.me/91XXXXXXXXXX"
                        className="w-full border-2 border-bauhaus-black pl-12 pr-4 py-2.5 text-xs font-bold outline-none focus:border-bauhaus-blue"
                      />
                    </div>
                  </div>

                  {/* Telegram */}
                  <div>
                    <label className="block font-bold text-xs mb-1 uppercase">Telegram Link or Username</label>
                    <div className="relative">
                      <Send className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={telegram}
                        onChange={(e) => setTelegram(e.target.value)}
                        placeholder="https://t.me/username"
                        className="w-full border-2 border-bauhaus-black pl-12 pr-4 py-2.5 text-xs font-bold outline-none focus:border-bauhaus-blue"
                      />
                    </div>
                  </div>

                  {/* Facebook */}
                  <div>
                    <label className="block font-bold text-xs mb-1 uppercase">Facebook Page Link</label>
                    <div className="relative">
                      <FacebookIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={facebook}
                        onChange={(e) => setFacebook(e.target.value)}
                        placeholder="https://facebook.com/..."
                        className="w-full border-2 border-bauhaus-black pl-12 pr-4 py-2.5 text-xs font-bold outline-none focus:border-bauhaus-blue"
                      />
                    </div>
                  </div>

                  {/* Instagram */}
                  <div>
                    <label className="block font-bold text-xs mb-1 uppercase">Instagram Link</label>
                    <div className="relative">
                      <InstagramIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="https://instagram.com/..."
                        className="w-full border-2 border-bauhaus-black pl-12 pr-4 py-2.5 text-xs font-bold outline-none focus:border-bauhaus-blue"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-bauhaus-yellow text-bauhaus-black border-4 border-bauhaus-black py-4 font-black text-xl uppercase tracking-widest hover:bg-yellow-400 transition-colors disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(26,26,26,1)] transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" />
                  {saving ? "Saving Settings..." : "Save Settings →"}
                </span>
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Password settings */}
        <div className="lg:mt-0">
          <PasswordManager />
        </div>
      </div>
    </div>
  );
}
