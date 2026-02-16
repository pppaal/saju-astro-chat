import { DemoGateMessage } from '../_components/DemoGateMessage'
import { DemoServiceRunner } from '../_components/DemoServiceRunner'
import { validateDemoTokenForPage } from '@/lib/demo/requireDemoToken'

interface DemoPageProps {
  searchParams?: { demo_token?: string | string[]; token?: string | string[] }
}

export default async function DemoCalendarPage({ searchParams }: DemoPageProps) {
  const gate = await validateDemoTokenForPage(searchParams)
  if (!gate.ok) {
    return <DemoGateMessage reason={gate.reason} />
  }

  return (
    <DemoServiceRunner
      title="Calendar Demo"
      description="Generates calendar output from production calendar endpoint with demo profile data."
      token={gate.token || undefined}
      endpoint="/api/demo/calendar"
      payloadPreset="calendar"
    />
  )
}
