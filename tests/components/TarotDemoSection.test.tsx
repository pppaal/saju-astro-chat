import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TarotDemoSection } from '@/components/home/TarotDemoSection';

describe('TarotDemoSection', () => {
  const mockTranslate = (key: string, fallback: string) => fallback;
  const mockOnCardClick = jest.fn();
  const mockOnDeckClick = jest.fn();

  const mockCards = [
    { name: 'The Fool', nameKo: '바보', image: '/cards/fool.jpg' },
    { name: 'The Magician', nameKo: '마법사', image: '/cards/magician.jpg' },
    { name: 'The High Priestess', nameKo: '여사제', image: '/cards/priestess.jpg' },
    { name: 'The Empress', nameKo: '여제', image: '/cards/empress.jpg' },
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
    jest.clearAllMocks();
  });

  it('should render deck container', () => {
    render(<TarotDemoSection {...defaultProps} />);

    expect(screen.getByText('클릭하여 카드 그리기')).toBeInTheDocument();
  });

  it('should call onDeckClick when clicking deck', () => {
    const { container } = render(<TarotDemoSection {...defaultProps} />);

    const deck = container.querySelector('.tarotDeck');
    if (deck) {
      fireEvent.click(deck);
      expect(mockOnDeckClick).toHaveBeenCalled();
    }
  });

  it('should render 13 deck cards in spread', () => {
    const { container } = render(<TarotDemoSection {...defaultProps} />);

    const deckCards = container.querySelectorAll('.deckCard');
    expect(deckCards).toHaveLength(13);
  });

  it('should not show selected cards when none are selected', () => {
    render(<TarotDemoSection {...defaultProps} />);

    expect(screen.queryByText('과거')).not.toBeInTheDocument();
    expect(screen.queryByText('현재')).not.toBeInTheDocument();
  });

  it('should show selected cards when cards are drawn', () => {
    render(<TarotDemoSection {...defaultProps} selectedCards={mockCards} />);

    expect(screen.getByText('과거')).toBeInTheDocument();
    expect(screen.getByText('현재')).toBeInTheDocument();
    expect(screen.getByText('미래')).toBeInTheDocument();
    expect(screen.getByText('조언')).toBeInTheDocument();
  });

  it('should display card names in English when locale is en', () => {
    render(<TarotDemoSection {...defaultProps} selectedCards={mockCards} locale="en" />);

    expect(screen.getByText('The Fool')).toBeInTheDocument();
    expect(screen.getByText('The Magician')).toBeInTheDocument();
  });

  it('should display card names in Korean when locale is ko', () => {
    render(<TarotDemoSection {...defaultProps} selectedCards={mockCards} locale="ko" />);

    expect(screen.getByText('바보')).toBeInTheDocument();
    expect(screen.getByText('마법사')).toBeInTheDocument();
  });

  it('should call onCardClick when clicking a card', () => {
    const { container } = render(<TarotDemoSection {...defaultProps} selectedCards={mockCards} />);

    const cards = container.querySelectorAll('.tarotCard');
    if (cards[0]) {
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

    const cards = container.querySelectorAll('.tarotCard');
    expect(cards[0].classList.contains('flipped')).toBe(true);
    expect(cards[1].classList.contains('flipped')).toBe(false);
    expect(cards[2].classList.contains('flipped')).toBe(true);
    expect(cards[3].classList.contains('flipped')).toBe(false);
  });

  it('should apply deckSpread class when deck is spread', () => {
    const { container } = render(<TarotDemoSection {...defaultProps} isDeckSpread={true} />);

    const deck = container.querySelector('.tarotDeck');
    expect(deck?.classList.contains('deckSpread')).toBe(true);
  });

  it('should show reset message when deck is spread', () => {
    render(<TarotDemoSection {...defaultProps} isDeckSpread={true} />);

    expect(screen.getByText('클릭하여 카드 그리기')).toBeInTheDocument();
  });

  it('should render all 4 card positions', () => {
    const { container } = render(<TarotDemoSection {...defaultProps} selectedCards={mockCards} />);

    const cardElements = container.querySelectorAll('.tarotCard');
    expect(cardElements).toHaveLength(4);
  });
});
