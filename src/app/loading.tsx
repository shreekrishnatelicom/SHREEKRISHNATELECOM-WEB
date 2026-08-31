"use client";

export default function Loading() {
  // Return null because the global RouteLoader component covers the page transitions
  // with a unified full-screen loading animation, avoiding double-loader layouts.
  return null;
}
