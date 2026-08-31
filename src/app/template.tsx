"use client";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-page-enter min-h-screen w-full">
      {children}
    </div>
  );
}
