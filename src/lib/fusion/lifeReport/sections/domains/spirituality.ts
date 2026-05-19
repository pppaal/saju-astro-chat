// src/lib/fusion/lifeReport/sections/domains/spirituality.ts
// Spirituality / 영성·내면 deterministic narrative builder.
// Uses:
//   • 사주: 공망, 화개, iljuDeep, 인성
//   • 점성: 12집(내면·비밀), 해왕성, draconic Sun, 출생 일/월식, lilith,
//          harmonics 7, 12집 행성

import type { BuilderInput, DomainNarrative, Paragraph } from '../../types'
import {
  categoryCount,
  countSibsin,
  gongmangAffectedPillars,
  relationPhraseEn,
  relationPhraseKo,
} from '../../signals/sajuSignals'
import { chiron, getPlanet, houseCusp, planetsInHouse, vesta } from '../../signals/astroSignals'
import { houseLabel, paragraph, planetLabel, signLabel } from '../../templates/sentences'
import { asteroidHouseLine, planetHouseLine } from '../../pools'

export function buildSpirituality(input: BuilderInput): DomainNarrative {
  const { saju, astro, calendarSignals } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []
  const fusionUsed: string[] = []

  // ── Saju
  const sib = countSibsin(saju)
  const cat = categoryCount(sib)
  const inseong = cat['인성'] || 0
  if (inseong > 0) sajuUsed.push('sibsin.인성')

  const gongmang = gongmangAffectedPillars(saju)
  const gongmangBranches = saju.ultraAdvanced?.gongmang?.gongmangBranches ?? []
  if (gongmang.length > 0) sajuUsed.push('ultraAdvanced.gongmang')

  const shinsalNames = collectShinsal(saju)
  const hwagae = shinsalNames.find((n) => n.includes('화개'))
  if (hwagae) sajuUsed.push('shinsal.화개')

  const iljuName = saju.ultraAdvanced?.iljuDeep?.ilju
  const iljuChar = saju.ultraAdvanced?.iljuDeep?.iljuCharacter || ''

  // ── Astro
  const neptune = getPlanet(astro, 'Neptune')
  const moon = getPlanet(astro, 'Moon')
  const pluto = getPlanet(astro, 'Pluto')
  if (neptune) astroUsed.push('planets.neptune')
  if (pluto) astroUsed.push('planets.pluto')
  const lilith = astro.lilith
  if (lilith) astroUsed.push('lilith')
  const ch = chiron(astro)
  if (ch) astroUsed.push('chiron')
  const twelfth = planetsInHouse(astro, 12)
  if (twelfth.length > 0) astroUsed.push('houses.12.planets')
  const twelfthCusp = houseCusp(astro, 12)

  // Eclipses near birth
  const nearestEclipse = astro.eclipses?.nearestSolar
  if (nearestEclipse?.date) astroUsed.push('eclipses.nearestSolar')

  // Harmonics 7 from adapter
  const h7 = calendarSignals?.harmonics?.[7]
  if (h7) fusionUsed.push('calendarSignals.harmonics.7')

  // Draconic Sun (영혼이 가져온 정체성)
  const dra = calendarSignals?.draconicSummary
  if (dra) fusionUsed.push('calendarSignals.draconicSummary')

  // ZR — current chapter sign (영혼의 시기)
  const zr = calendarSignals?.zrCurrent
  if (zr) fusionUsed.push('calendarSignals.zrCurrent')

  // ── P1: 영성의 결
  const opener = openerKo(inseong, gongmang.length, hwagae !== undefined)
  const openerE = openerEn(inseong, gongmang.length, hwagae !== undefined)
  const p1ko = paragraph([
    opener,
    twelfth.length > 0
      ? `${houseLabel(12, 'ko')}에 ${twelfth.map((p) => planetLabel(p.name, 'ko')).join(', ')}이 머물러, 혼자 있는 시간이 영성의 통로가 돼요.`
      : twelfthCusp?.sign
        ? `내면 영역은 ${signLabel(twelfthCusp.sign, 'ko')}의 분위기로 열려, ${twelfthSignFlavorKo(twelfthCusp.sign)} 방식의 내면 작업이 잘 맞아요.`
        : '',
    neptune
      ? `해왕성이 ${signLabel(neptune.sign, 'ko')}${neptune.house ? `의 ${houseLabel(neptune.house, 'ko')}` : ''}에 있어, 현실과 꿈의 경계가 옅어지는 자리에서 영적 흐름이 풀려요.`
      : '',
  ])
  const p1en = paragraph([
    openerE,
    twelfth.length > 0
      ? `With ${twelfth.map((p) => p.name).join(', ')} in the 12th, solitude becomes your channel to the spiritual.`
      : twelfthCusp?.sign
        ? `Your 12th-house cusp in ${signLabel(twelfthCusp.sign, 'en')} favours inner work that is ${twelfthSignFlavorEn(twelfthCusp.sign)}.`
        : '',
    neptune
      ? `Neptune in ${signLabel(neptune.sign, 'en')}${neptune.house ? ` (${houseLabel(neptune.house, 'en')})` : ''} softens the boundary so the spiritual current can flow.`
      : '',
  ])

  // ── P2: 공망 + 화개 + 일주 심화
  const p2pieces: string[] = []
  const p2piecesEn: string[] = []
  if (gongmang.length > 0) {
    p2pieces.push(
      `삶의 ${gongmang.join('·')} 영역에 '비어 있는 자리'(${gongmangBranches.join('·')})가 있어요. 이 빈 자리가 의외로 영적인 출구가 돼요 — 채울 수 없는 것이 가장 깊은 사유를 만들어요.`
    )
    p2piecesEn.push(
      'There is an empty space in your chart that no outer thing can quite fill — and that very gap turns out to be one of the deepest doorways into your spiritual life.'
    )
  }
  if (hwagae) {
    p2pieces.push(
      '예술·고독의 별이 들어와 있어, 종교·예술·치유 어느 길로 가도 깊이 들어가는 성향이 강해요.'
    )
    p2piecesEn.push(
      'A star of art-and-solitude sits in your chart — whether you turn toward religion, art, or healing, each of these paths opens deeply for you.'
    )
  }
  if (iljuName) {
    // iljuChar 의 raw 값에 한자가 있으면 한국어 음으로 변환 (P 안에 한자 노출 X).
    const short = humanizeIljuCharSpirit(iljuChar || '')
      .split(/[.,。，]/)[0]
      .trim()
      .slice(0, 40)
    if (short) {
      p2pieces.push(`타고난 성향을 한 마디로 풀면 '${short}'이고, 이것이 영적 사유의 출발점이에요.`)
      p2piecesEn.push(
        `Your day-pillar archetype (${iljuLabelEnSpirit(iljuName)}) sets the keynote — this is where your spiritual reflection naturally begins.`
      )
    }
  }
  if (inseong >= 2) {
    p2pieces.push('지혜와 돌봄의 자질이 강해서, 가르침을 받아 전하는 흐름이 영성의 뼈대가 돼요.')
    p2piecesEn.push(
      'A strong wisdom-and-care pattern shapes your spiritual life around receiving teaching and passing it on to others.'
    )
  }
  const p2ko = paragraph(
    p2pieces.length
      ? p2pieces
      : [
          '영성의 흐름은 평이하게 정렬돼 있어, 의식적인 명상·기도 같은 일상의 작은 의식이 가장 잘 작동해요.',
        ]
  )
  const p2en = paragraph(
    p2piecesEn.length
      ? p2piecesEn
      : [
          'Your spiritual signals sit in an even balance — small daily rituals like meditation and prayer tend to work best for you.',
        ]
  )

  // ── P3: 영혼의 결 (draconic + harmonics 7 + lilith + eclipse)
  const p3pieces: string[] = []
  const p3piecesEn: string[] = []

  // Vesta × house — 헌신·신성 소행성 (destiny-matrix layer9 활용)
  const ves = vesta(astro)
  if (ves) {
    astroUsed.push('asteroids.vesta')
    const vesCrossKo = asteroidHouseLine('Vesta', ves.house, 'ko')
    const vesCrossEn = asteroidHouseLine('Vesta', ves.house, 'en')
    if (vesCrossKo) {
      astroUsed.push('pools.asteroid.vesta.house')
      p3pieces.push(vesCrossKo)
      p3piecesEn.push(vesCrossEn)
    }
  }
  // Pluto × house — 변혁·심층의 무대 (spirituality 깊이 외행성)
  const plutoHouseS = planetHouseLine('Pluto', pluto?.house, 'ko')
  if (plutoHouseS) {
    astroUsed.push('pools.planetHouse.pluto')
    p3pieces.push(`${plutoHouseS}.`)
  }
  if (dra?.sunSign) {
    p3pieces.push(
      `영혼이 가져온 정체성은 ${signLabel(dra.sunSign, 'ko')}, ${signSoulKo(dra.sunSign)}의 색을 입고 왔어요.`
    )
    p3piecesEn.push(
      `Your draconic Sun in ${signLabel(dra.sunSign, 'en')} suggests your soul arrived in this life already carrying ${signSoulEn(dra.sunSign)}.`
    )
  }
  if (dra?.archetype) {
    p3pieces.push(`전생에서 들고 온 정체성은 '${dra.archetype}' 쪽 색이에요.`)
    // dra.archetype은 한국어 텍스트 → 영어 narrative에는 노출하지 않음.
  }
  if (h7 && h7.strength >= 40) {
    p3pieces.push(
      '영적 친밀감이 차트 안에서 강하게 울려요. 신비적 체험·직관·꿈이 자주 일상에 들어와요.'
    )
    p3piecesEn.push(
      'The 7th harmonic resonates strongly in your chart — mystical experience, intuition, and dreams enter your daily life often.'
    )
  } else if (h7) {
    p3pieces.push('영적 친밀감이 잔잔히 깔려 있어요. 깊은 침묵의 시간을 두면 자연스럽게 깨어나요.')
    p3piecesEn.push('The 7th harmonic runs quietly beneath the surface — long stretches of silence are what will awaken it most naturally.')
  }
  if (lilith) {
    p3pieces.push(
      `${signLabel(lilith.sign, 'ko')}의 색으로 사회적 기대 밖의 내면이 자리잡고 있어, 이 어두운 자질을 인정할 때 진짜 힘이 풀려요.`
    )
    p3piecesEn.push(
      `With Lilith in ${signLabel(lilith.sign, 'en')}, real power becomes available to you when you can acknowledge the parts of yourself that live outside social approval.`
    )
  }
  if (nearestEclipse?.date) {
    p3pieces.push('출생 가까이 일식의 흔적이 있어, 결정적 순간에 평소와 다른 영적 직관이 작동해요.')
    p3piecesEn.push(
      'A solar eclipse falls close to your birth — at decisive moments, an unusually strong spiritual intuition tends to wake up in you.'
    )
  }
  if (ch) {
    p3pieces.push(
      `상처와 치유의 색이 ${signLabel(ch.sign, 'ko')}의 톤으로 자리잡고 있어, 자신의 상처를 다루는 과정 자체가 영적 작업이 돼요.`
    )
    p3piecesEn.push(
      `With Chiron in ${signLabel(ch.sign, 'en')}, working with your own wound becomes itself the spiritual practice.`
    )
  }
  // Saju relations — 해(misalignment) often opens the most spiritual material;
  // bias toward 해 first, then any.
  const relKoSpirit =
    relationPhraseKo(calendarSignals?.sajuRelations, {
      preferKind: '해',
    }) ?? relationPhraseKo(calendarSignals?.sajuRelations)
  const relEnSpirit =
    relationPhraseEn(calendarSignals?.sajuRelations, {
      preferKind: '해',
    }) ?? relationPhraseEn(calendarSignals?.sajuRelations)
  if (relKoSpirit) {
    sajuUsed.push('calendarSignals.sajuRelations')
    p3pieces.push(`${relKoSpirit} 그 어긋남이 영적 사유의 출발점이 돼요.`)
    if (relEnSpirit)
      p3piecesEn.push(`${relEnSpirit} That very misalignment becomes the starting point for spiritual reflection.`)
  }
  // Part of Spirit (다이몬) — even when Spirit is already used elsewhere,
  // surface it here as the soul-callout for the spirituality domain.
  const spiritLot = calendarSignals?.arabicParts?.Spirit
  if (spiritLot) {
    fusionUsed.push('calendarSignals.arabicParts.Spirit')
    p3pieces.push(
      `영혼·다이몬의 점이 ${signLabel(spiritLot.sign, 'ko')}에 놓여, 진짜 부름이 어느 방향으로 와 있는지 알려줘요.`
    )
    p3piecesEn.push(
      `Your Lot of Spirit, sometimes called the Daimon, sits in ${signLabel(spiritLot.sign, 'en')} — and it marks the direction from which your true calling speaks.`
    )
  }
  // Part of Captivity — 속박의 결 → 영적 매듭으로 풀어 해석
  const captivity = calendarSignals?.arabicPartsExtra?.Captivity
  if (captivity) {
    fusionUsed.push('calendarSignals.arabicPartsExtra.Captivity')
    p3pieces.push(
      `속박의 점이 ${signLabel(captivity.sign, 'ko')}에 머물러, 풀어야 할 영적 매듭이 그 자리에 한 번 모여 있어요.`
    )
    p3piecesEn.push(
      `Your Lot of Captivity sits in ${signLabel(captivity.sign, 'en')} — that is the place where the spiritual knot you came here to untie tends to gather.`
    )
  }
  const p3ko = paragraph(
    p3pieces.length
      ? p3pieces
      : [
          '지금 흐름이 평이하게 정렬돼 있어, 특정 종교나 수행보다는 일상에 영성을 천천히 녹이는 길이 잘 맞아요.',
        ]
  )
  const p3en = paragraph(
    p3piecesEn.length
      ? p3piecesEn
      : [
          'Your current signals sit in a calm arrangement — rather than one religion or one method, what fits you best is slowly letting spirit dissolve into the texture of daily life.',
        ]
  )

  // ── P4: 가이드 + ZR 시기
  const guidePiecesKo: string[] = ['일상 가이드 한 줄:']
  const guidePiecesEn: string[] = ['Daily handle:']
  if (twelfth.length >= 2) {
    guidePiecesKo.push(
      '하루에 한 번은 혼자 있는 시간을 일정에 박아두세요. 12집의 행성이 거기서 풀려요.'
    )
    guidePiecesEn.push(
      'Put one solitary block on your calendar each day and keep it — your 12th-house planets unwind in that quiet space.'
    )
  } else if (hwagae) {
    guidePiecesKo.push(
      '한 가지 영적 실천(명상·필사·기도·산책)을 의식적으로 반복하세요. 화개의 자질이 의식 안에서 익어요.'
    )
    guidePiecesEn.push(
      'Choose one spiritual practice — meditation, copying texts by hand, prayer, or walking — and repeat it deliberately, because this art-and-solitude streak ripens inside steady ritual.'
    )
  } else {
    guidePiecesKo.push(
      '일상에서 잠시 멈추는 의식 하나를 만들어보세요. 큰 행위보다 작은 의식이 영성을 안정시켜요.'
    )
    guidePiecesEn.push(
      'Build one small pause-ritual into your day — small rituals settle the spirit more reliably than grand gestures do.'
    )
  }
  if (zr) {
    guidePiecesKo.push(
      `지금은 ${signLabel(zr.sign, 'ko')}의 톤으로 ${planetLabel(zr.ruler, 'ko')}이 다스리는 인생 챕터에 있어요. ${zrSignFlavorKo(zr.sign)}이 영적 흐름의 큰 주제예요.`
    )
    guidePiecesEn.push(
      `You are currently in a ${signLabel(zr.sign, 'en')} chapter ruled by ${zr.ruler} — ${zrSignFlavorEn(zr.sign)} forms the broad spiritual theme.`
    )
  }
  const guideKo = paragraph(guidePiecesKo)
  const guideEn = paragraph(guidePiecesEn)

  const paragraphs: Paragraph[] = [
    { ko: p1ko, en: p1en },
    { ko: p2ko, en: p2en },
    { ko: p3ko, en: p3en },
    { ko: guideKo, en: guideEn },
  ]

  return {
    id: 'spirituality',
    title: { ko: '영성·내면', en: 'Spirituality & Inner Life' },
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed, fusion: fusionUsed },
  }
}

