"use client";
import { useState, useRef, useEffect } from "react";
import { SUPPORTED_LOCALES, useI18n } from "@/i18n/I18nProvider";

const LANGUAGE_LABELS: Record<string, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇺🇸" },
  ko: { label: "한국어", flag: "🇰🇷" },
  es: { label: "Español", flag: "🇪🇸" },
  fr: { label: "Français", flag: "🇫🇷" },
  de: { label: "Deutsch", flag: "🇩🇪" },
  pt: { label: "Português", flag: "🇵🇹" },
  ru: { label: "Русский", flag: "🇷🇺" },
  ja: { label: "日本語", flag: "🇯🇵" },
  zh: { label: "中文", flag: "🇨🇳" },
  ar: { label: "العربية", flag: "🇸🇦" },
};

export default function LanguageSwitcher() {
  const { locale, setLocale, dir } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const currentLang = LANGUAGE_LABELS[locale] || { label: locale.toUpperCase(), flag: "🌐" };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }} dir={dir}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Language"
        title="Select language"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: isOpen
            ? "linear-gradient(135deg, rgba(99, 210, 255, 0.2) 0%, rgba(138, 164, 255, 0.2) 100%)"
            : "rgba(255,255,255,0.08)",
          color: "#e8eeff",
          border: isOpen
            ? "1px solid rgba(99, 210, 255, 0.4)"
            : "1px solid rgba(255,255,255,0.15)",
          padding: "8px 14px",
          borderRadius: 12,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          fontSize: 13,
          fontWeight: 500,
          outline: "none",
          cursor: "pointer",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: isOpen
            ? "0 4px 20px rgba(99, 210, 255, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)"
            : "0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = "rgba(255,255,255,0.12)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            e.currentTarget.style.transform = "translateY(0)";
          }
        }}
      >
        <span style={{ fontSize: 16 }}>{currentLang.flag}</span>
        <span>{currentLang.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            opacity: 0.7,
          }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 180,
            background: "linear-gradient(180deg, rgba(15, 20, 45, 0.98) 0%, rgba(10, 15, 35, 0.98) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(99, 210, 255, 0.2)",
            borderRadius: 16,
            padding: "8px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset",
            zIndex: 1000,
            animation: "dropdownFadeIn 0.2s ease-out",
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          <style>{`
            @keyframes dropdownFadeIn {
              from { opacity: 0; transform: translateY(-8px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          {SUPPORTED_LOCALES.map((loc) => {
            const lang = LANGUAGE_LABELS[loc] || { label: loc.toUpperCase(), flag: "🌐" };
            const isSelected = loc === locale;
            return (
              <button
                key={loc}
                onClick={() => {
                  setLocale(loc);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 12px",
                  background: isSelected
                    ? "linear-gradient(135deg, rgba(99, 210, 255, 0.15) 0%, rgba(138, 164, 255, 0.15) 100%)"
                    : "transparent",
                  border: "none",
                  borderRadius: 10,
                  color: isSelected ? "#63d2ff" : "#e8eeff",
                  fontSize: 14,
                  fontWeight: isSelected ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span style={{ fontSize: 18 }}>{lang.flag}</span>
                <span style={{ flex: 1 }}>{lang.label}</span>
                {isSelected && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#63d2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
