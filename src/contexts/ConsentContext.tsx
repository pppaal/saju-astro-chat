"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ConsentStatus = "pending" | "granted" | "denied";

type ConsentContextValue = {
  status: ConsentStatus;
  grant: () => void;
  deny: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

const STORAGE_KEY = "destinypal-consent";

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>("pending");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "granted" || stored === "denied") {
      setStatus(stored);
    }
  }, []);

  useEffect(() => {
    if (status === "pending" || typeof window === "undefined") {return;}
    window.localStorage.setItem(STORAGE_KEY, status);
  }, [status]);

  const value = useMemo(
    () => ({
      status,
      grant: () => setStatus("granted"),
      deny: () => setStatus("denied"),
    }),
    [status]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return ctx;
}
