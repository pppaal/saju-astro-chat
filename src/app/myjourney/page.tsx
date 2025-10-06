'use client'

import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'

export default function Page() {
  return (
    <SessionProvider>
      <MyJourneyPage />
    </SessionProvider>
  )
}

function MyJourneyPage() {
  const { data: session, status } = useSession()

  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | 'U'>('U')

  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const connectSaju = async () => {
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
      const res = await fetch('/api/saju/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate,
          birthTime: birthTime || null,
          gender: gender === 'U' ? null : gender,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to save')
      setMsg('Saju connected successfully.')
    } catch (e: any) {
      setMsg(e?.message || 'Error occurred')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={wrapDark}>
      <h1 style={{ marginBottom: 10, color: '#EAE6FF' }}>My Journey</h1>

      <section style={cardDark}>
        <h2 style={h2Dark}>Account</h2>
        {status === 'loading' ? (
          <p style={muted}>Checking session...</p>
        ) : session ? (
          <>
            <p style={{ margin: '6px 0', color: '#EAE6FF' }}>
              Signed in as {session.user?.name ?? session.user?.email}
            </p>
            <button
              style={btnGhostDark}
              onClick={() => signOut({ callbackUrl: '/myjourney' })}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <p style={{ margin: '6px 0', color: '#9EA4C9' }}>
              Create an account or sign in to save your birth info.
            </p>
            <button
              style={btnPrimaryDark}
              onClick={() => signIn('google', { callbackUrl: '/myjourney' })}
            >
              Continue with Google
            </button>
          </>
        )}
      </section>

      <section style={cardDark}>
        <h2 style={h2Dark}>Birth Information</h2>
        <div style={grid}>
          <label style={labelDark}>
            <span style={labelText}>Date of Birth</span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              style={inputDark}
            />
          </label>
          <label style={labelDark}>
            <span style={labelText}>Time (optional)</span>
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              style={inputDark}
            />
          </label>
          <label style={labelDark}>
            <span style={labelText}>Gender (optional)</span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'U')}
              style={inputDark}
            >
              <option value="U">Unspecified</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            style={btnPrimaryDark}
            onClick={connectSaju}
            disabled={busy || !birthDate}
            title={!birthDate ? 'Select your date of birth' : 'Save'}
          >
            {busy ? 'Saving...' : 'Connect to Saju'}
          </button>
          {!session && (
            <span style={{ fontSize: 12, color: '#9EA4C9' }}>
              Sign in to save your birth data.
            </span>
          )}
        </div>

        {msg && <p style={{ marginTop: 8, color: '#EAE6FF' }}>{msg}</p>}
      </section>
    </main>
  )
}

/* Dark theme inline styles aligned to your globals */
const wrapDark: React.CSSProperties = { maxWidth: 820, margin: '40px auto', padding: 24 }
const cardDark: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)), #121727',
  border: '1px solid rgba(138,164,255,0.16)',
  borderRadius: 16,
  boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 36px rgba(176,192,255,0.15)',
  padding: 20,
  marginBottom: 16,
}
const h2Dark: React.CSSProperties = { fontSize: 18, marginBottom: 8, color: '#EAE6FF' }
const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
}
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
const muted: React.CSSProperties = { color: '#9EA4C9' }