"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // Start visible for initial splash screen
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Initial splash screen on first page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setIsFadingOut(false);
      }, 400);
      return () => clearTimeout(hideTimer);
    }, 300); // Show splash for 300ms
    return () => clearTimeout(timer);
  }, []);

  // Monitor route transition changes
  useEffect(() => {
    let showTimer: NodeJS.Timeout;
    let fadeTimer: NodeJS.Timeout;

    if (loading) {
      // Debounce: only show overlay if the page takes more than 200ms to resolve
      showTimer = setTimeout(() => {
        setIsVisible(true);
        setIsFadingOut(false);
      }, 200);
    } else {
      // When loading finishes, fade out if currently visible
      if (isVisible && !isFadingOut) {
        setIsFadingOut(true);
        fadeTimer = setTimeout(() => {
          setIsVisible(false);
          setIsFadingOut(false);
        }, 400);
      }
    }

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
    };
  }, [loading, isVisible, isFadingOut]);

  // Set loading to false when pathname or searchParams change (navigation finished)
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external links, mailto, tel, hashes, new tab, modifiers
      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        anchor.getAttribute("target") === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.button !== 0
      ) {
        return;
      }

      // Check if it's the same page
      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(href, window.location.href);
        if (
          currentUrl.pathname === targetUrl.pathname &&
          currentUrl.search === targetUrl.search
        ) {
          return;
        }
      } catch (err) {
        // Fallback for relative or malformed URLs
      }

      setLoading(true);
    };

    document.addEventListener("click", handleLinkClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleLinkClick, { capture: true });
    };
  }, [pathname, searchParams]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bauhaus-white/95 backdrop-blur-xs transition-all duration-400 ease-in-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className={`loader scale-125 transition-transform duration-400 ease-out ${isFadingOut ? "scale-90" : "scale-100"}`} />
      <p className="font-black uppercase tracking-widest text-bauhaus-black text-xs mt-6 animate-pulse">
        Shree Krishna Telecom
      </p>
    </div>
  );
}
