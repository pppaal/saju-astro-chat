'use client'

import type { DemoProfile } from './types'

interface DemoProfileFormProps {
  value: DemoProfile
  onChange: (next: DemoProfile) => void
  title?: string
}

export function DemoProfileForm({ value, onChange, title = 'Demo Profile' }: DemoProfileFormProps) {
  return (
    <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
        <label>
          Name
          <input
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            style={{ width: '100%' }}
          />
        </label>
        <label>
          City
          <input
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            style={{ width: '100%' }}
          />
        </label>
        <label>
          Birth Date
          <input
            type="date"
            value={value.birthDate}
            onChange={(e) => onChange({ ...value, birthDate: e.target.value })}
            style={{ width: '100%' }}
          />
        </label>
        <label>
          Birth Time
          <input
            type="time"
            value={value.birthTime}
            onChange={(e) => onChange({ ...value, birthTime: e.target.value })}
            style={{ width: '100%' }}
          />
        </label>
        <label>
          Latitude
          <input
            type="number"
            value={value.latitude}
            onChange={(e) => onChange({ ...value, latitude: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            value={value.longitude}
            onChange={(e) => onChange({ ...value, longitude: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </label>
        <label>
          Timezone
          <input
            value={value.timezone}
            onChange={(e) => onChange({ ...value, timezone: e.target.value })}
            style={{ width: '100%' }}
          />
        </label>
        <label>
          Gender
          <select
            value={value.gender}
            onChange={(e) =>
              onChange({ ...value, gender: e.target.value as DemoProfile['gender'] })
            }
            style={{ width: '100%' }}
          >
            <option value="male">male</option>
            <option value="female">female</option>
          </select>
        </label>
      </div>
    </section>
  )
}
