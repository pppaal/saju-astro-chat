import { DemoGateMessage } from '../_components/DemoGateMessage'
import { DemoServiceRunner } from '../_components/DemoServiceRunner'
import { validateDemoTokenForPage } from '@/lib/demo/requireDemoToken'

interface DemoPageProps {
  searchParams?: { demo_token?: string | string[]; token?: string | string[] }
}

export default function DemoReportPage({ searchParams }: DemoPageProps) {
  const gate = validateDemoTokenForPage(searchParams)
  if (!gate.ok || !gate.token) {
    return <DemoGateMessage reason={gate.reason} />
  }

  return (
    <DemoServiceRunner
      title="Report Demo"
      description="Generates a shortened report summary from the matrix report API."
      token={gate.token}
      endpoint="/api/demo/report"
      buildPayload={(profile) => ({
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        timezone: profile.timezone,
        lang: 'en',
        queryDomain: 'career',
        maxInsights: 5,
      })}
    />
  )
}
