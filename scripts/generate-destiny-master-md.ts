// @ts-nocheck
import fs from 'node:fs'
import path from 'node:path'

type AnyRecord = Record<string, any>

const INPUT_JSON = path.join(process.cwd(), 'reports', '1995-02-09_0640_seoul_gpt_input.json')
const OUTPUT_MD = path.join(
  process.cwd(),
  'reports',
  '1995-02-09_0640_seoul_destiny_master_prompt.md'
)

function readJson(filePath: string): AnyRecord {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function mdTable(headers: string[], rows: string[][]): string {
  const h = `| ${headers.join(' | ')} |`
  const s = `| ${headers.map(() => '---').join(' | ')} |`
  const b = rows.map((r) => `| ${r.join(' | ')} |`).join('\n')
  return [h, s, b].join('\n')
}

function safe(v: unknown, fallback = '-'): string {
  if (v === null || v === undefined || v === '') {
    return fallback
  }
  return String(v)
}

function toSignElement(sign: string): string {
  if (['Aries', 'Leo', 'Sagittarius'].includes(sign)) return 'Fire'
  if (['Taurus', 'Virgo', 'Capricorn'].includes(sign)) return 'Earth'
  if (['Gemini', 'Libra', 'Aquarius'].includes(sign)) return 'Air'
  if (['Cancer', 'Scorpio', 'Pisces'].includes(sign)) return 'Water'
  return '-'
}

function build(): void {
  const d = readJson(INPUT_JSON)
  const profile = d.profile ?? {}
  const saju = d.saju ?? {}
  const astro = d.astrology ?? {}

  const natal = astro.natalData ?? {}
  const planets = Array.isArray(natal.planets) ? natal.planets : []
  const houses = Array.isArray(natal.houses) ? natal.houses : []
  const natalAspects = Array.isArray(astro.natalAspects) ? astro.natalAspects : []
  const extraPointsRaw = astro.extraPoints ?? {}
  const extraPoints = Array.isArray(extraPointsRaw)
    ? extraPointsRaw
    : ['chiron', 'lilith', 'partOfFortune', 'vertex'].map((k) => extraPointsRaw[k]).filter(Boolean)
  const asteroids = Array.isArray(astro.asteroids) ? astro.asteroids : []
  const majorTransits = Array.isArray(astro.majorTransits) ? astro.majorTransits : []

  const dayMaster = saju.dayMaster ?? {}
  const advanced = saju.advanced ?? {}
  const daeWoon = saju.daeWoon ?? {}
  const unse = saju.unse ?? {}
  const annual = Array.isArray(unse.annual) ? unse.annual : []
  const monthly = Array.isArray(unse.monthly) ? unse.monthly : []
  const relations = Array.isArray(saju.relations) ? saju.relations : []
  const shinsalHits = Array.isArray(saju.shinsalHits) ? saju.shinsalHits : []

  const sun = planets.find((p: AnyRecord) => p.name === 'Sun')
  const moon = planets.find((p: AnyRecord) => p.name === 'Moon')
  const mercury = planets.find((p: AnyRecord) => p.name === 'Mercury')
  const mars = planets.find((p: AnyRecord) => p.name === 'Mars')

  const lines: string[] = []
  lines.push('# 운명 해석 마스터 데이터 (GPT 즉시 투입용)')
  lines.push('')
  lines.push(
    '> 아래 문서는 **1995-02-09 06:40, 서울, 남성** 기준 계산 결과를 기반으로 작성되었습니다.'
  )
  lines.push(
    '> 이 문서를 그대로 GPT에 넣고 `이 사람의 운명은?`이라고 질문하면 장문 해석에 바로 사용할 수 있습니다.'
  )
  lines.push('')
  lines.push('## 0) 프로필 & 계산 기준')
  lines.push('')
  lines.push(`- 생성시각: ${safe(d.generatedAt)}`)
  lines.push(
    `- 출생정보: ${safe(profile.birthDate)} ${safe(profile.birthTime)} / ${safe(profile.birthCity)} / ${safe(profile.gender)}`
  )
  lines.push(
    `- 좌표/타임존: ${safe(profile.latitude)}, ${safe(profile.longitude)} / ${safe(profile.timezone)}`
  )
  lines.push('- 점성 기준: House=Placidus, Node=True Node')
  lines.push('- 사주 기준: 절기 반영(연/월/대운), 대운 시작나이 라운딩=round, 월운 기본=간편모드')
  lines.push('')

  lines.push('## 1) 핵심 프로필 한눈에')
  lines.push('')
  lines.push(
    mdTable(
      ['구분', '값'],
      [
        [
          '일간',
          `${safe(dayMaster.name)} (${safe(dayMaster.element)}, ${safe(dayMaster.yin_yang)})`,
        ],
        ['격국', safe(advanced?.geokguk?.type)],
        ['용신', safe(advanced?.yongsin?.primary)],
        ['신강약', `${safe(advanced?.strength?.level)} / score=${safe(advanced?.strength?.score)}`],
        [
          '현재 대운',
          daeWoon?.current
            ? `${safe(daeWoon.current.heavenlyStem)}${safe(daeWoon.current.earthlyBranch)} (age ${safe(daeWoon.current.age)})`
            : '-',
        ],
        ['ASC', safe(natal?.ascendant?.formatted)],
        ['MC', safe(natal?.mc?.formatted)],
        ['태양/달', `${safe(sun?.formatted)} / ${safe(moon?.formatted)}`],
      ]
    )
  )
  lines.push('')

  lines.push('## 2) 사주 고급 데이터')
  lines.push('')
  lines.push('### 2-1. 사주 원국 4주')
  lines.push('')
  lines.push(
    mdTable(
      ['기둥', '천간', '천간오행', '십신', '지지', '지지오행', '십신'],
      [
        [
          '년주',
          safe(saju?.yearPillar?.heavenlyStem?.name),
          safe(saju?.yearPillar?.heavenlyStem?.element),
          safe(saju?.yearPillar?.heavenlyStem?.sibsin),
          safe(saju?.yearPillar?.earthlyBranch?.name),
          safe(saju?.yearPillar?.earthlyBranch?.element),
          safe(saju?.yearPillar?.earthlyBranch?.sibsin),
        ],
        [
          '월주',
          safe(saju?.monthPillar?.heavenlyStem?.name),
          safe(saju?.monthPillar?.heavenlyStem?.element),
          safe(saju?.monthPillar?.heavenlyStem?.sibsin),
          safe(saju?.monthPillar?.earthlyBranch?.name),
          safe(saju?.monthPillar?.earthlyBranch?.element),
          safe(saju?.monthPillar?.earthlyBranch?.sibsin),
        ],
        [
          '일주',
          safe(saju?.dayPillar?.heavenlyStem?.name),
          safe(saju?.dayPillar?.heavenlyStem?.element),
          safe(saju?.dayPillar?.heavenlyStem?.sibsin),
          safe(saju?.dayPillar?.earthlyBranch?.name),
          safe(saju?.dayPillar?.earthlyBranch?.element),
          safe(saju?.dayPillar?.earthlyBranch?.sibsin),
        ],
        [
          '시주',
          safe(saju?.timePillar?.heavenlyStem?.name),
          safe(saju?.timePillar?.heavenlyStem?.element),
          safe(saju?.timePillar?.heavenlyStem?.sibsin),
          safe(saju?.timePillar?.earthlyBranch?.name),
          safe(saju?.timePillar?.earthlyBranch?.element),
          safe(saju?.timePillar?.earthlyBranch?.sibsin),
        ],
      ]
    )
  )
  lines.push('')
  lines.push(
    `- 오행 카운트: wood=${safe(saju?.fiveElements?.wood)}, fire=${safe(saju?.fiveElements?.fire)}, earth=${safe(saju?.fiveElements?.earth)}, metal=${safe(saju?.fiveElements?.metal)}, water=${safe(saju?.fiveElements?.water)}`
  )
  lines.push(`- 강약 상세: ${JSON.stringify(advanced?.strength?.details ?? {})}`)
  lines.push(`- 격국 근거: ${safe(advanced?.geokguk?.basis)}`)
  lines.push(`- 용신 근거: ${safe(advanced?.yongsin?.basis)}`)
  lines.push('')

  lines.push('### 2-2. 대운/세운/월운')
  lines.push('')
  lines.push(`- 대운 시작나이: ${safe(daeWoon?.startAge)}, 순행여부: ${safe(daeWoon?.isForward)}`)
  lines.push(
    mdTable(
      ['Age', '대운', '십신(천간/지지)'],
      (Array.isArray(daeWoon?.list) ? daeWoon.list : []).map((x: AnyRecord) => [
        safe(x.age),
        `${safe(x.heavenlyStem)}${safe(x.earthlyBranch)}`,
        `${safe(x?.sibsin?.cheon)}/${safe(x?.sibsin?.ji)}`,
      ])
    )
  )
  lines.push('')
  lines.push(
    mdTable(
      ['연도', '간지', '오행'],
      annual.map((y: AnyRecord) => [safe(y.year), safe(y.ganji), safe(y.element)])
    )
  )
  lines.push('')
  lines.push(
    mdTable(
      ['연도-월', '간지', '오행'],
      monthly
        .slice(0, 12)
        .map((m: AnyRecord) => [
          `${safe(m.year)}-${String(m.month ?? '').padStart(2, '0')}`,
          safe(m.ganji),
          safe(m.element),
        ])
    )
  )
  lines.push('')

  lines.push('### 2-3. 합충형파해/신살')
  lines.push('')
  lines.push(
    mdTable(
      ['관계', '기둥', '세부'],
      relations.map((r: AnyRecord) => [
        safe(r.kind),
        safe((r.pillars || []).join(',')),
        safe(r.detail),
      ])
    )
  )
  lines.push('')
  lines.push(
    mdTable(
      ['신살', '기둥', '타겟', '세부'],
      shinsalHits
        .slice(0, 40)
        .map((s: AnyRecord) => [
          safe(s.kind),
          safe((s.pillars || []).join(',')),
          safe(s.target),
          safe(s.detail),
        ])
    )
  )
  lines.push('')

  lines.push('## 3) 점성 고급 데이터')
  lines.push('')
  lines.push('### 3-1. 나탈 행성/하우스')
  lines.push('')
  lines.push(
    mdTable(
      ['행성', '위치', '하우스', '역행'],
      planets.map((p: AnyRecord) => [
        safe(p.name),
        safe(p.formatted),
        safe(p.house),
        p.retrograde ? 'R' : '-',
      ])
    )
  )
  lines.push('')
  lines.push(
    mdTable(
      ['하우스', 'Cusp'],
      houses.map((h: AnyRecord, idx: number) => [String(idx + 1), safe(h.formatted)])
    )
  )
  lines.push('')
  lines.push(`- ASC: ${safe(natal?.ascendant?.formatted)} / MC: ${safe(natal?.mc?.formatted)}`)
  lines.push(
    `- 태양 원소: ${toSignElement(safe(sun?.sign, ''))}, 달 원소: ${toSignElement(safe(moon?.sign, ''))}`
  )
  lines.push('')

  lines.push('### 3-2. 나탈 주요 어스펙트')
  lines.push('')
  lines.push(
    mdTable(
      ['From', 'Aspect', 'To', 'Orb', 'Applying'],
      natalAspects.map((a: AnyRecord) => [
        safe(a?.from?.name),
        safe(a.type),
        safe(a?.to?.name),
        safe(a.orb),
        a.applying ? 'Y' : 'N',
      ])
    )
  )
  lines.push('')

  lines.push('### 3-3. 고급 포인트/소행성')
  lines.push('')
  lines.push(
    mdTable(
      ['포인트', '위치', '하우스', '설명'],
      extraPoints.map((p: AnyRecord) => [
        safe(p.name),
        safe(p.formatted),
        safe(p.house),
        safe(p.description),
      ])
    )
  )
  lines.push('')
  lines.push(
    mdTable(
      ['소행성', '위치', '하우스', '역행'],
      asteroids.map((a: AnyRecord) => [
        safe(a.name),
        safe(a.formatted),
        safe(a.house),
        a.retrograde ? 'R' : '-',
      ])
    )
  )
  lines.push('')

  lines.push('### 3-4. 트랜짓/프로그레션/리턴/드라코닉/하모닉')
  lines.push('')
  lines.push(
    `- Secondary Progressions: ${safe(astro?.secondaryProgressions?.progressedDate)} / ${safe(astro?.secondaryProgressions?.yearsProgressed)}년 진행`
  )
  lines.push(
    `- Solar Arc: ${safe(astro?.solarArcDirections?.progressedDate)} / ${safe(astro?.solarArcDirections?.yearsProgressed)}년 진행`
  )
  lines.push(`- Solar Return exact: ${safe(astro?.solarReturn?.exactReturnTime)}`)
  lines.push(`- Lunar Return exact: ${safe(astro?.lunarReturn?.exactReturnTime)}`)
  lines.push(`- Draconic alignmentScore: ${safe(astro?.draconic?.summary?.alignmentScore)}`)
  lines.push(`- Draconic soulIdentity: ${safe(astro?.draconic?.summary?.soulIdentity)}`)
  lines.push(`- Draconic soulNeeds: ${safe(astro?.draconic?.summary?.soulNeeds)}`)
  lines.push(`- Draconic soulPurpose: ${safe(astro?.draconic?.summary?.soulPurpose)}`)
  lines.push(`- Draconic karmicLessons: ${safe(astro?.draconic?.summary?.karmicLessons)}`)
  lines.push(
    `- Harmonic strongest: ${JSON.stringify(astro?.harmonicProfile?.strongestHarmonics ?? [])}`
  )
  lines.push(
    `- Harmonic weakest: ${JSON.stringify(astro?.harmonicProfile?.weakestHarmonics ?? [])}`
  )
  const ageH = astro?.harmonicProfile?.ageHarmonic ?? {}
  const ageHSummary = {
    harmonic: ageH?.harmonic,
    strength: ageH?.strength,
    interpretation: ageH?.interpretation,
  }
  lines.push(`- Harmonic age: ${JSON.stringify(ageHSummary)}`)
  lines.push('')
  lines.push(
    mdTable(
      ['Transit', 'Aspect', 'Natal', 'Orb'],
      majorTransits.map((t: AnyRecord) => [
        safe(t.transitPlanet),
        safe(t.type),
        safe(t.natalPoint),
        safe(t.orb),
      ])
    )
  )
  lines.push('')

  lines.push('## 4) 사주 × 점성 교차 근거 (운명 질문용)')
  lines.push('')
  lines.push('### X1. 에너지 보정 축')
  lines.push(
    `- 사주에서 fire=0, 용신=화 (근거: saju.fiveElements.fire, saju.advanced.yongsin.primary)`
  )
  lines.push(`- 세운 2026/2027이 화(丙午/丁未)로 연속 등장 (근거: saju.unse.annual)`)
  lines.push('- 해석 시 “부족 에너지 보정 구간”으로 연결해서 운명 전개를 설명할 것')
  lines.push('')
  lines.push('### X2. 정체성/표현 축')
  lines.push(
    `- 일간 辛금 + Sun Aquarius 1H + Mercury Aquarius 1H(R) (근거: saju.dayMaster, astrology.natalData.planets)`
  )
  lines.push(
    `- Jupiter/Pluto 10H, MC Scorpio로 사회적 영향력 축이 강함 (근거: astrology.natalData.planets, mc)`
  )
  lines.push('- 해석 시 “개인 정체성 고도화 → 사회적 영향력 확장” 흐름으로 연결할 것')
  lines.push('')
  lines.push('### X3. 관계/전환 축')
  lines.push(
    `- 현재 대운 乙亥(편재/상관) + 7H Mars(R) + Moon-Pluto opposition (근거: saju.daeWoon.current, astrology.natalData, natalAspects)`
  )
  lines.push(
    '- 해석 시 “관계와 협업이 운명 가속 장치이지만, 감정/권력역학 재정렬이 필수”로 연결할 것'
  )
  lines.push('')

  lines.push('## 5) GPT에 그대로 넣는 질문 블록')
  lines.push('')
  lines.push('```text')
  lines.push('아래 마스터 데이터를 근거로 이 사람의 운명을 장문(최소 5,000자)으로 분석해줘.')
  lines.push('반드시 아래 순서로 작성:')
  lines.push('1) 운명의 핵심 테마 5가지')
  lines.push('2) 10년 단위 인생 전개 (대운 + 점성 타이밍 교차)')
  lines.push('3) 커리어/관계/재물/건강 운명 축')
  lines.push('4) 반드시 피해야 할 패턴과 바꿔야 할 습관')
  lines.push('5) 오늘부터 90일 실행전략')
  lines.push('')
  lines.push('규칙:')
  lines.push('- 데이터에 없는 내용은 추정이라고 명시')
  lines.push(
    '- 각 단락마다 근거 필드를 괄호로 달 것 (예: 근거: saju.daeWoon.current, astrology.natalAspects)'
  )
  lines.push('- 욕설/비난 없이 단정적이고 명확하게')
  lines.push('```')
  lines.push('')

  lines.push('## 6) 원본 데이터 파일')
  lines.push('')
  lines.push(`- 원본 JSON: \`reports/1995-02-09_0640_seoul_gpt_input.json\``)
  lines.push(`- 상세 계산 리포트: \`reports/1995-02-09_0640_seoul_full_saju_astrology_report.md\``)
  lines.push('')

  fs.writeFileSync(OUTPUT_MD, `${lines.join('\n')}\n`, 'utf8')
  console.log(`Saved destiny master markdown: ${OUTPUT_MD}`)
}

build()
