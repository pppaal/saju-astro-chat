import Link from 'next/link'
import styles from './demo-ui.module.css'

interface DemoGateMessageProps {
  reason?: 'disabled' | 'misconfigured' | 'missing_or_invalid'
}

export function DemoGateMessage({ reason = 'missing_or_invalid' }: DemoGateMessageProps) {
  const reasonText =
    reason === 'disabled'
      ? 'Demo mode is currently disabled.'
      : reason === 'misconfigured'
        ? 'Demo mode is not configured on this deployment.'
        : 'A valid demo token is required.'

  return (
    <main className={styles.gateWrap}>
      <div className={styles.gateCard}>
        <h1 className={styles.gateHeading}>Demo access required</h1>
        <p>{reasonText}</p>
        <p>
          Open demo URLs with <code className={styles.gateCode}>?demo_token=YOUR_TOKEN</code>{' '}
          (preferred) or <code className={styles.gateCode}>?token=YOUR_TOKEN</code> (legacy), or
          send header <code className={styles.gateCode}>x-demo-token: YOUR_TOKEN</code>.
        </p>
        <p>
          Example:{' '}
          <code className={styles.gateCode}>/demo?demo_token=YOUR_TOKEN</code> or{' '}
          <code className={styles.gateCode}>/demo?token=YOUR_TOKEN</code>
        </p>
        <Link href="/">Back to home</Link>
      </div>
    </main>
  )
}
