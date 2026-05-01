/**
 * Tier 4 — Advanced astro × 사주 cross interpretation (남은 6 영역).
 *
 * Solar/Lunar Return·Eclipses·ASC·Aspects는 sajuNarrationBridge에 이미 deep cross가 있음.
 * 이 모듈은 *나머지 차원*을 메인 cross로 끌어올림:
 *   - 소행성 (Juno/Vesta/Ceres/Pallas) × 사주 십신
 *   - Vertex × 사주 일간 element
 *   - Part of Fortune × 사주 일간 element
 *   - 개별 aspect × 사주 일간 element (specific)
 *   - 용신 × astro transit element
 *   - 12운성 × astro transit
 */

const ELEMENT_FLOW: Record<string, Record<string, 'same' | 'flow' | 'caution' | 'neutral'>> = {
  목: { 목: 'same', 화: 'flow', 토: 'caution', 금: 'caution', 수: 'flow' },
  화: { 화: 'same', 토: 'flow', 금: 'caution', 수: 'caution', 목: 'flow' },
  토: { 토: 'same', 금: 'flow', 수: 'caution', 목: 'caution', 화: 'flow' },
  금: { 금: 'same', 수: 'flow', 목: 'caution', 화: 'caution', 토: 'flow' },
  수: { 수: 'same', 목: 'flow', 화: 'caution', 토: 'caution', 금: 'flow' },
}

const SIGN_TO_ELEMENT: Record<string, string> = {
  Aries: '화', Leo: '화', Sagittarius: '화',
  Taurus: '토', Virgo: '토', Capricorn: '토',
  Gemini: '목', Libra: '목', Aquarius: '목',
  Cancer: '수', Scorpio: '수', Pisces: '수',
}

const SIGN_KO: Record<string, string> = {
  Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리',
  Leo: '사자자리', Virgo: '처녀자리', Libra: '천칭자리', Scorpio: '전갈자리',
  Sagittarius: '사수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리',
}

interface AdvancedCrossInput {
  natalElement?: string
  yongsin?: string
  twelveStage?: string
  currentSaeunElement?: string
  currentDaeunElement?: string
  sibsinDistribution?: Record<string, number>
  asteroidHouses?: Record<string, number | undefined>
  extraPointSigns?: Record<string, string | undefined>
  aspects?: Array<{ planet1: string; planet2: string; type: string }>
  activeTransits?: string[]
}

// ───────── 소행성 × 사주 십신 cross ─────────
export function buildAsteroidsSibsinCrossKo(input: AdvancedCrossInput): string {
  const houses = input.asteroidHouses || {}
  const sibsin = input.sibsinDistribution || {}
  const lines: string[] = []

  const junoH = houses.Juno
  const guanCount = (sibsin['정관'] || 0) + (sibsin['편관'] || 0)
  if (junoH && guanCount >= 2) {
    lines.push(`Juno가 ${junoH}하우스에 있고 사주 관성(정관·편관)이 ${guanCount}개로 두텁게 들어와 있어, *결혼·동반자 결이 점성·사주 양쪽에서 같이 활성화*된 차트예요. 점성 Juno는 *어떤 결의 만남인지*(${junoH}하우스 영역), 사주 관성은 *결혼이 인생에 어떤 무게로 작용하는지*(책임감의 결합)를 같이 알려줘서, 두 신호가 동시에 맞물리는 시기가 가장 깊은 인연을 만나는 자리예요.`)
  }

  const vestaH = houses.Vesta
  const sikCount = (sibsin['식신'] || 0) + (sibsin['상관'] || 0)
  if (vestaH && sikCount >= 2) {
    lines.push(`Vesta가 ${vestaH}하우스고 사주 식상(식신·상관)이 ${sikCount}개로 두텁게 들어와 있어, *헌신·집중·표현의 결이 양쪽에서 동시에* 활성화돼요. 점성 Vesta는 *어디에 헌신할지*의 영역(${vestaH}하우스), 사주 식상은 *어떻게 표현·만들 것인가*의 본명 결을 가리켜서, 둘이 겹치면 *한 곳에 깊이 파고드는 길*이 직업·소명으로 풀립니다.`)
  }

  const ceresH = houses.Ceres
  const inCount = (sibsin['정인'] || 0) + (sibsin['편인'] || 0)
  if (ceresH && inCount >= 2) {
    lines.push(`Ceres가 ${ceresH}하우스고 사주 인성(정인·편인)이 ${inCount}개로 들어와 있어, *돌봄·양육의 결이 본명 안에 깊이 박혀* 있는 차트예요. Ceres는 *어디에 돌봄을 쏟을지*의 영역, 인성은 *받음·배움의 결*이라, 둘이 같이 작동하면 *남을 길러내는 일이 본인을 길러내는 결로 돌아오는* 자리에서 빛나요.`)
  }

  const pallasH = houses.Pallas
  const biCount = (sibsin['비견'] || 0) + (sibsin['겁재'] || 0)
  if (pallasH && biCount >= 2) {
    lines.push(`Pallas가 ${pallasH}하우스고 사주 비겁(비견·겁재)이 ${biCount}개라, *전략·지혜·자기 길의 결*이 양쪽에서 같이 진해지는 차트예요. Pallas는 *어디에 전략을 펼지*(${pallasH}하우스), 비겁은 *자기 색을 지키고 키우는 결*을 가리키니, 둘이 합쳐지면 *본인 이름으로 한 분야를 정복하는* 자리가 자연스러워요.`)
  }

  if (lines.length === 0) return ''
  return lines.join('\n\n')
}

