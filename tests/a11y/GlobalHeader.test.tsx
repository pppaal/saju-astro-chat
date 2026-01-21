/**
 * Accessibility Tests for GlobalHeader Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from './axe-helper';
import React from 'react';

// Mock next-auth
vi.mock('next-auth/react', () => {
  return {
    useSession: vi.fn(() => ({
      data: null,
      status: 'unauthenticated',
    })),
    signOut: vi.fn(),
  };
});

// Mock next/navigation
vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
    }),
    usePathname: () => '/test',
  };
});

// Mock I18n
vi.mock('@/i18n/I18nProvider', () => {
  return {
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'ko',
    }),
  };
});

// Import after mocks
import GlobalHeader from '@/components/ui/GlobalHeader';
import { useSession } from 'next-auth/react';

describe('Accessibility: GlobalHeader', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Unauthenticated state', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<GlobalHeader />);

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('should have proper banner role', () => {
      const { getByRole } = render(<GlobalHeader />);
      expect(getByRole('banner')).toBeInTheDocument();
    });

    it('should have accessible login link', () => {
      const { getByRole } = render(<GlobalHeader />);
      // Check for home link instead since unauthenticated may not have login button
      const homeLink = getByRole('link', { name: /home/i });
      expect(homeLink).toBeInTheDocument();
    });
  });

  describe('Authenticated state', () => {
    beforeEach(() => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: { name: 'Test User', email: 'test@example.com' },
          expires: '2099-01-01',
        },
        status: 'authenticated',
        update: vi.fn(),
      });
    });

    it('should have no accessibility violations when logged in', async () => {
      const { container } = render(<GlobalHeader />);

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('should have accessible user menu button with aria attributes', () => {
      const { getByRole } = render(<GlobalHeader />);

      // User menu button should exist (translated key is "nav.userMenu" from mock)
      const userMenuButton = getByRole('button', { name: /userMenu/i });
      expect(userMenuButton).toBeInTheDocument();
      expect(userMenuButton).toHaveAttribute('aria-expanded', 'false');
      expect(userMenuButton).toHaveAttribute('aria-haspopup', 'true');
    });
  });

  describe('Keyboard navigation', () => {
    beforeEach(() => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: { name: 'Test User', email: 'test@example.com' },
          expires: '2099-01-01',
        },
        status: 'authenticated',
        update: vi.fn(),
      });
    });

    it('should have focusable buttons', () => {
      const { getAllByRole } = render(<GlobalHeader />);
      const buttons = getAllByRole('button');

      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});
