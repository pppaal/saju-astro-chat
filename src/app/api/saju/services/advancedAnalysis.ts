// src/app/api/saju/services/advancedAnalysis.ts
// 고급 분석 실행 함수들

import { logger } from '@/lib/logger'
import { determineGeokgukAdvanced, getGeokgukDescription } from '@/lib/saju/geokguk'
import {
  determineYongsin,
  getYongsinDescription,
  getLuckyColors,
  getLuckyDirection,
  getLuckyNumbers,
} from '@/lib/saju/yongsin'
import { analyzeHyeongchung } from '@/lib/saju/hyeongchung'
import { calculateTonggeun, calculateDeukryeong } from '@/lib/saju/tonggeun'
import { analyzeSibsinComprehensive } from '@/lib/saju/sibsinAnalysis'

export interface SimplePillars {
  year: { stem: string; branch: string }
  month: { stem: string; branch: string }
  day: { stem: string; branch: string }
  time: { stem: string; branch: string }
  hour: { stem: string; branch: string }
}

export interface PillarsWithHour {
  year: { stem: string; branch: string }
  month: { stem: string; branch: string }
  day: { stem: string; branch: string }
  hour: { stem: string; branch: string }
}

export interface AdvancedAnalysisResult {
  geokguk: (ReturnType<typeof determineGeokgukAdvanced> & { description: string }) | null
  yongsin:
    | (ReturnType<typeof determineYongsin> & {
        description: string
        luckyColors: string[]
        luckyDirection: string
        luckyNumbers: number[]
      })
    | null
  hyeongchung: ReturnType<typeof analyzeHyeongchung> | null
  tonggeun: ReturnType<typeof calculateTonggeun> | null
  deukryeong: ReturnType<typeof calculateDeukryeong> | null
  sibsin: ReturnType<typeof analyzeSibsinComprehensive> | null
  // 옛 johuYongsin/interpretations — 해석/텍스트라 raw 응답에서 제거(2026-06-06).
  // 운흐름/소비자가 raw 받아 getJohuYongsin/getTwelveStageInterpretation 직접 호출.
}

/**
 * 고급 분석 실행
 */
export function performAdvancedAnalysis(
  simplePillars: SimplePillars,
  pillarsWithHour: PillarsWithHour,
  dayMasterStem: string,
  monthBranch: string,
): AdvancedAnalysisResult {
  const result: AdvancedAnalysisResult = {
    geokguk: null,
    yongsin: null,
    hyeongchung: null,
    tonggeun: null,
    deukryeong: null,
    sibsin: null,
  }

  // 1. 격국 분석 — determineGeokgukAdvanced 는 (a) 잡기격 보완 판정 (b) 정격·비격에
  // 대해 evaluateGeokgukStatus 로 성격/파격/반성반파 statusResult 를 결과에 부착.
  // 차트 PersonaCard 와 calendar saju-geokguk extractor 가 성패 정보를 소비.
  try {
    const geokguk = determineGeokgukAdvanced(simplePillars)
    result.geokguk = {
      ...geokguk,
      description: getGeokgukDescription(geokguk.primary),
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('[Saju API] Geokguk analysis failed:', e)
    }
  }

  // 2. 용신 분석
  try {
    const yongsin = determineYongsin(simplePillars)
    const luckyColors = getLuckyColors(yongsin.primaryYongsin)
    const luckyDirection = getLuckyDirection(yongsin.primaryYongsin)
    const luckyNumbers = getLuckyNumbers(yongsin.primaryYongsin)
    result.yongsin = {
      ...yongsin,
      description: getYongsinDescription(yongsin.primaryYongsin),
      luckyColors,
      luckyDirection,
      luckyNumbers,
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('[Saju API] Yongsin analysis failed:', e)
    }
  }

  // 3. 형충회합 분석
  try {
    result.hyeongchung = analyzeHyeongchung(simplePillars)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('[Saju API] Hyeongchung analysis failed:', e)
    }
  }

  // 4. 통근/득령 분석
  try {
    result.tonggeun = calculateTonggeun(dayMasterStem, simplePillars)
    result.deukryeong = calculateDeukryeong(dayMasterStem, monthBranch)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('[Saju API] Tonggeun/Deukryeong analysis failed:', e)
    }
  }

  // 5. 십신 종합 분석
  try {
    result.sibsin = analyzeSibsinComprehensive(pillarsWithHour)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('[Saju API] Sibsin analysis failed:', e)
    }
  }

  // 옛 johuYongsin / interpretations.twelveStages / health / career / score —
  // 모두 해석/텍스트 라 raw 응답에서 제거(2026-06-06). 소비자가 직접 호출:
  //   getJohuYongsin(dayMasterStem, monthBranch)
  //   getTwelveStageInterpretation(stage)
  //   analyze...

  return result
}
