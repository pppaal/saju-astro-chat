import { repairMojibakeText } from '@/lib/text/mojibake'
import { prepareForMatching } from './utils/koreanTextNormalizer'
import { recommendSpreads } from './tarot-recommend'
import {
  buildPath,
  getSpreadOptions,
  type AnalyzeSource,
  type EngineLanguage,
  type EngineSpreadOption,
  type LLMAnalysisPayload,
  type PrimarySelection,
  type QuestionEngineV2FallbackReason,
  type QuestionEngineV2Result,
  type QuestionProfile,
  type QuestionSubject,
  type SpreadOption,
  type StructuredIntent,
  type TarotQuestionIntent,
} from './questionEngineV2Support'
import {
  detectQuestionIntent,
  detectQuestionSubject,
  detectQuestionTimeframe,
  detectQuestionTone,
  getFocusLabel,
  getIntentLabel,
  getSubjectLabel,
  getTimeframeLabel,
  getToneLabel,
  hasRelationshipSignal,
  hasStrongFlowSignal,
  hasStrongOtherSubjectSignal,
  hasStrongTimingSignal,
  isCareerQuestion,
  isHealthQuestion,
  isMoneyQuestion,
  normalizeQuestionType,
  normalizeSubject,
  normalizeTimeframe,
  normalizeTone,
} from './questionEngineV2Heuristics'

export function expandColloquialQuestionVariants(question: string): string[] {
  const trimmed = question.trim()
  if (!trimmed) return []

  const rewritten = trimmed
    .replace(/[걔얘쟤]/g, '그 사람')
    .replace(/엑스/g, '전 연인')
    .replace(/남친/g, '남자친구')
    .replace(/여친/g, '여자친구')
    .replace(/언팔/g, '언팔로우')
    .replace(/프필|프사/g, '프로필')
    .replace(/\bdm\b/gi, '메시지')
    .replace(/디엠/g, '메시지')
    .replace(/속맘/g, '속마음')
    .replace(/\b맘\b/g, '마음')
    .replace(/어때|어땐|어떤/g, '어때')
    .replace(/어케|어캐|어떡해|우째/g, '어떻게')
    .replace(/머임|뭐임/g, '뭐야')
    .replace(/맞냐/g, '맞아')
    .replace(/있냐/g, '있어')
    .replace(/되냐/g, '될까')
    .replace(/됨\?/g, '될까?')
    .replace(/됨$/g, '될까')
    .replace(/재회각/g, '재회 가능성')
    .replace(/이직각/g, '이직')
    .replace(/퇴사각/g, '퇴사')
    .replace(/연락각/g, '연락 가능성')
    .replace(/올각/g, '올 가능성')
    .replace(/연락해오냐/g, '연락해 올까')
    .replace(/연락오냐/g, '연락 올까')
    .replace(/읽씹/g, '읽고 답장하지 않음')
    .replace(/안읽씹/g, '읽지 않고 답장하지 않음')
    .replace(/차였/g, '헤어졌')
    .replace(/연락옴/g, '연락 올까')
    .replace(/애프터 옴/g, '애프터 올까')
    .replace(/연락함/g, '연락할까')
    .replace(/다시옴/g, '다시 올까')
    .replace(/좋아함/g, '좋아해')
    .replace(/생각함/g, '생각해')
    .replace(/맘정리함/g, '마음 정리했어')
    .replace(/미련 남음/g, '미련 남아')
    .replace(/마음 있냐/g, '마음 있어')
    .replace(/볼수있음/g, '볼 수 있을까')
    .replace(/만날수있나/g, '만날 수 있을까')
    .replace(/붙냐/g, '붙을까')
    .replace(/망함/g, '망할까')
    .replace(/잘풀림/g, '잘 풀릴까')
    .replace(/풀림\?/g, '풀릴까?')
    .replace(/집사도/g, '집 사도')
    .replace(/연락 박으면/g, '연락하면')
    .replace(/들이대면/g, '다가가면')
    .replace(/찾아가면/g, '내가 찾아가면')
    .replace(/어케됨|어떻게됨/g, '반응 어떨까')
    .replace(/의식함/g, '의식해')
    .replace(/보냐/g, '볼까')
    .replace(/체크하냐/g, '볼까')
    .replace(/말 걸까/g, '먼저 말할까')
    .replace(/염탐하냐/g, '몰래 볼까')
    .replace(/신경쓰나/g, '신경쓸까')
    .replace(/당하는중임/g, '당하는 중일까')
    .replace(/썸붕/g, '썸이 끝난 상태')
    .replace(/맞팔/g, '맞팔로우')
    .replace(/찍은사람/g, '관심 있는 사람')
    .replace(/찍었을까/g, '관심 있어할까')
    .replace(/관심있는애/g, '관심 있는 사람')
    .replace(/간보는건가/g, '간보는 걸까')
    .replace(/재고있는건가/g, '재고 있는 걸까')
    .replace(/어장관리하는거 맞음|어장인가/g, '어장관리하는 걸까')
    .replace(/김치국마시는건가/g, '혼자 착각하는 걸까')
    .replace(/기다리면 됨/g, '기다리면 될까')
    .replace(/다녀도됨/g, '다녀도 될까')
    .replace(/해도됨/g, '해도 될까')
    .replace(/차단풀면/g, '차단 풀리면')
    .replace(/들어옴/g, '들어올까')
    .replace(/옴\?/g, '올까?')
    .replace(/옴$/g, '올까')
    .replace(/함\?/g, '할까?')
    .replace(/함$/g, '할까')
    .replace(/됨/g, '됨')

  const variants = new Set<string>()
  if (rewritten !== trimmed) variants.add(rewritten)

  const compact = rewritten.replace(/\s+/g, ' ').trim()
  if (/속마음|마음|감정/.test(compact) && !/(어때|어떨까|뭐야|무엇|생각|좋아하|식은|있어)/.test(compact)) {
    variants.add(`${compact}은 어떨까?`)
  }
  if (/재회/.test(compact) && !/(가능성|올까|다시|있어|있을까)/.test(compact)) {
    variants.add(`${compact} 가능성 있을까?`)
  }
  if (/연락/.test(compact) && !/(올까|할까|답장|확률|가능성|언제)/.test(compact)) {
    variants.add(`${compact} 올까?`)
  }
  if (/(분위기|결과|흐름|방향)/.test(compact) && !/(어때|어떨까|궁금|맞아|될까|어떻게)/.test(compact)) {
    variants.add(`${compact} 어때?`)
  }
  if (/(뭐야|맞아|있어|될까)$/.test(compact) && !/[?？]$/.test(compact)) {
    variants.add(`${compact}?`)
  }

  return Array.from(variants)
}

