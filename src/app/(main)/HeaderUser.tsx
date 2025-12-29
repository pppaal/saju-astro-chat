"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useI18n } from "@/i18n/I18nProvider"

export default function HeaderUser() {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()

  // 로그인 후 현재 페이지로 돌아가기 위한 핸들러
  const handleGoogleLogin = useCallback(() => {
    const callbackUrl = pathname || "/"
    signIn("google", { callbackUrl })
  }, [pathname])

  const handleKakaoLogin = useCallback(() => {
    const callbackUrl = pathname || "/"
    signIn("kakao", { callbackUrl })
  }, [pathname])

  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loading = status === "loading"
  const name = session?.user?.name || session?.user?.email || null

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
              onClick={handleGoogleLogin}
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

            {/* Kakao Login - temporarily disabled */}
            {/* <button
              onClick={handleKakaoLogin}
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
            </button> */}
          </div>
        )}
      </div>
    )
  }

  // Logged in - show login status with name and dropdown for logout
  return (
    <div ref={dropdownRef} style={{ position: "relative", marginLeft: 8 }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 14px 6px 8px",
          borderRadius: 24,
          background: showDropdown
            ? "linear-gradient(135deg, rgba(99, 210, 255, 0.2) 0%, rgba(138, 164, 255, 0.2) 100%)"
            : "linear-gradient(135deg, rgba(99, 210, 255, 0.12) 0%, rgba(138, 164, 255, 0.12) 100%)",
          border: "1px solid rgba(99, 210, 255, 0.2)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(99, 210, 255, 0.2) 0%, rgba(138, 164, 255, 0.2) 100%)"
          e.currentTarget.style.borderColor = "rgba(99, 210, 255, 0.4)"
        }}
        onMouseOut={(e) => {
          if (!showDropdown) {
            e.currentTarget.style.background = "linear-gradient(135deg, rgba(99, 210, 255, 0.12) 0%, rgba(138, 164, 255, 0.12) 100%)"
            e.currentTarget.style.borderColor = "rgba(99, 210, 255, 0.2)"
          }
        }}
      >
        {/* Avatar with gradient */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #63d2ff 0%, #a78bfa 50%, #7cf29c 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(99, 210, 255, 0.3)",
          }}
        >
          {name?.charAt(0) || "U"}
        </div>
        {/* Name */}
        <span
          style={{
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
            background: "linear-gradient(135deg, #ffffff 0%, #a8c8ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {name}
        </span>
        {/* Online indicator */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #22c55e 0%, #4ade80 100%)",
            boxShadow: "0 0 8px rgba(34, 197, 94, 0.6)",
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.9); }
          }
        `}</style>
      </button>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 160,
            background: "rgba(15, 20, 40, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(138,164,255,0.2)",
            borderRadius: 16,
            padding: "8px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {/* My Journey button */}
          <button
            onClick={() => {
              setShowDropdown(false)
              router.push("/myjourney")
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 16px",
              background: "rgba(138, 164, 255, 0.15)",
              border: "1px solid rgba(138, 164, 255, 0.3)",
              borderRadius: 12,
              color: "#a8c8ff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(138, 164, 255, 0.25)"
              e.currentTarget.style.borderColor = "rgba(138, 164, 255, 0.5)"
              e.currentTarget.style.transform = "translateY(-1px)"
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(138, 164, 255, 0.15)"
              e.currentTarget.style.borderColor = "rgba(138, 164, 255, 0.3)"
              e.currentTarget.style.transform = "translateY(0)"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            {t("nav.myJourney") || "My Journey"}
          </button>
          {/* Logout button */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 16px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 12,
              color: "#f87171",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)"
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)"
              e.currentTarget.style.transform = "translateY(-1px)"
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)"
              e.currentTarget.style.transform = "translateY(0)"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t("community.logout") || "Logout"}
          </button>
        </div>
      )}
    </div>
  )
}