"use client"

import { useEffect, useState, useRef } from "react"
import { signIn } from "next-auth/react"
import { useI18n } from "@/i18n/I18nProvider"

export default function HeaderUser() {
  const { t } = useI18n()
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (mounted) {
          setName(d?.name ?? null)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showDropdown])

  // Loading state - show skeleton placeholder to prevent layout shift
  if (loading) {
    return (
      <div
        style={{
          marginLeft: 8,
          minWidth: 80,
          height: 34,
          borderRadius: 20,
          background: "rgba(138,164,255,0.1)",
          border: "1px solid transparent",
          padding: "6px 14px",
          boxSizing: "border-box",
        }}
      />
    )
  }

  // Not logged in - show Login button with dropdown
  if (!name) {
    return (
      <div ref={dropdownRef} style={{ position: "relative", marginLeft: 8 }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            color: "#EAE6FF",
            fontSize: 14,
            whiteSpace: "nowrap",
            border: "1px solid rgba(138,164,255,0.4)",
            padding: "6px 14px",
            borderRadius: 20,
            background: showDropdown ? "rgba(138,164,255,0.25)" : "rgba(138,164,255,0.15)",
            backdropFilter: "blur(6px)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(138,164,255,0.25)"
            e.currentTarget.style.borderColor = "rgba(138,164,255,0.6)"
          }}
          onMouseOut={(e) => {
            if (!showDropdown) {
              e.currentTarget.style.background = "rgba(138,164,255,0.15)"
              e.currentTarget.style.borderColor = "rgba(138,164,255,0.4)"
            }
          }}
        >
          {t("community.login") || "Login"}
        </button>

        {showDropdown && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              minWidth: 200,
              background: "rgba(15, 20, 40, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(138,164,255,0.2)",
              borderRadius: 16,
              padding: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* Google Login */}
            <button
              onClick={() => signIn("google")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "10px 16px",
                background: "#ffffff",
                border: "none",
                borderRadius: 12,
                color: "#333",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)"
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            {/* Kakao Login */}
            <button
              onClick={() => signIn("kakao")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "10px 16px",
                background: "#FEE500",
                border: "none",
                borderRadius: 12,
                color: "#000",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)"
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(254,229,0,0.3)"
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="#000" d="M12 3C6.5 3 2 6.58 2 11c0 2.88 1.93 5.41 4.82 6.84-.2.74-.76 2.67-.87 3.08-.14.51.18.5.38.37.15-.1 2.44-1.63 3.47-2.32.77.11 1.56.17 2.37.17C17.5 19.14 22 15.56 22 11S17.5 3 12 3z"/>
              </svg>
              Kakao
            </button>
          </div>
        )}
      </div>
    )
  }

  // Logged in - show login status with name (non-clickable)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          color: "#A8C8FF",
          fontSize: 14,
          whiteSpace: "nowrap",
          padding: "6px 14px",
          borderRadius: 20,
          background: "rgba(138,164,255,0.15)",
          border: "1px solid rgba(138,164,255,0.25)",
          backdropFilter: "blur(6px)",
          cursor: "default",
        }}
      >
        {t("common.loggedIn") || "로그인되어있음"}
      </span>
      <span style={{
        color: "#EAE6FF",
        opacity: 0.9,
        fontSize: 14,
        whiteSpace: "nowrap",
        border: "1px solid rgba(138,164,255,0.25)",
        padding: "4px 10px",
        borderRadius: 16,
        background: "rgba(15,20,36,0.35)",
        backdropFilter: "blur(6px)",
      }}>
        {name}
      </span>
    </div>
  )
}