// @ts-nocheck
import fs from 'node:fs'
import path from 'node:path'

import { calculateSajuData } from '../src/lib/Saju/saju'
import { analyzeAdvancedSaju } from '../src/lib/Saju/astrologyengine'
import { analyzeRelations, toAnalyzeInputFromSaju } from '../src/lib/Saju/relations'
import {
  getShinsalHits,
  getTwelveStagesForPillars,
  toSajuPillarsLike,
} from '../src/lib/Saju/shinsal'

import {
  calculateNatalChart,
  toChart,
  findNatalAspects,
  calculateTransitChart,
  findMajorTransits,
  calculateExtraPoints,
  calculateAllAsteroids,
  calculateSecondaryProgressions,
  calculateSolarArcDirections,
  calculateSolarReturn,
  calculateLunarReturn,
  compareDraconicToNatal,
  generateHarmonicProfile,
} from '../src/lib/astrology'

type BirthProfile = {
  name: string
  birthDate: string
  birthTime: string
  birthCity: string
  latitude: number
  longitude: number
  timezone: string
  gender: 'male' | 'female'
}

const PROFILE: BirthProfile = {
  name: '1995-02-09 06:40 Seoul',
  birthDate: '1995-02-09',
  birthTime: '06:40',
  birthCity: 'Seoul',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
  gender: 'male', // Assumption: required by Saju engine for daeun direction
}

function pad2(v: number): string {
  return String(v).padStart(2, '0')
}

function toNatalInput(p: BirthProfile) {
  const [y, m, d] = p.birthDate.split('-').map(Number)
  const [hh, mm] = p.birthTime.split(':').map(Number)
  return {
    year: y,
    month: m,
    date: d,
    hour: hh,
    minute: mm,
    latitude: p.latitude,
    longitude: p.longitude,
    timeZone: p.timezone,
  }
}

