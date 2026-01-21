/**
 * Tests for LanguageSwitcher component
 * src/components/LanguageSwitcher/LanguageSwitcher.tsx
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LanguageSwitcher from '@/components/LanguageSwitcher/LanguageSwitcher';

// Mock the I18n provider
const mockSetLocale = vi.fn();
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    locale: 'en',
    setLocale: mockSetLocale,
    dir: 'ltr',
  }),
  SUPPORTED_LOCALES: ['en', 'ko', 'es', 'fr', 'de', 'pt', 'ru', 'ja', 'zh', 'ar'],
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render the trigger button', () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole('button', { name: /language/i });
      expect(button).toBeInTheDocument();
    });

    it('should display current language label', () => {
      render(<LanguageSwitcher />);

      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should display current language flag', () => {
      render(<LanguageSwitcher />);

      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
    });

    it('should not show dropdown by default', () => {
      render(<LanguageSwitcher />);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('dropdown behavior', () => {
    it('should open dropdown when button is clicked', () => {
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should close dropdown when button is clicked again', () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');

      fireEvent.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should display all supported languages in dropdown', () => {
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByRole('button'));

      // English appears twice (in button and dropdown), so use getAllByText
      expect(screen.getAllByText('English').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('한국어')).toBeInTheDocument();
      expect(screen.getByText('Español')).toBeInTheDocument();
      expect(screen.getByText('Français')).toBeInTheDocument();
      expect(screen.getByText('Deutsch')).toBeInTheDocument();
      expect(screen.getByText('Português')).toBeInTheDocument();
      expect(screen.getByText('Русский')).toBeInTheDocument();
      expect(screen.getByText('日本語')).toBeInTheDocument();
      expect(screen.getByText('中文')).toBeInTheDocument();
      expect(screen.getByText('العربية')).toBeInTheDocument();
    });

    it('should display flags for each language', () => {
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('🇰🇷')).toBeInTheDocument();
      expect(screen.getByText('🇪🇸')).toBeInTheDocument();
      expect(screen.getByText('🇫🇷')).toBeInTheDocument();
      expect(screen.getByText('🇩🇪')).toBeInTheDocument();
      expect(screen.getByText('🇯🇵')).toBeInTheDocument();
      expect(screen.getByText('🇨🇳')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <LanguageSwitcher />
        </div>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('language selection', () => {
    it('should call setLocale when a language is selected', () => {
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByRole('option', { name: /한국어/i }));

      expect(mockSetLocale).toHaveBeenCalledWith('ko');
    });

    it('should close dropdown after selection', async () => {
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByRole('option', { name: /español/i }));

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should mark current language as selected', () => {
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByRole('button'));

      const englishOption = screen.getByRole('option', { name: /english/i });
      expect(englishOption).toHaveAttribute('aria-selected', 'true');
    });

    it('should show checkmark for selected language', () => {
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByRole('button'));

      const englishOption = screen.getByRole('option', { name: /english/i });
      const checkmark = englishOption.querySelector('svg');
      expect(checkmark).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('should close dropdown on Escape key', () => {
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole('button').parentElement!, { key: 'Escape' });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should return focus to trigger on Escape', () => {
      render(<LanguageSwitcher />);

      const triggerButton = screen.getByRole('button');
      fireEvent.click(triggerButton);

      fireEvent.keyDown(triggerButton.parentElement!, { key: 'Escape' });

      expect(triggerButton).toHaveFocus();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on trigger', () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Language');
    });

    it('should have aria-expanded attribute', () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-haspopup attribute', () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('should have title attribute on trigger', () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Select language');
    });

    it('should have aria-label on listbox', () => {
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByRole('button'));

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Available languages');
    });

    it('should have role option on each language item', () => {
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByRole('button'));

      const options = screen.getAllByRole('option');
      expect(options.length).toBe(10); // 10 supported locales
    });

    it('should have aria-hidden on decorative flags', () => {
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByRole('button'));

      const flags = screen.getAllByText(/🇺🇸|🇰🇷|🇪🇸|🇫🇷|🇩🇪|🇵🇹|🇷🇺|🇯🇵|🇨🇳|🇸🇦/);
      flags.forEach((flag) => {
        expect(flag).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('visual states', () => {
    it('should apply different styles when open', () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');

      // Get initial classes
      const initialClasses = button.className;

      fireEvent.click(button);

      // Classes should change when open
      expect(button.className).not.toBe(initialClasses);
    });

    it('should rotate chevron when dropdown is open', () => {
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByRole('button'));

      const svg = screen.getByRole('button').querySelector('svg');
      expect(svg).toHaveClass('rotate-180');
    });
  });
});
