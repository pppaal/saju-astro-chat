import React from 'react';
import { render, screen } from '@testing-library/react';
import { VisitorStats } from '@/components/home/VisitorStats';

describe('VisitorStats', () => {
  const mockTranslate = (key: string, fallback: string) => fallback;

  it('should render all stat items', () => {
    render(
      <VisitorStats
        todayVisitors={150}
        totalVisitors={5000}
        totalMembers={1200}
        error={null}
        translate={mockTranslate}
      />
    );

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Total Visitors')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
  });

  it('should display formatted visitor numbers', () => {
    render(
      <VisitorStats
        todayVisitors={150}
        totalVisitors={5000}
        totalMembers={1200}
        error={null}
        translate={mockTranslate}
      />
    );

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('5K')).toBeInTheDocument();
    expect(screen.getByText('1.2K')).toBeInTheDocument();
  });

  it('should display — for null values', () => {
    render(
      <VisitorStats
        todayVisitors={null}
        totalVisitors={null}
        totalMembers={null}
        error={null}
        translate={mockTranslate}
      />
    );

    const dashes = screen.getAllByText('—');
    expect(dashes).toHaveLength(3);
  });

  it('should display error message when error exists', () => {
    render(
      <VisitorStats
        todayVisitors={null}
        totalVisitors={null}
        totalMembers={null}
        error="Could not load stats."
        translate={mockTranslate}
      />
    );

    expect(screen.getByText('Could not load stats.')).toBeInTheDocument();
  });

  it('should display Live stats when no error', () => {
    render(
      <VisitorStats
        todayVisitors={100}
        totalVisitors={2000}
        totalMembers={500}
        error={null}
        translate={mockTranslate}
      />
    );

    expect(screen.getByText('Live stats')).toBeInTheDocument();
  });

  it('should render stat icons', () => {
    render(
      <VisitorStats
        todayVisitors={100}
        totalVisitors={2000}
        totalMembers={500}
        error={null}
        translate={mockTranslate}
      />
    );

    expect(screen.getByText('👁️')).toBeInTheDocument();
    expect(screen.getByText('🌟')).toBeInTheDocument();
    expect(screen.getByText('✨')).toBeInTheDocument();
  });

  it('should format large numbers correctly', () => {
    render(
      <VisitorStats
        todayVisitors={1500000}
        totalVisitors={1000}
        totalMembers={999}
        error={null}
        translate={mockTranslate}
      />
    );

    expect(screen.getByText('1.5M')).toBeInTheDocument();
    expect(screen.getByText('1K')).toBeInTheDocument();
    expect(screen.getByText('999')).toBeInTheDocument();
  });
});