function renderTable(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(' | ')} |`
  const sep = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n')
  return [head, sep, body].join('\n')
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

async function main() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = now.getMonth() + 1
  const dd = now.getDate()
  const todayIso = `${yyyy}-${pad2(mm)}-${pad2(dd)}`

  const saju = calculateSajuData(
    PROFILE.birthDate,
    PROFILE.birthTime,
    PROFILE.gender,
    'solar',
    PROFILE.timezone
  )

  const pillarsLike = toSajuPillarsLike({
    yearPillar: saju.yearPillar,
    monthPillar: saju.monthPillar,
    dayPillar: saju.dayPillar,
    timePillar: saju.timePillar,
  })

  const relations = analyzeRelations(
    toAnalyzeInputFromSaju(
      {
        year: pillarsLike.year,
        month: pillarsLike.month,
        day: pillarsLike.day,
        time: pillarsLike.time,
      },
      saju.dayPillar.heavenlyStem.name
    )
  )

  const twelveByPillar = getTwelveStagesForPillars(pillarsLike, 'day')
  const shinsalHits = getShinsalHits(pillarsLike, {
    includeTwelveAll: true,
    includeGeneralShinsal: true,
    includeLuckyDetails: true,
    includeLucky: true,
    includeUnlucky: true,
    useMonthCompletion: true,
    includeHwaHae: true,
  })

  const advancedSaju = analyzeAdvancedSaju(
    {
      name: saju.dayPillar.heavenlyStem.name,
      element: saju.dayPillar.heavenlyStem.element,
      yin_yang: saju.dayPillar.heavenlyStem.yin_yang || '양',
    },
    {
      yearPillar: saju.yearPillar,
      monthPillar: saju.monthPillar,
      dayPillar: saju.dayPillar,
      timePillar: saju.timePillar,
    }
  )

  const natalInput = toNatalInput(PROFILE)
  const natalData = await calculateNatalChart(natalInput)
  const natalChart = toChart(natalData)
  const natalAspects = findNatalAspects(natalChart)

  const transitChart = await calculateTransitChart({
    iso: now.toISOString(),
    latitude: PROFILE.latitude,
    longitude: PROFILE.longitude,
    timeZone: PROFILE.timezone,
  })
  const majorTransits = findMajorTransits(natalChart, transitChart)

  const houseCusps = natalData.houses.map((h) => h.cusp)
  const sun = natalData.planets.find((p) => p.name === 'Sun')
  const moon = natalData.planets.find((p) => p.name === 'Moon')
  const extraPoints =
    natalData.meta?.jdUT && sun && moon
      ? await calculateExtraPoints(
          natalData.meta.jdUT,
          PROFILE.latitude,
          PROFILE.longitude,
          natalData.ascendant.longitude,
          sun.longitude,
          moon.longitude,
          sun.house,
          houseCusps
        )
      : null

  const asteroids = natalData.meta?.jdUT
    ? calculateAllAsteroids(natalData.meta.jdUT, houseCusps)
    : []

  const secondary = await calculateSecondaryProgressions({
    natal: natalInput,
    targetDate: todayIso,
  })
  const solarArc = await calculateSolarArcDirections({
    natal: natalInput,
    targetDate: todayIso,
  })
  const solarReturn = await calculateSolarReturn({
    natal: natalInput,
    year: yyyy,
  })
  const lunarReturn = await calculateLunarReturn({
    natal: natalInput,
    year: yyyy,
    month: mm,
  })

  const draconic = compareDraconicToNatal(natalChart)
  const age = yyyy - Number(PROFILE.birthDate.slice(0, 4))
  const harmonicProfile = generateHarmonicProfile(natalChart, age)

  const topAspects = [...natalAspects].sort((a, b) => (a.orb ?? 99) - (b.orb ?? 99)).slice(0, 40)
  const topShinsal = shinsalHits.slice(0, 80)
  const topRelations = relations.slice(0, 60)
  const topTransits = majorTransits.slice(0, 30)

  const mdParts: string[] = []
  mdParts.push(`# Full Saju + Astrology Calculation Report`)
  mdParts.push(``)
  mdParts.push(`- Generated At: ${now.toISOString()}`)
  mdParts.push(`- Profile: ${PROFILE.name}`)
  mdParts.push(`- Birth DateTime: ${PROFILE.birthDate} ${PROFILE.birthTime}`)
  mdParts.push(
    `- City/Coordinates: ${PROFILE.birthCity} (${PROFILE.latitude}, ${PROFILE.longitude})`
  )
  mdParts.push(`- Timezone: ${PROFILE.timezone}`)
  mdParts.push(`- Gender Assumption (Saju Daeun direction only): ${PROFILE.gender}`)
  mdParts.push(``)

  mdParts.push(`## 1) Saju Raw Pillars`)
  mdParts.push(
    renderTable(
      [
        'Pillar',
        'Stem',
        'Stem Element',
        'Stem Sibsin',
        'Branch',
        'Branch Element',
        'Branch Sibsin',
      ],
      [
        [
          'Year',
          saju.yearPillar.heavenlyStem.name,
          saju.yearPillar.heavenlyStem.element,
          saju.yearPillar.heavenlyStem.sibsin,
          saju.yearPillar.earthlyBranch.name,
          saju.yearPillar.earthlyBranch.element,
          saju.yearPillar.earthlyBranch.sibsin,
        ],
        [
          'Month',
          saju.monthPillar.heavenlyStem.name,
          saju.monthPillar.heavenlyStem.element,
          saju.monthPillar.heavenlyStem.sibsin,
          saju.monthPillar.earthlyBranch.name,
          saju.monthPillar.earthlyBranch.element,
          saju.monthPillar.earthlyBranch.sibsin,
        ],
        [
          'Day',
          saju.dayPillar.heavenlyStem.name,
          saju.dayPillar.heavenlyStem.element,
          saju.dayPillar.heavenlyStem.sibsin,
          saju.dayPillar.earthlyBranch.name,
          saju.dayPillar.earthlyBranch.element,
          saju.dayPillar.earthlyBranch.sibsin,
        ],
        [
          'Time',
          saju.timePillar.heavenlyStem.name,
          saju.timePillar.heavenlyStem.element,
          saju.timePillar.heavenlyStem.sibsin,
          saju.timePillar.earthlyBranch.name,
          saju.timePillar.earthlyBranch.element,
          saju.timePillar.earthlyBranch.sibsin,
        ],
      ]
    )
  )
  mdParts.push(``)
  mdParts.push(
    `- Day Master: ${saju.dayMaster.name} (${saju.dayMaster.element}, ${saju.dayMaster.yin_yang})`
  )
  mdParts.push(`- Five Elements Count: ${JSON.stringify(saju.fiveElements)}`)
  mdParts.push(``)

  mdParts.push(`## 2) Saju Advanced Analysis (Shingang/Geokguk/Yongsin)`)
  mdParts.push(`- Strength Level: ${advancedSaju.strength.level}`)
  mdParts.push(`- Strength Score: ${advancedSaju.strength.score}`)
  mdParts.push(
    `- Helping vs Draining: ${advancedSaju.strength.helpingScore} / ${advancedSaju.strength.drainingScore}`
  )
  mdParts.push(`- Detail Score: ${JSON.stringify(advancedSaju.strength.details)}`)
  mdParts.push(`- Geokguk: ${advancedSaju.geokguk.type}`)
  mdParts.push(`- Geokguk Basis: ${advancedSaju.geokguk.basis}`)
  mdParts.push(`- Yongsin Primary: ${advancedSaju.yongsin.primary}`)
  mdParts.push(`- Yongsin Secondary: ${advancedSaju.yongsin.secondary || '-'}`)
  mdParts.push(`- Yongsin Favorable: ${advancedSaju.yongsin.favorable.join(', ')}`)
  mdParts.push(`- Yongsin Unfavorable: ${advancedSaju.yongsin.unfavorable.join(', ')}`)
  mdParts.push(`- Yongsin Basis: ${advancedSaju.yongsin.basis}`)
  mdParts.push(``)

  mdParts.push(`## 3) Daeun / Unse`)
  mdParts.push(`- Daeun Start Age: ${saju.daeWoon.startAge}`)
  mdParts.push(`- Daeun Direction: ${saju.daeWoon.isForward ? 'Forward' : 'Reverse'}`)
  mdParts.push(
    `- Current Daeun: ${saju.daeWoon.current ? `${saju.daeWoon.current.heavenlyStem}${saju.daeWoon.current.earthlyBranch}` : 'N/A'}`
  )
  mdParts.push(
    renderTable(
      ['Age', 'Daeun Ganji', 'Sibsin(Stem/Branch)'],
      saju.daeWoon.list
        .slice(0, 12)
        .map((d) => [
          String(d.age),
          `${d.heavenlyStem}${d.earthlyBranch}`,
          `${d.sibsin.cheon}/${d.sibsin.ji}`,
        ])
    )
  )
  mdParts.push(``)
  mdParts.push(
    renderTable(
      ['Year', 'Ganji', 'Element'],
      (saju.unse.annual || [])
        .slice(0, 20)
        .map((y) => [
          String(y.year),
          y.ganji || `${y.heavenlyStem || ''}${y.earthlyBranch || ''}`,
          y.element || '-',
        ])
    )
  )
  mdParts.push(``)

  mdParts.push(`## 4) Saju Relations`)
  mdParts.push(`- Total Relation Hits: ${relations.length}`)
  mdParts.push(
    renderTable(
      ['Kind', 'Pillars', 'Detail'],
      topRelations.map((r) => [r.kind, (r.pillars || []).join(','), r.detail || '-'])
    )
  )
  mdParts.push(``)

  mdParts.push(`## 5) Twelve Stages + Shinsal`)
  mdParts.push(`- Twelve Stage by Pillar: ${JSON.stringify(twelveByPillar)}`)
  mdParts.push(`- Total Shinsal Hits: ${shinsalHits.length}`)
  mdParts.push(
    renderTable(
      ['Kind', 'Pillars', 'Target', 'Detail'],
      topShinsal.map((s) => [s.kind, (s.pillars || []).join(','), s.target || '-', s.detail || '-'])
    )
  )
  mdParts.push(``)

  mdParts.push(`## 6) Astrology Natal Chart (Core)`)
  mdParts.push(`- ASC: ${natalData.ascendant.formatted} (House ${natalData.ascendant.house})`)
  mdParts.push(`- MC: ${natalData.mc.formatted} (House ${natalData.mc.house})`)
  mdParts.push(
    renderTable(
      ['Planet', 'Sign/Degree', 'House', 'Longitude', 'Retrograde'],
      natalData.planets.map((p) => [
        p.name,
        p.formatted,
        String(p.house),
        p.longitude.toFixed(4),
        p.retrograde ? 'R' : '-',
      ])
    )
  )
  mdParts.push(``)
  mdParts.push(
    renderTable(
      ['House', 'Cusp'],
      natalData.houses.map((h, i) => [String(i + 1), h.formatted])
    )
  )
  mdParts.push(``)

  mdParts.push(`## 7) Natal Aspects`)
  mdParts.push(`- Total Aspects: ${natalAspects.length}`)
  mdParts.push(
    renderTable(
      ['From', 'Type', 'To', 'Orb', 'Score'],
      topAspects.map((a) => [
        a.from.name,
        a.type,
        a.to.name,
        (a.orb ?? 0).toFixed(2),
        a.score != null ? Number(a.score).toFixed(2) : '-',
      ])
    )
  )
  mdParts.push(``)

  mdParts.push(`## 8) Extra Points + Asteroids`)
  if (extraPoints) {
    mdParts.push(
      renderTable(
        ['Point', 'Formatted', 'House', 'Description'],
        [
          [
            'Chiron',
            extraPoints.chiron.formatted,
            String(extraPoints.chiron.house),
            extraPoints.chiron.description || '-',
          ],
          [
            'Lilith',
            extraPoints.lilith.formatted,
            String(extraPoints.lilith.house),
            extraPoints.lilith.description || '-',
          ],
          [
            'Part of Fortune',
            extraPoints.partOfFortune.formatted,
            String(extraPoints.partOfFortune.house),
            extraPoints.partOfFortune.description || '-',
          ],
          [
            'Vertex',
            extraPoints.vertex.formatted,
            String(extraPoints.vertex.house),
            extraPoints.vertex.description || '-',
          ],
        ]
      )
    )
  } else {
    mdParts.push(`- Extra points could not be calculated.`)
  }
  mdParts.push(``)
  mdParts.push(
    renderTable(
      ['Asteroid', 'Formatted', 'House', 'Retrograde'],
      (asteroids || []).map((a) => [a.name, a.formatted, String(a.house), a.retrograde ? 'R' : '-'])
    )
  )
  mdParts.push(``)

  mdParts.push(`## 9) Progressions / Returns / Draconic / Harmonics`)
  mdParts.push(
    `- Secondary Progressed Date: ${secondary.progressedDate} (Years progressed: ${secondary.yearsProgressed})`
  )
  mdParts.push(
    `- Solar Arc Date: ${solarArc.progressedDate} (Years progressed: ${solarArc.yearsProgressed})`
  )
  mdParts.push(`- Solar Return ${yyyy} Exact Time: ${solarReturn.exactReturnTime}`)
  mdParts.push(`- Lunar Return ${yyyy}-${pad2(mm)} Exact Time: ${lunarReturn.exactReturnTime}`)
  mdParts.push(``)
  mdParts.push(`- Draconic Alignment Score: ${draconic.summary.alignmentScore}`)
  mdParts.push(`- Draconic Soul Identity: ${draconic.summary.soulIdentity}`)
  mdParts.push(`- Draconic Soul Needs: ${draconic.summary.soulNeeds}`)
  mdParts.push(`- Draconic Soul Purpose: ${draconic.summary.soulPurpose}`)
  mdParts.push(`- Draconic Karmic Lessons: ${draconic.summary.karmicLessons}`)
  mdParts.push(``)
  mdParts.push(
    renderTable(
      ['Draconic', 'Natal', 'Orb', 'Meaning'],
      draconic.alignments
        .slice(0, 25)
        .map((a) => [a.draconicPlanet, a.natalPlanet, a.orb.toFixed(2), a.meaning])
    )
  )
  mdParts.push(``)
  mdParts.push(
    renderTable(
      ['Draconic', 'Natal', 'Aspect', 'Orb', 'Meaning'],
      draconic.tensions
        .slice(0, 25)
        .map((t) => [t.draconicPlanet, t.natalPlanet, t.aspectType, t.orb.toFixed(2), t.meaning])
    )
  )
  mdParts.push(``)
  mdParts.push(
    `- Harmonic Profile (Strongest): ${JSON.stringify(harmonicProfile.strongestHarmonics)}`
  )
  mdParts.push(`- Harmonic Profile (Weakest): ${JSON.stringify(harmonicProfile.weakestHarmonics)}`)
  mdParts.push(`- Harmonic Overall Interpretation:`)
  mdParts.push(``)
  mdParts.push(harmonicProfile.overallInterpretation)
  mdParts.push(``)

  mdParts.push(`## 10) Current Major Transits (Reference Time: ${now.toISOString()})`)
  mdParts.push(`- Total Major Transit Events: ${majorTransits.length}`)
  mdParts.push(
    renderTable(
      ['Transit Planet', 'Aspect', 'Natal Point', 'Orb', 'Meaning'],
      topTransits.map((t) => [
        t.transitPlanet || t.from?.name || '-',
        t.type || '-',
        t.natalPoint || t.to?.name || '-',
        t.orb != null ? Number(t.orb).toFixed(2) : '-',
        Array.isArray(t.keywords) ? t.keywords.join(', ') : '-',
      ])
    )
  )
  mdParts.push(``)

  mdParts.push(`## 11) Raw JSON Appendices`)
  mdParts.push(`### A. advancedSaju`)
  mdParts.push('```json')
  mdParts.push(JSON.stringify(advancedSaju, null, 2))
  mdParts.push('```')
  mdParts.push(``)
  mdParts.push(`### B. saju.meta`)
  mdParts.push('```json')
  mdParts.push(
    JSON.stringify(
      {
        dayMaster: saju.dayMaster,
        fiveElements: saju.fiveElements,
        daeWoon: {
          startAge: saju.daeWoon.startAge,
          isForward: saju.daeWoon.isForward,
          current: saju.daeWoon.current,
        },
      },
      null,
      2
    )
  )
  mdParts.push('```')
  mdParts.push(``)
  mdParts.push(`### C. astrology.meta`)
  mdParts.push('```json')
  mdParts.push(
    JSON.stringify(
      {
        natalMeta: natalData.meta || null,
        aspectCount: natalAspects.length,
        transitCount: majorTransits.length,
      },
      null,
      2
    )
  )
  mdParts.push('```')
  mdParts.push(``)

  const outDir = path.join(process.cwd(), 'reports')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, '1995-02-09_0640_seoul_full_saju_astrology_report.md')
  fs.writeFileSync(outPath, mdParts.join('\n'), 'utf8')

  const jsonSnapshotPath = path.join(outDir, '1995-02-09_0640_seoul_gpt_input.json')
  const jsonSnapshot = {
    generatedAt: now.toISOString(),
    profile: PROFILE,
    basis: {
      todayIso,
      assumption: {
        genderAffectsDaeunDirection: true,
      },
    },
    saju: {
      yearPillar: saju.yearPillar,
      monthPillar: saju.monthPillar,
      dayPillar: saju.dayPillar,
      timePillar: saju.timePillar,
      dayMaster: saju.dayMaster,
      fiveElements: saju.fiveElements,
      daeWoon: saju.daeWoon,
      unse: saju.unse,
      advanced: advancedSaju,
      relations,
      twelveByPillar,
      shinsalHits,
    },
    astrology: {
      natalData,
      natalAspects,
      transitChart,
      majorTransits,
      extraPoints,
      asteroids,
      secondaryProgressions: secondary,
      solarArcDirections: solarArc,
      solarReturn,
      lunarReturn,
      draconic,
      harmonicProfile,
    },
  }
  fs.writeFileSync(jsonSnapshotPath, JSON.stringify(jsonSnapshot, null, 2), 'utf8')

  const promptPath = path.join(outDir, '1995-02-09_0640_seoul_gpt_prompt.md')
  const promptText = [
    '# GPT Interpretation Prompt (Data-Locked)',
    '',
    '아래 JSON 데이터만 근거로 해석해 주세요.',
    '추측/일반론 금지, 데이터에 없는 말 금지.',
    '',
    '## 출력 요구사항',
    '- 총 분량: 한국어 기준 A4 3페이지 수준(약 5,000~7,000자)',
    '- 말투: 단정적/명확, 근거 인용 중심',
    '- 섹션 순서:',
    '1. 핵심 프로필 요약 (일간/격국/용신/ASC/MC/핵심 어스펙트)',
    '2. 사주 고급 해석 (신강약, 십신구조, 대운/세운 포함)',
    '3. 점성 고급 해석 (나탈, 하우스, 어스펙트, 프로그레션/리턴/드라코닉/하모닉)',
    '4. 통합 결론 (사주+점성 교차근거)',
    '5. 3단계 실행 전략 (오늘/이번달/올해)',
    '',
    '## 강제 규칙',
    '- 각 단락마다 최소 1개 이상 데이터 근거를 괄호로 표기: (근거: ...)',
    '- 일간/격국/용신/대운/주요 어스펙트는 반드시 본문 앞부분에 명시',
    '- 불확실하거나 데이터 누락이면 "데이터 없음"이라고 명시',
    '- 욕설/비속어/과장 금지',
    '',
    '## 입력 JSON',
    '```json',
    JSON.stringify(jsonSnapshot, null, 2),
    '```',
    '',
  ].join('\n')
  fs.writeFileSync(promptPath, promptText, 'utf8')

  console.log(`Saved report: ${outPath}`)
  console.log(`Saved json snapshot: ${jsonSnapshotPath}`)
  console.log(`Saved GPT prompt: ${promptPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