export function buildQuestionVariants(question: string): string[] {
  const seedQuestions = [question.trim(), ...expandColloquialQuestionVariants(question)].filter(Boolean)
  const variants = seedQuestions
    .flatMap((entry) => prepareForMatching(entry))
    .map((entry) => entry.trim())
    .filter(Boolean)
  return Array.from(new Set(seedQuestions.concat(variants))).slice(0, 10)
}

export function buildHeuristicIntent(questionVariants: string[], language: EngineLanguage): StructuredIntent {
  let questionType = detectQuestionIntent(questionVariants)
  const baseSubject = detectQuestionSubject(questionVariants, questionType)
  const joined = questionVariants.join(' ').toLowerCase()
  let subject: QuestionSubject = baseSubject

  if (hasRelationshipSignal(questionVariants)) subject = 'relationship'
  else if (isHealthQuestion(joined)) subject = 'self'
  else if (isCareerQuestion(joined) || isMoneyQuestion(joined)) subject = 'external_situation'
  else if (questionType === 'unknown' && baseSubject === 'overall_flow') {
    if (/(관계|연애|결혼|썸|소개팅|relationship|dating|marriage)/.test(joined)) subject = 'relationship'
    else if (isHealthQuestion(joined)) subject = 'self'
    else if (isCareerQuestion(joined) || isMoneyQuestion(joined)) subject = 'external_situation'
  }

  if (
    questionType === 'unknown' &&
    subject === 'relationship' &&
    /((눈|인상).*(어때|어떤|어떨)|보여|어케 보여|어떻게 보여|어떻게 봐|어떤 사람)/.test(
      joined
    )
  ) {
    questionType = 'inner_feelings'
  }

  if (
    (questionType === 'unknown' || questionType === 'self_decision') &&
    subject === 'relationship' &&
    /(반응|답장|읽씹|읽고 답장하지 않음|연락.*하면|먼저.*연락|사과하면)/.test(joined) &&
    /(내가|먼저)/.test(joined)
  ) {
    questionType = 'other_person_response'
  }

  return {
    questionType,
    subject,
    focus: getFocusLabel(questionType, language),
    timeframe: detectQuestionTimeframe(questionVariants),
    tone: detectQuestionTone(questionType, questionVariants),
  }
}