// ─── helpers ─────────────────────────────────────────────────
function collectShinsal(saju: BuilderInput['saju']): string[] {
  const u = saju.ultraAdvanced as unknown as {
    shinsal?: {
      luckyList?: Array<{ kind?: string }>
      list?: Array<{ kind?: string }>
    }
  }
  const luck = u?.shinsal?.luckyList ?? []
  const all = u?.shinsal?.list ?? []
  return [...luck, ...all].map((x) => x?.kind ?? '').filter(Boolean)
}

function openerKo(inseong: number, gongmangCount: number, hasHwagae: boolean): string {
  if (hasHwagae && gongmangCount > 0) {
    return '예술과 고독의 별, 그리고 비어 있는 자리가 함께 깔려 있어서, 영성은 우회로가 아니라 이번 생의 중심 주제 중 하나예요.'
  }
  if (gongmangCount > 0) {
    return '삶 한쪽에 비어 있는 자리가 있어서, 그 빈 곳을 채우지 못하는 감각이 영적 사유로 이어져요.'
  }
  if (hasHwagae) {
    return '예술과 고독의 별이 함께 있어, 혼자 깊이 들어가는 시간이 영성의 주된 길이에요.'
  }
  if (inseong >= 3) {
    return '지혜와 돌봄의 자질이 매우 강해서, 가르침을 통해 자기를 발견하는 흐름이 영성의 뿌리가 돼요.'
  }
  return '영성의 길은 외부 종교나 사상보다, 일상의 작은 사유와 내면 관찰에서 자라나는 쪽이에요.'
}
function openerEn(inseong: number, gongmangCount: number, hasHwagae: boolean): string {
  if (hasHwagae && gongmangCount > 0) {
    return 'Both 화개 (art-solitude star) and gongmang (empty seats) sit in your saju — spirituality is not a detour but a central thread of this life.'
  }
  if (gongmangCount > 0) {
    return 'An "unfillable" seat sits in your saju — the inability to fill it leads naturally into spiritual reflection.'
  }
  if (hasHwagae) {
    return '화개 grants spiritual depth through solitude — long solo time is your main path.'
  }
  if (inseong >= 3) {
    return 'A very strong 인성 line — spirituality grows by receiving teaching and finding yourself in it.'
  }
  return 'Your spiritual grain grows less from outside religion than from daily reflection and inner observation.'
}

