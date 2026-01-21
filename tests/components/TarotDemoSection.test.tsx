import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TarotDemoSection } from '@/components/home/TarotDemoSection';

describe('TarotDemoSection', () => {
  const translations: Record<string, string> = {
    'landing.tarotDeckLabel': 'Deck label',
    'landing.tarotDeckReset': 'Deck reset',
    'landing.tarotPast': 'Past',
    'landing.tarotPresent': 'Present',
    'landing.tarotFuture': 'Future',
    'landing.tarotAdvice': 'Advice',
  };
  const mockTranslate = (key: string, fallback: string) => translations[key] || fallback;
  const mockOnCardClick = vi.fn();
  const mockOnDeckClick = vi.fn();

  const mockCards = [
    { name: 'The Fool', nameKo: 'The Fool KO', image: '/cards/fool.jpg' },
    { name: 'The Magician', nameKo: 'The Magician KO', image: '/cards/magician.jpg' },
    { name: 'The High Priestess', nameKo: 'The High Priestess KO', image: '/cards/priestess.jpg' },
    { name: 'The Empress', nameKo: 'The Empress KO', image: '/cards/empress.jpg' },
  ];

  const defaultProps = {
    selectedCards: [],
    flippedCards: [false, false, false, false],
    isDeckSpread: false,
    locale: 'en',
    onCardClick: mockOnCardClick,
    onDeckClick: mockOnDeckClick,
    translate: mockTranslate,
    cardBackImage: '/cards/back.jpg',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render deck container', () => {
    render(<TarotDemoSection {...defaultProps} />);

    expect(screen.getByText('Deck label')).toBeInTheDocument();
  });

  it('should call onDeckClick when clicking deck', () => {
    const { container } = render(<TarotDemoSection {...defaultProps} />);

    // tarotDeck is inside tarotDeckContainer - find the clickable deck div
    const deckContainer = container.querySelector('[class*="tarotDeckContainer"]');
    // The deck is the first direct child div with tarotDeck class
    const deck = deckContainer?.querySelector(':scope > [class*="tarotDeck"]');
    expect(deck).toBeInTheDocument();
    if (deck) {
      fireEvent.click(deck);
      expect(mockOnDeckClick).toHaveBeenCalled();
    }
  });

  it('should render 13 deck cards in spread', () => {
    const { container } = render(<TarotDemoSection {...defaultProps} />);

    // deckCard elements are rendered inside the tarotDeck container (not tarotCards)
    const deckContainer = container.querySelector('[class*="tarotDeckContainer"]');
    const deck = deckContainer?.querySelector(':scope > [class*="tarotDeck"]');
    const deckCards = deck?.querySelectorAll(':scope > [class*="deckCard"]');
    expect(deckCards?.length).toBe(13);
  });

  it('should not show selected cards when none are selected', () => {
    render(<TarotDemoSection {...defaultProps} />);

    expect(screen.queryByText('Past')).not.toBeInTheDocument();
    expect(screen.queryByText('Present')).not.toBeInTheDocument();
  });

  it('should show selected cards when cards are drawn', () => {
    render(<TarotDemoSection {...defaultProps} selectedCards={mockCards} />);

    expect(screen.getByText('Past')).toBeInTheDocument();
    expect(screen.getByText('Present')).toBeInTheDocument();
    expect(screen.getByText('Future')).toBeInTheDocument();
    expect(screen.getByText('Advice')).toBeInTheDocument();
  });

  it('should display card names in English when locale is en', () => {
    render(<TarotDemoSection {...defaultProps} selectedCards={mockCards} locale="en" />);

    expect(screen.getByText('The Fool')).toBeInTheDocument();
    expect(screen.getByText('The Magician')).toBeInTheDocument();
  });

  it('should display card names in Korean when locale is ko', () => {
    render(<TarotDemoSection {...defaultProps} selectedCards={mockCards} locale="ko" />);

    expect(screen.getByText('The Fool KO')).toBeInTheDocument();
    expect(screen.getByText('The Magician KO')).toBeInTheDocument();
  });

  it('should call onCardClick when clicking a card', () => {
    const { container } = render(<TarotDemoSection {...defaultProps} selectedCards={mockCards} />);

    // tarotCards is the container for selected cards (not tarotDeck)
    const cardsContainer = container.querySelector('[class*="tarotCards"]');
    const cards = cardsContainer?.querySelectorAll(':scope > [class*="tarotCard"]');
    expect(cards?.length).toBe(4);
    if (cards && cards[0]) {
      fireEvent.click(cards[0]);
      expect(mockOnCardClick).toHaveBeenCalledWith(0);
    }
  });

  it('should apply flipped class to flipped cards', () => {
    const { container } = render(
      <TarotDemoSection
        {...defaultProps}
        selectedCards={mockCards}
        flippedCards={[true, false, true, false]}
      />
    );

    // CSS Module adds hash to class names, use regex for partial match
    // tarotCards is the container for selected cards
    const cardsContainer = container.querySelector('[class*="tarotCards"]');
    const cards = cardsContainer?.querySelectorAll(':scope > [class*="tarotCard"]');
    expect(cards?.length).toBe(4);
    if (cards) {
      expect(cards[0].className).toMatch(/flipped/);
      expect(cards[1].className).not.toMatch(/flipped/);
      expect(cards[2].className).toMatch(/flipped/);
      expect(cards[3].className).not.toMatch(/flipped/);
    }
  });

  it('should apply deckSpread class when deck is spread', () => {
    const { container } = render(<TarotDemoSection {...defaultProps} isDeckSpread={true} />);

    // tarotDeck is inside tarotDeckContainer
    const deckContainer = container.querySelector('[class*="tarotDeckContainer"]');
    const deck = deckContainer?.querySelector(':scope > [class*="tarotDeck"]');
    expect(deck).toBeInTheDocument();
    expect(deck?.className).toMatch(/deckSpread/);
  });

  it('should show reset message when deck is spread', () => {
    render(<TarotDemoSection {...defaultProps} isDeckSpread={true} />);

    expect(screen.getByText('Deck reset')).toBeInTheDocument();
  });

  it('should render all 4 card positions', () => {
    const { container } = render(<TarotDemoSection {...defaultProps} selectedCards={mockCards} />);

    // tarotCards is the container for selected cards
    const cardsContainer = container.querySelector('[class*="tarotCards"]');
    const cardElements = cardsContainer?.querySelectorAll(':scope > [class*="tarotCard"]');
    expect(cardElements?.length).toBe(4);
  });
});
