/**
 * Tests for WeeklyFortuneCard component
 * src/components/WeeklyFortuneCard.tsx
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import WeeklyFortuneCard from '@/components/WeeklyFortuneCard';

// Mock next/image
vi.mock('next/image', () => ({
  default: function MockImage({ src, alt, ...props }: { src: string; alt: string }) {
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WeeklyFortuneCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loading state', () => {
    it('should show skeleton while loading', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<WeeklyFortuneCard />);

      const skeleton = container.querySelector('[class*="skeleton"]');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('successful fetch', () => {
    it('should render fortune card with data', async () => {
      const mockData = {
        imageUrl: 'https://example.com/fortune.jpg',
        generatedAt: '2024-01-15',
        weekNumber: 3,
        theme: '새로운 시작의 기운',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      render(<WeeklyFortuneCard />);

      await waitFor(() => {
        expect(screen.getByText('✨ 이번 주 운세')).toBeInTheDocument();
      });

      expect(screen.getByText('Week 3')).toBeInTheDocument();
      expect(screen.getByText('새로운 시작의 기운')).toBeInTheDocument();
      expect(screen.getByText('이번 주의 에너지를 느껴보세요')).toBeInTheDocument();
    });

    it('should render image with correct attributes', async () => {
      const mockData = {
        imageUrl: 'https://example.com/fortune.jpg',
        generatedAt: '2024-01-15',
        weekNumber: 5,
        theme: '행운의 주간',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      render(<WeeklyFortuneCard />);

      await waitFor(() => {
        const image = screen.getByAltText('이번 주 운세 이미지');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'https://example.com/fortune.jpg');
      });
    });

    it('should call fetch with correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrl: 'https://example.com/fortune.jpg',
          weekNumber: 1,
          theme: 'Test',
        }),
      });

      render(<WeeklyFortuneCard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/weekly-fortune');
      });
    });
  });

  describe('error handling', () => {
    it('should render nothing on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(<WeeklyFortuneCard />);

      await waitFor(() => {
        expect(container.querySelector('[class*="card"]')).not.toBeInTheDocument();
      });
    });

    it('should render nothing on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { container } = render(<WeeklyFortuneCard />);

      await waitFor(() => {
        expect(container.querySelector('[class*="card"]')).not.toBeInTheDocument();
      });
    });

    it('should render nothing when imageUrl is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          weekNumber: 1,
          theme: 'Test',
          // No imageUrl
        }),
      });

      const { container } = render(<WeeklyFortuneCard />);

      await waitFor(() => {
        // Should not show the card content after loading
        expect(screen.queryByText('✨ 이번 주 운세')).not.toBeInTheDocument();
      });
    });
  });

  describe('structure', () => {
    it('should have correct card structure', async () => {
      const mockData = {
        imageUrl: 'https://example.com/fortune.jpg',
        weekNumber: 2,
        theme: '평화로운 주간',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const { container } = render(<WeeklyFortuneCard />);

      await waitFor(() => {
        expect(screen.getByText('✨ 이번 주 운세')).toBeInTheDocument();
      });

      // Check for header
      expect(container.querySelector('[class*="header"]')).toBeInTheDocument();

      // Check for image wrapper
      expect(container.querySelector('[class*="imageWrapper"]')).toBeInTheDocument();

      // Check for footer
      expect(container.querySelector('[class*="footer"]')).toBeInTheDocument();
    });

    it('should display badge in header', async () => {
      const mockData = {
        imageUrl: 'https://example.com/fortune.jpg',
        weekNumber: 10,
        theme: 'Test Theme',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const { container } = render(<WeeklyFortuneCard />);

      await waitFor(() => {
        const badge = container.querySelector('[class*="badge"]');
        expect(badge).toHaveTextContent('✨ 이번 주 운세');
      });
    });
  });

  describe('different week numbers', () => {
    it.each([1, 15, 52])('should display week number %i correctly', async (weekNum) => {
      const mockData = {
        imageUrl: 'https://example.com/fortune.jpg',
        weekNumber: weekNum,
        theme: 'Test Theme',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      render(<WeeklyFortuneCard />);

      await waitFor(() => {
        expect(screen.getByText(`Week ${weekNum}`)).toBeInTheDocument();
      });
    });
  });

  describe('different themes', () => {
    const themes = [
      '사랑과 관계의 기운',
      '재물운 상승',
      '건강 회복의 시기',
      '새로운 기회',
    ];

    it.each(themes)('should display theme: %s', async (theme) => {
      const mockData = {
        imageUrl: 'https://example.com/fortune.jpg',
        weekNumber: 1,
        theme,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      render(<WeeklyFortuneCard />);

      await waitFor(() => {
        expect(screen.getByText(theme)).toBeInTheDocument();
      });
    });
  });
});
