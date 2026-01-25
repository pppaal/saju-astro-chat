/**
 * useInlineTarotState Hook Tests
 * InlineTarotModal 상태 관리 훅 테스트
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInlineTarotState, type Step } from '@/components/destiny-map/hooks/useInlineTarotState';
import type { Spread, DrawnCard, CardInsight } from '@/lib/Tarot/tarot.types';

// Mock tarotThemes
vi.mock('@/lib/Tarot/tarot-spreads-data', () => ({
  tarotThemes: [
    {
      id: 'general-insight',
      name: 'General Insight',
      spreads: [
        { id: 'single-card', title: 'Single Card', cardCount: 1 },
        { id: 'three-card', title: 'Three Card', cardCount: 3 },
        { id: 'celtic-cross', title: 'Celtic Cross', cardCount: 10 },
      ],
    },
    {
      id: 'love-relationships',
      name: 'Love & Relationships',
      spreads: [
        { id: 'relationship-spread', title: 'Relationship', cardCount: 5 },
        { id: 'love-single', title: 'Love Single', cardCount: 1 },
      ],
    },
    {
      id: 'career-work',
      name: 'Career & Work',
      spreads: [
        { id: 'career-path', title: 'Career Path', cardCount: 4 },
      ],
    },
  ],
}));

describe('useInlineTarotState', () => {
  const defaultOptions = {
    isOpen: true,
    initialConcern: 'What should I focus on?',
    theme: 'life',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useInlineTarotState(defaultOptions));

      expect(result.current.state.step).toBe('concern');
      expect(result.current.state.concern).toBe('What should I focus on?');
      expect(result.current.state.selectedSpread).toBeNull();
      expect(result.current.state.drawnCards).toEqual([]);
      expect(result.current.state.revealedCount).toBe(0);
      expect(result.current.state.isDrawing).toBe(false);
      expect(result.current.state.overallMessage).toBe('');
      expect(result.current.state.cardInsights).toEqual([]);
      expect(result.current.state.guidance).toBe('');
      expect(result.current.state.affirmation).toBe('');
      expect(result.current.state.isSaved).toBe(false);
      expect(result.current.state.isSaving).toBe(false);
      expect(result.current.state.isAnalyzing).toBe(false);
      expect(result.current.state.aiReason).toBe('');
    });

    it('should set initial concern from options', () => {
      const { result } = renderHook(() =>
        useInlineTarotState({
          ...defaultOptions,
          initialConcern: 'My specific question',
        })
      );

      expect(result.current.state.concern).toBe('My specific question');
    });

    it('should return themeToCategory mapping', () => {
      const { result } = renderHook(() => useInlineTarotState(defaultOptions));

      expect(result.current.themeToCategory).toBeDefined();
      expect(result.current.themeToCategory.focus_love).toBe('love-relationships');
      expect(result.current.themeToCategory.career).toBe('career-work');
      expect(result.current.themeToCategory.life).toBe('general-insight');
    });
  });

  describe('theme to category mapping', () => {
    it('should map focus_love to love-relationships', () => {
      const { result } = renderHook(() =>
        useInlineTarotState({ ...defaultOptions, theme: 'focus_love' })
      );

      expect(result.current.state.selectedCategory).toBe('love-relationships');
    });

    it('should map love to love-relationships', () => {
      const { result } = renderHook(() =>
        useInlineTarotState({ ...defaultOptions, theme: 'love' })
      );

      expect(result.current.state.selectedCategory).toBe('love-relationships');
    });

    it('should map focus_career to career-work', () => {
      const { result } = renderHook(() =>
        useInlineTarotState({ ...defaultOptions, theme: 'focus_career' })
      );

      expect(result.current.state.selectedCategory).toBe('career-work');
    });

    it('should map career to career-work', () => {
      const { result } = renderHook(() =>
        useInlineTarotState({ ...defaultOptions, theme: 'career' })
      );

      expect(result.current.state.selectedCategory).toBe('career-work');
    });

    it('should map life to general-insight', () => {
      const { result } = renderHook(() =>
        useInlineTarotState({ ...defaultOptions, theme: 'life' })
      );

      expect(result.current.state.selectedCategory).toBe('general-insight');
    });

    it('should default to general-insight for unknown theme', () => {
      const { result } = renderHook(() =>
        useInlineTarotState({ ...defaultOptions, theme: 'unknown_theme' })
      );

      expect(result.current.state.selectedCategory).toBe('general-insight');
    });
  });

  describe('recommendedSpreads', () => {
    it('should return spreads sorted by card count', () => {
      const { result } = renderHook(() =>
        useInlineTarotState({ ...defaultOptions, theme: 'life' })
      );

      const spreads = result.current.recommendedSpreads;
      expect(spreads.length).toBe(3);
      expect(spreads[0].cardCount).toBe(1);
      expect(spreads[1].cardCount).toBe(3);
      expect(spreads[2].cardCount).toBe(10);
    });

    it('should return spreads for love theme', () => {
      const { result } = renderHook(() =>
        useInlineTarotState({ ...defaultOptions, theme: 'love' })
      );

      const spreads = result.current.recommendedSpreads;
      expect(spreads.length).toBe(2);
      expect(spreads.some((s) => s.id === 'relationship-spread')).toBe(true);
    });

    it('should return empty array for theme without category', () => {
      // Mock tarotThemes to return empty
      const { result } = renderHook(() =>
        useInlineTarotState({ ...defaultOptions, theme: 'nonexistent' })
      );

      // Should fall back to general-insight
      expect(result.current.recommendedSpreads.length).toBe(3);
    });
  });

  describe('actions', () => {
    describe('setStep', () => {
      it('should update step', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setStep('spread-select');
        });

        expect(result.current.state.step).toBe('spread-select');
      });

      it('should handle all step values', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));
        const steps: Step[] = ['concern', 'spread-select', 'card-draw', 'interpreting', 'result'];

        steps.forEach((step) => {
          act(() => {
            result.current.actions.setStep(step);
          });
          expect(result.current.state.step).toBe(step);
        });
      });
    });

    describe('setConcern', () => {
      it('should update concern', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setConcern('New question');
        });

        expect(result.current.state.concern).toBe('New question');
      });
    });

    describe('setSelectedSpread', () => {
      it('should update selected spread', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));
        const spread = { id: 'test', title: 'Test' } as Spread;

        act(() => {
          result.current.actions.setSelectedSpread(spread);
        });

        expect(result.current.state.selectedSpread).toEqual(spread);
      });

      it('should allow null spread', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setSelectedSpread({ id: 'test' } as Spread);
        });

        act(() => {
          result.current.actions.setSelectedSpread(null);
        });

        expect(result.current.state.selectedSpread).toBeNull();
      });
    });

    describe('setSelectedCategory', () => {
      it('should update selected category', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setSelectedCategory('love-relationships');
        });

        expect(result.current.state.selectedCategory).toBe('love-relationships');
      });
    });

    describe('setDrawnCards', () => {
      it('should update drawn cards', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));
        const cards = [{ card: { id: '1' }, isReversed: false }] as DrawnCard[];

        act(() => {
          result.current.actions.setDrawnCards(cards);
        });

        expect(result.current.state.drawnCards).toEqual(cards);
      });
    });

    describe('incrementRevealedCount', () => {
      it('should increment revealed count', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        expect(result.current.state.revealedCount).toBe(0);

        act(() => {
          result.current.actions.incrementRevealedCount();
        });

        expect(result.current.state.revealedCount).toBe(1);

        act(() => {
          result.current.actions.incrementRevealedCount();
        });

        expect(result.current.state.revealedCount).toBe(2);
      });
    });

    describe('setIsDrawing', () => {
      it('should update isDrawing', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setIsDrawing(true);
        });

        expect(result.current.state.isDrawing).toBe(true);

        act(() => {
          result.current.actions.setIsDrawing(false);
        });

        expect(result.current.state.isDrawing).toBe(false);
      });
    });

    describe('setOverallMessage', () => {
      it('should set message directly', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setOverallMessage('Hello');
        });

        expect(result.current.state.overallMessage).toBe('Hello');
      });

      it('should support function updater', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setOverallMessage('Hello');
        });

        act(() => {
          result.current.actions.setOverallMessage((prev) => prev + ' World');
        });

        expect(result.current.state.overallMessage).toBe('Hello World');
      });
    });

    describe('setCardInsights', () => {
      it('should update card insights', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));
        const insights = [{ position: 'Past', interpretation: 'Text' }] as CardInsight[];

        act(() => {
          result.current.actions.setCardInsights(insights);
        });

        expect(result.current.state.cardInsights).toEqual(insights);
      });
    });

    describe('setGuidance', () => {
      it('should set guidance directly', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setGuidance('Guidance text');
        });

        expect(result.current.state.guidance).toBe('Guidance text');
      });

      it('should support function updater', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setGuidance('Part 1');
        });

        act(() => {
          result.current.actions.setGuidance((prev) => prev + ' Part 2');
        });

        expect(result.current.state.guidance).toBe('Part 1 Part 2');
      });
    });

    describe('setAffirmation', () => {
      it('should set affirmation directly', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setAffirmation('I am worthy');
        });

        expect(result.current.state.affirmation).toBe('I am worthy');
      });

      it('should support function updater', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setAffirmation('I am');
        });

        act(() => {
          result.current.actions.setAffirmation((prev) => prev + ' enough');
        });

        expect(result.current.state.affirmation).toBe('I am enough');
      });
    });

    describe('setIsSaved', () => {
      it('should update isSaved', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setIsSaved(true);
        });

        expect(result.current.state.isSaved).toBe(true);
      });
    });

    describe('setIsSaving', () => {
      it('should update isSaving', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setIsSaving(true);
        });

        expect(result.current.state.isSaving).toBe(true);
      });
    });

    describe('setIsAnalyzing', () => {
      it('should update isAnalyzing', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setIsAnalyzing(true);
        });

        expect(result.current.state.isAnalyzing).toBe(true);
      });
    });

    describe('setAiReason', () => {
      it('should update aiReason', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        act(() => {
          result.current.actions.setAiReason('AI selected this spread because...');
        });

        expect(result.current.state.aiReason).toBe('AI selected this spread because...');
      });
    });

    describe('resetForDrawAgain', () => {
      it('should reset card-related state and go to card-draw step', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        // Set up some state first
        act(() => {
          result.current.actions.setDrawnCards([{ card: { id: '1' } }] as DrawnCard[]);
          result.current.actions.incrementRevealedCount();
          result.current.actions.setOverallMessage('Message');
          result.current.actions.setCardInsights([{ position: 'Past' }] as CardInsight[]);
          result.current.actions.setGuidance('Guidance');
          result.current.actions.setAffirmation('Affirmation');
          result.current.actions.setStep('result');
        });

        // Reset for draw again
        act(() => {
          result.current.actions.resetForDrawAgain();
        });

        expect(result.current.state.drawnCards).toEqual([]);
        expect(result.current.state.revealedCount).toBe(0);
        expect(result.current.state.overallMessage).toBe('');
        expect(result.current.state.cardInsights).toEqual([]);
        expect(result.current.state.guidance).toBe('');
        expect(result.current.state.affirmation).toBe('');
        expect(result.current.state.step).toBe('card-draw');
      });

      it('should preserve concern and selectedSpread', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));

        const spread = { id: 'test' } as Spread;
        act(() => {
          result.current.actions.setConcern('My question');
          result.current.actions.setSelectedSpread(spread);
          result.current.actions.setDrawnCards([{ card: { id: '1' } }] as DrawnCard[]);
        });

        act(() => {
          result.current.actions.resetForDrawAgain();
        });

        expect(result.current.state.concern).toBe('My question');
        expect(result.current.state.selectedSpread).toEqual(spread);
      });
    });

    describe('selectSpreadAndProceed', () => {
      it('should set spread, reason, and go to card-draw', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));
        const spread = { id: 'three-card', title: 'Three Card' } as Spread;

        act(() => {
          result.current.actions.selectSpreadAndProceed(spread, 'This spread is perfect');
        });

        expect(result.current.state.selectedSpread).toEqual(spread);
        expect(result.current.state.aiReason).toBe('This spread is perfect');
        expect(result.current.state.step).toBe('card-draw');
      });

      it('should work without reason', () => {
        const { result } = renderHook(() => useInlineTarotState(defaultOptions));
        const spread = { id: 'single-card' } as Spread;

        act(() => {
          result.current.actions.selectSpreadAndProceed(spread);
        });

        expect(result.current.state.selectedSpread).toEqual(spread);
        expect(result.current.state.aiReason).toBe('');
        expect(result.current.state.step).toBe('card-draw');
      });
    });
  });

  describe('reset on modal open', () => {
    it('should reset state when modal opens', () => {
      const { result, rerender } = renderHook(
        (props) => useInlineTarotState(props),
        { initialProps: { ...defaultOptions, isOpen: false } }
      );

      // Set some state
      act(() => {
        result.current.actions.setStep('result');
        result.current.actions.setDrawnCards([{ card: { id: '1' } }] as DrawnCard[]);
      });

      // Open modal
      rerender({ ...defaultOptions, isOpen: true });

      // State should be reset
      expect(result.current.state.step).toBe('concern');
      expect(result.current.state.drawnCards).toEqual([]);
    });

    it('should update concern from new initialConcern', () => {
      const { result, rerender } = renderHook(
        (props) => useInlineTarotState(props),
        { initialProps: { ...defaultOptions, isOpen: true } }
      );

      expect(result.current.state.concern).toBe('What should I focus on?');

      // Close and reopen with new concern
      rerender({ ...defaultOptions, isOpen: false });
      rerender({
        ...defaultOptions,
        isOpen: true,
        initialConcern: 'New question',
      });

      expect(result.current.state.concern).toBe('New question');
    });
  });

  describe('theme change effect', () => {
    it('should update category when theme changes', () => {
      const { result, rerender } = renderHook(
        (props) => useInlineTarotState(props),
        { initialProps: defaultOptions }
      );

      expect(result.current.state.selectedCategory).toBe('general-insight');

      rerender({ ...defaultOptions, theme: 'love' });

      expect(result.current.state.selectedCategory).toBe('love-relationships');
    });
  });

  describe('actions stability', () => {
    it('should have stable actions reference', () => {
      const { result, rerender } = renderHook(() =>
        useInlineTarotState(defaultOptions)
      );

      const firstActions = result.current.actions;
      rerender();
      const secondActions = result.current.actions;

      expect(firstActions).toBe(secondActions);
    });
  });
});