export function repairIntentAnalysis(
  questionVariants: string[],
  baseIntent: StructuredIntent,
  analysis: LLMAnalysisPayload,
  language: EngineLanguage
): StructuredIntent {
  const next: StructuredIntent = {
    questionType: normalizeQuestionType(analysis.questionType, baseIntent.questionType),
    subject: normalizeSubject(analysis.subject, baseIntent.subject),
    focus: analysis.focus?.trim() || baseIntent.focus,
    timeframe: normalizeTimeframe(analysis.timeframe, baseIntent.timeframe),
    tone: normalizeTone(analysis.tone, baseIntent.tone),
  }

  if (hasStrongOtherSubjectSignal(questionVariants) && next.subject === 'self') {
    next.subject = next.questionType === 'reconciliation' || next.questionType === 'inner_feelings' ? 'relationship' : 'other_person'
  }
  if (baseIntent.subject === 'relationship' && (next.subject === 'self' || next.subject === 'overall_flow')) {
    next.subject = 'relationship'
  }
  if (hasStrongFlowSignal(questionVariants)) {
    next.timeframe = 'current_phase'
    next.tone = 'flow'
    if (!analysis.focus || analysis.focus === 'unknown') next.focus = getFocusLabel(next.questionType, language)
  }
  if (hasStrongTimingSignal(questionVariants)) {
    next.timeframe = next.timeframe === 'open' ? 'near_term' : next.timeframe
    if (next.tone === 'flow') next.tone = 'prediction'
  }
  if (next.questionType === 'meeting_likelihood' && next.subject !== 'other_person' && next.subject !== 'relationship') {
    next.subject = 'other_person'
  }
  if (next.questionType === 'unknown' && next.tone === 'prediction' && hasStrongFlowSignal(questionVariants)) {
    next.tone = 'flow'
  }
  return next
}

export function buildQuestionProfile(intent: StructuredIntent, language: EngineLanguage): QuestionProfile {
  return {
    type: { code: intent.questionType, label: getIntentLabel(intent.questionType, language) },
    subject: { code: intent.subject, label: getSubjectLabel(intent.subject, language) },
    focus: { code: intent.focus, label: intent.focus },
    timeframe: { code: intent.timeframe, label: getTimeframeLabel(intent.timeframe, language) },
    tone: { code: intent.tone, label: getToneLabel(intent.tone, language) },
  }
}

export function buildQuestionSummary(intent: StructuredIntent, language: EngineLanguage) {
  if (language === 'ko') {
    const summaryByIntent: Record<TarotQuestionIntent, string> = {
      self_decision: '먼저 내 선택 기준을 정리한 뒤 행동 방향을 보는 질문입니다.',
      other_person_response: '상대가 어떻게 반응할지 읽는 질문입니다.',
      meeting_likelihood: '가까운 시점의 연락이나 만남 가능성을 보는 질문입니다.',
      near_term_outcome: '당장 이어질 결과와 전개를 확인하는 질문입니다.',
      timing: '결과보다 적절한 시기와 타이밍을 확인하는 질문입니다.',
      reconciliation: '관계 회복 가능성과 조건을 확인하는 질문입니다.',
      inner_feelings: '겉으로 보이지 않는 상대의 내면을 읽는 질문입니다.',
      unknown: '지금 질문은 전체 흐름과 핵심 포인트를 먼저 읽는 편이 맞습니다.',
    }
    return summaryByIntent[intent.questionType]
  }
  const summaryByIntent: Record<TarotQuestionIntent, string> = {
    self_decision: 'This question is best answered by clarifying your decision criteria first.',
    other_person_response: "This question is mainly about the other person's likely response.",
    meeting_likelihood: 'This question is about near-term contact or meeting probability.',
    near_term_outcome: 'This question is best answered by tracking the next outcome and direction.',
    timing: 'This question is mainly about timing rather than a simple yes or no.',
    reconciliation: 'This question is about reconciliation and the conditions around it.',
    inner_feelings: 'This question is about reading hidden feelings beneath the surface.',
    unknown: 'This question is better treated as an overall flow reading first.',
  }
  return summaryByIntent[intent.questionType]
}

