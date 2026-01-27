import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PersonCard } from '@/components/compatibility/PersonCard';
import type { PersonForm, SavedPerson } from '@/app/compatibility/lib';

// Mock custom picker components to render simple inputs for testability
vi.mock('@/components/ui/DateTimePicker', () => ({
  default: ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) => (
    <div>
      <label htmlFor="mock-date">{label}</label>
      <input id="mock-date" type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  ),
}));

vi.mock('@/components/ui/TimePicker', () => ({
  default: ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) => (
    <div>
      <label htmlFor="mock-time">{label}</label>
      <input id="mock-time" type="time" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  ),
}));

vi.mock('./PersonCard.module.css', () => ({
  default: new Proxy({}, { get: (_target, name) => name }),
}));

describe('PersonCard', () => {
  const mockT = (key: string, fallback?: string) => fallback || key;
  const mockOnUpdate = vi.fn();
  const mockOnPickCity = vi.fn();
  const mockOnToggleCircleDropdown = vi.fn();
  const mockOnFillFromCircle = vi.fn();

  const mockPerson: PersonForm = {
    name: 'John Doe',
    date: '1990-01-01',
    time: '10:00',
    cityQuery: 'Seoul',
    lat: null,
    lon: null,
    timeZone: 'UTC',
    suggestions: [],
    showDropdown: false,
  };

  const mockCirclePeople: SavedPerson[] = [
    {
      id: '1',
      name: 'Alice',
      birthDate: '1995-05-15',
      relation: 'partner',
    },
    {
      id: '2',
      name: 'Bob',
      birthDate: '1988-12-20',
      relation: 'friend',
    },
  ];

  const defaultProps = {
    person: mockPerson,
    index: 0,
    isAuthenticated: false,
    circlePeople: [],
    showCircleDropdown: null,
    onToggleCircleDropdown: mockOnToggleCircleDropdown,
    onFillFromCircle: mockOnFillFromCircle,
    onUpdate: mockOnUpdate,
    onPickCity: mockOnPickCity,
    t: mockT,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render person card with person number', () => {
    render(<PersonCard {...defaultProps} />);

    expect(screen.getByText(/Person 1/)).toBeInTheDocument();
  });

  it('should render all input fields', () => {
    render(<PersonCard {...defaultProps} />);

    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Birth/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time of Birth/)).toBeInTheDocument();
    expect(screen.getByLabelText(/City of Birth/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time Zone/)).toBeInTheDocument();
  });

  it('should call onUpdate when name changes', () => {
    render(<PersonCard {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: 'Jane' } });

    expect(mockOnUpdate).toHaveBeenCalledWith(0, 'name', 'Jane');
  });

  it('should call onUpdate when date changes', () => {
    render(<PersonCard {...defaultProps} />);

    const dateInput = screen.getByLabelText(/Date of Birth/);
    fireEvent.change(dateInput, { target: { value: '2000-01-01' } });

    expect(mockOnUpdate).toHaveBeenCalledWith(0, 'date', '2000-01-01');
  });

  it('should call onUpdate when time changes', () => {
    render(<PersonCard {...defaultProps} />);

    const timeInput = screen.getByLabelText(/Time of Birth/);
    fireEvent.change(timeInput, { target: { value: '14:30' } });

    expect(mockOnUpdate).toHaveBeenCalledWith(0, 'time', '14:30');
  });

  it('should call onUpdate and clear lat/lon when city query changes', () => {
    render(<PersonCard {...defaultProps} />);

    const cityInput = screen.getByLabelText(/City of Birth/);
    fireEvent.change(cityInput, { target: { value: 'Tokyo' } });

    expect(mockOnUpdate).toHaveBeenCalledWith(0, 'cityQuery', 'Tokyo');
    expect(mockOnUpdate).toHaveBeenCalledWith(0, 'lat', null);
    expect(mockOnUpdate).toHaveBeenCalledWith(0, 'lon', null);
  });

  it('should show dropdown when city has suggestions', () => {
    const personWithSuggestions = {
      ...mockPerson,
      suggestions: [
        { name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978 },
        { name: 'Seongnam', country: 'KR', lat: 37.4386, lon: 127.1378 },
      ],
      showDropdown: true,
    };

    render(<PersonCard {...defaultProps} person={personWithSuggestions} />);

    expect(screen.getByText('Seoul, KR')).toBeInTheDocument();
    expect(screen.getByText('Seongnam, KR')).toBeInTheDocument();
  });

  it('should call onPickCity when city is selected', () => {
    const personWithSuggestions = {
      ...mockPerson,
      suggestions: [{ name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978 }],
      showDropdown: true,
    };

    render(<PersonCard {...defaultProps} person={personWithSuggestions} />);

    const cityOption = screen.getByText('Seoul, KR');
    fireEvent.mouseDown(cityOption);

    expect(mockOnPickCity).toHaveBeenCalledWith(0, {
      name: 'Seoul',
      country: 'KR',
      lat: 37.5665,
      lon: 126.978,
    });
  });

  it('should show dropdown on focus when lat is null', () => {
    render(<PersonCard {...defaultProps} />);

    const cityInput = screen.getByLabelText(/City of Birth/);
    fireEvent.focus(cityInput);

    expect(mockOnUpdate).toHaveBeenCalledWith(0, 'showDropdown', true);
  });

  it('should hide dropdown on blur', async () => {
    vi.useFakeTimers();
    render(<PersonCard {...defaultProps} />);

    const cityInput = screen.getByLabelText(/City of Birth/);
    fireEvent.blur(cityInput);

    // The component uses setTimeout with 200ms delay for blur
    await vi.advanceTimersByTimeAsync(250);

    expect(mockOnUpdate).toHaveBeenCalledWith(0, 'showDropdown', false);
    vi.useRealTimers();
  });

  it('should display timezone as readonly', () => {
    render(<PersonCard {...defaultProps} />);

    const timezoneInput = screen.getByLabelText(/Time Zone/) as HTMLInputElement;
    expect(timezoneInput.readOnly).toBe(true);
  });

  it('should show My Circle button when authenticated with people', () => {
    render(
      <PersonCard {...defaultProps} isAuthenticated={true} circlePeople={mockCirclePeople} />
    );

    expect(screen.getByText(/My Circle/)).toBeInTheDocument();
  });

  it('should not show My Circle button when not authenticated', () => {
    render(<PersonCard {...defaultProps} circlePeople={mockCirclePeople} />);

    expect(screen.queryByText(/My Circle/)).not.toBeInTheDocument();
  });

  it('should toggle circle dropdown when clicking My Circle button', () => {
    render(
      <PersonCard {...defaultProps} isAuthenticated={true} circlePeople={mockCirclePeople} />
    );

    const circleButton = screen.getByText(/My Circle/);
    fireEvent.click(circleButton);

    expect(mockOnToggleCircleDropdown).toHaveBeenCalledWith(0);
  });

  it('should show circle people when dropdown is open', () => {
    render(
      <PersonCard
        {...defaultProps}
        isAuthenticated={true}
        circlePeople={mockCirclePeople}
        showCircleDropdown={0}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should call onFillFromCircle when clicking circle person', () => {
    render(
      <PersonCard
        {...defaultProps}
        isAuthenticated={true}
        circlePeople={mockCirclePeople}
        showCircleDropdown={0}
      />
    );

    const aliceItem = screen.getByText('Alice');
    fireEvent.click(aliceItem);

    expect(mockOnFillFromCircle).toHaveBeenCalledWith(0, mockCirclePeople[0]);
  });

  it('should show relation select for person index > 0', () => {
    const personWithRelation = { ...mockPerson, relation: 'lover' as const };
    render(<PersonCard {...defaultProps} person={personWithRelation} index={1} />);

    expect(screen.getByLabelText(/Relation to Person 1/)).toBeInTheDocument();
  });

  it('should not show relation select for person index 0', () => {
    render(<PersonCard {...defaultProps} index={0} />);

    expect(screen.queryByLabelText(/Relation to Person 1/)).not.toBeInTheDocument();
  });

  it('should call onUpdate when relation changes', () => {
    const personWithRelation = { ...mockPerson, relation: 'lover' as const };
    render(<PersonCard {...defaultProps} person={personWithRelation} index={1} />);

    const relationSelect = screen.getByLabelText(/Relation to Person 1/);
    fireEvent.change(relationSelect, { target: { value: 'friend' } });

    expect(mockOnUpdate).toHaveBeenCalledWith(1, 'relation', 'friend');
  });

  it('should call onUpdate when relation note changes', () => {
    const personWithRelation = { ...mockPerson, relation: 'other' as const, relationNote: '' };
    render(<PersonCard {...defaultProps} person={personWithRelation} index={1} />);

    const noteInput = screen.getByLabelText(/Relation Note/);
    fireEvent.change(noteInput, { target: { value: 'Colleague' } });

    expect(mockOnUpdate).toHaveBeenCalledWith(1, 'relationNote', 'Colleague');
  });

  it('should display correct icon for person 0', () => {
    render(<PersonCard {...defaultProps} index={0} />);

    expect(screen.getByText('👤')).toBeInTheDocument();
  });

  it('should display correct icon for relation type', () => {
    const personWithRelation = { ...mockPerson, relation: 'lover' as const };
    render(<PersonCard {...defaultProps} person={personWithRelation} index={1} />);

    expect(screen.getByText('💕')).toBeInTheDocument();
  });

  it('should display emoji icons for circle person relations', () => {
    render(
      <PersonCard
        {...defaultProps}
        isAuthenticated={true}
        circlePeople={mockCirclePeople}
        showCircleDropdown={0}
      />
    );

    expect(screen.getByText('❤️')).toBeInTheDocument(); // partner
    expect(screen.getByText('🤝')).toBeInTheDocument(); // friend
  });

  it('should apply animation delay based on index', () => {
    const { container } = render(<PersonCard {...defaultProps} index={2} />);

    const card = container.firstChild as HTMLElement;
    expect(card.style.animationDelay).toBe('0.2s');
  });
});