// ───────── Vertex × 사주 일간 element cross ─────────
export function buildVertexSajuCrossKo(input: AdvancedCrossInput): string {
  const vertexSign = input.extraPointSigns?.Vertex
  const natal = input.natalElement
  if (!vertexSign || !natal) return ''
  const vertexElement = SIGN_TO_ELEMENT[vertexSign]
  if (!vertexElement) return ''
  const flow = ELEMENT_FLOW[natal]?.[vertexElement] || 'neutral'
  const signKo = SIGN_KO[vertexSign] || vertexSign
  if (flow === 'same') {
    return `Vertex(운명의 문)가 ${signKo}(${vertexElement} 결)에 있고 사주 일간(${natal})과 *같은 결*이라, 인생의 결정적 만남이 *본인 결과 같은 톤*으로 들어와요. Vertex는 의식적으로 선택하지 않은 만남을 가리키는데, 본인 결과 같으면 *자연스럽게 받아들이게 되는* 인연이고, 큰 거부감 없이 흘러가는 자리예요.`
  }
  if (flow === 'flow') {
    return `Vertex가 ${signKo}(${vertexElement} 결)에 있고 사주 일간(${natal})과 *순행 관계*라, 결정적 만남이 *본인을 자연스럽게 키워주는 결*로 들어와요. 거리감 있는 톤이지만 본인을 발전시키는 자리니, 처음 끌리지 않더라도 한 번 받아보는 게 좋아요.`
  }
  if (flow === 'caution') {
    return `Vertex가 ${signKo}(${vertexElement} 결)에 있고 사주 일간(${natal})과 *부담 관계*라, 결정적 만남이 *본인 결과 부딪치는 톤*으로 들어와요. 처음엔 거부감이 들지만 그 만남이 *본인의 부족한 결*을 보충해주는 운명적 자리니, 직감적 거부감보다 *왜 들어왔나*를 한 번 더 보세요.`
  }
  return ''
}

// ───────── Part of Fortune × 사주 일간 cross ─────────
export function buildPartOfFortuneSajuCrossKo(input: AdvancedCrossInput): string {
  const pofSign = input.extraPointSigns?.PartOfFortune
  const natal = input.natalElement
  if (!pofSign || !natal) return ''
  const pofElement = SIGN_TO_ELEMENT[pofSign]
  if (!pofElement) return ''
  const flow = ELEMENT_FLOW[natal]?.[pofElement] || 'neutral'
  const signKo = SIGN_KO[pofSign] || pofSign
  if (flow === 'same' || flow === 'flow') {
    return `Part of Fortune(번영점)이 ${signKo}(${pofElement} 결)에 있고 사주 일간(${natal})과 ${flow === 'same' ? '같은 결' : '순행 결'}이라, *행운·번영의 자리가 본인 결과 같은 방향*으로 정렬돼 있어요. POF는 본인이 가장 자연스럽게 만족·성취감을 느끼는 자리고, 그게 일간 결과 같다는 건 *외부 행운과 내부 결정이 한 줄로 정렬*된다는 뜻 — 큰 결정에서 이 결을 잊지 마세요.`
  }
  if (flow === 'caution') {
    return `Part of Fortune이 ${signKo}(${pofElement} 결)에 있고 사주 일간(${natal})과 *다른 방향*이라, 행운·번영의 자리와 본인 결정 결이 *다른 톤*이에요. 머리로 끌리는 자리(일간)와 행운이 풀리는 자리(POF)가 다르다는 건 *의식적인 선택과 자연스러운 행운이 다른 방향*이란 뜻 — 가끔은 본인이 끌리지 않는 결도 시도해보면 의외로 큰 풀림이 들어와요.`
  }
  return ''
}

// ───────── 개별 aspect × 사주 일간 element cross ─────────
const ASPECT_KO: Record<string, string> = {
  conjunction: '합', opposition: '대립', square: '긴장', trine: '조화', sextile: '협력',
}
const PLANET_KO: Record<string, string> = {
  Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성',
  Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성',
}

