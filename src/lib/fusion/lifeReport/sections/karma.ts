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
  dayMasterRoot,
  fiveElements,
  geokgukType,
  gongmangAffectedPillars,
  gongmangAreasKo,
  isJonggeok,
  jonggeokType,
  pickRelationEntry,
  relationDictionaryEntry,
  samgiInfo,
  dayElement,
  yongsinPrimary,
} from '../signals/sajuSignals'
import {
  aspectPairEntriesForPairs,
  chiron,
  nearestEclipses,
  partOfFortune,
  planetsInHouse,
} from '../signals/astroSignals'
import { northNode, findPlanet } from '../signals/astroSynthesis'
import { eulReul, paragraph, planetLabel, signLabel } from '../templates/sentences'
import { findGeokgukEntry } from '@/lib/saju/geokgukDictionary'
import { findUltraAdvancedEntry } from '@/lib/saju/ultraAdvancedDictionary'

// 행성명을 한국어로 (planetLabel은 동일 동작이지만 가독성을 위한 alias)
function planetLabelKo(name: string): string {
  return planetLabel(name, 'ko')
}

// 카르마 영역에서 사용하는 하우스 의미 자연어
function karmaHouseHintKo(h: number | undefined): string {
  if (!h) return ''
  const map: Record<number, string> = {
    1: '정체성',
    2: '재산',
    3: '학습과 소통',
    4: '가정과 뿌리',
    5: '창조와 자녀',
    6: '일상과 건강',
    7: '관계',
    8: '심층 변용',
    9: '확장과 신념',
    10: '사회 무대',
    11: '공동체와 친구',
    12: '내면과 비밀',
  }
  return map[h] || ''
}

// 격국을 자연어로 짧게 (karma 섹션에서 사용)
function karmaGeokgukShortKo(g: string): string {
  if (!g) return '자기 본성 그대로 살아가는 길'
  if (g.includes('편관')) return '도전과 책임으로 무게를 견디는 길'
  if (g.includes('정관')) return '책임감 있게 자리 잡는 길'
  if (g.includes('편재')) return '기회를 잡아내는 감각으로 풀어가는 길'
  if (g.includes('정재')) return '꾸준히 쌓아가는 길'
  if (g.includes('식신')) return '여유롭게 창조하는 길'
  if (g.includes('상관')) return '재능을 자유롭게 풀어내는 길'
  if (g.includes('편인')) return '독특한 직관으로 풀어가는 길'
  if (g.includes('정인')) return '배움과 돌봄으로 흐르는 길'
  return '자기 본성 그대로 살아가는 길'
}

// 격국 → natural English (raw 사주 용어 없이) — karma 섹션 전용.
function karmaGeokgukShortEn(g: string): string {
  if (!g) return 'its native shape'
  if (g.includes('편관'))
    return 'a pressure-as-fuel path that carries weight through challenge and responsibility'
  if (g.includes('정관')) return 'a steady-authority path, settling into responsibility'
  if (g.includes('편재')) return 'an opportunistic-resource sense, catching openings as they pass'
  if (g.includes('정재')) return 'a steady-resource path, building up patiently'
  if (g.includes('식신')) return 'an easeful-creation flow, expressing with grace'
  if (g.includes('상관')) return 'a free-talent flow, releasing skill without strict form'
  if (g.includes('편인')) return 'an unconventional-wisdom path'
  if (g.includes('정인')) return 'a learning-and-care path'
  return 'its native shape'
}

// 오행 영어 자연어
function elementFlavorEn(y: string): string {
  if (!y) return 'a native element'
  if (y.includes('목') || y.includes('wood')) return 'Wood (growth, sprouting)'
  if (y.includes('화') || y.includes('fire')) return 'Fire (warmth, expression)'
  if (y.includes('토') || y.includes('earth')) return 'Earth (steadiness, rooting)'
  if (y.includes('금') || y.includes('metal')) return 'Metal (clarity, refinement)'
  if (y.includes('수') || y.includes('water')) return 'Water (depth, flow)'
  return 'a native element'
}

