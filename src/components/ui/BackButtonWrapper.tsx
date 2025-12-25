"use client";

import { usePathname } from "next/navigation";
import BackButton from "./BackButton";

// Pages that should hide the global back button
// These pages either have their own back button or custom header navigation
const PAGES_WITHOUT_BACK_BUTTON = [
  "/",                 // Home page - no back button needed
  "/tarot",            // Tarot pages - have their own navigation
  "/dream",            // Uses ServicePageLayout with built-in back button
  "/compatibility",    // Uses ServicePageLayout with built-in back button
  "/saju",             // Uses ServicePageLayout with built-in back button
  "/astrology",        // Uses ServicePageLayout with built-in back button
  "/iching",           // Uses ServicePageLayout with built-in back button
  "/numerology",       // Uses ServicePageLayout with built-in back button
  "/personality",      // Uses ServicePageLayout with built-in back button
  "/destiny-map",      // Uses ServicePageLayout with built-in back button
  "/destiny-matrix",   // Uses ServicePageLayout with built-in back button
  "/destiny-pal",      // Has custom back button
  "/destiny-match",    // Has custom back button
  "/about",            // Has custom back button in page
  "/contact",          // Has custom back button in page
  "/faq",              // Has custom back button in page
  "/myjourney",        // Has custom header with back button
  "/pricing",          // Has custom navigation
  "/policy",           // Has custom back button in page
  "/calendar",         // Uses ServicePageLayout
  "/profile",          // Has custom navigation
  "/notifications",    // Has custom navigation
  "/auth",             // Has custom header with back button
  "/blog",             // Has custom back button
  "/community",        // Has custom back button
  "/success",          // Has custom back button
  "/icp",              // Has custom back button
  "/admin",            // Admin pages - no back button needed
];

export default function BackButtonWrapper() {
  const pathname = usePathname();

  // Always hide on home page
  if (!pathname || pathname === "/") return null;

  // Hide on pages that have their own back button or navigation
  const shouldHide = PAGES_WITHOUT_BACK_BUTTON.some(prefix => {
    // Exact match for root pages
    if (prefix === pathname) return true;
    // Match child routes, but exclude specific exceptions
    if (pathname.startsWith(prefix + "/")) {
      // Show back button on counselor subpages that don't have their own
      // (astrology/counselor and saju/counselor need the global back button)
      if (pathname === "/astrology/counselor" || pathname === "/saju/counselor") {
        return false;
      }
      return true;
    }
    return false;
  });

  if (shouldHide) return null;
  return <BackButton />;
}
