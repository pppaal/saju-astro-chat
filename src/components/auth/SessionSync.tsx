"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const STORAGE_KEY = "auth:refresh";
const REFRESH_DEBOUNCE_MS = 800;
const AUTH_REFRESH_PARAM = "authRefresh";

export default function SessionSync() {
  const { status, update } = useSession();
  const lastStatusRef = useRef<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const refreshHandledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!refreshHandledRef.current) {
      const url = new URL(window.location.href);
      if (url.searchParams.get(AUTH_REFRESH_PARAM) === "1") {
        refreshHandledRef.current = true;
        url.searchParams.delete(AUTH_REFRESH_PARAM);
        update()
          .catch(() => undefined)
          .finally(() => {
            window.history.replaceState({}, "", url.toString());
          });
      }
    }

    const scheduleRefresh = () => {
      if (debounceRef.current !== null) return;
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        update();
      }, REFRESH_DEBOUNCE_MS);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        scheduleRefresh();
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [update]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prevStatus = lastStatusRef.current;
    lastStatusRef.current = status;

    if (!prevStatus || prevStatus === status) return;
    if (status === "authenticated" || status === "unauthenticated") {
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        // ignore storage failures
      }
    }
  }, [status]);

  return null;
}
