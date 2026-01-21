import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '@/components/home/SearchBar';
import { VisitorStats } from '@/components/home/VisitorStats';
import { TarotDemoSection } from '@/components/home/TarotDemoSection';

describe('Components Edge Cases', () => {
  describe('SearchBar edge cases', () => {
    const mockT = (key: string) => key;
    const mockTranslate = (key: string, fallback: string) =>
      key === 'landing.selectService' ? 'Select service' : fallback;

    it('should handle empty service options', () => {
      const props = {
        lifeQuestion: '',
        typingPlaceholder: 'Type...',
        showServiceSelector: false,
        selectedService: null,
        serviceOptions: [],
        onQuestionChange: vi.fn(),
        onSubmit: vi.fn(),
        onServiceSelect: vi.fn(),
        onToggleSelector: vi.fn(),
        onFocus: vi.fn(),
        onHintClick: vi.fn(),
        hints: [],
        t: mockT,
        translate: mockTranslate,
        containerRef: { current: null } as React.RefObject<HTMLDivElement>,
      };

      render(<SearchBar {...props} />);

      expect(screen.getByPlaceholderText('Type...')).toBeInTheDocument();
    });

    it('should handle very long question input', () => {
      const props = {
        lifeQuestion: 'A'.repeat(10000),
        typingPlaceholder: '',
        showServiceSelector: false,
        selectedService: null,
        serviceOptions: [],
        onQuestionChange: vi.fn(),
        onSubmit: vi.fn(),
        onServiceSelect: vi.fn(),
        onToggleSelector: vi.fn(),
        onFocus: vi.fn(),
        onHintClick: vi.fn(),
        hints: [],
        t: mockT,
        translate: mockTranslate,
        containerRef: { current: null } as React.RefObject<HTMLDivElement>,
      };

      render(<SearchBar {...props} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toHaveLength(10000);
    });

    it('should handle rapid hint clicks', () => {
      const onHintClick = vi.fn();
      const props = {
        lifeQuestion: '',
        typingPlaceholder: '',
        showServiceSelector: false,
        selectedService: null,
        serviceOptions: [],
        onQuestionChange: vi.fn(),
        onSubmit: vi.fn(),
        onServiceSelect: vi.fn(),
        onToggleSelector: vi.fn(),
        onFocus: vi.fn(),
        onHintClick,
        hints: ['Hint 1', 'Hint 2', 'Hint 3'],
        t: mockT,
        translate: mockTranslate,
        containerRef: { current: null } as React.RefObject<HTMLDivElement>,
      };

      render(<SearchBar {...props} />);

      const hint1 = screen.getByText('Hint 1');

      // Rapidly click 100 times
      for (let i = 0; i < 100; i++) {
        fireEvent.click(hint1);
      }

      expect(onHintClick).toHaveBeenCalledTimes(100);
    });

    it('should handle service with null icon', () => {
      const props = {
        lifeQuestion: '',
        typingPlaceholder: '',
        showServiceSelector: false,
        selectedService: 'test',
        serviceOptions: [
          { key: 'test', icon: null as any, path: '/test' },
        ],
        onQuestionChange: vi.fn(),
        onSubmit: vi.fn(),
        onServiceSelect: vi.fn(),
        onToggleSelector: vi.fn(),
        onFocus: vi.fn(),
        onHintClick: vi.fn(),
        hints: [],
        t: mockT,
        translate: mockTranslate,
        containerRef: { current: null } as React.RefObject<HTMLDivElement>,
      };

      render(<SearchBar {...props} />);

      // Should show default fallback icon '🌟' when icon is null/undefined
      const button = screen.getByRole('button', { name: /select service/i });
      expect(button).toHaveTextContent('🌟');
    });

    it('should handle form submission with preventDefault', () => {
      const onSubmit = vi.fn();
      const props = {
        lifeQuestion: 'test question',
        typingPlaceholder: '',
        showServiceSelector: false,
        selectedService: null,
        serviceOptions: [],
        onQuestionChange: vi.fn(),
        onSubmit,
        onServiceSelect: vi.fn(),
        onToggleSelector: vi.fn(),
        onFocus: vi.fn(),
        onHintClick: vi.fn(),
        hints: [],
        t: mockT,
        translate: mockTranslate,
        containerRef: { current: null } as React.RefObject<HTMLDivElement>,
      };

      render(<SearchBar {...props} />);

      const form = document.querySelector('form');
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });

      form?.dispatchEvent(submitEvent);

      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('VisitorStats edge cases', () => {
    const mockTranslate = (key: string, fallback: string) => fallback;

    it('should handle extremely large numbers', () => {
      render(
        <VisitorStats
          todayVisitors={999999999999}
          totalVisitors={1500000000000}
          totalMembers={999999999}
          error={null}
          translate={mockTranslate}
        />
      );

      expect(screen.getByText('1000000.0M')).toBeInTheDocument();
      expect(screen.getByText('1500000M')).toBeInTheDocument();
    });

    it('should handle negative numbers', () => {
      render(
        <VisitorStats
          todayVisitors={-100}
          totalVisitors={-5000}
          totalMembers={-1200}
          error={null}
          translate={mockTranslate}
        />
      );

      expect(screen.getByText('-100')).toBeInTheDocument();
      expect(screen.getByText('-5K')).toBeInTheDocument();
      expect(screen.getByText('-1.2K')).toBeInTheDocument();
    });

    it('should handle zero values', () => {
      render(
        <VisitorStats
          todayVisitors={0}
          totalVisitors={0}
          totalMembers={0}
          error={null}
          translate={mockTranslate}
        />
      );

      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });

    it('should handle decimal numbers', () => {
      render(
        <VisitorStats
          todayVisitors={99.99}
          totalVisitors={1500.5}
          totalMembers={999.1}
          error={null}
          translate={mockTranslate}
        />
      );

      expect(screen.getByText('99.99')).toBeInTheDocument();
      expect(screen.getByText('1.5K')).toBeInTheDocument();
      expect(screen.getByText('999.1')).toBeInTheDocument();
    });
    it('should handle mixed null and number values', () => {
      render(
        <VisitorStats
          todayVisitors={150}
          totalVisitors={null}
          totalMembers={1200}
          error={null}
          translate={mockTranslate}
        />
      );

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('\u2014')).toBeInTheDocument();
      expect(screen.getByText('1.2K')).toBeInTheDocument();
    });

    it('should handle very long error messages', () => {
      const longError = 'Error: '.repeat(100) + 'Failed to load';

      render(
        <VisitorStats
          todayVisitors={null}
          totalVisitors={null}
          totalMembers={null}
          error={longError}
          translate={mockTranslate}
        />
      );

      expect(screen.getByText(longError)).toBeInTheDocument();
    });
  });

  describe('TarotDemoSection edge cases', () => {
    const translations: Record<string, string> = {
      'landing.tarotDeckLabel': 'Deck label',
      'landing.tarotDeckReset': 'Deck reset',
      'landing.tarotPast': 'Past',
      'landing.tarotPresent': 'Present',
      'landing.tarotFuture': 'Future',
      'landing.tarotAdvice': 'Advice',
    };
    const mockTranslate = (key: string, fallback: string) => translations[key] || fallback;

    it('should handle empty card array', () => {
      render(
        <TarotDemoSection
          selectedCards={[]}
          flippedCards={[false, false, false, false]}
          isDeckSpread={false}
          locale="en"
          onCardClick={vi.fn()}
          onDeckClick={vi.fn()}
          translate={mockTranslate}
          cardBackImage="/back.jpg"
        />
      );

      // Labels should not be shown when no cards are selected
      expect(screen.queryByText('Past')).not.toBeInTheDocument();
    });

    it('should handle cards with missing properties', () => {
      // Component requires selectedCards.length > 0 to show cards
      // Even with incomplete cards, it should not crash
      const incompleteCards = [
        { name: 'Card1', nameKo: '', image: '' },
        { name: '', nameKo: 'Card2Ko', image: '' },
        { name: 'Card3', nameKo: 'Card3Ko', image: '' },
        { name: 'Card4', nameKo: 'Card4Ko', image: '' },
      ];

      render(
        <TarotDemoSection
          selectedCards={incompleteCards}
          flippedCards={[true, true, true, true]}
          isDeckSpread={true}
          locale="en"
          onCardClick={vi.fn()}
          onDeckClick={vi.fn()}
          translate={mockTranslate}
          cardBackImage="/back.jpg"
        />
      );

      // Should not crash and show labels
      expect(screen.getByText('Deck reset')).toBeInTheDocument();
      expect(screen.getByText('Past')).toBeInTheDocument();
    });
    it('should handle rapid card clicks', () => {
      const onCardClick = vi.fn();
      const mockCards = [
        { name: 'Card 1', nameKo: 'Card 1 KO', image: '/1.jpg' },
        { name: 'Card 2', nameKo: 'Card 2 KO', image: '/2.jpg' },
        { name: 'Card 3', nameKo: 'Card 3 KO', image: '/3.jpg' },
        { name: 'Card 4', nameKo: 'Card 4 KO', image: '/4.jpg' },
      ];

      const { container } = render(
        <TarotDemoSection
          selectedCards={mockCards}
          flippedCards={[false, false, false, false]}
          isDeckSpread={true}
          locale="en"
          onCardClick={onCardClick}
          onDeckClick={vi.fn()}
          translate={mockTranslate}
          cardBackImage="/back.jpg"
        />
      );

      const cardsContainer = container.querySelector('[class*="tarotCards"]');
      const cards = cardsContainer?.querySelectorAll(':scope > [class*="tarotCard"]');
      expect(cards?.length).toBe(4);

      // Rapidly click first card 50 times
      if (cards && cards[0]) {
        for (let i = 0; i < 50; i++) {
          fireEvent.click(cards[0]);
        }
      }

      expect(onCardClick).toHaveBeenCalledTimes(50);
    });

    it('should handle locale switching during render', () => {
      const mockCards = [
        { name: 'The Fool', nameKo: 'The Fool KO', image: '/fool.jpg' },
      ];

      const { rerender } = render(
        <TarotDemoSection
          selectedCards={mockCards}
          flippedCards={[true, false, false, false]}
          isDeckSpread={true}
          locale="en"
          onCardClick={vi.fn()}
          onDeckClick={vi.fn()}
          translate={mockTranslate}
          cardBackImage="/back.jpg"
        />
      );

      expect(screen.getByText('The Fool')).toBeInTheDocument();

      rerender(
        <TarotDemoSection
          selectedCards={mockCards}
          flippedCards={[true, false, false, false]}
          isDeckSpread={true}
          locale="ko"
          onCardClick={vi.fn()}
          onDeckClick={vi.fn()}
          translate={mockTranslate}
          cardBackImage="/back.jpg"
        />
      );

      expect(screen.getByText('The Fool KO')).toBeInTheDocument();
    });
    it('should handle deck click during animation', () => {
      const onDeckClick = vi.fn();

      const { container } = render(
        <TarotDemoSection
          selectedCards={[]}
          flippedCards={[false, false, false, false]}
          isDeckSpread={false}
          locale="en"
          onCardClick={vi.fn()}
          onDeckClick={onDeckClick}
          translate={mockTranslate}
          cardBackImage="/back.jpg"
        />
      );

      const deckContainer = container.querySelector('[class*="tarotDeckContainer"]');
      const deck = deckContainer?.querySelector(':scope > [class*="tarotDeck"]');
      expect(deck).toBeInTheDocument();

      // Click multiple times rapidly
      for (let i = 0; i < 10; i++) {
        if (deck) fireEvent.click(deck);
      }

      expect(onDeckClick).toHaveBeenCalledTimes(10);
    });
  });
});