export function buildHeuristicDirectAnswer(intent: StructuredIntent, questionVariants: string[], language: EngineLanguage) {
  const joined = questionVariants.join(' ').toLowerCase()
  const isTomorrow = /(내일|tomorrow)/.test(joined)
  if (language === 'ko') {
    const answers: Record<TarotQuestionIntent, string> = {
      self_decision: '지금은 바로 결정하기보다 기준을 먼저 정리한 뒤 움직이는 편이 좋아 보여요.',
      other_person_response: '상대 반응은 즉각적이기보다 한 템포 늦게 드러날 가능성에 무게가 있어 보여요.',
      meeting_likelihood: isTomorrow ? '내일 바로 성사 쪽보다는 간격과 변수 확인이 먼저라서, 기대를 낮추고 가볍게 접근하는 편이 좋아 보여요.' : '연락이나 만남은 열려 있지만, 바로 확정된다고 보기보다 천천히 반응을 보는 편이 좋아 보여요.',
      near_term_outcome: '단기 결과는 열려 있지만, 확정적으로 밀기보다 변수 점검이 먼저입니다.',
      timing: '지금은 결과보다 타이밍을 보는 질문이라서, 서두르기보다 시기를 기다리는 편이 맞아 보여요.',
      reconciliation: '지금은 바로 재회를 단정하기보다 관계를 다시 여는 조건부터 보는 편이 맞아 보여요.',
      inner_feelings: '겉으로는 조심스러워 보여도, 내면에서는 신경 쓰는 흐름이 남아 있을 가능성이 있습니다.',
      unknown: '지금 전체 흐름은 확장보다 정리와 기준 재정비가 먼저인 전환기로 읽히는 편입니다.',
    }
    return answers[intent.questionType]
  }
  const answers: Record<TarotQuestionIntent, string> = {
    self_decision: 'It looks better to clarify your standards first rather than forcing a quick decision.',
    other_person_response: "The other person's response looks more delayed than immediate right now.",
    meeting_likelihood: isTomorrow ? 'A meeting tomorrow does not look strongly fixed yet, so a lighter approach is better than high expectations.' : 'Contact or a meeting is possible, but it looks better to watch the response slowly than expect a fast confirmation.',
    near_term_outcome: 'The near-term outcome is open, but checking the variables first is better than forcing certainty.',
    timing: 'This looks more like a timing question, so waiting for the right moment makes more sense than rushing.',
    reconciliation: 'It looks better to read the conditions for reopening the connection before assuming reconciliation.',
    inner_feelings: 'Even if the surface looks cautious, there may still be attention and feeling underneath.',
    unknown: 'The overall flow looks more like a transition phase focused on reordering and resetting your direction.',
  }
  return answers[intent.questionType]
}

export function findSpread(themeId: string, spreadId: string, spreadOptions = getSpreadOptions()) {
  return spreadOptions.find((item) => item.themeId === themeId && item.id === spreadId)
}

