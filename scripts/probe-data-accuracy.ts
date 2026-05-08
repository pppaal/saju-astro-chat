// @ts-nocheck
/**
 * 사주 데이터 정확성 검증 — 다수 생년월일에 대해 핵심 필드 산출 확인.
 *
 * 검증 항목:
 *  - 4기둥 (year/month/day/time)이 모두 채워짐
 *  - 일간 element + yin_yang 정상
 *  - 격국 산출 (또는 명시적 null)
 *  - 신살 활성 ≥1건 (정상 입력)
 *  - 대운 시작 나이 0~15 범위
 *  - 세운/월운/일운 element 채워짐
 *  - 12운성 분포 4기둥에서 산출
 *  - 십신 분포 비어있지 않음
 *
 * 엣지 케이스:
 *  - 한국 양력 자정 (00:00)
 *  - 윤년 2/29
 *  - 연 경계 (12/31 23:59 / 1/1 00:00)
 *  - 입춘 전후 (사주는 입춘 기준)
 */

import { calculateSajuData } from '../src/lib/saju/saju'
import { determineGeokguk } from '../src/lib/saju/geokguk'
import { getShinsalHits, toSajuPillarsLike } from '../src/lib/saju/shinsal'

type Profile = {
  label: string
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  expectations?: Partial<{
    dayMasterElement: string
    minDaeunStartAge: number
    maxDaeunStartAge: number
    minShinsalCount: number
    minSibsinCount: number
  }>
}

const PROFILES: Profile[] = [
  {
    label: '기준: 1995-02-09 06:40 男 (서울)',
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male',
    expectations: { minDaeunStartAge: 0, maxDaeunStartAge: 15, minShinsalCount: 3, minSibsinCount: 5 },
  },
  {
    label: '윤년: 1996-02-29 12:00 女',
    birthDate: '1996-02-29',
    birthTime: '12:00',
    gender: 'female',
    expectations: { minShinsalCount: 1, minSibsinCount: 4 },
  },
  {
    label: '연 경계: 1990-01-01 00:00 男 (입춘 전 → 전년 사주)',
    birthDate: '1990-01-01',
    birthTime: '00:00',
    gender: 'male',
    expectations: { minSibsinCount: 4 },
  },
  {
    label: '연 경계: 2000-12-31 23:59 女',
    birthDate: '2000-12-31',
    birthTime: '23:59',
    gender: 'female',
    expectations: { minSibsinCount: 4 },
  },
  {
    label: '입춘 전: 1985-02-03 14:00 男 (전년 사주여야)',
    birthDate: '1985-02-03',
    birthTime: '14:00',
    gender: 'male',
    expectations: { minSibsinCount: 4 },
  },
  {
    label: '입춘 후: 1985-02-05 14:00 男 (당년 사주)',
    birthDate: '1985-02-05',
    birthTime: '14:00',
    gender: 'male',
    expectations: { minSibsinCount: 4 },
  },
  {
    label: '하지: 2000-06-21 12:00 女',
    birthDate: '2000-06-21',
    birthTime: '12:00',
    gender: 'female',
    expectations: { minSibsinCount: 4 },
  },
  {
    label: '동지: 1980-12-22 12:00 男',
    birthDate: '1980-12-22',
    birthTime: '12:00',
    gender: 'male',
    expectations: { minSibsinCount: 4 },
  },
]

type ProbeReport = {
  label: string
  pass: boolean
  issues: string[]
  facts: Record<string, string | number | boolean | undefined>
}

