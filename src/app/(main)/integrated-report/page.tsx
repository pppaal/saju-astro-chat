/**
 * 통합 명식 리포트 페이지 — chart.zip 껍데기 + 우리 엔진/데이터.
 * 쿼리: ?date=YYYY-MM-DD&time=HH:mm&lat=&lng=&tz=&gender=male|female
 * 미지정 시 샘플 출생정보로 폴백.
 *
 * 2026-06-06 buildNatalContext (fat wrapper) 폐기 Phase 1: 통합 리포트만
 * 자기 전용 buildReportContext 호출. 안 쓰는 hellenistic 5개
 * (Profection/Lots/ZR/Almuten/5-tier dignity) 계산 안 함.
 */
import { buildReportContext } from './buildReportContext'
import { natalToReportData, buildCrossRows } from '@/components/report/integrated/adapter'
import { IntegratedReport } from '@/components/report/integrated/IntegratedReport'

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

  const ctx = (await buildReportContext({
    birthDate,
    birthTime,
    gender,
    latitude,
    longitude,
    timeZone,
  })) as unknown as Record<string, unknown>

  // 사용자 입력 메타 (이름·장소 등 raw 엔진이 안 알아채는 표시 전용 필드).
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
