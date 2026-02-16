import { DemoGateMessage } from '../_components/DemoGateMessage'
import { DemoServiceRunner } from '../_components/DemoServiceRunner'
import { validateDemoTokenForPage } from '@/lib/demo/requireDemoToken'

interface DemoPageProps {
  searchParams?: { demo_token?: string | string[]; token?: string | string[] }
}

export default function DemoDestinyMatrixPage({ searchParams }: DemoPageProps) {
  const gate = validateDemoTokenForPage(searchParams)
  if (!gate.ok || !gate.token) {
    return <DemoGateMessage reason={gate.reason} />
  }

  return (
    <DemoServiceRunner
      title="Destiny Matrix Demo"
      description="Calls matrix scoring endpoint and returns summary fields including domainScores and overlapTimeline."
      token={gate.token}
      endpoint="/api/demo/destiny-matrix"
      buildPayload={(profile) => ({
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        timezone: profile.timezone,
        gender: profile.gender,
        lang: 'en',
      })}
    />
  )
}