const TWELFTH_SIGN_KO: Record<string, string> = {
  Aries: '도전과 직진으로 푸는',
  Taurus: '느리고 감각적으로 가라앉는',
  Gemini: '글과 사유로 풀어내는',
  Cancer: '눈물과 정서로 풀어내는',
  Leo: '극적인 표현으로 푸는',
  Virgo: '정리와 헌신으로 푸는',
  Libra: '관계를 통해 풀어내는',
  Scorpio: '깊이로 파고드는',
  Sagittarius: '먼 길과 의미를 좇는',
  Capricorn: '구조와 책임으로 푸는',
  Aquarius: '낯선 시각과 공동체로 풀어내는',
  Pisces: '용해와 흐름에 몸을 맡기는',
}
const TWELFTH_SIGN_EN: Record<string, string> = {
  Aries: 'direct-action releasing',
  Taurus: 'slow, sensory settling',
  Gemini: 'word-and-thought work',
  Cancer: 'tears and emotion',
  Leo: 'dramatic expression',
  Virgo: 'tidying and devotion',
  Libra: 'work through relationship',
  Scorpio: 'depth probing',
  Sagittarius: 'long journeys and meaning',
  Capricorn: 'structure and responsibility',
  Aquarius: 'unfamiliar angles and community',
  Pisces: 'surrender to dissolution and flow',
}
function twelfthSignFlavorKo(sign: string): string {
  return TWELFTH_SIGN_KO[sign] ?? '독자적인 길'
}
function twelfthSignFlavorEn(sign: string): string {
  return TWELFTH_SIGN_EN[sign] ?? 'a singular grain'
}

