import { DemoGateMessage } from '../_components/DemoGateMessage'
import { DemoServiceRunner } from '../_components/DemoServiceRunner'
import { validateDemoTokenForPage } from '@/lib/demo/requireDemoToken'

interface DemoPageProps {
  searchParams?: { demo_token?: string | string[]; token?: string | string[] }
}

export default async function DemoDestinyMatrixPage({ searchParams }: DemoPageProps) {
  const gate = await validateDemoTokenForPage(searchParams)
  if (!gate.ok) {
    return <DemoGateMessage reason={gate.reason} />
  }

  return (
    <DemoServiceRunner
      title="Destiny Matrix Demo"
      description="Calls matrix scoring endpoint and returns summary fields including domainScores and overlapTimeline."
      token={gate.token || undefined}
      endpoint="/api/demo/destiny-matrix"
      payloadPreset="destiny-matrix"
    />
  )
}
