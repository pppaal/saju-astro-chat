import { describe, expect, it } from 'vitest'
import {
  buildQuestionContextPrompt,
  resolveStableTarotEntry,
  toAnalysisSnapshot,
  loadQuestionAnalysisSnapshot,
} from '@/lib/tarot/questionFlow'

describe('questionFlow', () => {
  describe('buildQuestionContextPrompt', () => {
    it('returns just the trimmed question — no metadata labels (simplified after PR #153)', () => {
      const text = buildQuestionContextPrompt('   이직할까   ', null, 'ko')
      expect(text).toBe('이직할까')
    })

    it('ignores analysis snapshot (LLM step-0 handles extraction)', () => {
      const snapshot = {
        question_summary: '직장 고민',
        question_profile: {
          type: { code: 'decision', label: '결정' },
          subject: { code: 'self', label: '나' },
          focus: { code: 'work', label: '직장' },
          timeframe: { code: 'near_term', label: '근시일' },
          tone: { code: 'advice', label: '조언' },
        },
        direct_answer: '결정 미루지 마라',
        intent: 'self_decision',
      }
      const text = buildQuestionContextPrompt('이직할까', snapshot, 'ko')
      expect(text).toBe('이직할까')
      expect(text).not.toContain('[질문 종류]')
      expect(text).not.toContain('[주체]')
    })

    it('handles empty input gracefully', () => {
      expect(buildQuestionContextPrompt('', null, 'ko')).toBe('')
      expect(buildQuestionContextPrompt('   ', null, 'en')).toBe('')
    })
  })

  describe('resolveStableTarotEntry', () => {
    it('all paths route to general-insight (no themed routing)', () => {
      const cases = [
        'this is a casual question',
        '이직할까 고민중',
        '인생 방향을 모르겠다',
        '낼 뭐먹어',
        '',
      ]
      for (const q of cases) {
        const entry = resolveStableTarotEntry(q)
        expect(entry.themeId, `q: ${q}`).toBe('general-insight')
      }
    })

    it('only routes to one of the 4 canonical spread IDs', () => {
      const allowed = new Set(['quick-reading', 'past-present-future', 'general-cross', 'celtic-cross'])
      const cases = [
        '낼 뭐 먹어',
        '오늘 흐름 어때',
        '이직할까',
        '인생 어떻게 살까',
        '회사 그만두고 새로운 분야로 가고 싶은데 정말 맞는 결정인지 모르겠고 가족도 반대하고 돈도 부족해서 어떻게 해야 할지 정말 막막',
      ]
      for (const q of cases) {
        const entry = resolveStableTarotEntry(q)
        expect(allowed.has(entry.spreadId), `q: ${q} → ${entry.spreadId}`).toBe(true)
      }
    })

    it('short → quick-reading, life-level → celtic-cross', () => {
      expect(resolveStableTarotEntry('짧').spreadId).toBe('quick-reading')
      expect(resolveStableTarotEntry('인생 방향').spreadId).toBe('celtic-cross')
      expect(resolveStableTarotEntry('내 운명이 어떻게 될까').spreadId).toBe('celtic-cross')
    })

    it('decision keywords → general-cross', () => {
      expect(resolveStableTarotEntry('이직할까 고민').spreadId).toBe('general-cross')
      expect(resolveStableTarotEntry('헤어질지 고민').spreadId).toBe('general-cross')
    })

    it('broad_flow analysis snapshot → past-present-future', () => {
      const snapshot = {
        question_profile: {
          type: { code: 'broad_flow', label: '흐름' },
          subject: { code: 'self', label: '나' },
          focus: { code: 'general', label: '전반' },
          timeframe: { code: 'current_phase', label: '현재' },
          tone: { code: 'flow', label: '흐름' },
        },
      }
      // 짧은 질문이라도 flow 의도면 3장
      expect(resolveStableTarotEntry('짧', snapshot).spreadId).toBe('past-present-future')
    })
  })

  describe('toAnalysisSnapshot', () => {
    it('returns null for null / undefined', () => {
      expect(toAnalysisSnapshot(null)).toBeNull()
      expect(toAnalysisSnapshot(undefined)).toBeNull()
    })

    it('extracts snapshot fields from analysis result', () => {
      const result = {
        themeId: 'general-insight',
        spreadId: 'quick-reading',
        spreadTitle: 'Quick',
        cardCount: 1,
        userFriendlyExplanation: 'x',
        path: '/tarot/general-insight/quick-reading',
        question_summary: 'sum',
        direct_answer: 'da',
        intent: 'general',
        intent_label: '일반',
      }
      const snap = toAnalysisSnapshot(result)
      expect(snap?.question_summary).toBe('sum')
      expect(snap?.direct_answer).toBe('da')
      expect(snap?.intent).toBe('general')
    })
  })

  describe('loadQuestionAnalysisSnapshot', () => {
    it('returns null on server (window undefined) without throwing', () => {
      // vitest runs jsdom by default — but our guard checks window
      // either way function should be safe
      expect(() => loadQuestionAnalysisSnapshot(null, null)).not.toThrow()
    })

    it('returns null when no key provided', () => {
      expect(loadQuestionAnalysisSnapshot(null, 'q')).toBeNull()
      expect(loadQuestionAnalysisSnapshot('', 'q')).toBeNull()
    })
  })
})