const SIGN_SOUL_KO: Record<string, string> = {
  Aries: '개척자 영혼',
  Taurus: '건설자 영혼',
  Gemini: '메신저 영혼',
  Cancer: '양육자 영혼',
  Leo: '창조자 영혼',
  Virgo: '치유자 영혼',
  Libra: '조화자 영혼',
  Scorpio: '변형자 영혼',
  Sagittarius: '탐험가 영혼',
  Capricorn: '성취자 영혼',
  Aquarius: '혁신가 영혼',
  Pisces: '신비주의자 영혼',
}
const SIGN_SOUL_EN: Record<string, string> = {
  Aries: 'a pioneer soul',
  Taurus: 'a builder soul',
  Gemini: 'a messenger soul',
  Cancer: 'a nurturer soul',
  Leo: 'a creator soul',
  Virgo: 'a healer soul',
  Libra: 'a harmoniser soul',
  Scorpio: 'a transformer soul',
  Sagittarius: 'an explorer soul',
  Capricorn: 'an achiever soul',
  Aquarius: 'an innovator soul',
  Pisces: 'a mystic soul',
}
function signSoulKo(sign: string): string {
  return SIGN_SOUL_KO[sign] ?? '본연의 영혼'
}
function signSoulEn(sign: string): string {
  return SIGN_SOUL_EN[sign] ?? 'a native soul-grain'
}