export function resolveDeterministicSpread(
  question: string,
  language: EngineLanguage,
  spreadOptions: SpreadOption[],
  questionVariants: string[],
  intent: StructuredIntent
): PrimarySelection {
  const normalizedQuestion = repairMojibakeText(question)
  const stableCandidates: Array<{ themeId: string; spreadId: string }> = []
  if (
    /((눈|인상).*(어때|어떤|어떨)|나를.*어떻게|어떻게.*봐|어케.*봐|어때 보여|어떤 사람)/i.test(
      normalizedQuestion
    )
  ) {
    stableCandidates.push({ themeId: 'love-relationships', spreadId: 'crush-feelings' })
  }
  if (intent.questionType === 'timing') stableCandidates.push({ themeId: 'decisions-crossroads', spreadId: 'timing-window' })
  if (intent.questionType === 'meeting_likelihood') stableCandidates.push({ themeId: 'decisions-crossroads', spreadId: 'yes-no-why' })
  if (intent.questionType === 'reconciliation') stableCandidates.push({ themeId: 'love-relationships', spreadId: 'reconciliation' })
  if (intent.questionType === 'inner_feelings' || intent.questionType === 'other_person_response') stableCandidates.push({ themeId: 'love-relationships', spreadId: 'crush-feelings' })
  if (intent.subject === 'relationship' && intent.questionType === 'near_term_outcome') stableCandidates.push({ themeId: 'love-relationships', spreadId: 'relationship-cross' })
  if (intent.subject === 'relationship' && intent.tone === 'emotion') stableCandidates.push({ themeId: 'love-relationships', spreadId: 'relationship-check-in' })
  if (intent.subject === 'relationship') stableCandidates.push({ themeId: 'love-relationships', spreadId: 'relationship-check-in' })
  if ((intent.tone === 'flow' || intent.questionType === 'unknown') && /(누가\s*내게\s*올까|내게\s*누가\s*들어올까|새\s*사람\s*들어올까|인연)/i.test(normalizedQuestion)) stableCandidates.push({ themeId: 'love-relationships', spreadId: 'relationship-check-in' })
  if ((intent.tone === 'flow' || intent.questionType === 'unknown') && isCareerQuestion(normalizedQuestion)) stableCandidates.push({ themeId: 'career-work', spreadId: 'career-path' })
  if ((intent.tone === 'flow' || intent.questionType === 'unknown') && isMoneyQuestion(normalizedQuestion)) {
    stableCandidates.push({ themeId: 'money-finance', spreadId: 'financial-snapshot' })
    stableCandidates.push({ themeId: 'money-finance', spreadId: 'abundance-path' })
  }
  if ((intent.tone === 'flow' || intent.questionType === 'unknown') && isHealthQuestion(normalizedQuestion)) {
    stableCandidates.push({ themeId: 'well-being-health', spreadId: 'mind-body-scan' })
    stableCandidates.push({ themeId: 'well-being-health', spreadId: 'healing-path' })
  }
  if (intent.tone === 'flow' || intent.timeframe === 'current_phase') stableCandidates.push({ themeId: 'general-insight', spreadId: 'past-present-future' })
  if (intent.subject === 'external_situation' && /(직장|이직|옮기|퇴사|job change|quit)/i.test(normalizedQuestion)) stableCandidates.push({ themeId: 'career-work', spreadId: 'job-change' })
  if (intent.questionType === 'self_decision') {
    stableCandidates.push({ themeId: 'decisions-crossroads', spreadId: 'yes-no-why' })
    stableCandidates.push({ themeId: 'decisions-crossroads', spreadId: 'two-paths' })
  }
  if (intent.subject === 'external_situation' && intent.questionType === 'near_term_outcome' && isMoneyQuestion(normalizedQuestion)) stableCandidates.push({ themeId: 'money-finance', spreadId: 'financial-snapshot' })
  if (intent.subject === 'external_situation' && intent.questionType === 'near_term_outcome' && /(회의|미팅|프로젝트|계약|사업|투자|발표|프레젠테이션|meeting|project|contract|business|presentation)/i.test(normalizedQuestion)) stableCandidates.push({ themeId: 'general-insight', spreadId: 'past-present-future' })
  if (intent.subject === 'external_situation' && /(면접|interview)/i.test(normalizedQuestion)) stableCandidates.push({ themeId: 'career-work', spreadId: 'interview-result' })
  if (intent.subject === 'external_situation' && /(시험|합격|exam)/i.test(normalizedQuestion)) stableCandidates.push({ themeId: 'career-work', spreadId: 'exam-pass' })

  for (const candidate of stableCandidates) {
    const spread = findSpread(candidate.themeId, candidate.spreadId, spreadOptions)
    if (spread) {
      return {
        themeId: spread.themeId,
        spreadId: spread.id,
        reason: language === 'ko' ? '질문 의도와 가장 가까운 안정적인 스프레드로 연결했어요.' : 'Routed to the most stable spread for this intent.',
        userFriendlyExplanation:
          language === 'ko'
            ? intent.tone === 'flow'
              ? '이 질문은 단순 예측보다 현재 국면과 흐름을 먼저 읽는 편이 맞습니다.'
              : intent.subject === 'other_person'
                ? '내 선택보다 상대의 반응과 움직임을 읽는 쪽이 핵심인 질문입니다.'
                : intent.tone === 'emotion'
                  ? '사실 확인보다 감정선과 내면 상태를 읽는 방식이 더 잘 맞는 질문입니다.'
                  : '질문의 핵심 의도를 먼저 정리한 뒤 그에 맞는 스프레드로 들어가는 편이 안정적입니다.'
            : 'Routed to the most stable spread for this intent.',
      }
    }
  }

  const candidates = Array.from(new Set([question, ...questionVariants].map((q) => q.trim()))).filter(Boolean)
  const ranked = candidates.flatMap((q) => recommendSpreads(q, 3).map((rec) => ({ ...rec, sourceQuestion: q })))
  const sorted = ranked.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
    const aIsDefault = a.themeId === 'general-insight' && a.spreadId === 'past-present-future'
    const bIsDefault = b.themeId === 'general-insight' && b.spreadId === 'past-present-future'
    if (aIsDefault !== bIsDefault) return aIsDefault ? 1 : -1
    return 0
  })
  if (sorted.length > 0) {
    const top = sorted[0]
    return {
      themeId: top.themeId,
      spreadId: top.spreadId,
      reason: language === 'ko' ? top.reasonKo || top.reason : top.reason,
      userFriendlyExplanation: language === 'ko' ? '질문과 가장 가까운 스프레드로 먼저 연결했어요.' : 'Routed first to the closest spread for your question.',
    }
  }

  const defaultSpread = findSpread('general-insight', 'quick-reading', spreadOptions) || spreadOptions[0]
  return {
    themeId: defaultSpread?.themeId || 'general-insight',
    spreadId: defaultSpread?.id || 'quick-reading',
    reason: language === 'ko' ? '기본 스프레드 추천' : 'Default spread recommendation',
    userFriendlyExplanation: language === 'ko' ? '질문을 해석할 수 있는 기본 스프레드로 연결했어요.' : 'Routed to a default spread that can interpret your question.',
  }
}

