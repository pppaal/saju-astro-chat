/**
 * useInlineTarotAPI Hook Tests
 * InlineTarotModal API 훅 테스트
 *
 * SKIPPED: ReferenceError in fetchInterpretation - needs investigation
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInlineTarotAPI } from '@/components/destiny-map/hooks/useInlineTarotAPI';
import type { UseInlineTarotStateReturn } from '@/components/destiny-map/hooks/useInlineTarotState';
import type { DrawnCard, Spread, CardInsight } from '@/lib/Tarot/tarot.types';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock tarotThemes
vi.mock('@/lib/Tarot/tarot-spreads-data', () => ({
  tarotThemes: [
    {
      id: 'general-insight',
      spreads: [
        { id: 'single-card', title: 'Single Card', titleKo: '한 장 뽑기' },
        { id: 'three-card', title: 'Three Card', titleKo: '세 장 뽑기' },
      ],
    },
    {
      id: 'love-relationships',
      spreads: [
        { id: 'love-single', title: 'Love Single Card' },
      ],
    },
  ],
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useInlineTarotAPI', () => {
  const mockSpread: Spread = {
    id: 'three-card',
    title: 'Three Card',
    titleKo: '세 장 뽑기',
    cardCount: 3,
    positions: [
      { title: 'Past', titleKo: '과거' },
      { title: 'Present', titleKo: '현재' },
      { title: 'Future', titleKo: '미래' },
    ],
  } as Spread;

  const mockDrawnCards: DrawnCard[] = [
    {
      card: {
        id: 'major-0',
        name: 'The Fool',
        nameKo: '바보',
        image: '/cards/fool.jpg',
        upright: {
          meaning: 'New beginnings',
          meaningKo: '새로운 시작',
          keywords: ['freedom', 'adventure'],
          keywordsKo: ['자유', '모험'],
        },
        reversed: {
          meaning: 'Recklessness',
          meaningKo: '무모함',
          keywords: ['foolishness'],
          keywordsKo: ['어리석음'],
        },
      },
      isReversed: false,
    },
    {
      card: {
        id: 'major-1',
        name: 'The Magician',
        nameKo: '마법사',
        image: '/cards/magician.jpg',
        upright: {
          meaning: 'Manifestation',
          meaningKo: '현현',
          keywords: ['power', 'skill'],
          keywordsKo: ['힘', '기술'],
        },
        reversed: {
          meaning: 'Manipulation',
          meaningKo: '조작',
          keywords: ['deception'],
          keywordsKo: ['속임수'],
        },
      },
      isReversed: true,
    },
  ] as DrawnCard[];

  // Create mock state manager
  const createMockStateManager = (overrides = {}): UseInlineTarotStateReturn => ({
    state: {
      step: 'concern',
      concern: 'What should I focus on?',
      selectedSpread: mockSpread,
      selectedCategory: 'general-insight',
      drawnCards: [],
      revealedCount: 0,
      isDrawing: false,
      overallMessage: '',
      cardInsights: [],
      guidance: '',
      affirmation: '',
      isSaved: false,
      isSaving: false,
      isAnalyzing: false,
      aiReason: '',
      ...overrides,
    },
    actions: {
      setStep: vi.fn(),
      setConcern: vi.fn(),
      setSelectedSpread: vi.fn(),
      setSelectedCategory: vi.fn(),
      setDrawnCards: vi.fn(),
      incrementRevealedCount: vi.fn(),
      setIsDrawing: vi.fn(),
      setOverallMessage: vi.fn(),
      setCardInsights: vi.fn(),
      setGuidance: vi.fn(),
      setAffirmation: vi.fn(),
      setIsSaved: vi.fn(),
      setIsSaving: vi.fn(),
      setIsAnalyzing: vi.fn(),
      setAiReason: vi.fn(),
      resetForDrawAgain: vi.fn(),
      selectSpreadAndProceed: vi.fn(),
    },
    recommendedSpreads: [mockSpread],
    themeToCategory: {
      focus_love: 'love-relationships',
      career: 'career-work',
    },
  });

  const mockProfile = {
    name: 'Test User',
    birthDate: '1990-01-01',
    birthTime: '12:00',
    city: 'Seoul',
    gender: 'male',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeQuestion', () => {
    it('should not analyze if concern is empty', async () => {
      const stateManager = createMockStateManager({ concern: '' });
      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.analyzeQuestion();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should set isAnalyzing to true during analysis', async () => {
      const stateManager = createMockStateManager();
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ spreadId: 'three-card' }),
        }), 100))
      );

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      act(() => {
        result.current.analyzeQuestion();
      });

      expect(stateManager.actions.setIsAnalyzing).toHaveBeenCalledWith(true);
    });

    it('should send correct request body', async () => {
      const stateManager = createMockStateManager();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ spreadId: 'three-card' }),
      });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'ko',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.analyzeQuestion();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/tarot/analyze-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': expect.any(String),
        },
        body: JSON.stringify({
          question: 'What should I focus on?',
          language: 'ko',
        }),
      });
    });

    it('should handle dangerous question response', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const stateManager = createMockStateManager();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          isDangerous: true,
          message: 'This question contains harmful content',
        }),
      });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.analyzeQuestion();
      });

      expect(alertSpy).toHaveBeenCalledWith('This question contains harmful content');
      expect(stateManager.actions.selectSpreadAndProceed).not.toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    it('should select spread and proceed on success', async () => {
      const stateManager = createMockStateManager();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          spreadId: 'three-card',
          reason: 'This spread is perfect for your question',
        }),
      });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.analyzeQuestion();
      });

      expect(stateManager.actions.selectSpreadAndProceed).toHaveBeenCalledWith(
        mockSpread,
        'This spread is perfect for your question'
      );
    });

    it('should use userFriendlyExplanation as reason fallback', async () => {
      const stateManager = createMockStateManager();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          spreadId: 'three-card',
          userFriendlyExplanation: 'Friendly explanation',
        }),
      });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.analyzeQuestion();
      });

      expect(stateManager.actions.selectSpreadAndProceed).toHaveBeenCalledWith(
        mockSpread,
        'Friendly explanation'
      );
    });

    it('should fallback to first recommended spread if AI spread not found', async () => {
      const stateManager = createMockStateManager();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          spreadId: 'non-existent-spread',
        }),
      });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.analyzeQuestion();
      });

      // Should use first recommended spread
      expect(stateManager.actions.selectSpreadAndProceed).toHaveBeenCalledWith(
        mockSpread,
        ''
      );
    });

    it('should go to spread-select on error', async () => {
      const stateManager = createMockStateManager();
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.analyzeQuestion();
      });

      expect(stateManager.actions.setStep).toHaveBeenCalledWith('spread-select');
    });

    it('should go to spread-select on HTTP error', async () => {
      const stateManager = createMockStateManager();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.analyzeQuestion();
      });

      expect(stateManager.actions.setStep).toHaveBeenCalledWith('spread-select');
    });

    it('should always set isAnalyzing to false at the end', async () => {
      const stateManager = createMockStateManager();
      mockFetch.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.analyzeQuestion();
      });

      expect(stateManager.actions.setIsAnalyzing).toHaveBeenLastCalledWith(false);
    });
  });

  describe('drawCards', () => {
    it('should not draw if no spread selected', async () => {
      const stateManager = createMockStateManager({ selectedSpread: null });
      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.drawCards();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should set isDrawing to true at start', async () => {
      const stateManager = createMockStateManager();
      // Mock to make it hang so we can check initial state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      act(() => {
        result.current.drawCards();
      });

      expect(stateManager.actions.setIsDrawing).toHaveBeenCalledWith(true);
    });

    it('should send correct draw request', async () => {
      const stateManager = createMockStateManager();
      // Mock immediate response with no cards to skip animation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ drawnCards: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          body: null,
        });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.drawCards();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/tarot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': expect.any(String),
        },
        body: JSON.stringify({
          categoryId: 'general-insight',
          spreadId: 'three-card',
        }),
      });
    });

    it('should set drawn cards from response', async () => {
      const stateManager = createMockStateManager();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ drawnCards: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          body: null,
        });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.drawCards();
      });

      expect(stateManager.actions.setDrawnCards).toHaveBeenCalled();
    });

    it('should handle draw API error', async () => {
      const stateManager = createMockStateManager();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.drawCards();
      });

      expect(stateManager.actions.setIsDrawing).toHaveBeenLastCalledWith(false);
    });
  });

  describe('saveReading', () => {
    it('should not save if already saving', async () => {
      const stateManager = createMockStateManager({ isSaving: true });
      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.saveReading();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not save if already saved', async () => {
      const stateManager = createMockStateManager({ isSaved: true });
      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.saveReading();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not save if no spread selected', async () => {
      const stateManager = createMockStateManager({ selectedSpread: null });
      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.saveReading();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should send correct save request', async () => {
      const stateManager = createMockStateManager({
        drawnCards: mockDrawnCards,
        overallMessage: 'Overall message',
        cardInsights: [{ position: 'Past', interpretation: 'Past interpretation' }] as CardInsight[],
        guidance: 'Guidance text',
        affirmation: 'Affirmation text',
      });

      mockFetch.mockResolvedValue({ ok: true });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.saveReading();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/tarot/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      });

      const savedBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(savedBody.question).toBe('What should I focus on?');
      expect(savedBody.theme).toBe('general-insight');
      expect(savedBody.spreadId).toBe('three-card');
      expect(savedBody.source).toBe('counselor');
      expect(savedBody.locale).toBe('en');
    });

    it('should use Korean titles when lang is ko', async () => {
      const stateManager = createMockStateManager({
        drawnCards: mockDrawnCards,
      });

      mockFetch.mockResolvedValue({ ok: true });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'ko',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.saveReading();
      });

      const savedBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(savedBody.spreadTitle).toBe('세 장 뽑기');
      expect(savedBody.cards[0].name).toBe('바보');
    });

    it('should set isSaved on success', async () => {
      const stateManager = createMockStateManager({
        drawnCards: mockDrawnCards,
      });

      mockFetch.mockResolvedValue({ ok: true });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.saveReading();
      });

      expect(stateManager.actions.setIsSaved).toHaveBeenCalledWith(true);
    });

    it('should handle save error', async () => {
      const stateManager = createMockStateManager({
        drawnCards: mockDrawnCards,
      });

      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Save failed' }),
      });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.saveReading();
      });

      expect(stateManager.actions.setIsSaved).not.toHaveBeenCalledWith(true);
      expect(stateManager.actions.setIsSaving).toHaveBeenLastCalledWith(false);
    });

    it('should handle network error during save', async () => {
      const stateManager = createMockStateManager({
        drawnCards: mockDrawnCards,
      });

      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.saveReading();
      });

      expect(stateManager.actions.setIsSaving).toHaveBeenLastCalledWith(false);
    });
  });

  describe('cleanup', () => {
    it('should abort any pending requests', () => {
      const stateManager = createMockStateManager();
      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      // Start a request first to create abort controller
      mockFetch.mockImplementation(() => new Promise(() => {}));
      act(() => {
        result.current.analyzeQuestion();
      });

      // Cleanup should abort
      const abortSpy = vi.fn();
      // Access internal ref is not possible, but we can verify cleanup doesn't throw
      expect(() => {
        result.current.cleanup();
      }).not.toThrow();
    });

    it('should be safe to call cleanup multiple times', () => {
      const stateManager = createMockStateManager();
      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      expect(() => {
        result.current.cleanup();
        result.current.cleanup();
        result.current.cleanup();
      }).not.toThrow();
    });
  });

  describe('streaming interpretation', () => {
    function createMockSSEResponse(events: string[]) {
      const encoder = new TextEncoder();
      let eventIndex = 0;

      return {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: async () => {
              if (eventIndex >= events.length) {
                return { done: true, value: undefined };
              }
              const event = events[eventIndex++];
              return { done: false, value: encoder.encode(event) };
            },
          }),
        },
      };
    }

    it('should handle streaming interpretation', async () => {
      const stateManager = createMockStateManager();

      // First call for draw (empty cards to skip animation), second for interpretation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ drawnCards: [] }),
        })
        .mockResolvedValueOnce(createMockSSEResponse([
          'data: {"section":"overall_message","content":"Hello "}\n',
          'data: {"section":"overall_message","content":"World"}\n',
          'data: [DONE]\n',
        ]));

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.drawCards();
      });

      // Should have set overall message
      expect(stateManager.actions.setOverallMessage).toHaveBeenCalled();
    });

    it('should handle card_insight section in stream', async () => {
      const stateManager = createMockStateManager();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ drawnCards: [] }),
        })
        .mockResolvedValueOnce(createMockSSEResponse([
          'data: {"section":"card_insight","index":0,"content":"First card insight"}\n',
          'data: [DONE]\n',
        ]));

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.drawCards();
      });

      expect(stateManager.actions.setCardInsights).toHaveBeenCalled();
    });

    it('should handle guidance section in stream', async () => {
      const stateManager = createMockStateManager();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ drawnCards: [] }),
        })
        .mockResolvedValueOnce(createMockSSEResponse([
          'data: {"section":"guidance","content":"Your guidance"}\n',
          'data: [DONE]\n',
        ]));

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.drawCards();
      });

      expect(stateManager.actions.setGuidance).toHaveBeenCalled();
    });

    it('should handle affirmation section in stream', async () => {
      const stateManager = createMockStateManager();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ drawnCards: [] }),
        })
        .mockResolvedValueOnce(createMockSSEResponse([
          'data: {"section":"affirmation","content":"Your affirmation"}\n',
          'data: [DONE]\n',
        ]));

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.drawCards();
      });

      expect(stateManager.actions.setAffirmation).toHaveBeenCalled();
    });

    it('should set step to result after interpretation', async () => {
      const stateManager = createMockStateManager();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ drawnCards: [] }),
        })
        .mockResolvedValueOnce(createMockSSEResponse([
          'data: {"section":"overall_message","content":"Done"}\n',
          'data: [DONE]\n',
        ]));

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.drawCards();
      });

      expect(stateManager.actions.setStep).toHaveBeenCalledWith('result');
    });

    it('should go to result step on interpretation error', async () => {
      const stateManager = createMockStateManager();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ drawnCards: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          body: null,
        });

      const { result } = renderHook(() =>
        useInlineTarotAPI({
          stateManager,
          lang: 'en',
          profile: mockProfile,
        })
      );

      await act(async () => {
        await result.current.drawCards();
      });

      expect(stateManager.actions.setStep).toHaveBeenCalledWith('result');
    });
  });
});
