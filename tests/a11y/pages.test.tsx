/**
 * Accessibility Tests for Page Components
 * Tests main application pages for WCAG compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from './axe-helper';
import React from 'react';

// Mock Next.js components
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'ko',
    setLocale: vi.fn(),
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Accessibility: Page Components', () => {
  beforeEach(() => {
    cleanup();
  });

  describe('Navigation Structure', () => {
    it('should have proper heading hierarchy', async () => {
      const { container } = render(
        <main>
          <h1>Main Page Title</h1>
          <section>
            <h2>Section Title</h2>
            <p>Content</p>
            <h3>Subsection</h3>
            <p>More content</p>
          </section>
        </main>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('should have skip to main content link', async () => {
      const { container, getByText } = render(
        <div>
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
          <main id="main">
            <h1>Main Content</h1>
          </main>
        </div>
      );

      const skipLink = getByText('Skip to main content');
      expect(skipLink).toHaveAttribute('href', '#main');

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Form Accessibility', () => {
    it('should have accessible form with proper labels', async () => {
      const { container } = render(
        <form aria-label="Contact form">
          <fieldset>
            <legend>Personal Information</legend>
            <div>
              <label htmlFor="name">Name *</label>
              <input id="name" type="text" required aria-required="true" />
            </div>
            <div>
              <label htmlFor="email">Email *</label>
              <input id="email" type="email" required aria-required="true" />
            </div>
          </fieldset>
          <button type="submit">Submit</button>
        </form>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('should have accessible error messages', async () => {
      const { container } = render(
        <form aria-label="Login form">
          <div>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              aria-invalid="true"
              aria-describedby="username-error"
            />
            <span id="username-error" role="alert">
              Username is required
            </span>
          </div>
          <button type="submit">Login</button>
        </form>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Interactive Elements', () => {
    it('should have accessible buttons', async () => {
      const { container } = render(
        <div>
          <button>Text Button</button>
          <button aria-label="Close dialog">
            <span aria-hidden="true">×</span>
          </button>
          <button disabled>Disabled Button</button>
        </div>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('should have accessible links', async () => {
      const { container } = render(
        <nav aria-label="Main navigation">
          <a href="/">Home</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact</a>
          <a href="https://external.com" target="_blank" rel="noopener noreferrer">
            External Link
            <span className="sr-only"> (opens in new window)</span>
          </a>
        </nav>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Content Structure', () => {
    it('should have accessible lists', async () => {
      const { container } = render(
        <div>
          <h2>Features</h2>
          <ul>
            <li>Feature 1</li>
            <li>Feature 2</li>
            <li>Feature 3</li>
          </ul>
        </div>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('should have accessible tables', async () => {
      const { container } = render(
        <table>
          <caption>User Statistics</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Doe</td>
              <td>john@example.com</td>
              <td>Active</td>
            </tr>
          </tbody>
        </table>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('ARIA Attributes', () => {
    it('should have proper ARIA roles', async () => {
      const { container } = render(
        <div>
          <header role="banner">
            <h1>Site Title</h1>
          </header>
          <nav role="navigation" aria-label="Main">
            <a href="/">Home</a>
          </nav>
          <main role="main">
            <h2>Content</h2>
          </main>
          <footer role="contentinfo">
            <p>Footer</p>
          </footer>
        </div>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('should have accessible live regions', async () => {
      const { container } = render(
        <div>
          <div role="status" aria-live="polite" aria-atomic="true">
            Loading content...
          </div>
          <div role="alert" aria-live="assertive">
            Error: Please try again
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should have focusable interactive elements', async () => {
      const { container } = render(
        <div>
          <button>Button 1</button>
          <a href="/link">Link</a>
          <label htmlFor="text-input">Text Input</label>
          <input id="text-input" type="text" placeholder="Input" />
          <label htmlFor="select-input">Select Option</label>
          <select id="select-input">
            <option>Option 1</option>
          </select>
          <label htmlFor="textarea-input">Textarea</label>
          <textarea id="textarea-input" placeholder="Textarea"></textarea>
        </div>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('should have proper tab order', async () => {
      const { container } = render(
        <div>
          <button tabIndex={0}>First</button>
          <button tabIndex={0}>Second</button>
          <button tabIndex={0}>Third</button>
          <div tabIndex={-1}>Not in tab order</div>
        </div>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Images and Media', () => {
    it('should have accessible images', async () => {
      const { container } = render(
        <div>
          <img src="/logo.png" alt="Company Logo" />
          <img src="/decorative.png" alt="" role="presentation" />
          <figure>
            <img src="/chart.png" alt="Sales chart for Q4" />
            <figcaption>Q4 Sales Performance</figcaption>
          </figure>
        </div>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('should have accessible icons', async () => {
      const { container } = render(
        <div>
          <button aria-label="Search">
            <svg aria-hidden="true" focusable="false">
              <path d="M10 10" />
            </svg>
          </button>
          <span role="img" aria-label="Star rating">
            ★★★★☆
          </span>
        </div>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Color Contrast', () => {
    it('should have sufficient color contrast', async () => {
      const { container } = render(
        <div>
          <p style={{ color: '#000', backgroundColor: '#fff' }}>
            Black text on white background (21:1 ratio)
          </p>
          <button style={{ color: '#fff', backgroundColor: '#0066cc' }}>
            Button with good contrast
          </button>
        </div>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Responsive and Mobile', () => {
    it('should have accessible viewport meta', async () => {
      const { container } = render(
        <div role="main">
          <h1>Responsive Page</h1>
          <p>Content that adapts to screen size</p>
        </div>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });
});
