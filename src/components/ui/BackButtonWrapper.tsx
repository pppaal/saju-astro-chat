"use client";

import { usePathname } from "next/navigation";
import BackButton from "./BackButton";

export default function BackButtonWrapper() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <BackButton />;
}
