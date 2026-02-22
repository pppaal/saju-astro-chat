'use client'

import { useMemo, useState } from 'react'
import { DemoProfileForm } from './DemoProfileForm'
import { DemoResultCard } from './DemoResultCard'
import { DemoErrorState } from './DemoErrorState'
import { DemoLoading } from './DemoLoading'
import { DemoBadge } from './DemoBadge'
import { DEFAULT_DEMO_PROFILE, type DemoProfile } from './types'
import styles from './demo-ui.module.css'

type DemoPayloadPreset = 'calendar' | 'destiny-map' | 'destiny-matrix' | 'report' | 'tarot'

interface DemoServiceRunnerProps {
  title: string
  description: string
  token?: string
  endpoint: string
  payloadPreset: DemoPayloadPreset
}

function buildPayload(preset: DemoPayloadPreset, profile: DemoProfile): unknown {
  switch (preset) {
    case 'calendar':
      return {
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        birthPlace: profile.city,
        locale: 'en',
        category: 'general',
        year: new Date().getFullYear(),
      }
    case 'destiny-map':
      return {
        name: profile.name,
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        city: profile.city,
        latitude: profile.latitude,
        longitude: profile.longitude,
        timezone: profile.timezone,
        userTimezone: profile.timezone,
        gender: profile.gender,
        theme: 'focus_overall',
        lang: 'en',
      }
    case 'destiny-matrix':
      return {
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        timezone: profile.timezone,
        gender: profile.gender,
        lang: 'en',
      }
    case 'report':
      return {
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        timezone: profile.timezone,
        gender: profile.gender,
        lang: 'en',
        queryDomain: 'career',
        maxInsights: 5,
      }
    case 'tarot':
      return {
        categoryId: 'love',
        spreadId: 'three-card',
      }
    default:
      return {}
  }
}

export function DemoServiceRunner({
  title,
  description,
  token,
  endpoint,
  payloadPreset,
}: DemoServiceRunnerProps) {
  const [profile, setProfile] = useState<DemoProfile>(DEFAULT_DEMO_PROFILE)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const requestUrl = useMemo(
    () => (token ? `${endpoint}?demo_token=${encodeURIComponent(token)}` : endpoint),
    [endpoint, token]
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
        body: JSON.stringify(buildPayload(payloadPreset, profile)),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw (
          (json as { error?: unknown } | null)?.error || json || `Request failed (${res.status})`
        )
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
        <h1 className={styles.title}>{title}</h1>
      </header>
      <p className={styles.description}>{description}</p>
      <DemoProfileForm value={profile} onChange={setProfile} />
      <div className={styles.actionRow}>
        <button type="button" onClick={onRun} disabled={loading} className={styles.runButton}>
          {loading ? 'Running...' : 'Run Demo'}
        </button>
        <span className={styles.helperText}>{endpoint}</span>
      </div>
      {loading && <DemoLoading />}
      {Boolean(error) && <DemoErrorState message={error} />}
      {Boolean(result) && <DemoResultCard title="Demo Result" data={result} />}
    </main>
  )
}
