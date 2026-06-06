/* eslint-disable no-console */
/**
 * 일회용 러너 — 한 사람의 인생 전체 흐름(점성 × 사주 교차)을 콘솔로 출력.
 * 실행: npx tsx scripts/run-lifetime.ts
 */
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { deriveLifetimeFlow } from '@/lib/calendar-engine/derivers/lifetimeFlow'
import { calculateOuterPlanetMilestones } from '@/lib/astrology/foundation/planetReturns'

const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665, // 서울 시청
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
  calendarType: 'solar' as const,
}

async function main() {
  const natal = await buildNatalContext(BIRTH)

  const milestones = calculateOuterPlanetMilestones({
    year: 1995,
    month: 2,
    date: 9,
    hour: 6,
    minute: 40,
    latitude: BIRTH.latitude,
    longitude: BIRTH.longitude,
    timeZone: BIRTH.timeZone,
  })

  // ── 본명 한 줄 요약 (교차의 두 축) ──
  const p = natal.saju?.pillars
  const ganji = (x: any) => (x ? `${x.heavenlyStem?.name ?? ''}${x.earthlyBranch?.name ?? ''}` : '?')
  console.log('━'.repeat(64))
  console.log('  1995-02-09  06:40  서울  남자')
  console.log('━'.repeat(64))
  console.log('[사주]  사주 네 기둥:',
    `年 ${ganji(p?.year)}  月 ${ganji(p?.month)}  日 ${ganji(p?.day)}  時 ${ganji(p?.time)}`)
  const ys = (natal.saju as any)?.yongsin
  console.log('        일간(나):', natal.saju?.dayMaster?.name,
    '· 강약:', natal.saju?.strength,
    '· 용신:', [ys?.primary, ys?.secondary].filter(Boolean).join('·') || '-')

  const chart = natal.astro?.chart
  const planet = (name: string) => chart?.planets?.find((x) => x.name === name)
  const sun = planet('Sun')
  const moon = planet('Moon')
  console.log('[점성]  태양:', sun?.sign ?? '?',
    '· 달:', moon?.sign ?? '?',
    '· 상승(ASC):', chart?.ascendant?.sign ?? '?',
    '· MC:', chart?.mc?.sign ?? '?',
    '· 섹트:', natal.astro?.sect === 'day' ? '낮(주)' : '밤(야)')

  const KIND_KO: Record<string, string> = {
    jupiter_return_1: '1차 목성회귀', jupiter_return_2: '2차 목성회귀',
    jupiter_return_3: '3차 목성회귀', jupiter_return_5: '5차 목성회귀',
    saturn_return_1: '1차 토성회귀(첫 정산)', saturn_return_2: '2차 토성회귀',
    pluto_square_pluto: '명왕성 사각', uranus_opposition: '천왕성 대립(중년 전환)',
    neptune_square: '해왕성 사각', chiron_return: '카이런 회귀(치유)',
    uranus_return: '천왕성 회귀',
  }
  const fmtDate = (iso: string | null) =>
    iso ? `${iso.slice(0, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}` : '(검색범위 밖)'
  console.log('[점성]  외행성 마디(정확 일시):')
  for (const m of milestones) {
    console.log('        ·',
      (KIND_KO[m.kind] ?? m.kind).padEnd(18),
      '→', fmtDate(m.exactDateISO), `(만 ${m.age ?? '?'}세)`)
  }

  // ── 인생 흐름 (대운 단계별, 점성 마디 교차 주입) ──
  const flow = deriveLifetimeFlow(natal, 'ko', milestones)
  console.log('━'.repeat(64))
  if (!flow) {
    console.log('deriveLifetimeFlow 가 undefined 반환 (birthYear/daeun/dayMaster 부족)')
    return
  }
  console.log('[인생 흐름]', flow.intro)
  console.log('━'.repeat(64))
  for (const ph of flow.phases) {
    const mark = ph.current ? ' ◀ 지금' : ''
    console.log(`\n● ${ph.label}  ${ph.ageRange}${mark}`)
    if (ph.daeunLine) console.log('  [대운·사주]', ph.daeunLine)
    if (ph.milestoneLine) console.log('  [외행성·점성]', ph.milestoneLine)
    if (ph.twelveStageLine) console.log('  [12운성]', ph.twelveStageLine)
    if (ph.shinsalLine) console.log('  [신살]', ph.shinsalLine)
    if (ph.relationLine) console.log('  [관계]', ph.relationLine)
    console.log('  ', ph.text)
  }
  console.log('\n' + '━'.repeat(64))
}

main().catch((e) => {
  console.error('실패:', e)
  process.exit(1)
})
