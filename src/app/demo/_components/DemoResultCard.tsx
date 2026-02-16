interface DemoResultCardProps {
  title: string
  data: unknown
}

export function DemoResultCard({ title, data }: DemoResultCardProps) {
  return (
    <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto', margin: 0 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  )
}