// English short ordinal used inline (karma 섹션 전용).
function ordinalShortKarma(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// 60갑자 일주 (e.g. "庚辰") → natural English label without hanja.
// Composes stem + branch English names so callers see e.g. "Yang Metal Dragon".
const ILJU_STEM_EN: Record<string, string> = {
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
const ILJU_BRANCH_EN: Record<string, string> = {
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
function iljuLabelEn(ilju: string): string {
  if (!ilju) return 'native day-pillar'
  const chars = Array.from(ilju)
  if (chars.length < 2) return 'native day-pillar'
  const stem = ILJU_STEM_EN[chars[0]] ?? ''
  const branch = ILJU_BRANCH_EN[chars[1]] ?? ''
  if (stem && branch) return `${stem} ${branch}`
  if (stem) return stem
  if (branch) return branch
  return 'native day-pillar'
}

// Gongmang affected pillars (raw 사주 라벨: '초년' 등) → natural English areas.
function gongmangAreasEn(areas: string[]): string {
  const map: Record<string, string> = {
    초년: 'early life',
    청년: 'young adulthood',
    중년: 'middle life',
    만년: 'later life',
    year: 'early life',
    month: 'young adulthood',
    day: 'middle life',
    time: 'later life',
  }
  const mapped = areas.map((a) => map[a] ?? a).filter(Boolean)
  if (mapped.length === 0) return 'one of your life-stages'
  if (mapped.length === 1) return mapped[0]
  return mapped.slice(0, -1).join(', ') + ' and ' + mapped[mapped.length - 1]
}

// 오행 음을 자연 한글 표현으로
function elementFlavorKo(y: string): string {
  if (!y) return '본연의 기운'
  if (y.includes('목')) return '나무 기운'
  if (y.includes('화')) return '불의 기운'
  if (y.includes('토')) return '흙의 기운'
  if (y.includes('금')) return '쇠의 기운'
  if (y.includes('수')) return '물의 기운'
  return '본연의 기운'
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
  치유형: '자신과 타인을 회복시키는 카르마. 돌봄·상담의 성향이 강해요.',
  균형형: '극단을 피하고 중도를 지키는 카르마. 꾸준함이 결과를 만들어요.',
}
const KARMA_DESC_EN: Record<KarmaType, string> = {
  창조형: 'luck opens through what you try first.',
  조화형: 'answers come from doing things together.',
  시련형: 'you toughen through deep curves and leap after the crisis.',
  치유형: 'care and counsel are your native channel.',
  균형형: 'steadiness, not extremes, produces the result.',
}
// Karma archetype → English label (no Korean leaks in narrative).
const KARMA_ARCHETYPE_EN: Record<KarmaType, string> = {
  창조형: 'a creator-line karma',
  조화형: 'a harmonizer-line karma',
  시련형: 'a trial-line karma',
  치유형: 'a healer-line karma',
  균형형: 'a balance-line karma',
}
// Karma archetype → noun used inside the "this life resolves X karma" line.
const KARMA_ARCHETYPE_NOUN_EN: Record<KarmaType, string> = {
  창조형: 'creator-line',
  조화형: 'harmonizer-line',
  시련형: 'trial-line',
  치유형: 'healer-line',
  균형형: 'balance-line',
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

  // 격국/종격 DB 깊이 — 정적 사전에서 핵심 한 문장을 P4에 통합.
  const geokgukEntry = geokguk ? findGeokgukEntry(geokguk) : null
  if (geokgukEntry) sajuUsed.push('geokgukDictionary.entry')
  const jongEntry = jong ? findUltraAdvancedEntry('종격', jong) : null
  if (jongEntry) sajuUsed.push('ultraAdvancedDictionary.jonggeok.entry')

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
    `이번 생의 큰 그림은 '${missionKo}'${eulReul(missionKo)} 통해 ${karmaGeokgukShortKo(geokguk)}을 완성해가는 여정이에요.`,
    nn
      ? `이번 생에 영혼이 향하고 싶은 방향은 ${signLabel(nn.sign, 'ko')}, ${nn.house ? karmaHouseHintKo(nn.house) + ' 영역에 ' : ''}있어요.`
      : '',
    ys
      ? `삶의 균형추가 되는 기운은 ${elementFlavorKo(ys)}이라, 이걸 일상에 들여올수록 마음이 풀어져요.`
      : '',
  ])
  const p1en = paragraph([
    `In this life your soul walks ${karmaGeokgukShortEn(geokguk)}, finding its completion in ${missionEn}.`,
    nn
      ? `Your North Node sits in ${signLabel(nn.sign, 'en')}${nn.house ? `'s ${ordinalShortKarma(nn.house)} house` : ''} — the direction your soul wants to grow.`
      : '',
    ys
      ? `Your supportive element is ${elementFlavorEn(ys)} — weaving it into daily life lets the soul unfold.`
      : '',
  ])

  // ──────── 文단 2: 카르마 패턴 (공망 + 12집 + South Node 영역 + 통근)
  // 일간의 통근 — 카르마가 자기 안에서 풀리는지(strong root) 외부에서
  // 풀리는지(weak/none) 결정하는 신호로 자연 통합.
  const dmRoot = dayMasterRoot(saju)
  if (dmRoot) sajuUsed.push('tonggeun.dayMasterRoot')
  const p2ko = paragraph([
    `카르마 유형은 ${karmaType}이에요. ${KARMA_DESC_KO[karmaType]}`,
    `약 ${Math.round(fixedRatio * 100)}% 정도는 타고난 거고, ${Math.round(flexibleRatio * 100)}%는 선택과 노력으로 바꿀 수 있어요.`,
    dmRoot ? dmRoot.phraseKo : '',
    gongmang.length > 0
      ? `삶의 ${gongmangAreasKo(gongmang)} 영역에 비어 있는 자리가 있어서 채워지지 않는 감각이 들 수 있어요. 이게 바로 영혼이 다음 단계로 넘어가도록 미는 부름이에요.`
      : '',
    twelfthPlanets.length > 0
      ? `${twelfthPlanets.map((p) => planetLabelKo(p.name)).join(', ')}이 내면 영역(12집)에 있어서, 혼자 있는 시간이 풀어야 할 과제예요.`
      : '',
  ])
  const p2en = paragraph([
    `Your karma archetype comes through as ${KARMA_ARCHETYPE_EN[karmaType]} — ${KARMA_DESC_EN[karmaType]}`,
    `Roughly ${Math.round(fixedRatio * 100)}% is fated; the other ${Math.round(flexibleRatio * 100)}% you reshape through choice.`,
    dmRoot ? dmRoot.phraseEn : '',
    gongmang.length > 0
      ? `An unfillable 'empty seat' sits in your chart around ${gongmangAreasEn(gongmang)} — and that very gap is what pushes the soul into its next stage.`
      : '',
    twelfthPlanets.length > 0
      ? `${twelfthPlanets.map((p) => p.name).join(', ')} ${twelfthPlanets.length === 1 ? 'sits' : 'sit'} in your 12th house, so part of the karma is worked out through solitude and the subconscious.`
      : '',
  ])

  // ──────── 文단 3: 치유 (일주 심화 + Chiron + Lilith)
  // iljuChar 의 raw 값에 한자가 섞여 있으면 한자 부분을 한국어 음으로
  // 풀어 자연 한국어 문장으로 만든다. (P3에 한자가 노출되지 않도록.)
  const iljuCharKo = iljuChar ? humanizeIljuCharKo(iljuChar) : ''
  const p3ko = paragraph([
    iljuName && iljuCharKo
      ? `타고난 성향을 한 마디로 풀면 '${shorten(iljuCharKo)}'이고, 이게 치유와 성장의 시작점이에요.`
      : iljuName
        ? `타고난 일주의 특징이 치유와 성장의 시작점이에요.`
        : '',
    ch
      ? `상처와 치유의 분위기는 ${signLabel(ch.sign, 'ko')} 느낌으로 자리잡고 있어서, ${chironHouseHintKo(ch.house)} 영역에서 평생의 상처가 다른 사람을 돕는 자원으로 바뀌어요.`
      : '',
    lilith
      ? `${signLabel(lilith.sign, 'ko')}의 분위기로 내면에 어두운 자질이 있어, 사회적 기대 밖의 자기를 인정할 때 진짜 힘이 풀려요.`
      : '',
  ])
  const p3en = paragraph([
    iljuName
      ? `Your day-pillar archetype (${iljuLabelEn(iljuName)}) sets the core note — the starting point for both healing and growth.`
      : '',
    ch
      ? `Chiron in ${signLabel(ch.sign, 'en')}${ch.house ? `, the ${ordinalShortKarma(ch.house)}-house seat,` : ''} means ${chironHouseHintEn(ch.house)} is where the lifelong wound converts itself into healing power.`
      : '',
    lilith
      ? `Lilith in ${signLabel(lilith.sign, 'en')} — owning the part of yourself that lies outside social approval unlocks real force.`
      : '',
  ])

  // ──────── 文단 4: 잠재력 (특수 격국 + Part of Fortune)
  const p4ko = paragraph([
    geokgukEntry ? firstSentenceKarma(geokgukEntry.ko) : '',
    jong
      ? '삶이 한 방향으로 강하게 응축돼서, 한 분야로 깊이 들어갈 때 가장 강한 잠재력이 풀려요.'
      : '',
    jongEntry ? firstSentenceKarma(jongEntry.ko) : '',
    hwagyeok?.isHwagyeok ? '결정적인 순간에 한 번 더 자기를 바꿀 변화의 자유가 깔려 있어요.' : '',
    samgi.hasSamgi ? '큰 무대에서 인정받을 특별한 자질이 깔려 있어요.' : '',
    pof
      ? `행운의 점이 ${signLabel(pof.sign, 'ko')}, ${pof.house ? karmaHouseHintKo(pof.house) + ' 영역에 ' : ''}있어서, 이 영역을 가꿀수록 운이 자기 자리로 돌아와요.`
      : '',
    specialFormations.length > 0 ? '평범한 흐름을 넘어서는 특별한 자질이 잠재돼 있어요.' : '',
    `한 줄로 정리하면: 이번 생은 ${missionKo}${eulReul(missionKo)} 통해 ${karmaType} 카르마를 풀어가는 여정이에요.`,
  ])
  const p4en = paragraph([
    geokgukEntry ? firstSentenceKarma(geokgukEntry.en) : '',
    jong
      ? 'Your chart condenses strongly into a single direction, so deep specialisation unlocks the largest potential.'
      : '',
    jongEntry ? firstSentenceKarma(jongEntry.en) : '',
    hwagyeok?.isHwagyeok
      ? 'A transformation pattern sits in the chart — at decisive moments it grants you the freedom to remake yourself.'
      : '',
    samgi.hasSamgi
      ? 'A rare nobility pattern is present, hinting at a latent capacity for recognition on a larger stage.'
      : '',
    pof
      ? `Part of Fortune sits in ${signLabel(pof.sign, 'en')}${pof.house ? `, in the ${ordinalShortKarma(pof.house)} house` : ''} — tending this area is where luck comes home.`
      : '',
    specialFormations.length > 0
      ? 'Rare formations sit in your chart, hinting that your grain can reach past the ordinary flow.'
      : '',
    `In one line: this life is a journey of resolving ${KARMA_ARCHETYPE_NOUN_EN[karmaType]} karma through ${missionEn}.`,
  ])

  // ──────── 文단 5: 영혼 (draconic Sun + harmonics 7)
  const dra = input.calendarSignals?.draconicSummary
  const h7 = input.calendarSignals?.harmonics?.[7]
  if (dra) astroUsed.push('calendarSignals.draconicSummary')
  if (h7) astroUsed.push('calendarSignals.harmonics.7')
  const p5pieces: string[] = []
  const p5piecesEn: string[] = []
  if (dra?.sunSign) {
    p5pieces.push(
      `영혼이 가져온 정체성은 ${signLabel(dra.sunSign, 'ko')}, ${signSoulKo(dra.sunSign)}의 모습으로 왔어요. 본명과 영혼이 같은 음을 낼 때 가장 평온해져요.`
    )
    p5piecesEn.push(
      `Your draconic Sun in ${signLabel(dra.sunSign, 'en')} marks the soul-identity you bring into this life — ${signSoulEn(dra.sunSign)}. The deepest sense of peace comes when your natal and draconic charts sound the same note.`
    )
  }
  if (h7 && h7.strength >= 40) {
    p5pieces.push(
      '영적 친밀감이 차트 안에서 분명하게 울리고 있어, 신비적 체험·꿈·직관이 평소에도 가까이 있어요.'
    )
    p5piecesEn.push(
      'The 7th harmonic resonates clearly in your chart — mystical experience, dreams and intuition stay close to daily life.'
    )
  } else if (h7) {
    p5pieces.push(
      '영적 친밀감은 잔잔히 깔려 있어요. 깊은 침묵과 명상의 시간이 이 감각을 깨우는 길이에요.'
    )
    p5piecesEn.push(
      'The 7th harmonic runs quietly beneath the surface — silence and meditation are what awaken it.'
    )
  }
  // Cross-domain themes (metaRules) — 여러 영역이 함께 움직이는 교차 주제를
  // 카르마 흐름으로 통합. 강한 교차 패턴이 잡힐 때만 노출.
  const crossThemes = input.fusion?.themes ?? []
  // narrativeEn 이 없으면(구버전 projection 등) 영문엔 한글이 새지 않도록 생략.
  if (crossThemes[0]) {
    astroUsed.push('fusion.themes')
    p5pieces.push(`여러 영역이 함께 움직이는 결이 있어요. ${crossThemes[0].rule.narrative}`)
    if (crossThemes[0].rule.narrativeEn) {
      p5piecesEn.push(`Several life areas move together here. ${crossThemes[0].rule.narrativeEn}`)
    }
  }

  // Nearest eclipses around birth (solar + lunar) — 카르마의 시작점에 새겨진
  // 일식/월식의 그늘 / 감정 변곡을 자연 한국어로 통합.
  const natalEclipses = nearestEclipses(astro)
  if (natalEclipses.length > 0) {
    astroUsed.push('eclipses.nearest')
    for (const ec of natalEclipses) {
      const signKo = ec.sign ? signLabel(ec.sign, 'ko') : ''
      const signEn = ec.sign ? signLabel(ec.sign, 'en') : ''
      if (ec.type === 'solar') {
        p5pieces.push(
          `운명의 시작에 일식의 그늘이 ${signKo ? signKo + ' 자리에 ' : ''}새겨져 있어, 정체성의 큰 굴곡이 평생의 카르마로 작용해요.`
        )
        p5piecesEn.push(
          `A solar eclipse near birth${signEn ? ' (in ' + signEn + ')' : ''} etches a karmic shadow into identity itself.`
        )
      } else {
        p5pieces.push(
          `태어난 시기에 가까운 월식이 ${signKo ? signKo + ' 자리에서 ' : ''}감정의 변곡으로 새겨져, 카르마가 감정을 따라 풀려요.`
        )
        p5piecesEn.push(
          `A lunar eclipse near birth${signEn ? ' (in ' + signEn + ')' : ''} marks an emotional bend — karma resolves through the feeling grain.`
        )
      }
    }
  }
  // aspectPair DB — 정체성·변용 축의 각(태양-달 / 토성-천왕·해왕·명왕)을
  // 영혼 섹션에 한 문장 그라운딩. 차트에 존재하는 가장 좁은 각 1개만.
  const karmaAspect = aspectPairEntriesForPairs(
    astro,
    [
      ['Sun', 'Moon'],
      ['Saturn', 'Pluto'],
      ['Saturn', 'Uranus'],
      ['Saturn', 'Neptune'],
    ],
    1
  )[0]
  if (karmaAspect) {
    astroUsed.push('aspectPairDictionary.karma')
    p5pieces.push(firstSentenceKarma(karmaAspect.ko))
    p5piecesEn.push(firstSentenceKarma(karmaAspect.en))
  }
  const p5ko = paragraph(
    p5pieces.length
      ? p5pieces
      : [
          '영혼의 색은 본명과 큰 충돌 없이 정렬돼 있어, 큰 깨달음보다 매일의 작은 흐름을 따라가는 길이 잘 맞아요.',
        ]
  )
  const p5en = paragraph(
    p5piecesEn.length
      ? p5piecesEn
      : [
          'Your soul aligns calmly with the natal chart — small daily attentions, not grand awakenings, fit best.',
        ]
  )

  // ──────── 文단 6: 사주 합충 패턴 (hyeongchung) + 4기둥 12운성
  const hc = input.calendarSignals?.sajuHyeongchung
  const twelve = input.calendarSignals?.twelveStageAll
  if (hc?.hasInteractions) sajuUsed.push('calendarSignals.sajuHyeongchung')
  if (twelve) sajuUsed.push('calendarSignals.twelveStageAll')
  const p6pieces: string[] = []
  const p6piecesEn: string[] = []
  if (hc && hc.hasInteractions) {
    const total = hc.hapCount + hc.chungCount + hc.hyungCount + hc.haeCount
    if (hc.hapCount > 0 && hc.chungCount > 0) {
      p6pieces.push(
        `사주 안에 결합과 충돌의 흐름이 함께 ${total}회 일어나, 인생이 결합과 단절을 동시에 풀어가는 카르마예요. ${hc.summary.slice(0, 3).join(' · ')}.`
      )
      p6piecesEn.push(
        `Inside your chart, both harmony and clash currents appear (${total} interactions in total) — this life resolves karma through simultaneous union and severance.`
      )
    } else if (hc.hapCount > 0) {
      p6pieces.push(
        `사주 안 결합의 흐름이 ${hc.hapCount}회 일어나, 인생의 카르마가 사람과 사람을 잇는 쪽으로 풀려요. ${hc.summary.slice(0, 2).join(' · ')}.`
      )
      p6piecesEn.push(
        `Your chart shows ${hc.hapCount} harmony-joinings — karma resolves by joining people and currents.`
      )
    } else if (hc.chungCount > 0) {
      p6pieces.push(
        `사주 안 충돌의 흐름이 ${hc.chungCount}회 일어나, 카르마가 단절과 결정을 통해 풀려요. 깨끗하게 끊는 능력이 운을 만들어요.`
      )
      p6piecesEn.push(
        `Your chart shows ${hc.chungCount} clash-currents — karma resolves through severance and clean decision. Cutting cleanly attracts luck.`
      )
    }
    if (hc.hyungCount > 0) {
      p6pieces.push(
        '형벌의 흐름도 함께 있어, 정의롭게 굽히지 않는 자기를 다듬는 과정이 이번 생의 통과의례 중 하나예요.'
      )
      p6piecesEn.push(
        "A reshaping penalty-accent runs through your chart — refining an unbending sense of justice is one of this life's rites of passage."
      )
    }
  }
  // 합충 DB — 가장 두드러진 관계 한 쌍의 구체적 결을 한 문장으로 그라운딩.
  const primaryRelation = input.calendarSignals?.sajuRelations
    ? pickRelationEntry(input.calendarSignals.sajuRelations)
    : undefined
  const relationEntry = relationDictionaryEntry(primaryRelation)
  if (relationEntry) {
    sajuUsed.push('relationsDictionary.entry')
    p6pieces.push(firstSentenceKarma(relationEntry.ko))
    p6piecesEn.push(firstSentenceKarma(relationEntry.en))
  }
  if (twelve) {
    const stages = [twelve.year, twelve.month, twelve.day, twelve.time].filter(Boolean) as string[]
    if (stages.length >= 2) {
      const strong = stages.filter((s) =>
        ['장생', '관대', '임관', '건록', '왕지', '제왕'].includes(s)
      ).length
      const weak = stages.filter((s) => ['병', '사', '묘', '절', '태'].includes(s)).length
      if (strong >= 2) {
        p6pieces.push(
          '4기둥의 12운성을 종합하면, 인생의 무게추가 발산과 자립 쪽으로 기울어 있어요. 카르마도 적극적으로 만들어가는 길이 맞아요.'
        )
        p6piecesEn.push(
          'Across your four pillars, the life-cycle stages tilt toward emanation and self-standing — your karma is actively shaped, not merely received.'
        )
      } else if (weak >= 2) {
        p6pieces.push(
          '4기둥의 12운성이 수렴과 마무리 쪽으로 기울어 있어요. 카르마는 정리와 결산으로 풀려요.'
        )
        p6piecesEn.push(
          'The four-pillar life-cycle stages tilt toward closure and inwardness — karma resolves through completion and settling accounts.'
        )
      } else {
        p6pieces.push(
          '4기둥의 12운성이 강약 양쪽에 골고루 분포해서, 시기에 따라 발산과 수렴을 오가는 흐름이에요.'
        )
        p6piecesEn.push(
          'Your four-pillar life-cycle stages spread evenly between strong and weak — you alternate between releasing and consolidating.'
        )
      }
    }
  }
  // Lot of Captivity — 속박·제약의 점 → 카르마 매듭으로 자연 통합
  const captivityLot = input.calendarSignals?.arabicPartsExtra?.Captivity
  if (captivityLot) {
    astroUsed.push('calendarSignals.arabicPartsExtra.Captivity')
    p6pieces.push(
      `속박의 점이 ${signLabel(captivityLot.sign, 'ko')}에 놓여, 이번 생에 풀어내야 할 카르마 매듭의 분위기도 같은 흐름을 따라요.`
    )
    p6piecesEn.push(
      `Your Lot of Captivity sits in ${signLabel(captivityLot.sign, 'en')} — the karmic knot you came here to untie tends to carry that same flavor.`
    )
  }
  const p6ko = paragraph(
    p6pieces.length
      ? p6pieces
      : [
          '사주 내부 결합·충돌 패턴은 잔잔하게 정렬돼 있어, 카르마가 격한 사건보다 일상의 흐름으로 풀려요.',
        ]
  )
  const p6en = paragraph(
    p6piecesEn.length
      ? p6piecesEn
      : [
          'The patterns of harmony and clash inside your chart sit calmly arranged — your karma tends to work itself out through the texture of daily life rather than through dramatic events.',
        ]
  )

  const paragraphs: Paragraph[] = [
    { ko: p1ko, en: p1en },
    { ko: p2ko, en: p2en },
    { ko: p3ko, en: p3en },
    { ko: p4ko, en: p4en },
    { ko: p5ko, en: p5en },
    { ko: p6ko, en: p6en },
  ]

  return {
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed },
  }
}

