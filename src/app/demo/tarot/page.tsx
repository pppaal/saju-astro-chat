import { DemoGateMessage } from '../_components/DemoGateMessage'
import { DemoServiceRunner } from '../_components/DemoServiceRunner'
import { validateDemoTokenForPage } from '@/lib/demo/requireDemoToken'

interface DemoPageProps {
  searchParams?: { demo_token?: string | string[]; token?: string | string[] }
}

export default async function DemoTarotPage({ searchParams }: DemoPageProps) {
  const gate = await validateDemoTokenForPage(searchParams)
  if (!gate.ok) {
    return <DemoGateMessage reason={gate.reason} />
  }

  return (
    <DemoServiceRunner
      title="Tarot Demo"
      description="Runs tarot draw with demo credit bypass via server-side demo token check."
      token={gate.token || undefined}
      endpoint="/api/demo/tarot"
      buildPayload={() => ({
        categoryId: 'love',
        spreadId: 'three-card',
      })}
    />
  )
}
