"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { allExtensions } from "@/lib/i18n/extensions";

// Import all split translation files
import koCommon from "./locales/ko/common.json";
import koLanding from "./locales/ko/landing.json";
import koChat from "./locales/ko/chat.json";
import koServices from "./locales/ko/services.json";
import koTarot from "./locales/ko/tarot.json";
import koCalendar from "./locales/ko/calendar.json";
import koPersonality from "./locales/ko/personality.json";
import koDream from "./locales/ko/dream.json";
import koNumerology from "./locales/ko/numerology.json";
import koIching from "./locales/ko/iching.json";
import koPastlife from "./locales/ko/pastlife.json";
import koCompatibility from "./locales/ko/compatibility.json";
import koDestinymap from "./locales/ko/destinymap.json";
import koFeatures from "./locales/ko/features.json";
import koMisc from "./locales/ko/misc.json";

import enCommon from "./locales/en/common.json";
import enLanding from "./locales/en/landing.json";
import enChat from "./locales/en/chat.json";
import enServices from "./locales/en/services.json";
import enTarot from "./locales/en/tarot.json";
import enCalendar from "./locales/en/calendar.json";
import enPersonality from "./locales/en/personality.json";
import enDream from "./locales/en/dream.json";
import enNumerology from "./locales/en/numerology.json";
import enIching from "./locales/en/iching.json";
import enPastlife from "./locales/en/pastlife.json";
import enCompatibility from "./locales/en/compatibility.json";
import enDestinymap from "./locales/en/destinymap.json";
import enFeatures from "./locales/en/features.json";
import enMisc from "./locales/en/misc.json";

// Merge all modules into single dictionaries
const koDict = {
  ...koCommon,
  ...koLanding,
  ...koChat,
  ...koServices,
  ...koTarot,
  ...koCalendar,
  ...koPersonality,
  ...koDream,
  ...koNumerology,
  ...koIching,
  ...koPastlife,
  ...koCompatibility,
  ...koDestinymap,
  ...koFeatures,
  ...koMisc,
};

const enDict = {
  ...enCommon,
  ...enLanding,
  ...enChat,
  ...enServices,
  ...enTarot,
  ...enCalendar,
  ...enPersonality,
  ...enDream,
  ...enNumerology,
  ...enIching,
  ...enPastlife,
  ...enCompatibility,
  ...enDestinymap,
  ...enFeatures,
  ...enMisc,
};

const dicts = {
  en: enDict,
  ko: koDict,
} as const;

type DictValue = Record<string, unknown>;
type DictType = Record<string, DictValue>;

// Merge extensions (new features - dailyRitual, psychology, meditation etc)
for (const [loc, namespaces] of Object.entries(allExtensions)) {
  const key = loc as keyof typeof dicts;
  if (dicts[key]) {
    for (const [ns, translations] of Object.entries(namespaces)) {
      (dicts as Record<string, Record<string, unknown>>)[key][ns] = {
        ...((dicts as Record<string, Record<string, unknown>>)[key][ns] || {}),
        ...translations,
      };
    }
  }
}

// Fill missing translations with English fallback
function fillMissing(base: Record<string, unknown>, target: Record<string, unknown>) {
  for (const [k, v] of Object.entries(base)) {
    if (!(k in target)) {
      target[k] = v;
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object") {
      fillMissing(v as Record<string, unknown>, target[k] as Record<string, unknown>);
    }
  }
}

for (const [locale, data] of Object.entries(dicts)) {
  if (locale === "en") {continue;}
  fillMissing(dicts.en, data);
}

type Locale = keyof typeof dicts;

type I18nContextType = {
  locale: Locale;
  language: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, fallback?: string) => string;
  translate: (path: string, fallback?: string) => string;
  dir: "ltr" | "rtl";
  hydrated: boolean;
};

export const DICTS = dicts;

const I18nContext = createContext<I18nContextType | null>(null);

// Only support en/ko
export const SUPPORTED_LOCALES: Locale[] = ['en', 'ko'];
const isRtl = (_l: Locale) => false; // No RTL languages supported

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const stored = localStorage.getItem("locale") as Locale | null;
      if (stored && SUPPORTED_LOCALES.includes(stored)) {
        setLocale(stored);
        return;
      }
    } catch {}
    try {
      const nav2 = navigator.language?.slice(0, 2) as Locale | undefined;
      if (nav2 && SUPPORTED_LOCALES.includes(nav2)) {setLocale(nav2);}
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("locale", locale);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
    }
  }, [locale]);

  const t = useMemo(() => {
    const getter = (obj: unknown, path: string) => {
      if (!path) {return undefined;}
      const parts = path.split(".");
      let cur: unknown = obj;
      for (const k of parts) {
        if (cur !== null && typeof cur === "object" && k in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[k];
        } else {
          return undefined;
        }
      }
      return cur;
    };

    const isLikelyCorrupted = (value: string) =>
      /[\u0400-\u04FF]/.test(value) || value.includes("�");

    return (path: string, fallback?: string) => {
      const got = getter(dicts[locale], path);
      if (typeof got === "string") {
        // Some locale files were corrupted (Cyrillic/�). If detected, fall back to English.
        if (locale === "ko" && isLikelyCorrupted(got)) {
          const fb = getter(dicts.en, path);
          if (typeof fb === "string") {return fb;}
          if (fallback) {return fallback;}
          return path.split(".").pop() || path;
        }
        return got;
      }

      const fb = getter(dicts.en, path);
      if (typeof fb === "string") {return fb;}

      if (fallback) {return fallback;}

      return path.split(".").pop() || path;
    };
  }, [locale]);

  const value = useMemo<I18nContextType>(
    () => ({ locale, language: locale, setLocale, t, translate: t, dir: isRtl(locale) ? "rtl" : "ltr", hydrated }),
    [locale, t, hydrated]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {throw new Error("useI18n must be used within I18nProvider");}
  return ctx;
}