// ─── helpers for P5 (draconic Sun, harmonics 7) ───────────────
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

function shorten(s: string): string {
  return s
    .split(/[\.。,，]/)[0]
    .trim()
    .slice(0, 40)
}

// 격국/종격 사전 narrative의 첫 문장만 뽑아 P4가 길어지지 않게 한다.
function firstSentenceKarma(s: string): string {
  const trimmed = s.trim()
  if (!trimmed) return ''
  const m = trimmed.match(/^[^.!?。]*[.!?。]/)
  return (m ? m[0] : trimmed).trim()
}

// 한자가 섞인 raw iljuCharacter 값을 한국어 음으로 풀어 자연 한국어로
// 만든다. 예: "辛 일간의 未 지지 조합" → "신금 일간과 미토 지지의 조합".
// 한자가 없는 경우 그대로 반환.
const HANJA_STEM_KO: Record<string, string> = {
  甲: '갑목',
  乙: '을목',
  丙: '병화',
  丁: '정화',
  戊: '무토',
  己: '기토',
  庚: '경금',
  辛: '신금',
  壬: '임수',
  癸: '계수',
}
const HANJA_BRANCH_KO: Record<string, string> = {
  子: '자수',
  丑: '축토',
  寅: '인목',
  卯: '묘목',
  辰: '진토',
  巳: '사화',
  午: '오화',
  未: '미토',
  申: '신금',
  酉: '유금',
  戌: '술토',
  亥: '해수',
}
function humanizeIljuCharKo(raw: string): string {
  if (!raw) return ''
  // raw 가 generic fallback ("X 일간의 Y 지지 조합") 인 경우 자연 한국어 재조합.
  const m = raw.match(
    /^([甲乙丙丁戊己庚辛壬癸])\s*일간의\s*([子丑寅卯辰巳午未申酉戌亥])\s*지지\s*조합$/
  )
  if (m) {
    const stem = HANJA_STEM_KO[m[1]] ?? m[1]
    const branch = HANJA_BRANCH_KO[m[2]] ?? m[2]
    return `${stem}과 ${branch}의 만남`
  }
  // 그 외에는 raw 안의 한자 각 글자를 한글 음으로 치환.
  let out = raw
  for (const [k, v] of Object.entries(HANJA_STEM_KO)) out = out.split(k).join(v)
  for (const [k, v] of Object.entries(HANJA_BRANCH_KO)) out = out.split(k).join(v)
  return out
}

function chironHouseHintKo(h: number | undefined): string {
  if (!h) return '평생 가장 예민하게 반응하는'
  const map: Record<number, string> = {
    1: '자기 정체성',
    2: '가치와 자원',
    3: '소통과 학습',
    4: '뿌리와 가정',
    5: '창작과 자녀',
    6: '일과 몸',
    7: '관계',
    8: '깊이와 공동 자원',
    9: '신념과 가르침',
    10: '사회 무대',
    11: '동료와 미래 비전',
    12: '내면과 은둔',
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
