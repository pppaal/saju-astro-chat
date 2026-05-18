// src/lib/fusion/lifeReport/sections/karma.ts
// 카르마·잠재력 섹션 — fuses 사주의 공망/종격/일주 심화/특수 격국과
// 점성의 12집/Chiron/Lilith/North Node/Part of Fortune를 4문단 narrative로.
//
// Absorbs:
//   • saju/extendedAnalysis.ts → KarmicInsight (fateVsDestiny, karmaType,
//     pastLifeArchetype, lifeMission)
//   • saju/orthodoxInterpretation.ts → ilju archetype + stem combinations
//   • saju/comprehensiveReport.ts → element-balance variance flavor
//   • astrology/themedReading.ts → spirituality theme planets

import type { BuilderInput, KarmaSection, Paragraph } from '../types'
import {
  fiveElements,
  geokgukType,
  gongmangAffectedPillars,
  isJonggeok,
  jonggeokType,
  samgiInfo,
  dayElement,
  yongsinPrimary,
} from '../signals/sajuSignals'
import {
  chiron,
  partOfFortune,
  planetsInHouse,
} from '../signals/astroSignals'
import { northNode, findPlanet } from '../signals/astroSynthesis'
import { eulReul, paragraph, planetLabel, signLabel } from '../templates/sentences'

// 행성명을 한국어로 (planetLabel은 동일 동작이지만 가독성을 위한 alias)
function planetLabelKo(name: string): string {
  return planetLabel(name, 'ko')
}

// 카르마 영역에서 사용하는 하우스 의미 자연어
function karmaHouseHintKo(h: number | undefined): string {
  if (!h) return ''
  const map: Record<number, string> = {
    1: '정체성의',
    2: '재물과 자원의',
    3: '소통과 학습의',
    4: '가정과 뿌리의',
    5: '창조와 자녀의',
    6: '일상과 건강의',
    7: '관계의',
    8: '변용과 깊이의',
    9: '확장과 신념의',
    10: '사회적 정점의',
    11: '공동체와 친구의',
    12: '내면과 비밀의',
  }
  return map[h] || ''
}

// 격국을 자연어로 짧게 (karma 섹션에서 사용)
function karmaGeokgukShortKo(g: string): string {
  if (!g) return '본연의 삶의 결'
  if (g.includes('편관')) return '도전과 책임으로 무게를 견디는 결'
  if (g.includes('정관')) return '책임감 있게 자리 잡는 결'
  if (g.includes('편재')) return '기회를 잡아내는 결'
  if (g.includes('정재')) return '꾸준히 쌓아가는 결'
  if (g.includes('식신')) return '여유롭게 창조하는 결'
  if (g.includes('상관')) return '재능을 자유롭게 풀어내는 결'
  if (g.includes('편인')) return '독특한 직관의 결'
  if (g.includes('정인')) return '배움과 돌봄의 결'
  return '본연의 삶의 결'
}

const ELEMENT_MISSION_KO: Record<string, string> = {
  목: '성장과 확장',
  화: '표현과 비전',
  토: '신뢰와 연결',
  금: '결단과 정의',
  수: '깊이와 통찰',
  wood: '성장과 확장',
  fire: '표현과 비전',
  earth: '신뢰와 연결',
  metal: '결단과 정의',
  water: '깊이와 통찰',
}
const ELEMENT_MISSION_EN: Record<string, string> = {
  목: 'growth and expansion',
  화: 'expression and vision',
  토: 'trust and connection',
  금: 'decisiveness and justice',
  수: 'depth and insight',
  wood: 'growth and expansion',
  fire: 'expression and vision',
  earth: 'trust and connection',
  metal: 'decisiveness and justice',
  water: 'depth and insight',
}

type KarmaType = '창조형' | '조화형' | '시련형' | '치유형' | '균형형'

function classifyKarma(variance: number): KarmaType {
  if (variance > 0.7) return '시련형'
  if (variance > 0.5) return '창조형'
  if (variance > 0.35) return '조화형'
  if (variance > 0.2) return '치유형'
  return '균형형'
}