export function buildAspectSajuElementCrossKo(input: AdvancedCrossInput): string {
  const natal = input.natalElement
  const aspects = input.aspects || []
  if (!natal || aspects.length === 0) return ''

  const PRIORITY = ['opposition', 'square', 'conjunction', 'trine', 'sextile']
  const sorted = [...aspects].sort(
    (a, b) => PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type)
  )
  const primary = sorted[0]
  if (!primary) return ''
  const p1Ko = PLANET_KO[primary.planet1] || primary.planet1
  const p2Ko = PLANET_KO[primary.planet2] || primary.planet2
  const aspectKo = ASPECT_KO[primary.type] || primary.type
  const tense = primary.type === 'opposition' || primary.type === 'square'
  const flow = primary.type === 'trine' || primary.type === 'sextile'

  const elementContext: Record<string, { tense: string; flow: string; conj: string }> = {
    목: {
      tense: '시작·확장 결인 일간 안에서 *추진의 칼날*로 작동해요. 새 일에 가속이 붙되 충돌·과욕도 함께 와서, 한 번씩 멈춰서 점검하는 리듬이 평생 과제예요',
      flow: '시작·확장 결인 일간을 *부드럽게 받쳐주는* 결이라 새 일이 자연스럽게 풀리는 자산이에요. 다만 너무 매끄러우면 도전 의지가 풀어지기 쉬우니 의식적으로 한 단계 더 시도해보세요',
      conj: '시작·확장 결인 일간 안에 *집중된 추진력*으로 합쳐져 한 영역을 깊이 파고드는 자산이 돼요',
    },
    화: {
      tense: '표현·발산 결인 일간 안에서 *과열·번아웃의 위험*으로 작동해요. 평소보다 표현은 강하되 회복 리듬을 의식적으로 짜야 한 해를 잘 풀어가요',
      flow: '표현·발산 결인 일간을 *조화롭게 받쳐주는* 결이라 무대·창의 영역에서 자연스럽게 빛나는 자산이에요',
      conj: '표현·발산 결인 일간 안에 *집중된 화력*이 합쳐져 한 영역에서 또렷한 임팩트를 만드는 자산이 돼요',
    },
    토: {
      tense: '안정·중심 결인 일간 안에서 *기반 흔들림*으로 작동해요. 평소처럼 묵직하게 가다가 한 번씩 큰 흔들림이 들어오니, 분산·기록·시스템화로 보완해야 안전해요',
      flow: '안정·중심 결인 일간을 *부드럽게 받쳐주는* 결이라 자원·자산 누적이 매끄럽게 풀리는 자산이에요',
      conj: '안정·중심 결인 일간 안에 *깊은 집중*이 합쳐져 한 분야의 권위를 세우는 자산이 돼요',
    },
    금: {
      tense: '결단·정리 결인 일간 안에서 *날카로운 마찰*로 작동해요. 결단력은 강하되 관계에서 거친 표현이 적을 만들기 쉬우니 *말의 결*을 의식적으로 다듬는 게 평생 과제예요',
      flow: '결단·정리 결인 일간을 *조화롭게 받쳐주는* 결이라 정밀·검수·법무 영역에서 자연스럽게 빛나는 자산이에요',
      conj: '결단·정리 결인 일간 안에 *집중된 결단력*이 합쳐져 한 영역의 권위·전문성을 만드는 자산이 돼요',
    },
    수: {
      tense: '직관·정서 결인 일간 안에서 *내면 진폭*으로 작동해요. 평소보다 정서가 흔들리기 쉽되 그 진폭이 창의·예술의 동력이 되니, 표현으로 풀어내는 채널을 찾으세요',
      flow: '직관·정서 결인 일간을 *부드럽게 받쳐주는* 결이라 학문·연구·심리 영역에서 자연스럽게 깊어지는 자산이에요',
      conj: '직관·정서 결인 일간 안에 *집중된 통찰*이 합쳐져 한 영역의 깊이를 만드는 자산이 돼요',
    },
  }

  const ctx = elementContext[natal]
  if (!ctx) return ''
  const tone = tense ? ctx.tense : flow ? ctx.flow : ctx.conj

  return `점성 ${p1Ko}-${p2Ko} ${aspectKo}이 본명에 들어와 있는데, 사주 일간(${natal})과 만나면 ${tone}. 같은 ${aspectKo} aspect라도 일간이 ${natal}이라는 점에서 *이 사람만의 specific 의미*가 형성되는 거예요.`
}

