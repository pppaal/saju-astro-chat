/**
 * 운명 상담사용 self-cross 라인 예시 — 한 사람의 사주 + 점성을 정통
 * 라인 단위로 출력.
 *
 * 케이스: 1995-02-09 06:40 男 서울
 *
 * 출력 카테고리:
 *  사주:
 *    1. 4기둥 — stem · branch · sibsin 한 줄씩
 *    2. 4기둥 내부 cross (천간합/충, 지지합/충/형)
 *    3. 신살 (천을귀인·도화·역마·...)
 *    4. 12운성 (각 지지에 일간 어떤 운성)
 *    5. 공망 (일주 기준)
 *    6. 현재 시기 — 대운·세운·월운·일진 + 본명과의 cross
 *  점성:
 *    1. Natal aspects (행성↔행성·Asc·MC)
 *    2. 행성 in house (1~12)
 *    3. Current transit aspects
 *    4. Profection (해 단위 house)
 *
 * 실행: npx tsx scripts/destiny-counselor-lines-example.ts
 */

import { calculateSajuData } from '../src/lib/saju/saju'
import { calculateNatalChart, toChart } from '../src/lib/astrology/foundation/astrologyService'
import { findNatalAspects } from '../src/lib/astrology/foundation/aspects'

const PERSON = {
  date: '1995-02-09', time: '06:40', gender: 'male' as const,
  year: 1995, month: 2, day: 9, hour: 6, minute: 40,
  latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' as const,
}

const SIGN_KO_TO_EN: Record<string, string> = {
  '양자리': 'Aries', '황소자리': 'Taurus', '쌍둥이자리': 'Gemini', '게자리': 'Cancer',
  '사자자리': 'Leo', '처녀자리': 'Virgo', '천칭자리': 'Libra', '전갈자리': 'Scorpio',
  '사수자리': 'Sagittarius', '염소자리': 'Capricorn', '물병자리': 'Aquarius', '물고기자리': 'Pisces',
}