const KARMA_DESC_KO: Record<KarmaType, string> = {
  창조형: '새로운 흐름을 만드는 카르마. 처음 시도하는 일에서 운이 열려요.',
  조화형: '관계와 조율로 풀리는 카르마. 함께하는 일에서 답을 찾아요.',
  시련형: '큰 굴곡을 지나며 단단해지는 카르마. 위기 후 도약이 커요.',
  치유형: '자신과 타인을 회복시키는 카르마. 돌봄·상담의 결이 강해요.',
  균형형: '극단을 피하고 중도를 지키는 카르마. 꾸준함이 결과를 만들어요.',
}
const KARMA_DESC_EN: Record<KarmaType, string> = {
  창조형: 'A creative-line karma — luck opens through what you try first.',
  조화형: 'A harmony-line karma — answers come from doing things together.',
  시련형: 'A trial-line karma — you toughen through deep curves; the leap after the crisis is large.',
  치유형: 'A healing-line karma — care and counsel are your native channel.',
  균형형: 'A balance-line karma — steadiness, not extremes, produces the result.',
}

function variance(fe: Record<string, number>): number {
  const vals = Object.values(fe).map((n) => Number(n) || 0)
  const total = vals.reduce((a, b) => a + b, 0) || 1
  const avg = total / Math.max(vals.length, 1)
  const sq = vals.reduce((a, b) => a + (b - avg) ** 2, 0)
  return Math.sqrt(sq / Math.max(vals.length, 1)) / Math.max(avg, 0.001)
}

