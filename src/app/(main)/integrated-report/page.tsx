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
import { getServerLocale } from '@/components/seo/SEO'
import { cookies } from 'next/headers'
import { fromZonedTime } from 'date-fns-tz'

export const dynamic = 'force-dynamic'

type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function IntegratedReportPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams
  // 로케일 — 메인화면(I18nProvider/언어토글)이 쓰는 'locale' 쿠키를 그대로 따라감.
  // ?lang/?locale 쿼리가 있으면 그게 우선, 없으면 쿠키, 그것도 없으면 헤더(getServerLocale).
  const langOverride = one(sp.lang) ?? one(sp.locale)
  const cookieLocale = (await cookies()).get('locale')?.value
  const lang: 'ko' | 'en' =
    langOverride === 'en'
      ? 'en'
      : langOverride === 'ko'
        ? 'ko'
        : cookieLocale === 'ko'
          ? 'ko'
          : cookieLocale === 'en'
            ? 'en'
            : await getServerLocale()
  const birthDate = one(sp.date) ?? '1992-03-15'
  // 출생시각 미상 — ?time= 없으면 정오(12:00)로 차트 계산(달 오차 최소화)하되,
  // birthTimeUnknown 플래그를 세워 ASC/MC/하우스 의존 해석을 신뢰불가로 처리·경고.
  const rawTime = one(sp.time)
  const birthTimeUnknown = !rawTime
  const birthTime = rawTime ?? '12:00'
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
    birthTimeUnknown,
  })) as unknown as Record<string, unknown>

  // 사용자 입력 메타 (이름·장소 등 raw 엔진이 안 알아채는 표시 전용 필드).
  ctx.input = {
    ...(ctx.input as object),
    birthTimeUnknown,
    name: one(sp.name) ?? (lang === 'en' ? 'Client' : '내담자'),
    gender,
    place: one(sp.place) ?? (lang === 'en' ? 'Seoul, Republic of Korea' : '대한민국 서울'),
    timeZone,
    isoUTC: (() => {
      try {
        // 출생 현지시각(birthDate+birthTime, timeZone) → UTC 환산 표시.
        const utc = fromZonedTime(`${birthDate}T${(birthTime || '00:00').slice(0, 5)}:00`, timeZone)
        return `${utc.toISOString().slice(0, 16).replace('T', ' ')} UTC`
      } catch {
        return ''
      }
    })(),
  }

  const data = natalToReportData(ctx, lang)
  const cross = buildCrossRows(ctx, lang)

  return <IntegratedReport data={data} cross={cross} lang={lang} />
}
