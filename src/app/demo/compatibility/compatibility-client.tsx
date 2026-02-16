'use client'

import { useMemo, useState } from 'react'
import { DemoBadge } from '../_components/DemoBadge'
import { DemoProfileForm } from '../_components/DemoProfileForm'
import { DemoLoading } from '../_components/DemoLoading'
import { DemoErrorState } from '../_components/DemoErrorState'
import { DemoResultCard } from '../_components/DemoResultCard'
import { DEFAULT_DEMO_PROFILE, type DemoProfile } from '../_components/types'

interface CompatibilityClientProps {
  token: string
}

const PARTNER_PROFILE: DemoProfile = {
  name: 'Demo Partner',
  birthDate: '1996-08-14',
  birthTime: '21:20',
  city: 'Seoul',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
  gender: 'female',
}

export default function CompatibilityClient({ token }: CompatibilityClientProps) {
  const [profileA, setProfileA] = useState<DemoProfile>(DEFAULT_DEMO_PROFILE)
  const [profileB, setProfileB] = useState<DemoProfile>(PARTNER_PROFILE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<unknown>(null)
  const requestUrl = useMemo(
    () => `/api/demo/compatibility?demo_token=${encodeURIComponent(token)}`,
    [token]
  )

  const onRun = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-demo-token': token,
        },
        body: JSON.stringify({
          persons: [
            {
              name: profileA.name,
              date: profileA.birthDate,
              time: profileA.birthTime,
              latitude: profileA.latitude,
              longitude: profileA.longitude,
              timeZone: profileA.timezone,
              city: profileA.city,
            },
            {
              name: profileB.name,
              date: profileB.birthDate,
              time: profileB.birthTime,
              latitude: profileB.latitude,
              longitude: profileB.longitude,
              timeZone: profileB.timezone,
              city: profileB.city,
              relationToP1: 'lover',
            },
          ],
          locale: 'en',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || `Request failed (${res.status})`)
      }
      setResult(json)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '24px auto', padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <DemoBadge />
        <h1 style={{ margin: 0 }}>Compatibility Demo</h1>
      </header>
      <p>Runs compatibility API with two editable profiles and demo token gate.</p>
      <DemoProfileForm value={profileA} onChange={setProfileA} title="Profile A" />
      <DemoProfileForm value={profileB} onChange={setProfileB} title="Profile B" />
      <div>
        <button type="button" onClick={onRun} disabled={loading}>
          {loading ? 'Running...' : 'Run Demo'}
        </button>
      </div>
      {loading && <DemoLoading />}
      {error && <DemoErrorState message={error} />}
      {Boolean(result) && <DemoResultCard title="Demo Result" data={result} />}
    </main>
  )
}
