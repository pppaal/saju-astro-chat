import { GET } from '@/app/api/calendar/date-detail/route'

async function main() {
  const url =
    'http://localhost:3000/api/calendar/date-detail?birthDate=1995-02-09&birthTime=14:30&gender=male&date=2026-04-13&timezone=Asia/Seoul'
  const req = new Request(url)
  const res = await (GET as unknown as (req: Request, ctx: unknown) => Promise<Response>)(
    req,
    {} as unknown
  )
  const json = await res.json()
  console.log(JSON.stringify(json, null, 2))
}

void main()
