import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '@/components/home/SearchBar';

describe('SearchBar', () => {
  const mockT = (key: string) => key;
  const mockTranslate = (key: string, fallback: string) => fallback;
  const mockOnQuestionChange = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockOnServiceSelect = vi.fn();
  const mockOnToggleSelector = vi.fn();
  const mockOnFocus = vi.fn();
  const mockOnHintClick = vi.fn();

  const defaultProps = {
    lifeQuestion: '',
    typingPlaceholder: 'Type your question...',
    showServiceSelector: false,
    selectedService: null,
    serviceOptions: [
      { key: 'destinyMap', icon: '🗺️', path: '/destiny-map' },
      { key: 'tarot', icon: '🔮', path: '/tarot' },
    ],
    onQuestionChange: mockOnQuestionChange,
    onSubmit: mockOnSubmit,
    onServiceSelect: mockOnServiceSelect,
    onToggleSelector: mockOnToggleSelector,
    onFocus: mockOnFocus,
    onHintClick: mockOnHintClick,
    hints: ['오늘의 운세', '연애운'],
    t: mockT,
    translate: mockTranslate,
    containerRef: { current: null } as React.RefObject<HTMLDivElement>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input with placeholder', () => {
    render(<SearchBar {...defaultProps} />);

    const input = screen.getByPlaceholderText('Type your question...');
    expect(input).toBeInTheDocument();
  });

  it('should render service selector button', () => {
    render(<SearchBar {...defaultProps} />);

    const button = screen.getByRole('button', { name: /서비스 선택/i });
    expect(button).toBeInTheDocument();
  });

  it('should call onToggleSelector when clicking service button', () => {
    render(<SearchBar {...defaultProps} />);

    const button = screen.getByRole('button', { name: /서비스 선택/i });
    fireEvent.click(button);

    expect(mockOnToggleSelector).toHaveBeenCalled();
  });

  it('should show service dropdown when showServiceSelector is true', () => {
    render(<SearchBar {...defaultProps} showServiceSelector={true} />);

    expect(screen.getByText(/destinyMap/)).toBeInTheDocument();
    expect(screen.getByText(/tarot/)).toBeInTheDocument();
  });

  it('should call onServiceSelect when clicking service option', () => {
    render(<SearchBar {...defaultProps} showServiceSelector={true} />);

    const option = screen.getByText(/destinyMap/);
    fireEvent.click(option);

    expect(mockOnServiceSelect).toHaveBeenCalledWith('destinyMap');
  });

  it('should call onQuestionChange when typing in input', () => {
    render(<SearchBar {...defaultProps} />);

    const input = screen.getByPlaceholderText('Type your question...');
    fireEvent.change(input, { target: { value: 'test question' } });

    expect(mockOnQuestionChange).toHaveBeenCalledWith('test question');
  });

  it('should call onSubmit when submitting form', () => {
    const { container } = render(<SearchBar {...defaultProps} />);

    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
    fireEvent.submit(form!);

    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('should call onFocus when focusing input', () => {
    render(<SearchBar {...defaultProps} />);

    const input = screen.getByPlaceholderText('Type your question...');
    fireEvent.focus(input);

    expect(mockOnFocus).toHaveBeenCalled();
  });

  it('should render hint buttons', () => {
    render(<SearchBar {...defaultProps} />);

    expect(screen.getByText('오늘의 운세')).toBeInTheDocument();
    expect(screen.getByText('연애운')).toBeInTheDocument();
  });

  it('should call onHintClick when clicking hint button', () => {
    render(<SearchBar {...defaultProps} />);

    const hint = screen.getByText('오늘의 운세');
    fireEvent.click(hint);

    expect(mockOnHintClick).toHaveBeenCalledWith('오늘의 운세');
  });

  it('should display selected service icon', () => {
    render(<SearchBar {...defaultProps} selectedService="tarot" />);

    const button = screen.getByRole('button', { name: /서비스 선택/i });
    expect(button).toHaveTextContent('🔮');
  });

  it('should display all service icons in guide section', () => {
    render(<SearchBar {...defaultProps} />);

    const icons = screen.getAllByTitle(/destinyMap|tarot/);
    expect(icons.length).toBeGreaterThan(0);
  });
});