// ───────── 용신 × astro transit element cross ─────────
const YONGSIN_BENEFIT: Record<string, string> = {
  목: '시작·확장·새 시도가 본명을 가장 잘 풀어주는 결',
  화: '표현·발산·외부 무대가 본명을 가장 잘 풀어주는 결',
  토: '안정·축적·중심 잡기가 본명을 가장 잘 풀어주는 결',
  금: '결단·정리·마무리가 본명을 가장 잘 풀어주는 결',
  수: '관찰·내적 정리·학습이 본명을 가장 잘 풀어주는 결',
}

export function buildYongsinAstroCrossKo(input: AdvancedCrossInput): string {
  const yongsin = input.yongsin
  const saeun = input.currentSaeunElement
  if (!yongsin || !saeun) return ''
  const benefit = YONGSIN_BENEFIT[yongsin]
  if (!benefit) return ''
  if (yongsin === saeun) {
    return `사주 용신은 ${yongsin}으로 *${benefit}*인데, 점성·사주 시기 신호가 같이 ${saeun} 결로 들어오는 시기예요. 용신은 본명에 가장 큰 보탬이 되는 element고, 외부 환경(점성 트랜짓·사주 세운)이 같이 ${yongsin} 결을 가져오면 *본명이 가장 잘 풀리는 환경*이 만들어진 거라 큰 결정·도전에 가속이 자연스럽게 붙어요.`
  }
  const flow = ELEMENT_FLOW[yongsin]?.[saeun] || 'neutral'
  if (flow === 'flow') {
    return `사주 용신은 ${yongsin} 결인데, 외부 시기(${saeun})가 용신을 *순행으로 받쳐주는* 자리예요. 용신이 직접 들어온 건 아니지만 외부 환경이 본명에 보탬이 되는 결이라, 평소보다 결정이 매끄럽게 풀립니다.`
  }
  if (flow === 'caution') {
    return `사주 용신은 ${yongsin}인데, 외부 시기(${saeun})가 용신과 *반대 방향*이라 *환경이 본명을 받쳐주지 못하는* 시기예요. 큰 도전보다 *지키기·보완 모드*에 무게중심을 두고, 다음 사이클에 용신 결이 들어올 때까지 본인 자원을 잘 보존하는 게 핵심.`
  }
  return ''
}

// ───────── 12운성 × astro transit cross ─────────
const STAGE_PHASE: Record<string, string> = {
  장생: '새로 시작하는 단계',
  목욕: '정화·다듬는 단계',
  관대: '사회로 나가 자리 잡는 단계',
  건록: '전성기·자수성가 단계',
  제왕: '권위·정점 단계',
  쇠: '한 번씩 정리하는 단계',
  병: '한 호흡 쉬어 가는 단계',
  사: '한 챕터 마무리 단계',
  묘: '깊이 파고드는 정리 단계',
  절: '비우고 다음을 준비하는 단계',
  태: '내적 잉태 단계',
  양: '안에서 키우는 단계',
}

export function buildTwelveStageAstroCrossKo(input: AdvancedCrossInput): string {
  const stage = input.twelveStage
  if (!stage) return ''
  const phase = STAGE_PHASE[stage]
  if (!phase) return ''
  const transitsCount = (input.activeTransits || []).length
  const hasFlowStage = ['장생', '관대', '건록', '제왕'].includes(stage)
  const hasRestStage = ['쇠', '병', '사', '묘', '절'].includes(stage)
  if (transitsCount >= 2 && hasFlowStage) {
    return `사주 12운성으로는 일간이 *${stage}* 단계라 *${phase}*인데, 점성에서도 활성 트랜짓이 ${transitsCount}개 들어와 외부 환경이 같이 *진행 신호*를 보내는 시기예요. 본명 안의 추진 단계와 외부 환경의 활성 신호가 *동시에* 들어왔다는 건, 평소처럼 흘러가는 시기가 아니라 *한 단계 진도가 분명히 나가는* 한 해예요.`
  }
  if (transitsCount >= 2 && hasRestStage) {
    return `사주 12운성으로는 일간이 *${stage}* 단계라 *${phase}*인데, 점성에서는 활성 트랜짓이 ${transitsCount}개 들어와 외부에서 변화 신호가 들어오는 시기예요. *본명 안쪽은 정리 단계*인데 *외부는 활성*이라는 건 두 결이 다른 방향이라, 외부 변화에 휩쓸리기보다 본명 단계에 맞춰 *내적 정리에 집중*하면서 외부는 가볍게 받아내는 편이 안전.`
  }
  if (transitsCount === 0 && hasFlowStage) {
    return `사주 12운성으로 일간이 *${stage}* 단계라 *${phase}*인데, 점성 트랜짓이 잠잠한 시기예요. 외부 환경 신호가 약하니 *본명 단계 안에서 자기 진도*에 집중하는 시기 — 외부 자극을 기다리지 말고 본인이 한 발짝씩 진도를 내야 ${stage} 단계를 잘 통과합니다.`
  }
  return ''
}
