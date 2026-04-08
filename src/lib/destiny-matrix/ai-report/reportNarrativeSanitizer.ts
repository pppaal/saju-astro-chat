import { normalizeUserFacingGuidance } from '@/lib/destiny-matrix/guidanceLanguage'
import { splitSentences } from './sectionQualityGate'

const USER_FACING_NOISE_REGEX =
  /(snapshot_|astrologysnapshot|sajusnapshot|crosssnapshot|스냅샷\s*키|해당\s*스냅샷|array\(|object\(|COV:|I\d+:|L\d+:|crossEvidenceSets|graphRAG|graphrag|matrix_)/i

const BOILERPLATE_PATTERNS = [
  /이 구간의 핵심 초점은[^.\n!?]*[.\n!?]?/g,
  /This section focuses on[^.\n!?]*[.\n!?]?/gi,
]

const BANNED_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/격국의 결/gi, '격국 흐름'],
  [/긴장 신호/gi, '주의 신호'],
  [/상호작용/gi, '연동'],
  [/시사/gi, '보여줌'],
  [/결이/gi, '흐름이'],
  [/프레임/gi, '구조'],
  [/검증/gi, '재확인'],
  [/근거 세트/gi, '근거 묶음'],
  [
    /\b(?:tarot|numerology|human\s*design|chakra|reiki|mbti|enneagram|blood\s*type|feng\s*shui)\b/gi,
    'saju-astrology',
  ],
  [/(?:타로|수비학|휴먼\s*디자인|차크라|레이키|에니어그램|혈액형|풍수)/gi, '사주·점성'],
]

const BANNED_PHRASE_PATTERNS = BANNED_PHRASE_REPLACEMENTS.map(([pattern]) => pattern)