const STEM_HAP: Record<string, { other: string; element: string }> = {
  '甲': { other: '己', element: '토' }, '己': { other: '甲', element: '토' },
  '乙': { other: '庚', element: '금' }, '庚': { other: '乙', element: '금' },
  '丙': { other: '辛', element: '수' }, '辛': { other: '丙', element: '수' },
  '丁': { other: '壬', element: '목' }, '壬': { other: '丁', element: '목' },
  '戊': { other: '癸', element: '화' }, '癸': { other: '戊', element: '화' },
}
const STEM_CHUNG: Record<string, string> = {
  '甲': '庚', '庚': '甲', '乙': '辛', '辛': '乙',
  '丙': '壬', '壬': '丙', '丁': '癸', '癸': '丁',
}
const BRANCH_HAP: Record<string, { other: string; element: string }> = {
  '子': { other: '丑', element: '토' }, '丑': { other: '子', element: '토' },
  '寅': { other: '亥', element: '목' }, '亥': { other: '寅', element: '목' },
  '卯': { other: '戌', element: '화' }, '戌': { other: '卯', element: '화' },
  '辰': { other: '酉', element: '금' }, '酉': { other: '辰', element: '금' },
  '巳': { other: '申', element: '수' }, '申': { other: '巳', element: '수' },
  '午': { other: '未', element: '화' }, '未': { other: '午', element: '화' },
}
const BRANCH_CHUNG: Record<string, string> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑',
  '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
}
const PILLAR_LABELS = ['년', '월', '일', '시'] as const
const CHEONULGWIIN: Record<string, string[]> = {
  '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '辛': ['寅', '午'],
  '壬': ['巳', '卯'], '癸': ['巳', '卯'],
}
// 12운성 — 일간 × 지지 (양/음 다름. 여기선 간단 양간 기준만 시연)
const TWELVE_STAGE_YANG: Record<string, Record<string, string>> = {
  // 일간 → 지지 → 운성
  '甲': { '亥': '장생', '子': '목욕', '丑': '관대', '寅': '건록', '卯': '제왕', '辰': '쇠', '巳': '병', '午': '사', '未': '묘', '申': '절', '酉': '태', '戌': '양' },
  '丙': { '寅': '장생', '卯': '목욕', '辰': '관대', '巳': '건록', '午': '제왕', '未': '쇠', '申': '병', '酉': '사', '戌': '묘', '亥': '절', '子': '태', '丑': '양' },
  '戊': { '寅': '장생', '卯': '목욕', '辰': '관대', '巳': '건록', '午': '제왕', '未': '쇠', '申': '병', '酉': '사', '戌': '묘', '亥': '절', '子': '태', '丑': '양' },
  '庚': { '巳': '장생', '午': '목욕', '未': '관대', '申': '건록', '酉': '제왕', '戌': '쇠', '亥': '병', '子': '사', '丑': '묘', '寅': '절', '卯': '태', '辰': '양' },
  '壬': { '申': '장생', '酉': '목욕', '戌': '관대', '亥': '건록', '子': '제왕', '丑': '쇠', '寅': '병', '卯': '사', '辰': '묘', '巳': '절', '午': '태', '未': '양' },
}
const TWELVE_STAGE_YIN: Record<string, Record<string, string>> = {
  '乙': { '午': '장생', '巳': '목욕', '辰': '관대', '卯': '건록', '寅': '제왕', '丑': '쇠', '子': '병', '亥': '사', '戌': '묘', '酉': '절', '申': '태', '未': '양' },
  '丁': { '酉': '장생', '申': '목욕', '未': '관대', '午': '건록', '巳': '제왕', '辰': '쇠', '卯': '병', '寅': '사', '丑': '묘', '子': '절', '亥': '태', '戌': '양' },
  '己': { '酉': '장생', '申': '목욕', '未': '관대', '午': '건록', '巳': '제왕', '辰': '쇠', '卯': '병', '寅': '사', '丑': '묘', '子': '절', '亥': '태', '戌': '양' },
  '辛': { '子': '장생', '亥': '목욕', '戌': '관대', '酉': '건록', '申': '제왕', '未': '쇠', '午': '병', '巳': '사', '辰': '묘', '卯': '절', '寅': '태', '丑': '양' },
  '癸': { '卯': '장생', '寅': '목욕', '丑': '관대', '子': '건록', '亥': '제왕', '戌': '쇠', '酉': '병', '申': '사', '未': '묘', '午': '절', '巳': '태', '辰': '양' },
}
const STEM_YINYANG: Record<string, 'yang' | 'yin'> = {
  '甲': 'yang', '丙': 'yang', '戊': 'yang', '庚': 'yang', '壬': 'yang',
  '乙': 'yin', '丁': 'yin', '己': 'yin', '辛': 'yin', '癸': 'yin',
}
function twelveStage(dayStem: string, branch: string): string {
  const table = STEM_YINYANG[dayStem] === 'yang' ? TWELVE_STAGE_YANG[dayStem] : TWELVE_STAGE_YIN[dayStem]
  return table?.[branch] ?? '?'
}

// 공망 — 일주 60갑자 → 공망 지지 2개
const GONGMANG: Record<string, [string, string]> = {
  '甲子': ['戌', '亥'], '甲戌': ['申', '酉'], '甲申': ['午', '未'], '甲午': ['辰', '巳'],
  '甲辰': ['寅', '卯'], '甲寅': ['子', '丑'],
  // 일주별로 다 있지만 demo라 일부만. 실 production은 전체.
}
function gongmangOfPillar(stem: string, branch: string): [string, string] | null {
  // 일주 + 그 다음 9 일주가 같은 공망 group
  // 단순화: stem 60주기에서 가장 가까운 甲X 찾기
  const key = `${stem}${branch}`
  if (GONGMANG[key]) return GONGMANG[key]
  // 정확한 매핑은 60갑자 순서로 — 여기선 demo skip
  return null
}

const ASPECT_NAME: Record<string, string> = {
  conjunction: 'Conjunction', opposition: 'Opposition', trine: 'Trine',
  square: 'Square', sextile: 'Sextile', quincunx: 'Quincunx',
  semisextile: 'Semisextile', quintile: 'Quintile', biquintile: 'Biquintile',
}

