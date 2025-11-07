// app/api/db-ping/route.ts
import { Client } from 'pg'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL
    const ca = process.env.DB_CA_PEM

    if (!dbUrl) {
      return json({ ok: false, error: 'Missing env: DATABASE_URL' }, 500)
    }
    if (!ca) {
      return json({ ok: false, error: 'Missing env: DB_CA_PEM' }, 500)
    }

    // 진단용 최소 로그
    console.log('DB_CA_PEM length:', ca.length)

    const client = new Client({
      connectionString: dbUrl,
      ssl: { ca, rejectUnauthorized: true },
    })

    await client.connect()
    const r = await client.query('select 1')
    await client.end()

    return json({ ok: true, rows: r.rows })
  } catch (e: any) {
    console.error('db-ping error:', e)
    return json({ ok: false, error: String(e?.message || e) }, 500)
  }
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}