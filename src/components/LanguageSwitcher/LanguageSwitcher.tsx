"use client";
import { SUPPORTED_LOCALES, useI18n } from "@/i18n/I18nProvider";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  ko: "한국어",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  ru: "Русский",
  ja: "日本語",
  zh: "中文",
  ar: "العربية",
};

export default function LanguageSwitcher() {
  const { locale, setLocale, dir } = useI18n();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as any)}
      aria-label="Language"
      title="Select language"
      dir={dir}
      style={{
        background: "rgba(255,255,255,0.10)",
        color: "#e8eeff",
        border: "1px solid rgba(255,255,255,0.28)",
        padding: "8px 12px",
        borderRadius: 10,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        fontSize: 13,
        outline: "none",
        appearance: "none",
        cursor: "pointer",
      }}
    >
      {SUPPORTED_LOCALES.map((loc) => (
        <option key={loc} value={loc} style={{ background: "#1b2133", color: "#e8eeff" }}>
          {LANGUAGE_LABELS[loc] ?? loc.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
