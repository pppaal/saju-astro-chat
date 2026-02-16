import Link from 'next/link'
import { DemoGateMessage } from './_components/DemoGateMessage'
import { DemoBadge } from './_components/DemoBadge'
import { validateDemoTokenForPage } from '@/lib/demo/requireDemoToken'

const SERVICES = [
  {
    path: '/demo/destiny-map',
    title: 'Destiny Map',
    desc: 'Generate a demo destiny-map result with editable profile inputs.',
  },
  {
    path: '/demo/destiny-matrix',
    title: 'Destiny Matrix',
    desc: 'Run matrix scoring and view domain scores + overlap timeline.',
  },
  {
    path: '/demo/tarot',
    title: 'Tarot',
    desc: 'Run a sample tarot reading flow without paywall.',
  },
  {
    path: '/demo/calendar',
    title: 'Calendar',
    desc: 'Generate a daily calendar result for the selected profile.',
  },
  {
    path: '/demo/compatibility',
    title: 'Compatibility',
    desc: 'Analyze two sample profiles for compatibility output.',
  },
  {
    path: '/demo/report',
    title: 'Report',
    desc: 'Generate a shortened report summary using matrix report endpoint.',
  },
]

interface DemoIndexPageProps {
  searchParams?: { demo_token?: string | string[]; token?: string | string[] }
}

export default async function DemoIndexPage({ searchParams }: DemoIndexPageProps) {
  const gate = await validateDemoTokenForPage(searchParams)
  if (!gate.ok) {
    return <DemoGateMessage reason={gate.reason} />
  }

  return (
    <main style={{ maxWidth: 1024, margin: '24px auto', padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <DemoBadge />
        <h1 style={{ margin: 0 }}>Demo Services</h1>
      </header>
      <p>Token-authenticated demo index for preview and production verification.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
        {SERVICES.map((service) => (
          <article
            key={service.path}
            style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}
          >
            <h2 style={{ marginTop: 0 }}>{service.title}</h2>
            <p>{service.desc}</p>
            <Link href={service.path}>Open</Link>
          </article>
        ))}
      </div>
    </main>
  )
}