export function buildKarma(input: BuilderInput): KarmaSection {
  const { saju, astro } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []

  const dayEl = dayElement(saju)
  const geokguk = geokgukType(saju)
  const ys = yongsinPrimary(saju)
  const jong = isJonggeok(saju) ? jonggeokType(saju) : ''
  const samgi = samgiInfo(saju)
  const fe = fiveElements(saju)
  const v = variance(fe)
  const karmaType = classifyKarma(v)
  const fixedRatio = Math.max(0.4, Math.min(0.75, 1 - v))
  const flexibleRatio = 1 - fixedRatio
  if (dayEl) sajuUsed.push('pillars.day.element')
  if (geokguk) sajuUsed.push('advanced.geokguk.type')
  if (ys) sajuUsed.push('advanced.yongsin.primary')
  if (jong) sajuUsed.push('ultraAdvanced.jonggeok.type')
  if (samgi.hasSamgi) sajuUsed.push('ultraAdvanced.samgi')
  if (Object.keys(fe).length > 0) sajuUsed.push('fiveElements')

  const gongmang = gongmangAffectedPillars(saju)
  if (gongmang.length > 0) sajuUsed.push('ultraAdvanced.gongmang')
  const gongmangBranches = saju.ultraAdvanced?.gongmang?.gongmangBranches ?? []

  const iljuName = saju.ultraAdvanced?.iljuDeep?.ilju || ''
  const iljuChar = saju.ultraAdvanced?.iljuDeep?.iljuCharacter || ''
  if (iljuName) sajuUsed.push('ultraAdvanced.iljuDeep.ilju')
  const hwagyeok = saju.ultraAdvanced?.hwagyeok
  const specialFormations = saju.ultraAdvanced?.specialFormations ?? []
  if (specialFormations.length > 0) sajuUsed.push('ultraAdvanced.specialFormations')

  // ─ astro signals
  const nn = northNode(astro)
  if (nn) astroUsed.push('planets.true_node')
  const ch = chiron(astro)
  if (ch) astroUsed.push('chiron')
  const lilith = astro.lilith
  if (lilith) astroUsed.push('lilith')
  const pof = partOfFortune(astro)
  if (pof) astroUsed.push('partOfFortune')
  const twelfthPlanets = planetsInHouse(astro, 12)
  if (twelfthPlanets.length > 0) astroUsed.push('houses.12.planets')
  const neptune = findPlanet(astro, 'Neptune')
  const jupiter = findPlanet(astro, 'Jupiter')
  if (neptune) astroUsed.push('planets.neptune')
  if (jupiter) astroUsed.push('planets.jupiter')

  // ──────── 文단 1: 영혼의 주제 (격국 + North Node)
  const missionKo = ELEMENT_MISSION_KO[dayEl] || '균형'
  const missionEn = ELEMENT_MISSION_EN[dayEl] || 'balance'
  const p1ko = paragraph([
    `이번 생의 결은 '${missionKo}'${eulReul(missionKo)} 통해 ${karmaGeokgukShortKo(geokguk)}을 완성해가는 흐름이에요.`,
    nn
      ? `이번 생에 영혼이 향하고 싶은 방향은 ${signLabel(nn.sign, 'ko')}의 결, ${nn.house ? karmaHouseHintKo(nn.house) + ' 자리에 ' : ''}있어요.`
      : '',
    ys ? `삶의 균형추가 되는 결은 '${ys}'의 기운이라, 이 결을 일상에 들여올수록 마음이 풀어져요.` : '',
  ])
  const p1en = paragraph([
    `Your soul-line in this life completes its ${geokguk || 'native pattern'} through ${missionEn}.`,
    nn
      ? `Your North Node sits in ${signLabel(nn.sign, 'en')}${nn.house ? ` (${nn.house}H)` : ''} — the direction your soul wants to grow.`
      : '',
    ys
      ? `Your primary yongsin is ${ys} — when you bring this element into your environment, the soul unfolds.`
      : '',
  ])

  // ──────── 文단 2: 카르마 패턴 (공망 + 12집 + South Node 영역)
  const p2ko = paragraph([
    `카르마 유형은 ${karmaType}이에요. ${KARMA_DESC_KO[karmaType]}`,
    `약 ${Math.round(fixedRatio * 100)}%는 타고난 결이고, ${Math.round(flexibleRatio * 100)}%는 선택과 노력으로 바꿀 수 있어요.`,
    gongmang.length > 0
      ? `삶의 결 중에 ${gongmang.join('·')} 영역엔 '비어 있는 자리'가 있어서 채워지지 않는 감각이 들 수 있어요. 이게 바로 영혼이 다음 단계로 넘어가도록 미는 결이에요.`
      : '',
    twelfthPlanets.length > 0
      ? `내면과 비밀의 자리에 ${twelfthPlanets.map((p) => planetLabelKo(p.name)).join(', ')}이 머물러 있어, 혼자 있는 시간 속에서 풀어야 할 결이 함께 있어요.`
      : '',
  ])
  const p2en = paragraph([
    `Your karma archetype is ${karmaType} — ${KARMA_DESC_EN[karmaType]}`,
    `Roughly ${Math.round(fixedRatio * 100)}% is the fated portion; ${Math.round(flexibleRatio * 100)}% is the flexible portion you reshape through choice.`,
    gongmang.length > 0
      ? `The gongmang (${gongmangBranches.join('·')}) inside your saju leaves an 'unfillable' sensation in ${gongmang.join(' / ')} — this very gap is what pushes the soul into the next stage.`
      : '',
    twelfthPlanets.length > 0
      ? `${twelfthPlanets.map((p) => p.name).join(', ')} sit in your 12th house, so part of the karma must be worked through solitude and the subconscious.`
      : '',
  ])

  // ──────── 文단 3: 치유의 자리 (일주 심화 + Chiron + Lilith)
  const p3ko = paragraph([
    iljuName
      ? `타고난 결을 한 마디로 말하면 '${shorten(iljuChar)}'이고, 이게 치유와 성장의 시작점이에요.`
      : '',
    ch
      ? `상처와 치유의 결은 ${signLabel(ch.sign, 'ko')}의 톤으로 자리잡고 있어서, ${chironHouseHintKo(ch.house)} 영역에서 평생의 상처가 다른 사람을 돕는 자원으로 바뀌어요.`
      : '',
    lilith
      ? `${signLabel(lilith.sign, 'ko')}의 결로 내면에 어두운 결이 있어, 사회적 기대 밖의 자기를 인정할 때 진짜 힘이 풀려요.`
      : '',
  ])
  const p3en = paragraph([
    iljuName
      ? `Your ilju (${iljuName}) carries '${shorten(iljuChar)}' as its core note — the starting point for both healing and growth.`
      : '',
    ch
      ? `Chiron in ${signLabel(ch.sign, 'en')}${ch.house ? ` (${ch.house}H)` : ''} means ${chironHouseHintEn(ch.house)} is where the lifelong wound converts itself into healing power.`
      : '',
    lilith
      ? `Lilith in ${signLabel(lilith.sign, 'en')} — owning the part of yourself that lies outside social approval unlocks real force.`
      : '',
  ])

  // ──────── 文단 4: 잠재력 (특수 격국 + Part of Fortune)
  const p4ko = paragraph([
    jong
      ? '삶의 결이 한 방향으로 강하게 응축돼서, 한 분야로 깊이 들어갈 때 가장 강한 잠재력이 풀려요.'
      : '',
    hwagyeok?.isHwagyeok
      ? '결정적인 순간에 한 번 더 자기를 바꿀 변화의 자유가 깔려 있어요.'
      : '',
    samgi.hasSamgi
      ? '큰 무대에서 인정받을 특별한 자질이 깔려 있어요.'
      : '',
    pof
      ? `행운의 점이 ${signLabel(pof.sign, 'ko')}의 결로 ${pof.house ? karmaHouseHintKo(pof.house) + ' 자리에 ' : ''}있어서, 이 영역을 가꿀수록 운이 자기 자리로 돌아와요.`
      : '',
    specialFormations.length > 0
      ? '평범한 흐름을 넘어서는 특별한 결이 잠재돼 있어요.'
      : '',
    `한 줄로 정리하면: 이번 생은 ${missionKo}${eulReul(missionKo)} 통해 ${karmaType}의 결을 풀어가는 여정이에요.`,
  ])
  const p4en = paragraph([
    jong
      ? `Your saju condenses strongly into one direction (${jong}), so deep specialisation unlocks the largest potential.`
      : '',
    hwagyeok?.isHwagyeok
      ? `A ${hwagyeok.type} transformation pattern sits in the stems — at decisive moments it grants you the freedom to remake yourself.`
      : '',
    samgi.hasSamgi
      ? `A ${samgi.type ?? 'samgi'} pattern is present — latent capacity for recognition on a larger stage.`
      : '',
    pof
      ? `Part of Fortune in ${signLabel(pof.sign, 'en')}${pof.house ? ` (${pof.house}H)` : ''} — tending this area is where luck comes home.`
      : '',
    specialFormations.length > 0
      ? `Special formations (${specialFormations.join(', ')}) suggest your grain reaches past the ordinary flow.`
      : '',
    `In one line: this life is a journey of resolving ${karmaType}-style karma through ${missionEn}.`,
  ])

  const paragraphs: Paragraph[] = [
    { ko: p1ko, en: p1en },
    { ko: p2ko, en: p2en },
    { ko: p3ko, en: p3en },
    { ko: p4ko, en: p4en },
  ]

  return {
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed },
  }
}

