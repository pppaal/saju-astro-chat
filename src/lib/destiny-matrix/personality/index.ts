/**
 * 개인화 인격 프로필 — 사주+점성 데이터 → 현대 심리학 framework
 *
 * 모든 함수는 deterministic. 같은 input이면 항상 같은 output.
 */

import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import { estimateMbti } from './personalityProfile'
import {
  estimateBigFive,
  detectCognitiveStyle,
  detectConflictTrigger,
  detectLearningStyle,
} from './personalityFacets'
import type { PersonalityProfile } from './personalityProfile'

export type {
  MbtiAxis,
  MbtiResult,
  BigFiveResult,
  CognitiveStyle,
  ConflictTrigger,
  LearningStyle,
  PersonalityProfile,
} from './personalityProfile'

export {
  estimateMbti,
  estimateBigFive,
  detectCognitiveStyle,
  detectConflictTrigger,
  detectLearningStyle,
}

export {
  adaptAdviceTone,
  adaptAdviceListTone,
  pickToneCategory,
  type ToneCategory,
  type ToneOptions,
} from './toneAdapter'

/**
 * 한 번 호출로 5종 인격 프로필 추출.
 * 리포트 introduction이나 상담사 컨텍스트에 그대로 첨부 가능.
 */
export function buildPersonalityProfile(input: MatrixCalculationInput): PersonalityProfile {
  return {
    mbti: estimateMbti(input),
    bigFive: estimateBigFive(input),
    cognitiveStyle: detectCognitiveStyle(input),
    conflictTrigger: detectConflictTrigger(input),
    learningStyle: detectLearningStyle(input),
  }
}

/**
 * 개인화 프로필 → 한국어 카운슬러 톤 narration (3-5 문장).
 * 리포트 introduction에 prepend하기 좋은 형태.
 */
export function buildPersonalityNarrationKo(input: MatrixCalculationInput): string {
  const p = buildPersonalityProfile(input)
  const lines: string[] = []
  lines.push(`인격 fingerprint로 보면 ${p.mbti.type}형(${p.mbti.summaryKo})에 가깝고, 진단 명확도는 ${p.mbti.confidence}% 정도입니다.`)
  lines.push(p.bigFive.summaryKo)
  // 조사 보정해서 자연스럽게
  const cog = p.cognitiveStyle
  lines.push(
    `인지 스타일은 ${cog.primary}가 주, ${cog.secondary}가 보조로 작동하고, ${cog.optimalEnvironment}에서 가장 잘 풀려요.`
  )
  // 갈등 패턴은 너무 길어지지 않게 핵심만
  const ct = p.conflictTrigger
  lines.push(
    `갈등은 주로 ${ct.triggers.slice(0, 2).join(', ')} 같은 상황에서 일어나고, 반응 패턴은 ${ct.reactionStyle}이라 회복엔 한 박자 거리가 필요해요.`
  )
  lines.push(`학습은 ${p.learningStyle.best} 방식 + "${p.learningStyle.pace}" 페이스가 자연스럽습니다.`)
  return lines.join(' ')
}
