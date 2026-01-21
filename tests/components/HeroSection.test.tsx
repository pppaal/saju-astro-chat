import React from 'react';
import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/components/home/HeroSection';

describe('HeroSection', () => {
  const defaultProps = {
    title: 'Know yourself. Shape tomorrow.',
    subtitle: 'Where destiny, psychology, and spirituality meet',
    scrollDownText: 'Scroll down',
  };

  it('should render hero title', () => {
    render(<HeroSection {...defaultProps} />);

    expect(screen.getByText('Know yourself. Shape tomorrow.')).toBeInTheDocument();
  });

  it('should render hero subtitle', () => {
    render(<HeroSection {...defaultProps} />);

    expect(
      screen.getByText('Where destiny, psychology, and spirituality meet')
    ).toBeInTheDocument();
  });

  it('should render scroll indicator', () => {
    render(<HeroSection {...defaultProps} />);

    expect(screen.getByText('Scroll down')).toBeInTheDocument();
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('should render with Korean text', () => {
    render(
      <HeroSection
        title="자신을 알고, 내일을 만드세요."
        subtitle="운명, 심리학, 영성이 만나는 곳"
        scrollDownText="스크롤하여 더보기"
      />
    );

    expect(screen.getByText('자신을 알고, 내일을 만드세요.')).toBeInTheDocument();
    expect(screen.getByText('운명, 심리학, 영성이 만나는 곳')).toBeInTheDocument();
    expect(screen.getByText('스크롤하여 더보기')).toBeInTheDocument();
  });

  it('should have correct structure', () => {
    const { container } = render(<HeroSection {...defaultProps} />);

    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
    expect(section?.querySelector('h1')).toBeInTheDocument();
    expect(section?.querySelector('p')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.scrollDownText)).toBeInTheDocument();
  });

  it('should display title as h1', () => {
    render(<HeroSection {...defaultProps} />);

    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('Know yourself. Shape tomorrow.');
  });

  it('should handle empty props gracefully', () => {
    render(<HeroSection title="" subtitle="" scrollDownText="" />);

    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('');
  });

  it('should handle long text content', () => {
    const longTitle = 'A'.repeat(200);
    const longSubtitle = 'B'.repeat(300);

    render(
      <HeroSection title={longTitle} subtitle={longSubtitle} scrollDownText="Scroll" />
    );

    expect(screen.getByText(longTitle)).toBeInTheDocument();
    expect(screen.getByText(longSubtitle)).toBeInTheDocument();
  });

  it('should render scroll arrow with proper icon', () => {
    render(<HeroSection {...defaultProps} />);

    const arrow = screen.getByText('↓');
    expect(arrow).toBeInTheDocument();
  });
});
