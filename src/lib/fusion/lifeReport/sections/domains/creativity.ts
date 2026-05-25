// src/lib/fusion/lifeReport/sections/domains/creativity.ts
// Creativity / 창작·재능 deterministic narrative builder.
// Uses:
// • 사주: 상관(재능 발산), 화개 신살, 식신, iljuDeep(careerAptitude)
// • 점성: 5집(창조), 금성 + aspects, harmonics 5, 5집 ruler, Pisces/Leo emphasis

import type { BuilderInput, DomainNarrative, Paragraph } from '../../types'
import { countSibsin, relationPhraseEn, relationPhraseKo } from '../../signals/sajuSignals'
import { aspectsOf, getPlanet, houseCusp, planetsInHouse } from '../../signals/astroSignals'
import {
  aspectQuality,
  gwaWa,
  houseLabel,
  iGa,
  paragraph,
  weaveParagraph,
  planetLabel,
  signLabel,
} from '../../templates/sentences'

export function buildCreativity(input: BuilderInput): DomainNarrative {
  const { saju, astro, calendarSignals } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []
  const fusionUsed: string[] = []

  // ── Saju
  const sib = countSibsin(saju)
  const sangwan = sib.상관
  const sikshin = sib.식신
  if (sangwan > 0) sajuUsed.push('sibsin.상관')
  if (sikshin > 0) sajuUsed.push('sibsin.식신')

  const shinsalNames = collectShinsal(saju)
  const hwagae = shinsalNames.find((n) => n.includes('화개'))
  if (hwagae) sajuUsed.push('shinsal.화개')

  const iljuName = saju.ultraAdvanced?.iljuDeep?.ilju
  const aptitudes = saju.ultraAdvanced?.iljuDeep?.careerAptitude ?? []
  if (aptitudes.length > 0) sajuUsed.push('ultraAdvanced.iljuDeep.careerAptitude')
  const artisticAptitudes = aptitudes.filter((a) =>
    ['예술', '창작', '디자인', '음악', '미술', '문학', '연기', '공연'].some((kw) => a.includes(kw))
  )

  // ── Astro
  const venus = getPlanet(astro, 'Venus')
  const moon = getPlanet(astro, 'Moon')
  const neptune = getPlanet(astro, 'Neptune')
  if (venus) astroUsed.push('planets.venus')
  if (neptune) astroUsed.push('planets.neptune')
  const fifth = planetsInHouse(astro, 5)
  if (fifth.length > 0) astroUsed.push('houses.5.planets')
  const fifthCusp = houseCusp(astro, 5)

  const venusAspects = venus ? aspectsOf(astro, 'Venus') : []
  const topVenusAspect = venusAspects
    .filter((a) => (a.from?.name === 'Venus') !== (a.to?.name === 'Venus'))
    .sort((a, b) => (a.orb ?? 0) - (b.orb ?? 0))[0]

  // Sign emphasis — Leo / Pisces planet count
  const planets = astro.planets ?? []
  const leoCount = planets.filter((p) => p.sign === 'Leo').length
  const piscesCount = planets.filter((p) => p.sign === 'Pisces').length

  // Harmonics 5 from calendar-engine adapter
  const h5 = calendarSignals?.harmonics?.[5]
  if (h5) fusionUsed.push('calendarSignals.harmonics.5')

  // Profection — 5th house activation
  const prof = calendarSignals?.profectionCurrent
  const profIsCreative = prof?.house === 5
  if (profIsCreative) fusionUsed.push('calendarSignals.profections')

  // Arabic part — Lot of Spirit (creative drive) + Lot of Eros
  const spirit = calendarSignals?.arabicParts?.Spirit
  const eros = calendarSignals?.arabicParts?.Eros
  if (spirit) fusionUsed.push('calendarSignals.arabicParts.Spirit')
  if (eros) fusionUsed.push('calendarSignals.arabicParts.Eros')

  // ── P1: 창작의 결
  const opener = openerKo(sangwan, sikshin, hwagae !== undefined)
  const openerE = openerEn(sangwan, sikshin, hwagae !== undefined)
  const p1ko = paragraph([
    opener,
    venus
      ? `당신의 금성이 ${signLabel(venus.sign, 'ko')}${venus.house ? `의 ${houseLabel(venus.house, 'ko')}` : ''}에 있어서, ${venusSignFlavorKo(venus.sign)}이 작품의 특징이에요.`
      : '',
    fifth.length > 0
      ? `${houseLabel(5, 'ko')}에 ${fifth.map((p) => planetLabel(p.name, 'ko')).join(', ')}이 머물러, 노는 듯 만들어내는 흐름이 강해요.`
      : fifthCusp?.sign
        ? `창조 영역이 ${signLabel(fifthCusp.sign, 'ko')}의 분위기로 열려, ${fifthSignFlavorKo(fifthCusp.sign)} 방식의 표현이 잘 맞아요.`
        : '',
  ])
  const p1en = paragraph([
    openerE,
    venus
      ? `Venus in ${signLabel(venus.sign, 'en')}${venus.house ? ` (${houseLabel(venus.house, 'en')})` : ''} sets the creative tone — ${venusSignFlavorEn(venus.sign)}.`
      : '',
    fifth.length > 0
      ? `Planets in your 5th (${fifth.map((p) => p.name).join(', ')}) lean toward making-as-play.`
      : fifthCusp?.sign
        ? `Your 5th-house cusp in ${signLabel(fifthCusp.sign, 'en')} favours ${fifthSignFlavorEn(fifthCusp.sign)}.`
        : '',
  ])

  // ── P2: 표현 방식·매개
  const p2pieces: string[] = []
  const p2piecesEn: string[] = []
  if (topVenusAspect && venus) {
    const other =
      topVenusAspect.from?.name === 'Venus' ? topVenusAspect.to?.name : topVenusAspect.from?.name
    if (other) {
      const otherKoC = planetLabel(other, 'ko')
      const venusFlavorC = venusAspectFlavorKo(other)
      p2pieces.push(
        `당신의 금성이 ${otherKoC}${gwaWa(otherKoC)} ${aspectQuality(topVenusAspect.type, 'ko')}, ${venusFlavorC}${iGa(venusFlavorC)} 표현에 묻어나요.`
      )
      p2piecesEn.push(
        `Venus ${aspectQuality(topVenusAspect.type, 'en')} ${other} — ${venusAspectFlavorEn(other)} marks the way you express.`
      )
    }
  }
  if (leoCount >= 2) {
    p2pieces.push('사자자리 쪽 행성이 모여 있어서, 무대 위에서 빛나는 모습이 자연스럽게 풀려요.')
    p2piecesEn.push(
      'A strong Leo emphasis (two or more planets) means creating in the spotlight comes naturally to you.'
    )
  }
  if (piscesCount >= 2) {
    p2pieces.push('물고기자리 쪽 행성이 모여 있어, 경계를 흐리는 감성적 창작이 강점이에요.')
    p2piecesEn.push(
      'A strong Pisces emphasis (two or more planets) favors emotional, boundary-dissolving creative work.'
    )
  }
  if (neptune && neptune.house && [5, 9, 12].includes(neptune.house)) {
    p2pieces.push(
      `해왕성이 ${houseLabel(neptune.house, 'ko')}에 머물러, 꿈·이미지·상징이 창작 재료가 돼요.`
    )
    p2piecesEn.push(
      `Neptune in your ${houseLabel(neptune.house, 'en')} makes dreams, images, and symbols your raw material.`
    )
  }
  if (moon && moon.house === 5) {
    p2pieces.push(
      '당신의 달이 창조 영역에 있어서, 마음의 흐름을 그대로 작품으로 옮기는 통로가 열려 있어요.'
    )
    p2piecesEn.push(
      'Moon in your 5th house opens a direct channel from emotion straight into the work you make.'
    )
  }
  if (artisticAptitudes.length > 0 && iljuName) {
    p2pieces.push(`타고난 자질이 ${artisticAptitudes.slice(0, 3).join('·')} 쪽으로 풀려 있어요.`)
    p2piecesEn.push(
      `Your natural aptitudes lean toward ${creativityAptitudeListEn(artisticAptitudes)}.`
    )
  }
  const p2ko = paragraph(
    p2pieces.length
      ? p2pieces
      : ['표현의 흐름은 평이하게 잘 잡혀 있어, 무엇이든 꾸준히 만들어내면 결과가 따라와요.']
  )
  const p2en = paragraph(
    p2piecesEn.length
      ? p2piecesEn
      : [
          'Your expressive flow sits in a calm tune — steady output is what turns into results over time.',
        ]
  )

  // ── P3: 창의의 깊은 결 (harmonics 5 + 화개 + 영감)
  const p3pieces: string[] = []
  const p3piecesEn: string[] = []
  if (h5 && h5.strength >= 40) {
    p3pieces.push(
      '창의의 깊은 자질이 차트 안에서 또렷하게 울리고 있어요. 독자적인 스타일 자체가 운의 통로예요.'
    )
    p3piecesEn.push(
      'The 5th harmonic resonates clearly in your chart — your own personal style becomes the channel through which luck flows.'
    )
  } else if (h5) {
    p3pieces.push(
      '창의의 깊은 자질은 잔잔히 깔려 있어요. 의식적으로 자기만의 분위기를 다듬을 때 강해져요.'
    )
    p3piecesEn.push(
      'The 5th harmonic runs quietly beneath the surface — deliberate work on your own personal style is what strengthens it over time.'
    )
  }
  if (hwagae) {
    p3pieces.push(
      '예술·고독의 별이 사주에 들어와 있어, 혼자 깊이 들어가는 시간이 작품의 색을 만들어요.'
    )
    p3piecesEn.push(
      'A star of art-and-solitude sits in your chart — long stretches of time alone are what shape the character of your work.'
    )
  }
  if (spirit) {
    p3pieces.push(
      `행적과 영감의 점이 ${signLabel(spirit.sign, 'ko')}에 있어, 창작의 출발점은 ${spiritSignFlavorKo(spirit.sign)}이에요.`
    )
    p3piecesEn.push(
      `Your Lot of Spirit sits in ${signLabel(spirit.sign, 'en')}, so each new piece of work starts from ${spiritSignFlavorEn(spirit.sign)}.`
    )
  }
  if (eros && !spirit) {
    p3pieces.push(
      `사랑·끌림의 점이 ${signLabel(eros.sign, 'ko')}에 있어, 창작에서도 ${spiritSignFlavorKo(eros.sign)}이 핵심이에요.`
    )
    p3piecesEn.push(
      `Your Lot of Eros sits in ${signLabel(eros.sign, 'en')}, keeping ${spiritSignFlavorEn(eros.sign)} at the heart of what you create.`
    )
  }
  // Saju relations — 형(reshape) often signals breakthrough / break-out energy
  // in creative work; bias the pick toward 형 first, then 충.
  const relKoCreate =
    relationPhraseKo(calendarSignals?.sajuRelations, {
      preferKind: '형',
      usedKeys: input.relUsed?.ko,
    }) ??
    relationPhraseKo(calendarSignals?.sajuRelations, {
      preferKind: '충',
      usedKeys: input.relUsed?.ko,
    })
  const relEnCreate =
    relationPhraseEn(calendarSignals?.sajuRelations, {
      preferKind: '형',
      usedKeys: input.relUsed?.en,
    }) ??
    relationPhraseEn(calendarSignals?.sajuRelations, {
      preferKind: '충',
      usedKeys: input.relUsed?.en,
    })
  if (relKoCreate) {
    sajuUsed.push('calendarSignals.sajuRelations')
    p3pieces.push(`${relKoCreate} 그 마찰이 작품으로 풀려나오는 통로가 돼요.`)
    if (relEnCreate)
      p3piecesEn.push(`${relEnCreate} That very friction is where the work breaks through.`)
  }
  const p3ko = p3pieces.length
    ? weaveParagraph(p3pieces, 'creativity')
    : paragraph([
        '지금 흐름은 창작 자체보다 정리·다듬기에 더 무게가 실려 있어요. 묵힌 작업을 끄집어내기 좋은 시기예요.',
      ])
  const p3en = paragraph(
    p3piecesEn.length
      ? p3piecesEn
      : [
          'Your current signals favor curation and refinement over fresh creation — a good window for pulling older work back out and finishing it.',
        ]
  )

  // ── P4: 가이드
  const guidePiecesKo: string[] = ['일상 가이드 한 줄:']
  const guidePiecesEn: string[] = ['Daily handle:']
  if (sangwan >= 2) {
    guidePiecesKo.push('만든 결과를 즉시 바깥에 내보내세요. 묵혀둔 작품은 운을 못 끌어와요.')
    guidePiecesEn.push('Publish what you make right away — hidden output cannot attract luck.')
  } else if (sikshin >= 2) {
    guidePiecesKo.push('즐기듯이 매일 짧게라도 만들어보세요. 식신의 자질은 여유에서 자라요.')
    guidePiecesEn.push(
      'Make something small every day, lightly and without pressure — your easeful, expressive streak grows best in relaxed regularity.'
    )
  } else {
    guidePiecesKo.push(
      '형식 안에서 한 가지 제약을 두고 만들어보세요. 제약이 오히려 독자성을 만들어줘요.'
    )
    guidePiecesEn.push(
      'Set yourself one tight constraint and create inside it — constraint, paradoxically, is what builds originality.'
    )
  }
  if (profIsCreative && prof) {
    guidePiecesKo.push('올해 창조 영역이 활성화돼서, 시작한 작업이 손에 잡히는 결과로 이어져요.')
    guidePiecesEn.push(
      'This year activates your 5th house — work you start now will turn into tangible results.'
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
    id: 'creativity',
    title: { ko: '창작·재능', en: 'Creativity & Talent' },
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

function openerKo(sangwan: number, sikshin: number, hasHwagae: boolean): string {
  if (sangwan >= 3)
    return '재능의 자유로운 발산이 매우 강해서, 만들지 않으면 답답해지는 모습이에요.'
  if (sangwan >= 1 && hasHwagae)
    return '재능과 예술의 별이 동시에 깔려 있어, 창작은 이번 생에서 피해갈 수 없는 길이에요.'
  if (sikshin >= 2) return '여유로운 표현의 자질이 강해서, 즐기듯 만드는 방식이 가장 잘 맞아요.'
  if (sangwan >= 1)
    return '재능을 자유롭게 풀어내는 성향이 깔려 있어, 정해진 틀보단 자기 색을 입히는 작업이 잘 풀려요.'
  return '창작의 분위기는 외부 자극보다 안에서 천천히 익혀가는 쪽으로 자리잡고 있어요.'
}
function openerEn(sangwan: number, sikshin: number, hasHwagae: boolean): string {
  if (sangwan >= 3)
    return 'A very strong streak of free creative expression runs through your chart — you feel stifled if you cannot make something.'
  if (sangwan >= 1 && hasHwagae)
    return 'Both a free creative streak and a star of art-and-solitude sit in your chart — making things is something you cannot avoid in this life.'
  if (sikshin >= 2)
    return 'A strong, easeful expressive streak favors light, enjoyment-driven making.'
  if (sangwan >= 1)
    return 'A free creative streak sits in your chart — work that lets you leave your own mark on it flows best.'
  return 'Your creative side matures slowly and from the inside, drawn out more by inner pressure than by outer prompts.'
}

const VENUS_SIGN_KO: Record<string, string> = {
  Aries: '솔직하고 꾸밈없는 아름다움',
  Taurus: '감각적이고 풍요로운 아름다움',
  Gemini: '경쾌한 아름다움',
  Cancer: '정서적이고 따뜻한 아름다움',
  Leo: '화려하고 극적인 아름다움',
  Virgo: '정밀하고 다듬어진 아름다움',
  Libra: '균형 잡힌 우아한 아름다움',
  Scorpio: '깊고 강렬한 아름다움',
  Sagittarius: '먼 곳과 이국의 아름다움',
  Capricorn: '절제되고 클래식한 아름다움',
  Aquarius: '낯설고 독창적인 아름다움',
  Pisces: '몽환적이고 흐르는 아름다움',
}
const VENUS_SIGN_EN: Record<string, string> = {
  Aries: 'a direct aesthetic',
  Taurus: 'a sensory, abundant aesthetic',
  Gemini: 'a light, agile aesthetic',
  Cancer: 'an emotional, warm aesthetic',
  Leo: 'a luminous, dramatic aesthetic',
  Virgo: 'a precise, refined aesthetic',
  Libra: 'a balanced, graceful aesthetic',
  Scorpio: 'a deep, intense aesthetic',
  Sagittarius: 'a far-and-foreign aesthetic',
  Capricorn: 'a restrained, classical aesthetic',
  Aquarius: 'a strange, original aesthetic',
  Pisces: 'a dreamy, flowing aesthetic',
}
function venusSignFlavorKo(sign: string): string {
  return VENUS_SIGN_KO[sign] ?? '독자적인 아름다움'
}
function venusSignFlavorEn(sign: string): string {
  return VENUS_SIGN_EN[sign] ?? 'a singular aesthetic'
}

const FIFTH_SIGN_KO: Record<string, string> = {
  Aries: '즉흥과 추진이 어우러진',
  Taurus: '손에 잡히는 재료를 다루는',
  Gemini: '말과 이야기로 만드는',
  Cancer: '정서를 담는',
  Leo: '무대 위에서 빛나는',
  Virgo: '정밀하고 다듬는',
  Libra: '관계와 미를 다루는',
  Scorpio: '깊이로 파고드는',
  Sagittarius: '먼 곳의 시야로 만드는',
  Capricorn: '구조와 형식을 짓는',
  Aquarius: '낯선 시각으로 다시 짜는',
  Pisces: '경계를 흐리는 감성',
}
const FIFTH_SIGN_EN: Record<string, string> = {
  Aries: 'spontaneous, momentum-driven',
  Taurus: 'tactile material work',
  Gemini: 'story- and word-led',
  Cancer: 'emotion-bearing',
  Leo: 'stage-shining',
  Virgo: 'precise refinement',
  Libra: 'relational, beauty-led',
  Scorpio: 'depth-probing',
  Sagittarius: 'a broad, far-reaching perspective',
  Capricorn: 'structure-building',
  Aquarius: 're-framing with novelty',
  Pisces: 'boundary-blurring emotion',
}
function fifthSignFlavorKo(sign: string): string {
  return FIFTH_SIGN_KO[sign] ?? '독자적인 색감'
}
function fifthSignFlavorEn(sign: string): string {
  return FIFTH_SIGN_EN[sign] ?? 'a singular grain'
}

const VENUS_ASPECT_KO: Record<string, string> = {
  Sun: '존재감 있는 표현',
  Moon: '정서적 깊이',
  Mercury: '말과 미가 어우러진',
  Mars: '강한 충동의 아름다움',
  Jupiter: '여유롭고 풍요로운 표현',
  Saturn: '클래식하고 절제된 표현',
  Uranus: '독창적이고 깜짝 놀라게 하는',
  Neptune: '몽환적이고 흐르는',
  Pluto: '강렬한 변용의',
}
const VENUS_ASPECT_EN: Record<string, string> = {
  Sun: 'presence-charged expression',
  Moon: 'emotional depth',
  Mercury: 'word-and-beauty weave',
  Mars: 'impulse-driven aesthetic',
  Jupiter: 'abundant, generous expression',
  Saturn: 'classical, restrained expression',
  Uranus: 'original, surprise-laden',
  Neptune: 'dreamy and flowing',
  Pluto: 'intensely transformative',
}
function venusAspectFlavorKo(planet: string): string {
  return VENUS_ASPECT_KO[planet] ?? '독자적인 색감'
}
function venusAspectFlavorEn(planet: string): string {
  return VENUS_ASPECT_EN[planet] ?? 'a singular grain'
}

const SPIRIT_SIGN_KO: Record<string, string> = {
  Aries: '시작하는 충동',
  Taurus: '뿌리내림과 감각',
  Gemini: '연결과 이야기',
  Cancer: '돌봄과 정서',
  Leo: '자기 표현',
  Virgo: '정밀한 헌신',
  Libra: '관계와 균형',
  Scorpio: '깊이와 변용',
  Sagittarius: '의미와 진리',
  Capricorn: '책임과 구조',
  Aquarius: '독창과 공동체',
  Pisces: '경계 너머의 연민',
}
const SPIRIT_SIGN_EN: Record<string, string> = {
  Aries: 'pioneering impulse',
  Taurus: 'rooting and sensation',
  Gemini: 'connection and storytelling',
  Cancer: 'care and emotion',
  Leo: 'self-expression',
  Virgo: 'precise devotion',
  Libra: 'relationship and balance',
  Scorpio: 'depth and transformation',
  Sagittarius: 'meaning and truth',
  Capricorn: 'responsibility and structure',
  Aquarius: 'originality and community',
  Pisces: 'compassion beyond boundaries',
}
function spiritSignFlavorKo(sign: string): string {
  return SPIRIT_SIGN_KO[sign] ?? '본연의 색'
}
function spiritSignFlavorEn(sign: string): string {
  return SPIRIT_SIGN_EN[sign] ?? 'its native grain'
}

// 한국어 자질 라벨 → natural English (creativity 섹션 전용).
const CREATIVITY_APTITUDE_EN: Record<string, string> = {
  예술: 'art',
  창작: 'creative work',
  디자인: 'design',
  음악: 'music',
  미술: 'fine art',
  문학: 'literature',
  연기: 'acting',
  공연: 'performance',
}
function creativityAptitudeListEn(items: string[]): string {
  const mapped = items.slice(0, 3).map((a) => CREATIVITY_APTITUDE_EN[a] ?? 'a singular craft')
  if (mapped.length === 0) return 'a singular craft'
  if (mapped.length === 1) return mapped[0]
  return mapped.slice(0, -1).join(', ') + ' and ' + mapped[mapped.length - 1]
}
