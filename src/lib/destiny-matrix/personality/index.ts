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

// MBTI 가운데 두 글자(NT/NF/ST/SF) × 일간 element → 사주↔심리 cross 한 줄
const SAJU_PERSONALITY_BRIDGE_KO: Record<string, Record<string, string>> = {
  목: {
    NT: '계획·전략(N+T) + 자라남(목)이 만나서 비전이 시간을 두고 자라는 결',
    NF: '직관·공감(N+F) + 자라남(목)이 만나서 사람을 키우며 자기도 함께 자라는 결',
    ST: '실행·논리(S+T) + 자라남(목)이 만나서 단계별로 차곡차곡 쌓아 올리는 결',
    SF: '돌봄·실용(S+F) + 자라남(목)이 만나서 가까운 관계를 천천히 키우는 결',
  },
  화: {
    NT: '비전·분석(N+T) + 표현(화)이 만나서 아이디어를 바로 무대에 올리는 결',
    NF: '직관·공감(N+F) + 표현(화)이 만나서 가치를 사람들에게 옮겨가는 결',
    ST: '실행·논리(S+T) + 표현(화)이 만나서 결과를 빠르게 보여주는 결',
    SF: '돌봄·실용(S+F) + 표현(화)이 만나서 따뜻함을 행동으로 보여주는 결',
  },
  토: {
    NT: '체계·전략(N+T) + 안정(토)이 만나서 묵직한 구조를 오래 운영하는 결',
    NF: '돌봄·통합(N+F) + 안정(토)이 만나서 사람을 받쳐주는 기반이 되는 결',
    ST: '실행·논리(S+T) + 안정(토)이 만나서 약속을 끝까지 지키는 결',
    SF: '돌봄·실용(S+F) + 안정(토)이 만나서 깊은 신뢰를 천천히 쌓는 결',
  },
  금: {
    NT: '분석·전략(N+T) + 절제(금)가 만나서 결정에 들어갈수록 정교해지는 결',
    NF: '직관·통합(N+F) + 절제(금)가 만나서 깊이 있는 통찰을 신중하게 풀어내는 결',
    ST: '실행·논리(S+T) + 절제(금)가 만나서 군더더기 없이 마무리하는 결',
    SF: '돌봄·실용(S+F) + 절제(금)가 만나서 거리를 두고 정확히 챙기는 결',
  },
  수: {
    NT: '통찰·전략(N+T) + 흐름(수)이 만나서 큰 그림이 끊임없이 새로 짜이는 결',
    NF: '직관·공감(N+F) + 흐름(수)이 만나서 정서가 깊고 풍부하게 흐르는 결',
    ST: '실행·논리(S+T) + 흐름(수)이 만나서 변화에 부드럽게 적응하는 결',
    SF: '돌봄·공감(S+F) + 흐름(수)이 만나서 정서적 파트너십이 깊어지는 결',
  },
}

const ELEMENT_KO_FROM_RAW: Record<string, string> = {
  wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
  목: '목', 화: '화', 토: '토', 금: '금', 수: '수',
}

/**
 * 개인화 프로필 → 한국어 카운슬러 톤 narration (3-5 문장).
 * 리포트 introduction에 prepend하기 좋은 형태.
 */
export function buildPersonalityNarrationKo(input: MatrixCalculationInput): string {
  const p = buildPersonalityProfile(input)
  const lines: string[] = []
  const koJongsung = (s: string): boolean => {
    if (!s) return false
    const last = s.charCodeAt(s.length - 1)
    if (last < 0xac00 || last > 0xd7a3) return false
    return (last - 0xac00) % 28 !== 0
  }
  const ig = (s: string) => (koJongsung(s) ? '이' : '가')

  lines.push(`인격 fingerprint로 보면 ${p.mbti.type}형(${p.mbti.summaryKo})에 가깝고, 진단 명확도는 ${p.mbti.confidence}% 정도예요.`)
  // (NEW) MBTI 가운데 2자(NT/NF/ST/SF) + 사주 일간 element cross 한 줄
  const dayMasterEl = (input as { dayMasterElement?: string }).dayMasterElement
  const elKo = dayMasterEl ? ELEMENT_KO_FROM_RAW[dayMasterEl] : undefined
  const mbtiMid = p.mbti.type ? p.mbti.type.slice(1, 3) : ''
  if (elKo && mbtiMid && SAJU_PERSONALITY_BRIDGE_KO[elKo]?.[mbtiMid]) {
    lines.push(`사주 일간(${elKo})과 합쳐서 보면, ${SAJU_PERSONALITY_BRIDGE_KO[elKo][mbtiMid]}이에요.`)
  }
  lines.push(p.bigFive.summaryKo)
  const cog = p.cognitiveStyle
  lines.push(
    `인지 스타일은 ${cog.primary}${ig(cog.primary)} 주, ${cog.secondary}${ig(cog.secondary)} 보조로 작동하고, ${cog.optimalEnvironment}에서 가장 잘 풀려요.`
  )
  const ct = p.conflictTrigger
  lines.push(
    `갈등은 주로 ${ct.triggers.slice(0, 2).join(', ')} 같은 상황에서 일어나고, 반응 패턴은 ${ct.reactionStyle}이라 회복엔 한 박자 거리가 필요해요.`
  )
  lines.push(`학습은 ${p.learningStyle.best} 방식 + "${p.learningStyle.pace}" 페이스가 자연스러워요.`)
  return lines.join(' ')
}