function orbToDegMin(orb: number): string {
  const deg = Math.floor(orb)
  const min = Math.round((orb - deg) * 60)
  return `${deg}°${String(min).padStart(2, '0')}'`
}

async function main() {
  const out: string[] = []
  const push = (s: string) => out.push(s)

  // ── SAJU ────────────────────────────────────────────────
  const saju = calculateSajuData(PERSON.date, PERSON.time, PERSON.gender, 'solar', PERSON.timeZone)
  const p = saju.pillars
  const pillars: Array<{ stem: string; branch: string; stemSib?: string; branchSib?: string }> = [
    { stem: p?.year?.heavenlyStem?.name ?? '', branch: p?.year?.earthlyBranch?.name ?? '', stemSib: p?.year?.heavenlyStem?.sibsin, branchSib: p?.year?.earthlyBranch?.sibsin },
    { stem: p?.month?.heavenlyStem?.name ?? '', branch: p?.month?.earthlyBranch?.name ?? '', stemSib: p?.month?.heavenlyStem?.sibsin, branchSib: p?.month?.earthlyBranch?.sibsin },
    { stem: p?.day?.heavenlyStem?.name ?? '', branch: p?.day?.earthlyBranch?.name ?? '', stemSib: '-', branchSib: p?.day?.earthlyBranch?.sibsin },
    { stem: p?.time?.heavenlyStem?.name ?? '', branch: p?.time?.earthlyBranch?.name ?? '', stemSib: p?.time?.heavenlyStem?.sibsin, branchSib: p?.time?.earthlyBranch?.sibsin },
  ]
  const dayMaster = pillars[2].stem

  push('═══ 사주 self-cross ═══\n')
  push('[4기둥]')
  for (let i = 0; i < 4; i++) {
    push(`${PILLAR_LABELS[i]}: ${pillars[i].stem}${pillars[i].branch}  (천간 ${pillars[i].stemSib ?? '-'} / 지지 ${pillars[i].branchSib ?? '-'})`)
  }
  push(`일간: ${dayMaster}`)
  push('')

  push('[4기둥 내부 cross]')
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const aS = pillars[i].stem, bS = pillars[j].stem
      if (STEM_HAP[aS]?.other === bS) {
        push(`${PILLAR_LABELS[i]}천간 ${aS} + ${PILLAR_LABELS[j]}천간 ${bS} — ${aS}${bS}合化${STEM_HAP[aS]!.element} (천간합)`)
      }
      if (STEM_CHUNG[aS] === bS) {
        push(`${PILLAR_LABELS[i]}천간 ${aS} ↔ ${PILLAR_LABELS[j]}천간 ${bS} — 천간충`)
      }
      const aB = pillars[i].branch, bB = pillars[j].branch
      if (BRANCH_HAP[aB]?.other === bB) {
        push(`${PILLAR_LABELS[i]}지 ${aB} + ${PILLAR_LABELS[j]}지 ${bB} — ${aB}${bB}합화${BRANCH_HAP[aB]!.element} (지지합)`)
      }
      if (BRANCH_CHUNG[aB] === bB) {
        push(`${PILLAR_LABELS[i]}지 ${aB} ↔ ${PILLAR_LABELS[j]}지 ${bB} — 지지충`)
      }
    }
  }
  push('')

  push('[신살 — 천을귀인]')
  const cheonul = CHEONULGWIIN[dayMaster] ?? []
  for (let i = 0; i < 4; i++) {
    if (cheonul.includes(pillars[i].branch)) {
      push(`천을귀인 (${cheonul.join('·')}) activates ${PILLAR_LABELS[i]}지 ${pillars[i].branch}`)
    }
  }
  push('')

  push('[12운성 — 일간 vs 각 지지]')
  for (let i = 0; i < 4; i++) {
    const stage = twelveStage(dayMaster, pillars[i].branch)
    push(`${PILLAR_LABELS[i]}지 ${pillars[i].branch} — ${stage}`)
  }
  push('')

  const gong = gongmangOfPillar(pillars[2].stem, pillars[2].branch)
  if (gong) {
    push(`[공망 (일주 ${pillars[2].stem}${pillars[2].branch})]`)
    push(`공망 지지: ${gong.join(', ')}`)
    for (let i = 0; i < 4; i++) {
      if (i === 2) continue
      if (gong.includes(pillars[i].branch)) {
        push(`${PILLAR_LABELS[i]}지 ${pillars[i].branch} — 공망 (작용 약화)`)
      }
    }
    push('')
  }

  // 현재 시기 — 대운 + 세운 + 월운 + 일진
  const cur = saju.daeWoon?.current
  if (cur) {
    push('[현재 시기 cross]')
    push(`현재 대운: ${cur.age}세 ${cur.heavenlyStem}${cur.earthlyBranch}`)
    // 본명과의 cross (대운 stem/branch vs 4기둥)
    const dS = cur.heavenlyStem ?? '', dB = cur.earthlyBranch ?? ''
    for (let i = 0; i < 4; i++) {
      if (STEM_HAP[pillars[i].stem]?.other === dS) {
        push(`${PILLAR_LABELS[i]}천간 ${pillars[i].stem} + 대운 ${dS} — ${pillars[i].stem}${dS}合 (본명-대운 합)`)
      }
      if (STEM_CHUNG[pillars[i].stem] === dS) {
        push(`${PILLAR_LABELS[i]}천간 ${pillars[i].stem} ↔ 대운 ${dS} — 천간충 (본명-대운 충돌)`)
      }
      if (BRANCH_HAP[pillars[i].branch]?.other === dB) {
        push(`${PILLAR_LABELS[i]}지 ${pillars[i].branch} + 대운 ${dB} — ${pillars[i].branch}${dB}합`)
      }
      if (BRANCH_CHUNG[pillars[i].branch] === dB) {
        push(`${PILLAR_LABELS[i]}지 ${pillars[i].branch} ↔ 대운 ${dB} — 지지충`)
      }
    }
    push('')
  }

  // ── ASTRO ───────────────────────────────────────────────
  push('═══ 점성 self-cross (natal aspects + houses) ═══\n')
  const natal = await calculateNatalChart({
    year: PERSON.year, month: PERSON.month, date: PERSON.day,
    hour: PERSON.hour, minute: PERSON.minute,
    latitude: PERSON.latitude, longitude: PERSON.longitude, timeZone: PERSON.timeZone,
  })
  const chart = toChart(natal)

  push('[행성 in 사인 · house]')
  for (const pl of [...chart.planets, chart.ascendant, chart.mc]) {
    const enSign = SIGN_KO_TO_EN[pl.sign] ?? pl.sign
    const houseStr = pl.house > 0 ? `, House ${pl.house}` : ''
    push(`${pl.name} in ${enSign} ${pl.degree}°${pl.minute.toString().padStart(2, '0')}'${houseStr}${pl.retrograde ? ' R' : ''}`)
  }
  push('')

  push('[Natal aspects — 행성·angle 사이]')
  // chart.planets에서 name으로 sign 찾는 lookup — findNatalAspects 결과의
  // from/to.sign이 비어 있을 수 있어 보조.
  const signByName = new Map<string, string>()
  for (const pl of [...chart.planets, chart.ascendant, chart.mc]) {
    signByName.set(pl.name, SIGN_KO_TO_EN[pl.sign] ?? pl.sign)
  }
  const aspects = findNatalAspects(chart, { includeMinor: true, maxResults: 80 })
  for (const asp of aspects) {
    const fromSign = signByName.get(asp.from.name) ?? '?'
    const toSign = signByName.get(asp.to.name) ?? '?'
    push(`${asp.from.name} in ${fromSign} ${ASPECT_NAME[asp.type] ?? asp.type} ${asp.to.name} in ${toSign} (Orb: ${orbToDegMin(asp.orb)})`)
  }

  console.log(out.join('\n'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
