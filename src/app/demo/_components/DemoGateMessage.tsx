import Link from 'next/link'

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
    <main style={{ maxWidth: 820, margin: '40px auto', padding: 24 }}>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
          background: '#ffffff',
        }}
      >
        <h1 style={{ marginTop: 0 }}>Demo access required</h1>
        <p>{reasonText}</p>
        <p>
          Open demo URLs with `?demo_token=YOUR_TOKEN`, or send header `x-demo-token: YOUR_TOKEN`.
        </p>
        <p>
          Example: <code>/demo?demo_token=YOUR_TOKEN</code>
        </p>
        <Link href="/">Back to home</Link>
      </div>
    </main>
  )
}
