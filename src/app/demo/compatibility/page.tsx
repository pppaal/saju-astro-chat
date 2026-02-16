import { DemoGateMessage } from '../_components/DemoGateMessage'
import { validateDemoTokenForPage } from '@/lib/demo/requireDemoToken'
import CompatibilityClient from './compatibility-client'

interface DemoPageProps {
  searchParams?: { demo_token?: string | string[]; token?: string | string[] }
}

export default function DemoCompatibilityPage({ searchParams }: DemoPageProps) {
  const gate = validateDemoTokenForPage(searchParams)
  if (!gate.ok || !gate.token) {
    return <DemoGateMessage reason={gate.reason} />
  }
  return <CompatibilityClient token={gate.token} />
}
