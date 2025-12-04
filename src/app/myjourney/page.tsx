'use client'

import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react'
import { Suspense, useEffect, useRef, useState } from 'react'  // ← Suspense 추가
import { useRouter, useSearchParams } from 'next/navigation'

type Profile = {
  birthDate?: string | null
  birthTime?: string | null
  birthCity?: string | null
  tzId?: string | null
  gender?: string | null
}

export default function MyJourneyClient() {
  return (
    <SessionProvider>
      <Suspense fallback={null}>
        <MyJourneyPage />
      </Suspense>
    </SessionProvider>
  )
}

// 추가: Stripe Checkout 호출 헬퍼
async function startCheckout() {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.url) {
    alert(`Checkout error: ${data?.error || res.status}`)
    return
  }
  window.location.href = data.url
}

function MyJourneyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const search = useSearchParams()

  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | 'U'>('U')
  const [city, setCity] = useState('')
  const [tzId, setTzId] = useState<string>(() => Intl.DateTimeFormat().resolvedOptions().timeZone)

  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const [profile, setProfile] = useState<Profile>({})

  useEffect(() => {
    const load = async () => {
      if (status !== 'authenticated') return
      const res = await fetch('/api/me/profile', { cache: 'no-store' })
      if (!res.ok) return
      const { user } = await res.json()
      if (!user) return
      setProfile(user)
      if (user.birthDate) setBirthDate(user.birthDate)
      if (user.birthTime) setBirthTime(user.birthTime)
      if (user.gender) setGender(user.gender)
      if (user.birthCity) setCity(user.birthCity)
      if (user.tzId) setTzId(user.tzId)
    }
    load()
  }, [status])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const fromQuery = search.get('from')
    const looksLikeAuthReferrer =
      document.referrer.includes('/api/auth') ||
      document.referrer.includes('accounts.google.com') ||
      document.referrer.includes('appleid.apple.com') ||
      document.referrer.includes('github.com/login')
    const cameFromAuth = fromQuery === 'oauth' || looksLikeAuthReferrer
    const state = history.state || {}
    if (!state.__entered) {
      history.replaceState({ ...state, __entered: true, __fromAuth: cameFromAuth }, '')
    }
  }, [search])

  const prevStatus = useRef(status)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (prevStatus.current !== status && status === 'authenticated') {
      const state = history.state || {}
      history.replaceState({ ...state, __fromAuth: true, __entered: true }, '')
    }
    prevStatus.current = status
  }, [status])

  const goBackSmart = () => {
    if (typeof window === 'undefined') return
    const state = history.state || {}
    const prev = document.referrer || ''
    const isAuthReferrer =
      prev.includes('/api/auth') ||
      prev.includes('/signin') ||
      prev.includes('accounts.google.com') ||
      prev.includes('appleid.apple.com') ||
      prev.includes('github.com/login')
    if (state.__fromAuth || isAuthReferrer || window.history.length <= 1) {
      router.replace('/')
      return
    }
    const before = location.pathname + location.search + location.hash
    window.addEventListener(
      'popstate',
      () => {
        const now = location.pathname + location.search + location.hash
        if (now === before) router.replace('/')
      },
      { once: true }
    )
    router.back()
  }

  const saveBirthInfo = async () => {
    setMsg('')
    if (!session) {
      setMsg('Please sign in first.')
      return
    }
    if (!birthDate) {
      setMsg('Please select your date of birth.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/user/update-birth-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate,
          birthTime: birthTime || null,
          gender: gender === 'U' ? null : gender,
          birthCity: city || null,
          tzId: tzId || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to save')
      setMsg('Saved successfully.')
      setProfile(data.user)
    } catch (e: any) {
      setMsg(e?.message || 'Error occurred')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={wrapDark}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button className="back-btn" onClick={goBackSmart} title="Back" aria-label="Go back">←</button>
        <h1 style={{ margin: 0, color: '#EAE6FF' }}>My Journey</h1>
      </div>

      <section style={cardDark}>
        <h2 style={h2Dark}>Account</h2>
        {status === 'loading' ? (
          <p style={muted}>Checking session...</p>
        ) : session ? (
          <>
            <p style={{ margin: '6px 0', color: '#EAE6FF' }}>
              Signed in as {session.user?.name ?? session.user?.email}
            </p>
            {/* 추가: 결제 시작 버튼 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                style={btnPrimaryDark}
                onClick={startCheckout}
                title="Subscribe to Premium"
              >
                Go Premium (HK$39/mo)
              </button>
              <button style={btnGhostDark} onClick={() => signOut({ callbackUrl: '/myjourney?from=oauth' })}>
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: '6px 0', color: '#9EA4C9' }}>
              Create an account or sign in to save your birth info.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                style={btnGoogleDark}
                onClick={() => signIn('google', { callbackUrl: '/myjourney?from=oauth' })}
              >
                <span style={{ fontSize: 18 }}>🔍</span> Continue with Google
              </button>
              <button
                style={btnKakaoDark}
                onClick={() => signIn('kakao', { callbackUrl: '/myjourney?from=oauth' })}
              >
                <span style={{ fontSize: 18 }}>💬</span> Continue with Kakao
              </button>
              <button
                style={btnFacebookDark}
                onClick={() => signIn('facebook', { callbackUrl: '/myjourney?from=oauth' })}
              >
                <span style={{ fontSize: 18 }}>📘</span> Continue with Facebook
              </button>
            </div>
          </>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <section style={cardDark}>
          <h2 style={h2Dark}>Birth Information</h2>
          <div style={grid}>
            <label style={labelDark}>
              <span style={labelText}>Date of Birth</span>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={inputDark}/>
            </label>
            <label style={labelDark}>
              <span style={labelText}>Time (optional)</span>
              <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} style={inputDark}/>
            </label>
            <label style={labelDark}>
              <span style={labelText}>Gender (optional)</span>
              <select value={gender} onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'U')} style={inputDark}>
                <option value="U">Unspecified</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </label>
            <label style={labelDark}>
              <span style={labelText}>City (optional)</span>
              <input type="text" placeholder="Seoul, KR" value={city} onChange={(e) => setCity(e.target.value)} style={inputDark}/>
            </label>
            <label style={labelDark}>
              <span style={labelText}>Time zone (optional)</span>
              <input type="text" placeholder="Asia/Seoul" value={tzId} onChange={(e) => setTzId(e.target.value)} style={inputDark}/>
            </label>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              style={btnPrimaryDark}
              onClick={saveBirthInfo}
              disabled={busy || !birthDate || status !== 'authenticated'}
              title={
                status !== 'authenticated'
                  ? 'Sign in to save'
                  : !birthDate
                  ? 'Select your date of birth'
                  : 'Save'
              }
            >
              {busy ? 'Saving...' : 'Save Birth Info'}
            </button>
            {status !== 'authenticated' && (
              <span style={{ fontSize: 12, color: '#9EA4C9' }}>
                Sign in to save your birth data.
              </span>
            )}
          </div>

          {msg && <p style={{ marginTop: 8, color: '#EAE6FF' }}>{msg}</p>}
        </section>

        <DestinyPanel profile={profile} />
      </div>
    </main>
  )
}

function useDestiny(profile: Profile, targetDate: string) {
  const result = {
    date: targetDate,
    summary: `Destiny snapshot for ${targetDate}`,
    hints: [
      `Base: ${profile.birthDate ?? '—'} ${profile.birthTime ?? ''} (${profile.tzId ?? 'local'})`,
      `City: ${profile.birthCity ?? '—'}`,
    ],
    score: ((new Date(targetDate).getTime() / 86400000) % 100) | 0,
  }
  return result
}

function DestinyPanel({ profile }: { profile: Profile }) {
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const destiny = useDestiny(profile, targetDate)

  const saveSnapshot = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/destiny/save-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate, data: { ...destiny, note } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to save snapshot')
      alert('Saved for ' + targetDate)
    } catch (e: any) {
      alert(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section style={cardDark}>
      <h2 style={h2Dark}>Destiny Map</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        <label style={labelDark}>
          <span style={labelText}>Date</span>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={inputDark}/>
        </label>

        <div style={{
          border: '1px solid rgba(138,164,255,0.22)',
          borderRadius: 12,
          padding: 12,
          background: '#0f1424',
          color: '#EAE6FF',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{destiny.summary}</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {destiny.hints.map((h, i) => <li key={i} style={{ color: '#cfd6ff' }}>{h}</li>)}
          </ul>
          <div style={{ marginTop: 8, fontSize: 13, color: '#ffd36a' }}>
            Fortune score: {destiny.score}
          </div>
        </div>

        <label style={labelDark}>
          <span style={labelText}>Note (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ ...inputDark, height: 80, resize: 'vertical' } as React.CSSProperties}
            placeholder="Add your note for this date..."
          />
        </label>

        <button style={btnPrimaryDark} onClick={saveSnapshot} disabled={saving}>
          {saving ? 'Saving...' : "Save Today's Destiny Map"}
        </button>
      </div>
    </section>
  )
}

/* styles */
const wrapDark: React.CSSProperties = { maxWidth: 980, margin: '40px auto', padding: 24 }
const cardDark: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)), #121727',
  border: '1px solid rgba(138,164,255,0.16)',
  borderRadius: 16,
  boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 36px rgba(176,192,255,0.15)',
  padding: 20,
  marginBottom: 16,
}
const h2Dark: React.CSSProperties = { fontSize: 18, marginBottom: 8, color: '#EAE6FF' }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }
const labelDark: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelText: React.CSSProperties = { color: 'rgba(255,255,255,0.65)', fontSize: 13 }
const inputDark: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid rgba(138,164,255,0.22)',
  background: '#0f1424',
  color: '#EAE6FF',
  borderRadius: 12,
  height: 44,
  outline: 'none',
}
const btnPrimaryDark: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  background: 'linear-gradient(135deg, #ffd36a, #ffb347)',
  color: '#2b1d00',
  border: '2px solid #fff3b0',
  fontWeight: 700,
}
const btnGhostDark: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  background: 'transparent',
  border: '1px solid rgba(138,164,255,0.22)',
  color: '#EAE6FF',
}
const btnGoogleDark: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: 12,
  background: 'white',
  color: '#333',
  border: '2px solid #ddd',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  justifyContent: 'center',
  cursor: 'pointer',
}
const btnKakaoDark: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: 12,
  background: '#FEE500',
  color: '#000000',
  border: '2px solid #FEE500',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  justifyContent: 'center',
  cursor: 'pointer',
}
const btnFacebookDark: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: 12,
  background: '#1877F2',
  color: 'white',
  border: '2px solid #1877F2',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  justifyContent: 'center',
  cursor: 'pointer',
}
const muted: React.CSSProperties = { color: '#9EA4C9' }