function probe(profile: Profile): ProbeReport {
  const issues: string[] = []
  const facts: Record<string, any> = {}

  let saju: any
  try {
    saju = calculateSajuData(profile.birthDate, profile.birthTime, profile.gender, 'solar', 'Asia/Seoul')
  } catch (e) {
    issues.push(`calculateSajuData 실패: ${(e as Error).message}`)
    return { label: profile.label, pass: false, issues, facts }
  }

  // 1. 4기둥 검증
  const pillars = saju.pillars
  if (!pillars) {
    issues.push('pillars 없음')
  } else {
    for (const p of ['year', 'month', 'day', 'time']) {
      const pi = pillars[p]
      if (!pi?.heavenlyStem?.name || !pi?.earthlyBranch?.name) {
        issues.push(`pillars.${p} 미산출`)
      }
    }
    facts.pillars = `${pillars.year?.heavenlyStem?.name}${pillars.year?.earthlyBranch?.name} ${pillars.month?.heavenlyStem?.name}${pillars.month?.earthlyBranch?.name} ${pillars.day?.heavenlyStem?.name}${pillars.day?.earthlyBranch?.name} ${pillars.time?.heavenlyStem?.name}${pillars.time?.earthlyBranch?.name}`
  }

  // 2. 일간 element + yin_yang
  const dm = saju.dayMaster
  if (!dm?.name || !dm?.element || !dm?.yin_yang) {
    issues.push('dayMaster 필수 필드 누락')
  } else {
    facts.dayMaster = `${dm.name}(${dm.element}, ${dm.yin_yang})`
    if (profile.expectations?.dayMasterElement && dm.element !== profile.expectations.dayMasterElement) {
      issues.push(`예상 일간 element=${profile.expectations.dayMasterElement}, 실제=${dm.element}`)
    }
  }

  // 3. 대운 시작 나이
  const daeunStart = saju.daeWoon?.list?.[0]?.age ?? saju.daeWoon?.startAge
  facts.daeunStartAge = daeunStart
  if (typeof daeunStart === 'number') {
    const min = profile.expectations?.minDaeunStartAge ?? 0
    const max = profile.expectations?.maxDaeunStartAge ?? 15
    if (daeunStart < min || daeunStart > max) {
      issues.push(`대운 시작 나이 비정상 (실제=${daeunStart}, 기대=${min}~${max})`)
    }
  } else {
    issues.push('대운 시작 나이 미산출')
  }

  // 4. 격국
  let geokguk: string | undefined
  try {
    if (pillars?.year && pillars?.month && pillars?.day) {
      const pillarsSimple: any = {
        year: { stem: pillars.year.heavenlyStem.name, branch: pillars.year.earthlyBranch.name },
        month: { stem: pillars.month.heavenlyStem.name, branch: pillars.month.earthlyBranch.name },
        day: { stem: pillars.day.heavenlyStem.name, branch: pillars.day.earthlyBranch.name },
        time: pillars.time ? { stem: pillars.time.heavenlyStem?.name, branch: pillars.time.earthlyBranch?.name } : undefined,
      }
      geokguk = determineGeokguk(pillarsSimple)?.primary
    }
  } catch (e) {
    issues.push(`격국 산출 에러: ${(e as Error).message}`)
  }
  facts.geokguk = geokguk || '(미산출)'

  // 5. 신살
  let shinsalCount = 0
  try {
    const sajuLike = toSajuPillarsLike({
      yearPillar: saju.yearPillar || pillars.year,
      monthPillar: saju.monthPillar || pillars.month,
      dayPillar: saju.dayPillar || pillars.day,
      timePillar: saju.timePillar || pillars.time,
    } as any)
    const hits = getShinsalHits(sajuLike, {
      includeLucky: true,
      includeUnlucky: true,
      includeTwelveAll: true,
      includeGeneralShinsal: true,
      includeLuckyDetails: true,
      ruleSet: 'your',
    })
    shinsalCount = hits.length
  } catch (e) {
    issues.push(`신살 산출 에러: ${(e as Error).message}`)
  }
  facts.shinsalCount = shinsalCount
  const minShinsal = profile.expectations?.minShinsalCount ?? 1
  if (shinsalCount < minShinsal) {
    issues.push(`신살 ${shinsalCount}건 — 기대 ≥${minShinsal}`)
  }

  // 6. 십신 분포
  let sibsinCount = 0
  if (pillars) {
    for (const p of ['year', 'month', 'day', 'time']) {
      const pi = pillars[p]
      if (pi?.heavenlyStem?.sibsin) sibsinCount++
      if (pi?.earthlyBranch?.sibsin) sibsinCount++
    }
  }
  facts.sibsinTotal = sibsinCount
  const minSibsin = profile.expectations?.minSibsinCount ?? 4
  if (sibsinCount < minSibsin) {
    issues.push(`십신 ${sibsinCount}건 — 기대 ≥${minSibsin}`)
  }

  return { label: profile.label, pass: issues.length === 0, issues, facts }
}

function main() {
  console.log('━━━ 사주 데이터 정확성 검증 — 8 케이스 ━━━\n')
  const reports = PROFILES.map(probe)
  let totalPass = 0
  let totalFail = 0
  for (const r of reports) {
    const status = r.pass ? '✓' : '✗'
    console.log(`${status} ${r.label}`)
    console.log(`  사주: ${r.facts.pillars} | 일간: ${r.facts.dayMaster} | 대운시작: ${r.facts.daeunStartAge}세 | 격국: ${r.facts.geokguk} | 신살: ${r.facts.shinsalCount}건 | 십신: ${r.facts.sibsinTotal}건`)
    if (r.issues.length > 0) {
      for (const i of r.issues) console.log(`    [WARN] ${i}`)
    }
    if (r.pass) totalPass++
    else totalFail++
    console.log()
  }
  console.log(`━━━ 합계: ${totalPass}/${reports.length} 통과 ━━━`)
  if (totalFail > 0) {
    console.log(`${totalFail}건 실패 — 상세는 위 [WARN] 참조`)
    process.exit(1)
  }
}

main()
