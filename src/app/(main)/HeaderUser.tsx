"use client"

import { useEffect, useState } from "react"

export default function HeaderUser() {
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    let mounted = true
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => { if (mounted) setName(d?.name ?? null) })
      .catch(() => {})
    return () => { mounted = false }
  }, [])
  if (!name) return null
  return (
    <span style={{
      marginLeft: 8, color: "#EAE6FF", opacity: 0.9, fontSize: 14, whiteSpace: "nowrap",
      border: "1px solid rgba(138,164,255,0.25)", padding: "4px 8px", borderRadius: 10,
      background: "rgba(15,20,36,0.35)", backdropFilter: "blur(6px)",
    }}>
      {name} logged in
    </span>
  )
}