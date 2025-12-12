"use client"

import { useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useI18n } from "@/i18n/I18nProvider"

export default function HeaderUser() {
  const { t } = useI18n()
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  // Loading state - show nothing
  if (loading) return null

  // Not logged in - show Login button
  if (!name) {
    return (
      <button
        onClick={() => signIn("google")}
        style={{
          marginLeft: 8,
          color: "#EAE6FF",
          fontSize: 14,
          whiteSpace: "nowrap",
          border: "1px solid rgba(138,164,255,0.4)",
          padding: "6px 14px",
          borderRadius: 20,
          background: "rgba(138,164,255,0.15)",
          backdropFilter: "blur(6px)",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(138,164,255,0.25)"
          e.currentTarget.style.borderColor = "rgba(138,164,255,0.6)"
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(138,164,255,0.15)"
          e.currentTarget.style.borderColor = "rgba(138,164,255,0.4)"
        }}
      >
        {t("community.login") || "Login"}
      </button>
    )
  }

  // Logged in - show user info + My Journey link
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Link
        href="/myjourney"
        style={{
          color: "#A8C8FF",
          fontSize: 14,
          whiteSpace: "nowrap",
          textDecoration: "none",
          padding: "6px 12px",
          borderRadius: 16,
          background: "rgba(138,164,255,0.1)",
          transition: "all 0.2s ease",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(138,164,255,0.2)"
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(138,164,255,0.1)"
        }}
      >
        {t("nav.myJourney") || "My Journey"}
      </Link>
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