export function chooseResolvedIntent(heuristicIntent: StructuredIntent, llmIntent: StructuredIntent): StructuredIntent {
  if (heuristicIntent.questionType !== 'unknown' && llmIntent.questionType === 'unknown') return heuristicIntent
  if (heuristicIntent.questionType === 'unknown' && heuristicIntent.tone === 'flow' && heuristicIntent.subject === 'relationship' && (llmIntent.questionType === 'other_person_response' || llmIntent.questionType === 'meeting_likelihood' || llmIntent.questionType === 'inner_feelings')) return heuristicIntent
  if (heuristicIntent.questionType === 'self_decision' && llmIntent.questionType === 'near_term_outcome') return heuristicIntent
  if (heuristicIntent.questionType === 'timing' && llmIntent.questionType === 'near_term_outcome') return heuristicIntent
  if (heuristicIntent.questionType === 'inner_feelings' && llmIntent.questionType === 'other_person_response') return heuristicIntent
  if (heuristicIntent.subject === 'external_situation' && heuristicIntent.questionType === 'near_term_outcome' && (llmIntent.questionType === 'meeting_likelihood' || llmIntent.questionType === 'other_person_response')) return heuristicIntent
  if (heuristicIntent.subject === 'relationship' && heuristicIntent.questionType === 'near_term_outcome' && (llmIntent.questionType === 'reconciliation' || llmIntent.questionType === 'other_person_response')) return heuristicIntent
  if (heuristicIntent.questionType === 'reconciliation' && (llmIntent.questionType === 'unknown' || llmIntent.questionType === 'near_term_outcome' || llmIntent.questionType === 'other_person_response')) return heuristicIntent
  if (heuristicIntent.questionType === 'other_person_response' && llmIntent.questionType === 'self_decision') return heuristicIntent
  if (heuristicIntent.subject === 'relationship' && heuristicIntent.questionType === 'near_term_outcome' && llmIntent.questionType === 'self_decision') return heuristicIntent
  return llmIntent
}


