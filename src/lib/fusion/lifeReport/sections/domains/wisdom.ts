// src/lib/fusion/lifeReport/sections/domains/wisdom.ts
// Wisdom / 학업·지혜 deterministic narrative builder.
// Uses:
//   • 사주: 인성(정인+편인), 식상 중 상관, 사주 patterns, 문창귀인(있을 때)
//   • 점성: 9집(확장·신념), 3집(학습), 수성 + aspects, North Node, harmonics 9

import type { BuilderInput, DomainNarrative, Paragraph } from '../../types'
import {
  categoryCount,
  countSibsin,
  geokgukType,
  relationPhraseEn,
  relationPhraseKo,
} from '../../signals/sajuSignals'
import { aspectsOf, getPlanet, houseCusp, planetsInHouse } from '../../signals/astroSignals'
import { northNode } from '../../signals/astroSynthesis'
import {
  aspectQuality,
  houseLabel,
  paragraph,
  planetLabel,
  signLabel,
} from '../../templates/sentences'

export function buildWisdom(input: BuilderInput): DomainNarrative {
  const { saju, astro, calendarSignals } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []
  const fusionUsed: string[] = []

  // ── Saju side
  const sib = countSibsin(saju)
  const cat = categoryCount(sib)
  const inseong = cat['인성'] || 0
  const sangwan = sib.상관
  const sikshin = sib.식신
  if (inseong > 0) sajuUsed.push('sibsin.인성')
  if (sangwan > 0) sajuUsed.push('sibsin.상관')

  const geokguk = geokgukType(saju)
  if (geokguk) sajuUsed.push('geokguk')

  // 문창귀인 등 럭키 신살 — defensively probe
  const luckyShinsalNames = collectShinsal(saju)
  const munchang = luckyShinsalNames.find((n) => n.includes('문창'))
  if (munchang) sajuUsed.push('shinsal.문창')
  const hakdang = luckyShinsalNames.find((n) => n.includes('학당'))
  if (hakdang) sajuUsed.push('shinsal.학당')

  // ── Astro side
  const mercury = getPlanet(astro, 'Mercury')
  if (mercury) astroUsed.push('planets.mercury')
  const ninth = planetsInHouse(astro, 9)
  if (ninth.length > 0) astroUsed.push('houses.9.planets')
  const third = planetsInHouse(astro, 3)
  if (third.length > 0) astroUsed.push('houses.3.planets')
  const ninthCusp = houseCusp(astro, 9)
  const thirdCusp = houseCusp(astro, 3)
  const nn = northNode(astro)
  if (nn) astroUsed.push('planets.true_node')

  const mercAspects = mercury ? aspectsOf(astro, 'Mercury') : []
  const topMercAspect = mercAspects
    .filter((a) => (a.from?.name === 'Mercury') !== (a.to?.name === 'Mercury'))
    .sort((a, b) => (a.orb ?? 0) - (b.orb ?? 0))[0]

  // Harmonics 9 from calendar-engine adapter (지혜의 깊은 결)
  const h9 = calendarSignals?.harmonics?.[9]
  if (h9) fusionUsed.push('calendarSignals.harmonics.9')

  // Profection — if current year activates 9th / 3rd house
  const prof = calendarSignals?.profectionCurrent
  const profIsLearning = prof?.house === 9 || prof?.house === 3
  if (profIsLearning) fusionUsed.push('calendarSignals.profections')

  // ── Paragraph 1: 학문·지혜의 결
  const inseongFlavorKo = inseong >= 3
    ? '지혜와 돌봄의 자질이 매우 진하게 깔려 있어서, 배움 자체가 운의 통로예요.'
    : inseong >= 1
      ? '지혜와 돌봄의 자질이 차분히 깔려 있어, 배움을 멈추지 않는 게 운이 풀리는 길이에요.'
      : '배움의 길은 외부에서 들어오기보다 스스로 만들어가는 쪽이에요.'
  const inseongFlavorEn = inseong >= 3
    ? 'A strong wisdom-and-care pattern runs through your chart — learning itself is how luck opens to you.'
    : inseong >= 1
      ? 'A quiet wisdom-and-care pattern sits in your chart — continuous learning opens your path forward.'
      : 'The learning current flows from initiative rather than inheritance.'

  const p1ko = paragraph([
    inseongFlavorKo,
    mercury
      ? `생각과 말의 별이 ${signLabel(mercury.sign, 'ko')}${mercury.house ? `의 ${houseLabel(mercury.house, 'ko')}에` : '에'} 놓여서, ${mercurySignFlavorKo(mercury.sign)}가 자연스럽게 펼쳐져요.`
      : '',
    ninth.length > 0
      ? `${houseLabel(9, 'ko')}에 ${ninth.map((p) => planetLabel(p.name, 'ko')).join(', ')}이 머물러, 큰 그림과 신념이 학습의 동력이 돼요.`
      : '',
  ])
  const p1en = paragraph([
    inseongFlavorEn,
    mercury
      ? `Mercury sits in ${signLabel(mercury.sign, 'en')}${mercury.house ? ` (${houseLabel(mercury.house, 'en')})` : ''}, lending ${enArticle(mercurySignFlavorEn(mercury.sign))} ${mercurySignFlavorEn(mercury.sign)} tone to your thinking.`
      : '',
    ninth.length > 0
      ? `With ${ninth.map((p) => p.name).join(', ')} in the 9th, broad meaning and belief drive your study.`
      : '',
  ])

  // ── Paragraph 2: 학습 방식·소통
  const p2pieces: string[] = []
  const p2piecesEn: string[] = []
  if (third.length > 0) {
    p2pieces.push(
      `학습 영역에 ${third.map((p) => planetLabel(p.name, 'ko')).join(', ')}이 머물러, 일상의 작은 학습과 짧은 대화 속에서 진짜 지혜가 쌓여요.`
    )
    p2piecesEn.push(
      `With ${third.map((p) => p.name).join(', ')} sitting in your 3rd house, real wisdom accumulates through small daily learning and short, frequent conversations.`
    )
  } else if (thirdCusp?.sign) {
    p2pieces.push(
      `학습 영역은 ${signLabel(thirdCusp.sign, 'ko')}의 분위기로 열려서, ${thirdSignFlavorKo(thirdCusp.sign)} 방식으로 배우는 게 자연스러워요.`
    )
    p2piecesEn.push(
      `Your 3rd-house cusp in ${signLabel(thirdCusp.sign, 'en')} suggests learning naturally happens through ${thirdSignFlavorEn(thirdCusp.sign)}.`
    )
  }
  if (sangwan >= 2) {
    p2pieces.push('재능의 자유로운 발산이 강해서, 받아들이기만 하는 학습보다 가르치고 표현할 때 지혜가 더 단단해져요.')
    p2piecesEn.push('A strong free-creative streak means your wisdom solidifies most when you teach and express it, not only when you absorb it.')
  } else if (sikshin >= 2) {
    p2pieces.push('여유로운 표현의 자질이 깔려 있어, 즐기듯 배우는 방식이 잘 맞아요.')
    p2piecesEn.push('An easeful, expressive streak puts ease at the center for you — learning works best when it doubles as something you enjoy.')
  }
  if (topMercAspect && mercury) {
    const other =
      topMercAspect.from?.name === 'Mercury' ? topMercAspect.to?.name : topMercAspect.from?.name
    if (other) {
      p2pieces.push(
        `생각의 별이 ${planetLabel(other, 'ko')}와 ${aspectQuality(topMercAspect.type, 'ko')}, ${mercAspectFlavorKo(other)}의 색이 사고 방식에 새겨져 있어요.`
      )
      p2piecesEn.push(
        `Your Mercury ${aspectQuality(topMercAspect.type, 'en')} with ${other}, etching a ${mercAspectFlavorEn(other)} quality into the way you think.`
      )
    }
  }
  const p2ko = paragraph(
    p2pieces.length
      ? p2pieces
      : [
          '학습의 흐름은 평탄하게 정렬돼 있어, 한 가지 방식보다 여러 통로를 열어두면 운이 더 잘 흘러요.',
        ]
  )
  const p2en = paragraph(
    p2piecesEn.length
      ? p2piecesEn
      : [
          'Your learning signals sit in an even balance — keeping multiple channels open lets luck flow toward you more naturally.',
        ]
  )

  // ── Paragraph 3: 영적·고급 결 (North Node + harmonics 9 + draconic)
  const p3pieces: string[] = []
  const p3piecesEn: string[] = []
  if (nn) {
    p3pieces.push(
      `이번 생의 방향이 ${signLabel(nn.sign, 'ko')}${nn.house ? `의 ${houseLabel(nn.house, 'ko')}` : ''}에 있어, 학습은 단순한 지식이 아니라 영혼의 ${signMissionKo(nn.sign)}을 따라가는 길이에요.`
    )
    p3piecesEn.push(
      `Your North Node sits in ${signLabel(nn.sign, 'en')}${nn.house ? ` (${houseLabel(nn.house, 'en')})` : ''}, so study is not just data for you — it becomes a path toward ${signMissionEn(nn.sign)}.`
    )
  }
  if (h9 && h9.strength >= 40) {
    p3pieces.push(
      '지혜의 깊은 자질이 차트 안에서 분명하게 울리고 있어요. 한 분야를 끝까지 파고들면 평범한 학습 너머의 통찰이 열려요.'
    )
    p3piecesEn.push(
      'The 9th harmonic resonates clearly in your chart — pushing one single field all the way to the bottom unlocks insight that goes beyond ordinary study.'
    )
  } else if (h9) {
    p3pieces.push(
      '지혜의 깊은 자질은 잔잔하게 깔려 있어요. 의식적으로 사유와 명상의 시간을 두면 자연스럽게 강해져요.'
    )
    p3piecesEn.push(
      'The 9th harmonic runs quietly beneath the surface — deliberate reflection and meditation are what will strengthen it over time.'
    )
  }
  if (geokguk && geokguk.includes('인')) {
    p3pieces.push('인생의 큰 패턴 자체가 배움·돌봄의 결이라, 가르치고 다루는 사람이 되는 길이 가장 본인답게 풀려요.')
    p3piecesEn.push('Your life-pattern sits in the wisdom-and-care family — the path of the teacher and the keeper of knowledge fits you most naturally.')
  }
  if (munchang) {
    p3pieces.push('학문과 창작의 별이 사주에 들어와 있어서, 글·이론·자료를 통해 성취가 빨라요.')
    p3piecesEn.push('A literary star lights your chart — writing, theory, and study of source material all accelerate what you can achieve.')
  }
  if (hakdang) {
    p3pieces.push('학당의 별도 함께 있어, 공식적인 교육과 자격 과정에서 운이 잘 풀려요.')
    p3piecesEn.push('An academy star also sits in your chart — formal education and credentialed tracks tend to suit you well.')
  }
  // Saju relations — 합(joining) often supports learning lineage / mentor
  const relKoWisdom = relationPhraseKo(calendarSignals?.sajuRelations, {
    preferKind: '합',
  })
  const relEnWisdom = relationPhraseEn(calendarSignals?.sajuRelations, {
    preferKind: '합',
  })
  if (relKoWisdom) {
    sajuUsed.push('calendarSignals.sajuRelations')
    p3pieces.push(`${relKoWisdom} 가르치는 사람이나 책과의 결합이 학습의 토대가 돼요.`)
    if (relEnWisdom)
      p3piecesEn.push(
        `${relEnWisdom} The pairing with teachers or with the right books becomes the foundation of your learning.`
      )
  }
  // Lot of Daimon — 영혼·천재의 점 (Spirit aliased)
  const daimon = calendarSignals?.arabicPartsExtra?.Daimon
  if (daimon) {
    fusionUsed.push('calendarSignals.arabicPartsExtra.Daimon')
    p3pieces.push(
      `영혼의 행운점이 ${signLabel(daimon.sign, 'ko')}에 놓여, 진짜 지혜가 자라는 자리도 같은 결을 따라요.`
    )
    p3piecesEn.push(
      `Your Lot of Daimon sits in ${signLabel(daimon.sign, 'en')} — the place where real wisdom grows in you shares that same flavor.`
    )
  }
  const p3ko = paragraph(
    p3pieces.length
      ? p3pieces
      : ['지금 흐름에선 새로운 지식보다 이미 알고 있는 것을 깊이 다지는 시기가 잘 맞아요.']
  )
  const p3en = paragraph(
    p3piecesEn.length
      ? p3piecesEn
      : ['Your current signals favor deepening what you already know rather than chasing new fields.']
  )

  // ── Paragraph 4: 가이드
  const guidePiecesKo: string[] = ['일상 가이드 한 줄:']
  const guidePiecesEn: string[] = ['Daily handle:']
  if (inseong >= 2) {
    guidePiecesKo.push('하루에 단 한 가지라도 정리해서 남겨두세요. 인성의 자질은 기록으로 자라요.')
    guidePiecesEn.push('Record one thing each day — your wisdom-and-care pattern grows through the steady practice of taking notes.')
  } else if (sangwan >= 2) {
    guidePiecesKo.push('배운 것을 즉시 누군가에게 풀어보세요. 가르치는 순간 진짜 지혜가 돼요.')
    guidePiecesEn.push(
      'Explain what you learn to someone else right away — the moment of teaching is what turns knowledge into wisdom.'
    )
  } else {
    guidePiecesKo.push('주제를 좁히고 한 분야에 머무는 시간을 늘려보세요. 깊이가 운을 끌어옵니다.')
    guidePiecesEn.push('Narrow your topic and stay longer in one field — depth is what attracts luck toward you.')
  }
  if (profIsLearning && prof) {
    guidePiecesKo.push(
      `올해는 ${prof.house}궁이 열려 있어, 학습과 확장이 손에 잡히는 결과로 이어지는 한 해예요.`
    )
    guidePiecesEn.push(
      `This year activates your ${houseLabel(prof.house, 'en')} — learning and expansion will translate into tangible results this year.`
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
    id: 'wisdom',
    title: { ko: '학업·지혜', en: 'Wisdom & Learning' },
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

const MERC_SIGN_KO: Record<string, string> = {
  Aries: '빠르고 직진하는 사고',
  Taurus: '느긋하지만 단단한 사고',
  Gemini: '명민하고 여러 갈래로 뻗는 사고',
  Cancer: '정서적으로 흡수하는 사고',
  Leo: '극적이고 표현 잘하는 사고',
  Virgo: '정밀하고 분석적인 사고',
  Libra: '조화롭게 조정하는 사고',
  Scorpio: '깊고 파고드는 사고',
  Sagittarius: '큰 그림과 의미의 사고',
  Capricorn: '구조화된 진중한 사고',
  Aquarius: '독창적이고 시야 넓은 사고',
  Pisces: '직관적이고 융합적인 사고',
}
const MERC_SIGN_EN: Record<string, string> = {
  Aries: 'quick and direct',
  Taurus: 'slow but solid',
  Gemini: 'agile and branching',
  Cancer: 'absorptive and emotional',
  Leo: 'dramatic and expressive',
  Virgo: 'precise and analytical',
  Libra: 'balancing and diplomatic',
  Scorpio: 'deep and probing',
  Sagittarius: 'big-picture and meaning-led',
  Capricorn: 'structured and serious',
  Aquarius: 'inventive and broad',
  Pisces: 'intuitive and fusional',
}
function mercurySignFlavorKo(sign: string): string {
  return MERC_SIGN_KO[sign] ?? '독특한 색감의 사고'
}
function mercurySignFlavorEn(sign: string): string {
  return MERC_SIGN_EN[sign] ?? 'a singular grain of thinking'
}

const THIRD_SIGN_KO: Record<string, string> = {
  Aries: '직접 부딪쳐 익히는',
  Taurus: '반복하고 손으로 다지는',
  Gemini: '여러 채널을 빠르게 오가며 잇는',
  Cancer: '정서로 흡수하는',
  Leo: '극적으로 표현하며 익히는',
  Virgo: '정리하고 다듬으며 익히는',
  Libra: '대화하고 비교하며 익히는',
  Scorpio: '바닥까지 파고드는',
  Sagittarius: '큰 의미를 먼저 잡고 들어가는',
  Capricorn: '구조적으로 쌓아가는',
  Aquarius: '낯선 시각으로 다시 짜는',
  Pisces: '느끼고 흘러가며 익히는',
}
const THIRD_SIGN_EN: Record<string, string> = {
  Aries: 'direct collision',
  Taurus: 'repetition and hands-on practice',
  Gemini: 'fast multi-channel cross-linking',
  Cancer: 'emotional absorption',
  Leo: 'dramatic expression',
  Virgo: 'organising and refining',
  Libra: 'dialogue and comparison',
  Scorpio: 'depth-probing',
  Sagittarius: 'meaning-first framing',
  Capricorn: 'structured stacking',
  Aquarius: 're-framing with novel angles',
  Pisces: 'feeling and drifting through',
}
function thirdSignFlavorKo(sign: string): string {
  return THIRD_SIGN_KO[sign] ?? '독자적인 방식'
}
function thirdSignFlavorEn(sign: string): string {
  return THIRD_SIGN_EN[sign] ?? 'a singular grain'
}

const MERC_ASPECT_KO: Record<string, string> = {
  Sun: '자기 확신',
  Moon: '정서적 직관',
  Jupiter: '큰 그림과 확장',
  Saturn: '체계와 인내',
  Uranus: '독창성과 번뜩임',
  Neptune: '직관과 상상',
  Pluto: '심층 통찰',
  Mars: '추진력 있는 사고',
  Venus: '미적 감각',
}
const MERC_ASPECT_EN: Record<string, string> = {
  Sun: 'self-conviction',
  Moon: 'emotional intuition',
  Jupiter: 'big-picture expansion',
  Saturn: 'discipline and patience',
  Uranus: 'originality and lightning insight',
  Neptune: 'intuition and imagination',
  Pluto: 'depth-investigation',
  Mars: 'driven thinking',
  Venus: 'aesthetic sense',
}
function mercAspectFlavorKo(planet: string): string {
  return MERC_ASPECT_KO[planet] ?? '독특한 색감'
}
function mercAspectFlavorEn(planet: string): string {
  return MERC_ASPECT_EN[planet] ?? 'a singular grain'
}

const SIGN_MISSION_KO: Record<string, string> = {
  Aries: '용기와 개척',
  Taurus: '뿌리내림과 가치',
  Gemini: '연결과 다양한 시야',
  Cancer: '돌봄과 정서적 연대',
  Leo: '자기 표현과 창조',
  Virgo: '정밀한 헌신',
  Libra: '관계와 균형',
  Scorpio: '깊이와 변용',
  Sagittarius: '의미와 진리',
  Capricorn: '책임과 성취',
  Aquarius: '독창과 공동체',
  Pisces: '경계 너머의 연민',
}
const SIGN_MISSION_EN: Record<string, string> = {
  Aries: 'courage and pioneering',
  Taurus: 'rooting and value',
  Gemini: 'connection and broad perspective',
  Cancer: 'care and emotional bond',
  Leo: 'self-expression and creation',
  Virgo: 'precise devotion',
  Libra: 'relationship and balance',
  Scorpio: 'depth and transformation',
  Sagittarius: 'meaning and truth',
  Capricorn: 'responsibility and achievement',
  Aquarius: 'originality and community',
  Pisces: 'compassion beyond boundaries',
}
function signMissionKo(sign: string): string {
  return SIGN_MISSION_KO[sign] ?? '본연의 길'
}
function signMissionEn(sign: string): string {
  return SIGN_MISSION_EN[sign] ?? 'its native grain'
}

// "a" or "an" picker for English (front-vowel-sound heuristic).
function enArticle(word: string): string {
  const w = (word || '').trim().toLowerCase()
  if (!w) return 'a'
  return /^[aeiou]/.test(w) ? 'an' : 'a'
}
