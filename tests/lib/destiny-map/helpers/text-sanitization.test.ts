import { describe, it, expect } from 'vitest';
import { cleanseText, isJsonResponse } from '@/lib/destiny-map/helpers/text-sanitization';

describe('text-sanitization', () => {
  describe('cleanseText', () => {
    describe('empty input handling', () => {
      it('should return empty string for null/undefined input', () => {
        expect(cleanseText(null as any)).toBe('');
        expect(cleanseText(undefined as any)).toBe('');
      });

      it('should return empty string for empty string input', () => {
        expect(cleanseText('')).toBe('');
      });
    });

    describe('script tag removal', () => {
      it('should remove inline script tags', () => {
        const input = '<script>alert("xss")</script>Hello';
        expect(cleanseText(input)).toBe('Hello');
      });

      it('should remove script tags with src attribute', () => {
        const input = 'Test<script src="evil.js"></script>Content';
        expect(cleanseText(input)).toBe('TestContent');
      });

      it('should remove multi-line script tags', () => {
        const input = `Before<script>
          var x = 1;
          alert(x);
        </script>After`;
        expect(cleanseText(input)).toBe('BeforeAfter');
      });

      it('should handle case-insensitive script tags', () => {
        const input = '<SCRIPT>alert(1)</SCRIPT>Safe';
        expect(cleanseText(input)).toBe('Safe');
      });
    });

    describe('style tag removal', () => {
      it('should remove style tags', () => {
        const input = '<style>.evil { display: none; }</style>Content';
        expect(cleanseText(input)).toBe('Content');
      });

      it('should remove multi-line style tags', () => {
        const input = `Text<style>
          .hidden { display: none; }
        </style>More`;
        // After removing style tag and collapsing whitespace, Text and More get joined
        expect(cleanseText(input)).toBe('TextMore');
      });
    });

    describe('HTML tag removal for non-JSON', () => {
      it('should remove simple HTML tags', () => {
        const input = '<p>Paragraph</p><div>Div</div>';
        expect(cleanseText(input)).toBe('ParagraphDiv');
      });

      it('should remove HTML tags with attributes', () => {
        const input = '<a href="evil.com">Link</a>';
        expect(cleanseText(input)).toBe('Link');
      });

      it('should remove self-closing tags', () => {
        const input = 'Text<br/>More<hr/>End';
        expect(cleanseText(input)).toBe('TextMoreEnd');
      });
    });

    describe('event handler removal', () => {
      it('should remove onclick handlers with quotes', () => {
        const input = '<div onclick="alert(1)">Click</div>';
        expect(cleanseText(input)).not.toContain('onclick');
      });

      it('should remove onmouseover handlers', () => {
        const input = '<span onmouseover="evil()">Hover</span>';
        expect(cleanseText(input)).not.toContain('onmouseover');
      });

      it('should remove onerror handlers', () => {
        const input = '<img onerror="hack()" src="x">';
        expect(cleanseText(input)).not.toContain('onerror');
      });

      it('should remove handlers without quotes', () => {
        const input = '<div onclick=alert(1)>Test</div>';
        expect(cleanseText(input)).not.toContain('onclick');
      });
    });

    describe('JSON response preservation', () => {
      it('should preserve JSON structure', () => {
        const input = '{"title": "Test", "content": "Hello"}';
        const result = cleanseText(input);

        expect(result).toContain('{');
        expect(result).toContain('}');
        expect(result).toContain('"title"');
      });

      it('should preserve JSON with lifeTimeline key', () => {
        const input = '{"lifeTimeline": [{"year": 2024, "event": "Important"}]}';
        const result = cleanseText(input);

        expect(result).toContain('"lifeTimeline"');
        expect(result).toContain('2024');
      });

      it('should preserve JSON with categoryAnalysis key', () => {
        const input = '{"categoryAnalysis": {"career": "Good", "love": "Great"}}';
        const result = cleanseText(input);

        expect(result).toContain('"categoryAnalysis"');
        expect(result).toContain('"career"');
      });

      it('should remove script tags from JSON while preserving structure', () => {
        const input = '{"title": "Test<script>alert(1)</script>", "valid": true}';
        const result = cleanseText(input);

        expect(result).not.toContain('<script>');
        expect(result).toContain('"title"');
        expect(result).toContain('"valid"');
      });

      it('should remove event handlers from JSON', () => {
        const input = '{"html": "<div onclick=\\"evil()\\">Test</div>"}';
        const result = cleanseText(input);

        expect(result).not.toContain('onclick');
      });
    });

    describe('special character handling', () => {
      it('should replace &nbsp; with space', () => {
        const input = 'Word1&nbsp;Word2';
        expect(cleanseText(input)).toBe('Word1 Word2');
      });

      it('should remove angle brackets', () => {
        const input = 'Test < > content';
        expect(cleanseText(input)).toBe('Test content');
      });

      it('should collapse multiple spaces', () => {
        const input = 'Too    many     spaces';
        expect(cleanseText(input)).toBe('Too many spaces');
      });
    });

    describe('dangerous keyword removal (non-JSON)', () => {
      it('should remove @import directives', () => {
        const input = '@import url("evil.css"); Content';
        expect(cleanseText(input)).not.toContain('@import');
      });

      it('should remove document.write', () => {
        const input = 'document.write("hack")';
        const result = cleanseText(input);
        expect(result).not.toContain('document.write');
      });

      it('should remove form tags', () => {
        const input = '<form action="evil.com">Input</form>';
        expect(cleanseText(input)).toBe('Input');
      });
    });

    describe('markdown preservation', () => {
      it('should preserve markdown headers', () => {
        const input = '# Title\n\n## Subtitle';
        expect(cleanseText(input)).toContain('# Title');
        expect(cleanseText(input)).toContain('## Subtitle');
      });

      it('should preserve markdown bold', () => {
        const input = '**bold text**';
        expect(cleanseText(input)).toContain('**bold text**');
      });

      it('should preserve markdown lists', () => {
        const input = '- Item 1\n- Item 2';
        expect(cleanseText(input)).toContain('- Item 1');
      });
    });

    describe('trimming', () => {
      it('should trim leading whitespace', () => {
        const input = '   Content';
        expect(cleanseText(input)).toBe('Content');
      });

      it('should trim trailing whitespace', () => {
        const input = 'Content   ';
        expect(cleanseText(input)).toBe('Content');
      });

      it('should trim both sides', () => {
        const input = '  Content  ';
        expect(cleanseText(input)).toBe('Content');
      });
    });
  });

  describe('isJsonResponse', () => {
    it('should return false for empty input', () => {
      expect(isJsonResponse('')).toBe(false);
      expect(isJsonResponse(null as any)).toBe(false);
      expect(isJsonResponse(undefined as any)).toBe(false);
    });

    it('should detect JSON starting with curly brace', () => {
      expect(isJsonResponse('{"key": "value"}')).toBe(true);
      expect(isJsonResponse('  {"key": "value"}')).toBe(true);
    });

    it('should detect lifeTimeline key', () => {
      expect(isJsonResponse('some text "lifeTimeline" more text')).toBe(true);
    });

    it('should detect categoryAnalysis key', () => {
      expect(isJsonResponse('response with "categoryAnalysis" key')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isJsonResponse('Just plain text')).toBe(false);
    });

    it('should return false for markdown', () => {
      expect(isJsonResponse('# Markdown Title\n\nSome content')).toBe(false);
    });

    it('should return false for array JSON', () => {
      expect(isJsonResponse('["item1", "item2"]')).toBe(false);
    });
  });
});
