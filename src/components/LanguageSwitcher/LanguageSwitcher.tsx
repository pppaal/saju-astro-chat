"use client";
import { useI18n } from "@/i18n/I18nProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale, dir } = useI18n();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as any)}
      aria-label="Language"
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
      <option value="en" style={{ background: "#1b2133", color: "#e8eeff" }}>
        English
      </option>
      <option value="ko" style={{ background: "#1b2133", color: "#e8eeff" }}>
        한국어
      </option>
      <option value="zh" style={{ background: "#1b2133", color: "#e8eeff" }}>
        中文
      </option>
      <option value="ar" style={{ background: "#1b2133", color: "#e8eeff" }}>
        العربية
      </option>
      <option value="es" style={{ background: "#1b2133", color: "#e8eeff" }}>
        Español
      </option>
      <option value="hi" style={{ background: "#1b2133", color: "#e8eeff" }}>
        हिन्दी
      </option>
      <option value="ru" style={{ background: "#1b2133", color: "#e8eeff" }}>
        Русский
      </option>
      <option value="fr" style={{ background: "#1b2133", color: "#e8eeff" }}>
        Français
      </option>
      <option value="ja" style={{ background: "#1b2133", color: "#e8eeff" }}>
        日本語
      </option>
    </select>
  );
}