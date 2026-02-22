import Link from 'next/link'
import { DemoGateMessage } from './_components/DemoGateMessage'
import { DemoBadge } from './_components/DemoBadge'
import { validateDemoTokenForPage } from '@/lib/demo/requireDemoToken'
import styles from './_components/demo-ui.module.css'

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
    <main className={styles.page}>
      <header className={styles.header}>
        <DemoBadge />
        <h1 className={styles.title}>Demo Services</h1>
      </header>
      <p className={styles.description}>
        Token-authenticated demo index for preview and production verification.
      </p>
      <div className={styles.summaryGrid}>
        {SERVICES.map((service) => (
          <article key={service.path} className={styles.summaryItem}>
            <h2 className={styles.sectionTitle}>{service.title}</h2>
            <p className={styles.description}>{service.desc}</p>
            <Link href={service.path}>Open</Link>
          </article>
        ))}
      </div>
    </main>
  )
}