// 60갑자 일주 (hanja) → natural English label (spirituality 섹션 전용).
const SPIRIT_STEM_EN: Record<string, string> = {
  甲: 'Yang Wood',
  乙: 'Yin Wood',
  丙: 'Yang Fire',
  丁: 'Yin Fire',
  戊: 'Yang Earth',
  己: 'Yin Earth',
  庚: 'Yang Metal',
  辛: 'Yin Metal',
  壬: 'Yang Water',
  癸: 'Yin Water',
}
const SPIRIT_BRANCH_EN: Record<string, string> = {
  子: 'Rat',
  丑: 'Ox',
  寅: 'Tiger',
  卯: 'Rabbit',
  辰: 'Dragon',
  巳: 'Snake',
  午: 'Horse',
  未: 'Goat',
  申: 'Monkey',
  酉: 'Rooster',
  戌: 'Dog',
  亥: 'Pig',
}
function iljuLabelEnSpirit(ilju: string | undefined): string {
  if (!ilju) return 'native day-pillar'
  const chars = Array.from(ilju)
  if (chars.length < 2) return 'native day-pillar'
  const stem = SPIRIT_STEM_EN[chars[0]] ?? ''
  const branch = SPIRIT_BRANCH_EN[chars[1]] ?? ''
  if (stem && branch) return `${stem} ${branch}`
  if (stem) return stem
  if (branch) return branch
  return 'native day-pillar'
}

