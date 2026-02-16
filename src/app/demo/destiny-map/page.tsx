import { DemoGateMessage } from '../_components/DemoGateMessage'
import { DemoServiceRunner } from '../_components/DemoServiceRunner'
import { validateDemoTokenForPage } from '@/lib/demo/requireDemoToken'

interface DemoPageProps {
  searchParams?: { demo_token?: string | string[]; token?: string | string[] }
}

export default function DemoDestinyMapPage({ searchParams }: DemoPageProps) {
  const gate = validateDemoTokenForPage(searchParams)
  if (!gate.ok || !gate.token) {
    return <DemoGateMessage reason={gate.reason} />
  }

  return (
    <DemoServiceRunner
      title="Destiny Map Demo"
      description="Generates a destiny-map result using the same production API endpoint."
      token={gate.token}
      endpoint="/api/demo/destiny-map"
      buildPayload={(profile) => ({
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
      })}
    />
  )
}