export function buildRecommendedSpreads(
  question: string,
  language: EngineLanguage,
  primary: { themeId: string; spreadId: string; reason: string },
  spreadOptions: SpreadOption[]
): EngineSpreadOption[] {
  const recommendations: EngineSpreadOption[] = []
  const seen = new Set<string>()

  const addSpread = (
    themeId: string,
    spreadId: string,
    reason: string,
    recommended: boolean,
    matchScore: number | null
  ) => {
    const key = `${themeId}:${spreadId}`
    if (seen.has(key)) return
    const spread = findSpread(themeId, spreadId, spreadOptions)
    if (!spread) return
    recommendations.push({
      themeId,
      themeTitle: language === 'ko' ? spread.themeTitleKo : spread.themeTitle,
      spreadId,
      spreadTitle: spread.titleKo || spread.title,
      cardCount: spread.cardCount,
      reason,
      matchScore,
      path: buildPath(themeId, spreadId, question),
      recommended,
    })
    seen.add(key)
  }

  addSpread(primary.themeId, primary.spreadId, primary.reason, true, null)

  const external = recommendSpreads(question, 3)
  for (const rec of external) {
    addSpread(
      rec.themeId,
      rec.spreadId,
      language === 'ko' ? rec.reasonKo || rec.reason : rec.reason,
      false,
      rec.matchScore
    )
  }

  addSpread(
    'general-insight',
    'quick-reading',
    language === 'ko'
      ? '질문이 흔들려도 핵심을 먼저 읽기 좋은 기본 진입점입니다.'
      : 'A stable starting point when the question is noisy.',
    false,
    null
  )
  addSpread(
    'general-insight',
    'past-present-future',
    language === 'ko'
      ? '질문의 흐름을 시간축으로 정리하기 좋습니다.'
      : 'Useful for reading the flow across time.',
    false,
    null
  )

  return recommendations.slice(0, 3)
}
function isGenericSpread(themeId: string, spreadId: string) {
  return (
    (themeId === 'general-insight' && (spreadId === 'past-present-future' || spreadId === 'quick-reading')) ||
    (themeId === 'daily-reading' && spreadId === 'weekly-forecast')
  )
}

export function shouldPreferHeuristicSpread(
  heuristicIntent: StructuredIntent,
  resolvedIntent: StructuredIntent,
  heuristicSpread: SpreadOption,
  llmSpread: SpreadOption
) {
  if (heuristicIntent.questionType === 'unknown' && !(heuristicIntent.tone === 'flow' && heuristicIntent.subject === 'relationship' && heuristicSpread.id === 'relationship-check-in')) return false
  if (llmSpread.themeId === 'self-discovery' && heuristicIntent.subject === 'relationship') return true
  if (heuristicSpread.themeId === 'love-relationships' && heuristicIntent.subject === 'relationship' && llmSpread.themeId !== 'love-relationships') return true
  if (heuristicSpread.themeId === 'decisions-crossroads' && heuristicIntent.questionType === 'self_decision' && llmSpread.themeId !== 'decisions-crossroads') return true
  if (heuristicSpread.themeId === 'decisions-crossroads' && heuristicIntent.questionType === 'meeting_likelihood' && llmSpread.themeId !== 'decisions-crossroads') return true
  if (heuristicIntent.questionType === 'other_person_response' && heuristicSpread.id === 'crush-feelings' && llmSpread.themeId === 'decisions-crossroads') return true
  if (heuristicIntent.subject === 'relationship' && heuristicIntent.questionType === 'near_term_outcome' && heuristicSpread.id === 'relationship-cross' && llmSpread.themeId === 'decisions-crossroads') return true
  if (heuristicIntent.questionType === 'unknown' && heuristicIntent.tone === 'flow' && heuristicIntent.subject === 'relationship' && heuristicSpread.id === 'relationship-check-in' && llmSpread.id !== 'relationship-check-in') return true
  if (heuristicIntent.subject === 'external_situation' && heuristicIntent.questionType === 'near_term_outcome' && heuristicSpread.themeId === 'general-insight' && llmSpread.themeId === 'daily-reading') return true
  if (resolvedIntent.questionType !== 'unknown' && isGenericSpread(llmSpread.themeId, llmSpread.id) && !isGenericSpread(heuristicSpread.themeId, heuristicSpread.id)) return true
  if (resolvedIntent.questionType === 'timing' && heuristicSpread.id === 'timing-window' && llmSpread.id !== 'timing-window') return true
  if (resolvedIntent.questionType === 'reconciliation' && heuristicSpread.id === 'reconciliation' && llmSpread.id !== 'reconciliation') return true
  if ((resolvedIntent.questionType === 'meeting_likelihood' || resolvedIntent.questionType === 'other_person_response' || resolvedIntent.questionType === 'inner_feelings' || resolvedIntent.questionType === 'self_decision') && isGenericSpread(llmSpread.themeId, llmSpread.id) && !isGenericSpread(heuristicSpread.themeId, heuristicSpread.id)) return true
  return false
}