// raw iljuCharacter ("辛 일간의 未 지지 조합") 를 한국어 음으로 변환.
// 한자가 없는 경우 그대로 반환.
const HUMANIZE_STEM_KO_SPIRIT: Record<string, string> = {
  甲: '갑목', 乙: '을목', 丙: '병화', 丁: '정화',
  戊: '무토', 己: '기토', 庚: '경금', 辛: '신금',
  壬: '임수', 癸: '계수',
}
const HUMANIZE_BRANCH_KO_SPIRIT: Record<string, string> = {
  子: '자수', 丑: '축토', 寅: '인목', 卯: '묘목',
  辰: '진토', 巳: '사화', 午: '오화', 未: '미토',
  申: '신금', 酉: '유금', 戌: '술토', 亥: '해수',
}
function humanizeIljuCharSpirit(raw: string): string {
  if (!raw) return ''
  const m = raw.match(/^([甲乙丙丁戊己庚辛壬癸])\s*일간의\s*([子丑寅卯辰巳午未申酉戌亥])\s*지지\s*조합$/)
  if (m) {
    const stem = HUMANIZE_STEM_KO_SPIRIT[m[1]] ?? m[1]
    const branch = HUMANIZE_BRANCH_KO_SPIRIT[m[2]] ?? m[2]
    return `${stem}과 ${branch}의 만남`
  }
  let out = raw
  for (const [k, v] of Object.entries(HUMANIZE_STEM_KO_SPIRIT)) out = out.split(k).join(v)
  for (const [k, v] of Object.entries(HUMANIZE_BRANCH_KO_SPIRIT)) out = out.split(k).join(v)
  return out
}

const ZR_SIGN_KO: Record<string, string> = {
  Aries: '시작과 자기 발견',
  Taurus: '안정과 뿌리내림',
  Gemini: '연결과 학습',
  Cancer: '돌봄과 정서',
  Leo: '자기 표현과 창조',
  Virgo: '정밀과 헌신',
  Libra: '관계와 조화',
  Scorpio: '심층 변형',
  Sagittarius: '확장과 진리',
  Capricorn: '구조와 성취',
  Aquarius: '혁신과 공동체',
  Pisces: '용해와 연민',
}
const ZR_SIGN_EN: Record<string, string> = {
  Aries: 'beginning and self-discovery',
  Taurus: 'stability and rooting',
  Gemini: 'connection and learning',
  Cancer: 'care and emotion',
  Leo: 'self-expression and creation',
  Virgo: 'precision and devotion',
  Libra: 'relationship and harmony',
  Scorpio: 'deep transformation',
  Sagittarius: 'expansion and truth',
  Capricorn: 'structure and achievement',
  Aquarius: 'innovation and community',
  Pisces: 'dissolution and compassion',
}
function zrSignFlavorKo(sign: string): string {
  return ZR_SIGN_KO[sign] ?? '본연의 톤'
}
function zrSignFlavorEn(sign: string): string {
  return ZR_SIGN_EN[sign] ?? 'its native grain'
}
