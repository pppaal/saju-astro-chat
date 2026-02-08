'use client'

import { useState, useRef, useEffect, useMemo, Suspense } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import { buildSignInUrl } from '@/lib/auth/signInUrl'

export default function HeaderUser() {
  return (
    <Suspense fallback={<HeaderUserSkeleton />}>
      <HeaderUserContent />
    </Suspense>
  )
}

function HeaderUserSkeleton() {
  return (
    <div
      style={{
        marginLeft: 8,
        minWidth: 80,
        height: 34,
        borderRadius: 20,
        background: 'rgba(138,164,255,0.1)',
        border: '1px solid transparent',
        padding: '6px 14px',
        boxSizing: 'border-box',
      }}
    />
  )
}

function HeaderUserContent() {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const signInUrl = useMemo(() => {
    const basePath = pathname || '/'
    const search = searchParams?.toString()
    const callbackUrl = search ? `${basePath}?${search}` : basePath
    return buildSignInUrl(callbackUrl)
  }, [pathname, searchParams])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loading = status === 'loading'
  const isAuthenticated = status === 'authenticated'
  const name =
    session?.user?.name ||
    session?.user?.email ||
    (isAuthenticated ? t('common.account') || 'Account' : null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
          background: 'rgba(138,164,255,0.1)',
          border: '1px solid transparent',
          padding: '6px 14px',
          boxSizing: 'border-box',
        }}
      />
    )
  }

  // Not logged in - show Login button
  if (!isAuthenticated) {
    return (
      <div ref={dropdownRef} style={{ position: 'relative', marginLeft: 8 }}>
        <button
          onClick={() => router.push(signInUrl)}
          style={{
            color: '#EAE6FF',
            fontSize: 14,
            whiteSpace: 'nowrap',
            border: '1px solid rgba(138,164,255,0.4)',
            padding: '6px 14px',
            borderRadius: 20,
            background: 'rgba(138,164,255,0.15)',
            backdropFilter: 'blur(6px)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(138,164,255,0.25)'
            e.currentTarget.style.borderColor = 'rgba(138,164,255,0.6)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(138,164,255,0.15)'
            e.currentTarget.style.borderColor = 'rgba(138,164,255,0.4)'
          }}
        >
          {t('community.login') || 'Login'}
        </button>
      </div>
    )
  }

  // Logged in - show login status with name and dropdown for logout
  return (
    <div ref={dropdownRef} style={{ position: 'relative', marginLeft: 8 }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 14px 6px 8px',
          borderRadius: 24,
          background: showDropdown
            ? 'linear-gradient(135deg, rgba(99, 210, 255, 0.2) 0%, rgba(138, 164, 255, 0.2) 100%)'
            : 'linear-gradient(135deg, rgba(99, 210, 255, 0.12) 0%, rgba(138, 164, 255, 0.12) 100%)',
          border: '1px solid rgba(99, 210, 255, 0.2)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background =
            'linear-gradient(135deg, rgba(99, 210, 255, 0.2) 0%, rgba(138, 164, 255, 0.2) 100%)'
          e.currentTarget.style.borderColor = 'rgba(99, 210, 255, 0.4)'
        }}
        onMouseOut={(e) => {
          if (!showDropdown) {
            e.currentTarget.style.background =
              'linear-gradient(135deg, rgba(99, 210, 255, 0.12) 0%, rgba(138, 164, 255, 0.12) 100%)'
            e.currentTarget.style.borderColor = 'rgba(99, 210, 255, 0.2)'
          }
        }}
      >
        {/* Avatar with gradient */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #63d2ff 0%, #a78bfa 50%, #7cf29c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            textTransform: 'uppercase',
            boxShadow: '0 2px 8px rgba(99, 210, 255, 0.3)',
          }}
        >
          {name?.charAt(0) || 'U'}
        </div>
        {/* Name */}
        <span
          style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            letterSpacing: '0.01em',
            background: 'linear-gradient(135deg, #ffffff 0%, #a8c8ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {name}
        </span>
        {/* Online indicator */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
            boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
            animation: 'pulse 2s ease-in-out infinite',
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
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 160,
            background: 'rgba(15, 20, 40, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(138,164,255,0.2)',
            borderRadius: 16,
            padding: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {/* My Journey button */}
          <button
            onClick={() => {
              setShowDropdown(false)
              router.push('/myjourney')
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 16px',
              background: 'rgba(138, 164, 255, 0.15)',
              border: '1px solid rgba(138, 164, 255, 0.3)',
              borderRadius: 12,
              color: '#a8c8ff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(138, 164, 255, 0.25)'
              e.currentTarget.style.borderColor = 'rgba(138, 164, 255, 0.5)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(138, 164, 255, 0.15)'
              e.currentTarget.style.borderColor = 'rgba(138, 164, 255, 0.3)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            {t('app.myJourney') || '나의 여정'}
          </button>
          {/* Logout button */}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              color: '#f87171',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t('community.logout') || '로그아웃'}
          </button>
        </div>
      )}
    </div>
  )
}