function shorten(s: string): string {
  return s.split(/[\.。,，]/)[0].trim().slice(0, 40)
}

function chironHouseHintKo(h: number | undefined): string {
  if (!h) return '평생 가장 예민하게 반응하는'
  const map: Record<number, string> = {
    1: '자기 정체성의',
    2: '가치와 자원의',
    3: '소통과 학습의',
    4: '뿌리와 가정의',
    5: '창작과 자녀의',
    6: '일과 몸의',
    7: '관계의',
    8: '깊이와 공동 자원의',
    9: '신념과 가르침의',
    10: '사회적 자리의',
    11: '동료와 미래 비전의',
    12: '내면과 은둔의',
  }
  return map[h] || '평생 가장 예민하게 반응하는'
}
function chironHouseHintEn(h: number | undefined): string {
  if (!h) return 'the most tender area of your life'
  const map: Record<number, string> = {
    1: 'self-identity',
    2: 'value and resource',
    3: 'speech and learning',
    4: 'roots and home',
    5: 'creation and children',
    6: 'work and body',
    7: 'partnership',
    8: 'depth and shared resource',
    9: 'belief and teaching',
    10: 'social standing',
    11: 'peers and future vision',
    12: 'solitude and inner life',
  }
  return map[h] || 'the most tender area of your life'
}
