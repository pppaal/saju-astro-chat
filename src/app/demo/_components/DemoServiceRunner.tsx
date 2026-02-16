'use client'

import { useMemo, useState } from 'react'
import { DemoProfileForm } from './DemoProfileForm'
import { DemoResultCard } from './DemoResultCard'
import { DemoErrorState } from './DemoErrorState'
import { DemoLoading } from './DemoLoading'
import { DemoBadge } from './DemoBadge'
import { DEFAULT_DEMO_PROFILE, type DemoProfile } from './types'

interface DemoServiceRunnerProps {
  title: string
  description: string
  token?: string
  endpoint: string
  buildPayload: (profile: DemoProfile) => unknown
}

export function DemoServiceRunner({
  title,
  description,
  token,
  endpoint,
  buildPayload,
}: DemoServiceRunnerProps) {
  const [profile, setProfile] = useState<DemoProfile>(DEFAULT_DEMO_PROFILE)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
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
        body: JSON.stringify(buildPayload(profile)),
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
        <h1 style={{ margin: 0 }}>{title}</h1>
      </header>
      <p>{description}</p>
      <DemoProfileForm value={profile} onChange={setProfile} />
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
