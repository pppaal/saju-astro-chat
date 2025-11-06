import { Client } from "pg";
export const runtime = "nodejs";

export async function GET() {
try {
const client = new Client({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false },
});
await client.connect();
const r = await client.query("select 1");
await client.end();
return new Response(JSON.stringify({ ok: true, rows: r.rows }), { status: 200 });
} catch (e) {
return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
}
}