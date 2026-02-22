'use client'

import { useMemo, useState } from 'react'
import { DemoBadge } from '../_components/DemoBadge'
import { DemoProfileForm } from '../_components/DemoProfileForm'
import { DemoLoading } from '../_components/DemoLoading'
import { DemoErrorState } from '../_components/DemoErrorState'
import { DemoResultCard } from '../_components/DemoResultCard'
import { DEFAULT_DEMO_PROFILE, type DemoProfile } from '../_components/types'
import styles from '../_components/demo-ui.module.css'

interface CompatibilityClientProps {
  token?: string
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
  const [error, setError] = useState<unknown>(null)
  const [result, setResult] = useState<unknown>(null)
  const requestUrl = useMemo(
    () =>
      token
        ? `/api/demo/compatibility?demo_token=${encodeURIComponent(token)}`
        : '/api/demo/compatibility',
    [token]
  )

  const onRun = async () => {
    setLoading(true)
    setError(null)
    try {
      const headers: HeadersInit = {
        'content-type': 'application/json',
      }
      if (token) {
        headers['x-demo-token'] = token
      }

      const res = await fetch(requestUrl, {
        method: 'POST',
        headers,
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
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw (json as { error?: unknown } | null)?.error || json || `Request failed (${res.status})`
      }
      setResult(json)
    } catch (err) {
      setResult(null)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <DemoBadge />
        <h1 className={styles.title}>Compatibility Demo</h1>
      </header>
      <p className={styles.description}>
        Runs compatibility API with two editable profiles and demo token gate.
      </p>
      <DemoProfileForm value={profileA} onChange={setProfileA} title="Profile A" />
      <DemoProfileForm value={profileB} onChange={setProfileB} title="Profile B" />
      <div className={styles.actionRow}>
        <button type="button" onClick={onRun} disabled={loading} className={styles.runButton}>
          {loading ? 'Running...' : 'Run Demo'}
        </button>
        <span className={styles.helperText}>/api/demo/compatibility</span>
      </div>
      {loading && <DemoLoading />}
      {error && <DemoErrorState message={error} />}
      {Boolean(result) && <DemoResultCard title="Demo Result" data={result} />}
    </main>
  )
}
