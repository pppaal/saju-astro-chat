"use client";

import { usePathname } from "next/navigation";
import BackButton from "./BackButton";

// Pages that should hide the global back button (startsWith check)
// Note: /tarot/*/chat mode has its own "Back to Cards" button within the chat UI
const PAGES_WITHOUT_BACK_BUTTON = [
  "/tarot/",  // Tarot reading pages - uses inline navigation
];

export default function BackButtonWrapper() {
  const pathname = usePathname();
  if (!pathname || pathname === "/") return null;
  // Hide on tarot reading pages (they have inline navigation)
  if (PAGES_WITHOUT_BACK_BUTTON.some(prefix => pathname.startsWith(prefix))) return null;
  return <BackButton />;
}