export function stripBannedPhrases(text: string): string {
  let result = text
  for (const [pattern, replacement] of BANNED_PHRASE_REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

export function containsBannedPhrase(text: string): boolean {
  return BANNED_PHRASE_PATTERNS.some((pattern) => pattern.test(text))
}

export function normalizeUserFacingArtifacts(text: string): string {
  if (!text || typeof text !== 'string') return ''

  const orphanHouseSentenceRegex =
    /^[은는이가를]\s*[가-힣A-Za-z]+\s*\d+하우스에 (?:놓여|위치해) 있습니다\.?$/u

  let normalized = String(text || '')
    .replace(/배경 구조축/g, '삶의 배경 흐름')
    .replace(/전면 행동축/g, '지금 먼저 움직여야 할 영역')
    .replace(/행동축/g, '실제 행동 방향')
    .replace(/중심축/g, '중심 흐름')
    .replace(/리스크축/g, '가장 조심해야 할 변수')
    .replace(/\bbasecamp reset\b/gi, '거점 재정비')
    .replace(/\bHidden Support Pattern\b/gi, '숨은 지원 흐름')
    .replace(/\bLearning Acceleration Pattern\b/gi, '학습 가속 흐름')
    .replace(/\bMovement Guardrail Window\b/gi, '이동·변화 경계 구간')
    .replace(/\bWealth Accumulation Pattern\b/gi, '자산 축적 흐름')
    .replace(/\bCareer Expansion Pattern\b/gi, '커리어 확장 패턴')
    .replace(/\bRelationship Tension Pattern\b/gi, '관계 긴장 패턴')
    .replace(/\bRelationship Activation Pattern\b/gi, '관계 활성화 흐름')
    .replace(/\bBurnout Risk Pattern\b/gi, '번아웃 리스크 패턴')
    .replace(/\bWealth Volatility Pattern\b/gi, '재정 변동성 흐름')
    .replace(/\bcontract negotiation\b/gi, '조건 협상')
    .replace(/\bspecialist track\b/gi, '전문화 트랙')
    .replace(/\bpromotion review\b/gi, '승진 검토')
    .replace(/\bList promotion criteria\b/gi, '승진 판단 기준을 정리하기')
    .replace(/\bList leverage points\b/gi, '협상 포인트를 정리하기')
    .replace(/\bName your narrow edge\b/gi, '자신의 전문 포지션을 명확히 하기')
    .replace(
      /\bExpansion without role clarity can create delivery strain\.?\b/gi,
      '역할과 범위가 불분명하면 실행 부담이 커질 수 있습니다'
    )
    .replace(/\bExpansion Pattern\b/gi, '확장 패턴')
    .replace(/\bTension Pattern\b/gi, '긴장 패턴')
    .replace(/\bsaju pillars\b/gi, '사주 원국 축')
    .replace(/\bjeonggwan\b/gi, '정관')
    .replace(/\bYongsin\b/gi, '용신')
    .replace(/\bearth\b/gi, '흙')
    .replace(/\bcareer\b(?=\s*영역)/gi, '커리어')
    .replace(/\brelationship\b(?=\s*영역)/gi, '관계')
    .replace(/\bwealth\b(?=\s*영역)/gi, '재정')
    .replace(/\bhealth\b(?=\s*영역)/gi, '건강')
    .replace(/\bnow\s+창\b/gi, '지금 창')
    .replace(/\bStage\s+/g, '')
    .replace(/\bDaeun\b/gi, '대운')
    .replace(/\bGeokguk\b/gi, '격국')
    .replace(/현재 흐름 흐름/g, '현재 흐름')
    .replace(/트랜짓가/g, '트랜짓이')
    .replace(/트랜짓/gi, '점성 흐름')
    .replace(/패턴 패턴/g, '패턴')
    .replace(/활성화 흐름 패턴/gi, '활성화 흐름')
    .replace(/변동성 흐름 패턴/gi, '변동성 흐름')
    .replace(/\b31\?\s*31-40\?/g, '31세 전후부터 40세 무렵까지')
    .replace(/\?\?\([^)]+\)\?\?\./g, '')
    .replace(/\?\?[가-힣A-Za-z0-9 ()-]*\?\?/g, '')
    .replace(/(숨은 지원 흐름|학습 가속 흐름|자산 축적 흐름|이동·변화 경계 구간)\s*패턴/g, '$1')
    .replace(/관계\s*Adjustment/gi, '관계 조정')
    .replace(/커리어\s*Expansion/gi, '커리어 확장')
    .replace(/재정\s*타이밍\s*Window/gi, '재정 타이밍 창')
    .replace(/타이밍\s*Window/gi, '타이밍 창')
    .replace(/관계 조정 배우자 아키타입/gi, '배우자 아키타입')
    .replace(/배우자 아키타입\(누구\):/gi, '배우자 아키타입:')
    .replace(/관계 조정 돈이 움직이는 방식을 보면/gi, '돈이 움직이는 방식을 보면')
    .replace(/관계 조정 자산 관리(?:의)?/gi, '자산 관리')
    .replace(/관계 조정 실행 전 확인 절차를/gi, '실행 전 확인 절차를')
    .replace(/관계 조정 확정 전에/gi, '확정 전에')
    .replace(/용신 화 패턴/gi, '용신 화 흐름')
    .replace(/격국 정관 패턴/gi, '격국 정관 흐름')
    .replace(
      /관계 조정은 우선 차단하는 것이 바람직합니다/gi,
      '관계에서는 성급한 충돌을 먼저 차단하는 편이 바람직합니다'
    )
    .replace(
      /관계 조정은 먼저 막는 편이 맞습니다/gi,
      '관계에서는 성급한 충돌을 먼저 막는 편이 맞습니다'
    )
    .replace(/지금 구간에 대운,\s*세운,\s*이 겹치며/g, '지금 구간에 대운과 세운 흐름이 겹치며')
    .replace(/지금 구간에는 대운,\s*세운,\s*이 겹쳐져/g, '지금 구간에는 대운과 세운 흐름이 겹쳐져')
    .replace(
      /대운\s+([가-힣A-Za-z]+)가,\s*세운\s+([가-힣A-Za-z]+)이/g,
      '대운 $1 흐름과 세운 $2 흐름이'
    )
    .replace(/현재 31세 전후는 현재 흐름 안에 있어/g, '현재 31세 전후 흐름은')
    .replace(/현재 31세 전후는 현재 흐름에서는/g, '현재 31세 전후 흐름에서는')
    .replace(/현재 31세 전후는 현재 흐름의 결론은/g, '현재 31세 전후 흐름의 결론은')
    .replace(/현재 31세 전후는 현재 흐름은/g, '현재 31세 전후 흐름은')
    .replace(/지금 결론은\s+([가-힣]+)\s+흐름은/g, '지금 결론은 $1 흐름이')
    .replace(/기준 정리 후 실행(?=\s*[가-힣])/g, '기준을 정리한 뒤 실행하고')
    .replace(/,\s*(?=(?:기준|긴장|결정은|실행 전|주의 신호가|핵심 근거는))/g, '. ')
    .replace(/세요\.,/g, '세요.')
    .replace(/역할\.\s*기준/gi, '역할, 기준')
    .replace(/한 번에 인생을 뒤집는 결정보다\./g, '한 번에 인생을 뒤집는 결정보다,')
    .replace(/\uB808\uC774\uC5B4\s*\d+\s*\uC2E0\uD638[^.!?\n]*[.!?]?/g, '')
    .replace(/Layer\s*\d+\s*signal[^.!?\n]*[.!?]?/gi, '')
    .replace(/\uD575\uC2EC \uADFC\uAC70\uB294[^.!?\n]*\uC785\uB2C8\uB2E4\.?/gu, '')
    .replace(
      /\uC774 \uD750\uB984\uC744 \uBC1B\uCCD0\uC8FC\uB294 \uBC14\uD0D5\uC740[^.!?\n]*\uC785\uB2C8\uB2E4\.?/gu,
      ''
    )
    .replace(
      /\uC9C0\uAE08 \uC0C1\uB300\uC801\uC73C\uB85C \uD798\uC774 \uC2E4\uB9AC\uB294 \uCD95\uC740[^.!?\n]*\uC785\uB2C8\uB2E4\.?/gu,
      ''
    )
    .replace(/\bMeasure weekly commute load\b/gi, '')
    .replace(/\bPush back on emotional certainty\b/gi, '')
    .replace(/\baction\?+\b/gi, '')
    .replace(/([\uAC00-\uD7A3]+)\?{2,}/gu, '$1')
    .replace(/\?{2,}\s*([\uAC00-\uD7A3]+)/gu, '$1')
    .replace(/([\uAC00-\uD7A3]+)\?+\s*([\uAC00-\uD7A3]+)/gu, '$1 $2')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const sentences = splitSentences(normalized)
    .map((sentence) => String(sentence || '').trim())
    .filter(Boolean)
    .filter((sentence) => !orphanHouseSentenceRegex.test(sentence))

  normalized = sentences
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return normalizeUserFacingGuidance(normalized, /[가-힣]/.test(normalized) ? 'ko' : 'en')
}

export function sanitizeSectionNarrative(text: string): string {
  if (!text || typeof text !== 'string') return ''
  let cleaned = text
  for (const pattern of BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }
  cleaned = stripBannedPhrases(cleaned)
  cleaned = normalizeUserFacingArtifacts(cleaned)
  return normalizeUserFacingGuidance(
    cleaned.replace(/\n{3,}/g, '\n\n').trim(),
    /[가-힣]/.test(cleaned) ? 'ko' : 'en'
  )
}

export function sentenceKey(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 72)
    .toLowerCase()
}

