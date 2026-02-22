'use client'

import type { DemoProfile } from './types'
import styles from './demo-ui.module.css'

interface DemoProfileFormProps {
  value: DemoProfile
  onChange: (next: DemoProfile) => void
  title?: string
}

export function DemoProfileForm({ value, onChange, title = 'Demo Profile' }: DemoProfileFormProps) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          Name
          <input
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          City
          <input
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          Birth Date
          <input
            type="date"
            value={value.birthDate}
            onChange={(e) => onChange({ ...value, birthDate: e.target.value })}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          Birth Time
          <input
            type="time"
            value={value.birthTime}
            onChange={(e) => onChange({ ...value, birthTime: e.target.value })}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          Latitude
          <input
            type="number"
            value={value.latitude}
            onChange={(e) => onChange({ ...value, latitude: Number(e.target.value) })}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          Longitude
          <input
            type="number"
            value={value.longitude}
            onChange={(e) => onChange({ ...value, longitude: Number(e.target.value) })}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          Timezone
          <input
            value={value.timezone}
            onChange={(e) => onChange({ ...value, timezone: e.target.value })}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          Gender
          <select
            value={value.gender}
            onChange={(e) =>
              onChange({ ...value, gender: e.target.value as DemoProfile['gender'] })
            }
            className={styles.select}
          >
            <option value="male">male</option>
            <option value="female">female</option>
          </select>
        </label>
      </div>
    </section>
  )
}
