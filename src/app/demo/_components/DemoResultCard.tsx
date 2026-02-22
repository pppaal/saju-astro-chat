'use client'

import { useMemo, useState } from 'react'
import styles from './demo-ui.module.css'

interface DemoResultCardProps {
  title: string
  data: unknown
}

function summarizeValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`
  }
  if (typeof value === 'object') {
    return `Object(${Object.keys(value as Record<string, unknown>).length} keys)`
  }
  if (typeof value === 'string') {
    return value.length > 140 ? `${value.slice(0, 140)}...` : value
  }
  return String(value)
}

export function DemoResultCard({ title, data }: DemoResultCardProps) {
  const [copied, setCopied] = useState(false)
  const prettyJson = useMemo(() => JSON.stringify(data, null, 2), [data])
  const entries = useMemo(() => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return []
    }
    return Object.entries(data as Record<string, unknown>).slice(0, 8)
  }, [data])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(prettyJson)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.actionRow}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <button type="button" className={styles.copyButton} onClick={onCopy}>
          {copied ? 'Copied' : 'Copy JSON'}
        </button>
      </div>

      <div className={styles.resultMeta}>
        <span className={styles.metaChip}>Payload size: {prettyJson.length.toLocaleString()} chars</span>
        <span className={styles.metaChip}>
          Top-level keys: {entries.length > 0 ? entries.length : 'not object'}
        </span>
      </div>

      {entries.length > 0 && (
        <div className={styles.summaryGrid}>
          {entries.map(([key, value]) => (
            <article key={key} className={styles.summaryItem}>
              <div className={styles.summaryKey}>{key}</div>
              <p className={styles.summaryValue}>{summarizeValue(value)}</p>
            </article>
          ))}
        </div>
      )}

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>Raw JSON</summary>
        <pre className={styles.jsonCode}>{prettyJson}</pre>
      </details>
    </section>
  )
}