export function dedupeNarrativeSentences(text: string): string {
  if (!text) return ''
  const raw = text
    .replace(/\s{2,}/g, ' ')
    .split(/(?<=[.!?]|다\.)\s+/u)
    .map((line) => line.trim())
    .filter(Boolean)
  if (raw.length <= 1) return text
  const seen = new Set<string>()
  const kept: string[] = []
  for (const sentence of raw) {
    const key = sentenceKey(sentence)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(sentence)
  }
  return kept
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function sanitizeUserFacingNarrative(text: string): string {
  const normalized = normalizeUserFacingArtifacts(String(text || ''))
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!normalized) return normalized
  const sentences = splitSentences(normalized)
    .map((s) => String(s || '').trim())
    .filter(Boolean)
  if (sentences.length === 0) {
    return normalizeUserFacingGuidance(normalized, /[가-힣]/.test(normalized) ? 'ko' : 'en')
  }
  const engineTokenRegex =
    /\b[a-z]+(?:_[a-z0-9]+){1,}\b|\b(?:career|relationship|wealth|health|move|personality|timing)\(\d+\)\b/i
  const corruptedMojibakeRegex =
    /(?:[\u00C3\u00C2][^\s]{1,}|[\u00EC\u00ED\u00EB\u00EA][A-Za-z0-9\u00A1-\u00FF]{1,}|\uFFFD|\u00ED\u02DC|\u00EC\u017E|\u00C3\u00AC|\u00C3\u00AD|[\u201E\u201D\u201C\u20AC\u2122\u0153\u0161\u017E\u2039\u203A\u00AC\u20AC])+/g
  const mixedEnglishNoiseRegex =
    /(Support stays latent|Overconfidence can dilute|hidden_support_main_window|income_growth_window)/i
  const structuredNoiseRegex =
    /(메인\/대안 시나리오는 핵심 이벤트 기준으로 업데이트됩니다|리포트 스코프:|체크리스트: 실행 우선순위:|상위 도메인:\s*[A-Za-z]|적합도\s*\d+|Top\d|역할 아키타입:.*[,/].*[,/]|직군\/산업|채널 Top3|알아볼 단서|KPI와 트리거 프로토콜|승부처와 실행 레버|인생 총운 한 줄 로그라인|커리어 엔진|성향 엔진|그림자 패턴|머니 스타일|국면 전환 레이어|확장 자원 레이어)/i
  const filtered = sentences.filter(
    (sentence) =>
      !USER_FACING_NOISE_REGEX.test(sentence) &&
      !engineTokenRegex.test(sentence) &&
      !corruptedMojibakeRegex.test(sentence) &&
      !mixedEnglishNoiseRegex.test(sentence) &&
      !structuredNoiseRegex.test(sentence)
  )
  const base = filtered.length >= Math.min(3, sentences.length) ? filtered : sentences
  const cleaned = base
    .map((sentence) =>
      sentence
        .replace(USER_FACING_NOISE_REGEX, '')
        .replace(engineTokenRegex, '')
        .replace(corruptedMojibakeRegex, '')
        .replace(mixedEnglishNoiseRegex, '')
        .replace(structuredNoiseRegex, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .filter(Boolean)
    .join(' ')
    .replace(/(2주 실행 3단계:)\s*\1/g, '$1')
    .replace(/(Main:)\s*(Main:)/g, '$1')
    .replace(/(Alt:)\s*(Alt:)/g, '$1')
    .replace(/\b즉시 확정\b/g, '')
    .replace(/\b일반 모드\b/g, '')
    .replace(/이번 해석의 중심에는[^.!?\n]*가 놓여 있습니다\.?/g, '')
    .replace(/핵심 근거는[^.!?\n]*입니다\.?/g, '')
    .replace(
      /외부 기회와 지원 흐름을 보면\s*외부 기회\/지원 네트워크 활용도를 해석합니다\.?/g,
      '외부 기회와 지원이 실제 성과로 이어질 수 있는지 함께 봅니다.'
    )
    .replace(
      /흐름이 바뀌는 지점을 보면\s*확장 신호와 리셋 신호의 동시성을 해석합니다\.?/g,
      '기회를 넓힐 흐름과 기준을 다시 세울 흐름이 함께 겹칩니다.'
    )
    .replace(
      /사주의 기본 구조를 실행 기준으로 고정하고, 역할\/우선순위 충돌을 먼저 정리하세요\.?/g,
      '기본 기준을 먼저 세우고, 역할과 우선순위가 겹치는 지점을 먼저 정리하세요.'
    )
    .replace(
      /주의 신호는 속도 조절과 확인 루틴을 같이 두어 손실을 줄이세요\.?/g,
      '주의 신호가 강한 구간에서는 속도를 조금 낮추고 확인 순서를 먼저 세우는 편이 안전합니다.'
    )
    .replace(
      /격국 신호를 실행 기준으로 고정하고, 역할\/우선순위 충돌을 먼저 정리하세요\.?/g,
      '사주의 기본 구조를 기준으로 삼고, 역할과 우선순위가 충돌하는 지점을 먼저 정리하세요.'
    )
    .replace(
      /긴장 애스펙트는 속도 조절과 검증 루틴을 같이 두어 손실을 줄이세요\.?/g,
      '긴장이 강한 시기일수록 속도를 조절하고 확인 루틴을 먼저 고정해야 손실을 줄일 수 있습니다.'
    )
    .replace(/미션\s*한\s*줄:\s*/g, '')
    .replace(/결정\s*기준\s*\d*:\s*/g, '중요한 판단 기준은 ')
    .replace(/확장\/축소\s*포인트:\s*\.?/g, '')
    .replace(/승리 조건:[\s\S]*$/g, '')
    .replace(/피해야 할 조건:[\s\S]*$/g, '')
    .replace(/마지막 메시지:[\s\S]*$/g, '')
    .replace(/잘 맞는 역할을 보면\s*/g, '')
    .replace(/분석 직군·국가 적합도 근거:\s*/g, '잘 맞는 환경을 보면 ')
    .replace(
      /모순.?게이트.?저합의 신호 때문에 준비 중심 판단으로 낮춰야 합니다\.?/g,
      '지금은 성급하게 확정하기보다 준비와 기준 정리가 더 중요한 구간입니다.'
    )
    .replace(
      /이 해석의 출발점은 총점 \d+점, 신뢰 \d+% 기준으로 해석을 시작합니다\.?/g,
      '전체 흐름은 현재 신뢰도와 점수가 모두 안정적으로 받쳐주는 편입니다.'
    )
    .replace(/이번 인생 총운의 중심축은/g, '지금 인생 전체 흐름에서 가장 크게 움직이는 축은')
    .replace(/핵심 판단은/g, '현재 국면은')
    .replace(/커리어 영역은/g, '커리어 흐름은')
    .replace(/관계 영역은/g, '관계 흐름은')
    .replace(/재정 영역은/g, '재정 흐름은')
    .replace(/건강 영역은/g, '건강 흐름은')
    .replace(/핵심 근거는\s*([^.!?\n]+)[.!?]?/gu, '이 흐름을 받쳐주는 바탕은 $1입니다.')
    .replace(/상위 흐름은\s*([^.!?\n]+)[.!?]?/gu, '지금 상대적으로 힘이 실리는 축은 $1입니다.')
    .replace(
      /\u00ED\u2022\u00B5\u00EC\u2039\u00AC \u00EA\u00B7\u00BC\u00EA\u00B1\u00B0\u00EB\u0160\u201D\s*([^.!?\n]+)[.!?]?/g,
      '이 흐름을 받쳐주는 바탕은 $1입니다.'
    )
    .replace(
      /\u00EC\u0192\u0081\u00EC\u0153\u201E \u00ED\u009D\u0090\u00EB\u00A6\u201E\u00EC\u009D\u20AC\s*([^.!?\n]+)[.!?]?/g,
      '지금 상대적으로 힘이 실리는 축은 $1입니다.'
    )
    .replace(
      /\u00C3\u00AD\u00E2\u20AC\u00A2\u00C2\u00B5\u00C3\u00AC\u00E2\u20AC\u00B9\u00C2\u00AC \u00C3\u00AA\u00C2\u00B7\u00C2\u00BC\u00C3\u00AA\u00C2\u00B1\u00C2\u00B0\u00C3\u00AB\u00C5\u00A0\u00E2\u20AC\u009D\s*([^.!?\n]+)[.!?]?/g,
      '이 흐름을 받쳐주는 바탕은 $1입니다.'
    )
    .replace(
      /\u00C3\u00AC\u00C6\u2019\u00C2\u0081\u00C3\u00AC\u00C5\u201C\u00E2\u20AC\u017E \u00C3\u00AD\u00C2\u009D\u00C2\u0090\u00C3\u00AB\u00C2\u00A6\u00E2\u20AC\u017E\u00C3\u00AC\u00C2\u009D\u00E2\u201A\u00AC\s*([^.!?\n]+)[.!?]?/g,
      '지금 상대적으로 힘이 실리는 축은 $1입니다.'
    )
    .replace(
      /(놓여 있습니다|작동합니다|중요합니다|입니다)\s+(핵심 성향은|중요한 판단 기준은|현재|그래서)/g,
      '$1. $2'
    )
    .replace(
      /(하우스에 놓여 있습니다|하우스에 위치해 있습니다)\s+(핵심 성향은|기본 성향에서는|주의 신호가|핵심 흐름 신호는|관계에서는|커리어는|재정은|건강은)/g,
      '$1. $2'
    )
    .replace(
      /(기후를 정하고, 세운·월운·일운은 그 위에서 실제 사건의 속도와 체감 강도를 조절합니다)\s+(21-\d+세)/g,
      '$1. $2'
    )
    .replace(/\b커리어\s+영역은\b/g, '커리어 흐름은')
    .replace(/\b관계\s+영역은\b/g, '관계 흐름은')
    .replace(/\b재정\s+영역은\b/g, '재정 흐름은')
    .replace(/\b건강\s+영역은\b/g, '건강 흐름은')
    .replace(/\b이동\s+영역은\b/g, '이동 흐름은')
    .replace(/이번 해석의 중심에는\s*[, ]*/g, '이번 해석의 중심에는 ')
    .replace(/\.\./g, '.')
    .replace(/Alt:\s*/g, '')
    .replace(/Main:\s*/g, '')
    .replace(/\uD575\uC2EC \uADFC\uAC70\uB294[^.!?\n]*\uC785\uB2C8\uB2E4\.?/gu, '')
    .replace(
      /\uC774 \uD750\uB984\uC744 \uBC1B\uCCD0\uC8FC\uB294 \uBC14\uD0D5\uC740[^.!?\n]*\uC785\uB2C8\uB2E4\.?/gu,
      ''
    )
    .replace(
      /\uC9C0\uAE08 \uC0C1\uB300\uC801\uC73C\uB85C \uD798\uC774 \uC2E4\uB9AC\uB294 \uCD95\uC740[^.!?\n]*\uC785\uB2C8\uB2E4\.?/gu,
      ''
    )
    .replace(/\b(?:Push|Measure|List|Compare|Reduce)\b[^.!?\n]*[.!?]?/g, '')
    .replace(/\baction\?+\b/gi, '')
    .replace(/([\uAC00-\uD7A3]+)\?{2,}/gu, '$1')
    .replace(/\?{2,}\s*([\uAC00-\uD7A3]+)/gu, '$1')
    .replace(/([\uAC00-\uD7A3]+)\?+\s*([\uAC00-\uD7A3]+)/gu, '$1 $2')
    .replace(/(커리어|관계|재정|건강)\s+흐름은\s+지금 창이 열려 있고/gi, '$1 흐름은 지금 열려 있고')
    .replace(
      /대운과 세운 흐름이 겹치며\s+([가-힣]+)\s*흐름이 활성화됩니다/gi,
      '대운과 세운 흐름이 겹치며 $1 조짐이 강해집니다'
    )
    .replace(
      /핵심 근거는\s*임관,\s*대운\s*([가-힣A-Za-z]+)입니다/gi,
      '핵심 근거는 임관 흐름과 대운 $1입니다'
    )
    .replace(
      /핵심 근거는\s*횡재,\s*대운\s*([가-힣A-Za-z]+)입니다/gi,
      '핵심 근거는 횡재 흐름과 대운 $1입니다'
    )
    .replace(
      /관계 조정은 먼저 막는 것이 바람직합니다/gi,
      '관계에서는 성급한 충돌을 먼저 막는 편이 바람직합니다'
    )
    .replace(
      /관계 조정은 먼저 막는 편이 맞습니다/gi,
      '관계에서는 성급한 충돌을 먼저 막는 편이 맞습니다'
    )
    .replace(
      /용신 기준으로 과열 영역을 줄이고 보완 루틴을 먼저 (?:설정|배치)하세요/gi,
      '과열되는 지점을 먼저 줄이고 보완 루틴을 앞쪽에 배치하세요'
    )
    .replace(/관계 조정 배우자 아키타입/gi, '배우자 아키타입')
    .replace(/배우자 아키타입\(누구\):/gi, '배우자 아키타입:')
    .replace(/관계 조정 돈이 움직이는 방식을 보면/gi, '돈이 움직이는 방식을 보면')
    .replace(/관계 조정 자산 관리(?:의)?/gi, '자산 관리')
    .replace(/관계 조정 실행 전 확인 절차를/gi, '실행 전 확인 절차를')
    .replace(/관계 조정 확정 전에/gi, '확정 전에')
    .replace(/용신 화 패턴/gi, '용신 화 흐름')
    .replace(/격국 정관 패턴/gi, '격국 정관 흐름')
    .replace(
      /[가-힣A-Za-z]+\s*은\s*[가-힣]+자리\s*\d+하우스에\s*(?:놓여 있습니다|위치해 있습니다)\.?\s*/gu,
      ''
    )
    .replace(
      /[^\n.]{0,80}\d+\u00ED\u2022\u02DC\u00EC\u0161\u00B0\u00EC\u0160\u00A4\u00EC\u2014\u0090[^\n.]{0,80}\.\s*/g,
      ''
    )
    .replace(
      /[^\n.]{0,120}10\u00C3\u00AD\u00E2\u20AC\u00A2\u00CB\u0153\u00C3\u00AC\u00C5\u00A1\u00C2\u00B0\u00C3\u00AC\u00C5\u00A0\u00C2\u00A4\u00C3\u00AC\u00E2\u20AC\u201D\u00C2\u0090[^\n.]{0,120}\.\s*/g,
      ''
    )
    .replace(/,\s*(?=(?:기준|긴장|결정은|실행 전|주의 신호가|핵심 근거는))/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
  const polished = dedupeNarrativeSentences(normalizeUserFacingArtifacts(cleaned))
  return normalizeUserFacingGuidance(polished, /[가-힣]/.test(polished) ? 'ko' : 'en')
}
