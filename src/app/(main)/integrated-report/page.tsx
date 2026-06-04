/**
 * 통합 명식 리포트 페이지 — chart.zip 껍데기 + 우리 엔진/데이터.
 * 쿼리: ?date=YYYY-MM-DD&time=HH:mm&lat=&lng=&tz=&gender=male|female
 * 미지정 시 샘플 출생정보로 폴백.
 */
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { natalToReportData, buildCrossRows } from '@/components/destiny-map/charts/integrated/adapter'
import { IntegratedReport } from '@/components/destiny-map/charts/integrated/IntegratedReport'

export const dynamic = 'force-dynamic'

type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function IntegratedReportPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams
  const birthDate = one(sp.date) ?? '1992-03-15'
  const birthTime = one(sp.time) ?? '09:20'
  const latitude = Number(one(sp.lat) ?? 37.5665)
  const longitude = Number(one(sp.lng) ?? 126.978)
  const timeZone = one(sp.tz) ?? 'Asia/Seoul'
  const gender = one(sp.gender) === 'female' ? 'female' : 'male'

  const ctx = (await buildNatalContext({
    birthDate,
    birthTime,
    gender,
    latitude,
    longitude,
    timeZone,
  })) as unknown as Record<string, unknown>

  const saju = ctx.saju as Record<string, unknown>
  saju.twelveStages = getTwelveStagesForPillars(saju.pillars as never)
  ctx.input = {
    ...(ctx.input as object),
    name: one(sp.name) ?? '내담자',
    gender,
    place: one(sp.place) ?? '대한민국 서울',
    timeZone,
    isoUTC: '',
  }

  const data = natalToReportData(ctx)
  const cross = buildCrossRows(ctx)

  return <IntegratedReport data={data} cross={cross} />
}
