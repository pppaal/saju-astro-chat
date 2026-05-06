import {
  buildCompatibilityPremiumReport,
  type CompatibilityPremiumInput,
} from '@/lib/compatibility/premiumReport'
import CompatibilityReportClient from './CompatibilityReportClient'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const DEFAULT_COUPLE: CompatibilityPremiumInput = {
  a: { name: 'A', date: '1995-02-09', time: '06:40', gender: 'male' },
  b: { name: 'B', date: '1991-02-03', time: '00:35', gender: 'female' },
}

function pickStr(v: string | string[] | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined
}

export default async function CompatibilityPremiumPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const aDate = pickStr(sp.aDate) || DEFAULT_COUPLE.a.date
  const aTime = pickStr(sp.aTime) || DEFAULT_COUPLE.a.time
  const aGender = (pickStr(sp.aGender) || DEFAULT_COUPLE.a.gender) as 'male' | 'female'
  const aName = pickStr(sp.aName) || DEFAULT_COUPLE.a.name

  const bDate = pickStr(sp.bDate) || DEFAULT_COUPLE.b.date
  const bTime = pickStr(sp.bTime) || DEFAULT_COUPLE.b.time
  const bGender = (pickStr(sp.bGender) || DEFAULT_COUPLE.b.gender) as 'male' | 'female'
  const bName = pickStr(sp.bName) || DEFAULT_COUPLE.b.name

  const report = await buildCompatibilityPremiumReport({
    a: { name: aName, date: aDate, time: aTime, gender: aGender },
    b: { name: bName, date: bDate, time: bTime, gender: bGender },
  })

  return <CompatibilityReportClient report={report} />
}