export function classifyOpenAIFailure(error: unknown): QuestionEngineV2FallbackReason {
  if (error instanceof Error && /OPENAI_API_KEY_MISSING/.test(error.message)) return 'auth_failed'
  if (error instanceof SyntaxError) return 'parse_failed'
  return 'server_error'
}

export function buildResult(args: {
  question: string
  language: EngineLanguage
  intent: StructuredIntent
  primarySpread: SpreadOption
  reason: string
  userFriendlyExplanation: string
  directAnswer: string
  source: AnalyzeSource
  fallbackReason: QuestionEngineV2FallbackReason | null
  message?: string
  isDangerous?: boolean
  recommended_spreads?: EngineSpreadOption[]
}): QuestionEngineV2Result {
  const questionProfile = buildQuestionProfile(args.intent, args.language)
  const shouldPromoteToBroadFlow =
    args.intent.questionType === 'unknown' &&
    (args.intent.tone === 'flow' || args.intent.subject === 'overall_flow' || args.intent.subject === 'relationship' || args.intent.subject === 'external_situation')
  const outputIntent =
    shouldPromoteToBroadFlow &&
    (args.primarySpread.id === 'crush-feelings' ||
      /(눈에.*내가|나를.*어떻게|어떤 사람|어때 보)/.test(args.question))
      ? 'inner_feelings'
      : shouldPromoteToBroadFlow
        ? 'broad_flow'
        : args.intent.questionType
  const outputIntentLabel =
    outputIntent === 'broad_flow'
      ? args.language === 'ko'
        ? '큰 흐름과 전체 국면을 보는 질문'
        : 'A question about the bigger flow and overall context'
      : questionProfile.type.label
  const outputQuestionProfile =
    outputIntent === 'broad_flow'
      ? { ...questionProfile, type: { code: 'broad_flow', label: outputIntentLabel } }
      : questionProfile

  const recommended =
    args.recommended_spreads ||
    buildRecommendedSpreads(
      args.question,
      args.language,
      { themeId: args.primarySpread.themeId, spreadId: args.primarySpread.id, reason: args.reason },
      getSpreadOptions()
    )

  return {
    isDangerous: Boolean(args.isDangerous),
    message: args.message,
    themeId: args.primarySpread.themeId,
    spreadId: args.primarySpread.id,
    spreadTitle: args.primarySpread.titleKo || args.primarySpread.title,
    cardCount: args.primarySpread.cardCount,
    userFriendlyExplanation: args.userFriendlyExplanation,
    question_summary: buildQuestionSummary(args.intent, args.language),
    question_profile: outputQuestionProfile,
    direct_answer: args.directAnswer,
    intent: outputIntent,
    intent_label: outputIntentLabel,
    recommended_spreads: recommended,
    path: buildPath(args.primarySpread.themeId, args.primarySpread.id, args.question),
    source: args.source,
    fallback_reason: args.fallbackReason,
  }
}

