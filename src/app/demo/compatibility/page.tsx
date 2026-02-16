import { DemoGateMessage } from '../_components/DemoGateMessage'
import { validateDemoTokenForPage } from '@/lib/demo/requireDemoToken'
import CompatibilityClient from './compatibility-client'

interface DemoPageProps {
  searchParams?: { demo_token?: string | string[]; token?: string | string[] }
}

export default async function DemoCompatibilityPage({ searchParams }: DemoPageProps) {
  const gate = await validateDemoTokenForPage(searchParams)
  if (!gate.ok) {
    return <DemoGateMessage reason={gate.reason} />
  }
  return <CompatibilityClient token={gate.token || undefined} />
}
