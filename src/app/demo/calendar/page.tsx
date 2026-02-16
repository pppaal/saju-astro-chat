import { DemoGateMessage } from '../_components/DemoGateMessage'
import { DemoServiceRunner } from '../_components/DemoServiceRunner'
import { validateDemoTokenForPage } from '@/lib/demo/requireDemoToken'

interface DemoPageProps {
  searchParams?: { demo_token?: string | string[]; token?: string | string[] }
}

export default function DemoCalendarPage({ searchParams }: DemoPageProps) {
  const gate = validateDemoTokenForPage(searchParams)
  if (!gate.ok || !gate.token) {
    return <DemoGateMessage reason={gate.reason} />
  }

  return (
    <DemoServiceRunner
      title="Calendar Demo"
      description="Generates calendar output from production calendar endpoint with demo profile data."
      token={gate.token}
      endpoint="/api/demo/calendar"
      buildPayload={(profile) => ({
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        birthPlace: profile.city,
        locale: 'en',
        category: 'overall',
        year: new Date().getFullYear(),
      })}
    />
  )
}
