/**
 * Text Guards MEGA Test Suite
 * Comprehensive edge case testing for all text sanitization functions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  FORBIDDEN_PATTERNS,
  PROMPT_BUDGET_CHARS,
  cleanText,
  guardText,
  containsForbidden,
  safetyMessage,
} from '@/lib/textGuards';

describe('textGuards MEGA - cleanText exhaustive tests', () => {
  describe('Script tag variations', () => {
    it.each([
      '<script>alert(1)</script>',
      '<SCRIPT>alert(1)</SCRIPT>',
      '<ScRiPt>alert(1)</ScRiPt>',
      '<script type="text/javascript">alert(1)</script>',
      '<script src="evil.js"></script>',
      '<script async>alert(1)</script>',
      '<script defer>alert(1)</script>',
      'Text<script>alert(1)</script>More',
      '<script>\nalert(1)\n</script>',
      '<script>alert("xss")</script><script>alert(2)</script>',
    ])('should remove script tag: %s', (input) => {
      const result = cleanText(input);
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
    });
  });

  describe('HTML tag variations', () => {
    it.each([
      '<div>content</div>',
      '<p>paragraph</p>',
      '<span>text</span>',
      '<a href="link">text</a>',
      '<img src="image.jpg" />',
      '<br/>',
      '<hr />',
      '<input type="text" />',
      '<button>Click</button>',
      '<h1>Header</h1>',
      '<ul><li>item</li></ul>',
      '<table><tr><td>cell</td></tr></table>',
      '<form><input /></form>',
      '<iframe src="evil"></iframe>',
      '<object data="evil"></object>',
    ])('should remove HTML tag: %s', (input) => {
      const result = cleanText(input);
      expect(result).not.toMatch(/<[^>]+>/);
    });
  });

  describe('Dangerous character removal', () => {
    it('should remove {', () => {
      expect(cleanText('Hello {world')).toBe('Hello world');
    });

    it('should remove }', () => {
      expect(cleanText('Hello world}')).toBe('Hello world');
    });

    it('should remove <', () => {
      expect(cleanText('Hello < world')).toBe('Hello');
    });

    it('should remove >', () => {
      expect(cleanText('Hello > world')).toBe('Hello world');
    });

    it('should remove multiple braces', () => {
      expect(cleanText('{{{Hello}}}')).toBe('Hello');
    });

    it('should remove mixed dangerous chars', () => {
      expect(cleanText('Hello {<world>}')).toBe('Hello');
    });
  });

  describe('Whitespace handling', () => {
    it('should collapse 2 spaces', () => {
      expect(cleanText('Hello  World')).toBe('Hello World');
    });

    it('should collapse 3 spaces', () => {
      expect(cleanText('Hello   World')).toBe('Hello World');
    });

    it('should collapse 10 spaces', () => {
      expect(cleanText('Hello          World')).toBe('Hello World');
    });

    it('should collapse tabs', () => {
      expect(cleanText('Hello\t\tWorld')).toBe('Hello World');
    });

    it('should collapse newlines', () => {
      expect(cleanText('Hello\n\nWorld')).toBe('Hello World');
    });

    it('should collapse mixed whitespace', () => {
      expect(cleanText('Hello \n\t  World')).toBe('Hello World');
    });

    it('should trim leading spaces', () => {
      expect(cleanText('   Hello')).toBe('Hello');
    });

    it('should trim trailing spaces', () => {
      expect(cleanText('Hello   ')).toBe('Hello');
    });

    it('should trim leading and trailing spaces', () => {
      expect(cleanText('   Hello   ')).toBe('Hello');
    });

    it('should handle only whitespace', () => {
      expect(cleanText('     ')).toBe('');
    });
  });

  describe('Length limits', () => {
    it('should enforce default 1800 limit', () => {
      const input = 'a'.repeat(2000);
      expect(cleanText(input)).toHaveLength(1800);
    });

    it('should enforce custom 100 limit', () => {
      const input = 'a'.repeat(500);
      expect(cleanText(input, 100)).toHaveLength(100);
    });

    it('should enforce custom 1 limit', () => {
      const input = 'hello';
      expect(cleanText(input, 1)).toHaveLength(1);
    });

    it('should enforce custom 5000 limit', () => {
      const input = 'a'.repeat(6000);
      expect(cleanText(input, 5000)).toHaveLength(5000);
    });

    it('should not truncate if under limit', () => {
      const input = 'a'.repeat(100);
      expect(cleanText(input, 200)).toHaveLength(100);
    });

    it('should handle 0 limit', () => {
      expect(cleanText('hello', 0)).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(cleanText('')).toBe('');
    });

    it('should handle null', () => {
      expect(cleanText(null as any)).toBe('');
    });

    it('should handle undefined', () => {
      expect(cleanText(undefined as any)).toBe('');
    });

    it('should handle number input', () => {
      expect(cleanText(123 as any)).toBe('123');
    });

    it('should handle boolean true', () => {
      expect(cleanText(true as any)).toBe('true');
    });

    it('should handle boolean false', () => {
      expect(cleanText(false as any)).toBe('');
    });

    it('should handle object input', () => {
      const result = cleanText({ foo: 'bar' } as any);
      expect(typeof result).toBe('string');
    });

    it('should handle array input', () => {
      const result = cleanText(['a', 'b'] as any);
      expect(typeof result).toBe('string');
    });
  });

  describe('Combined XSS attempts', () => {
    it('should handle script + HTML', () => {
      const input = '<div><script>alert(1)</script></div>';
      const result = cleanText(input);
      expect(result).not.toContain('script');
      expect(result).not.toContain('div');
    });

    it('should handle nested tags', () => {
      const input = '<div><p><span>text</span></p></div>';
      const result = cleanText(input);
      expect(result).toBe('text');
    });

    it('should handle tags + braces', () => {
      const input = '<div>{dangerous}</div>';
      const result = cleanText(input);
      expect(result).toBe('dangerous');
    });

    it('should handle script with braces', () => {
      const input = '<script>{alert(1)}</script>';
      const result = cleanText(input);
      expect(result).not.toContain('alert');
    });
  });

  describe('Unicode and special characters', () => {
    it('should preserve emoji', () => {
      expect(cleanText('Hello 😀 World')).toContain('😀');
    });

    it('should preserve Korean characters', () => {
      expect(cleanText('안녕하세요')).toBe('안녕하세요');
    });

    it('should preserve Chinese characters', () => {
      expect(cleanText('你好世界')).toBe('你好世界');
    });

    it('should preserve Japanese characters', () => {
      expect(cleanText('こんにちは')).toBe('こんにちは');
    });

    it('should preserve mixed unicode', () => {
      expect(cleanText('Hello 안녕 世界 😀')).toContain('안녕');
    });
  });
});

describe('textGuards MEGA - guardText exhaustive tests', () => {
  beforeEach(() => {
    FORBIDDEN_PATTERNS.forEach(p => (p.lastIndex = 0));
  });

  describe('PII filtering', () => {
    const piiInputs = [
      'my ssn is 123-45-6789',
      'social security number',
      'passport number ABC123',
      "driver's license",
      'drivers license',
      'phone number 555-1234',
      'contact number',
      'my address is 123 Main St',
      'email me at test@example.com',
      'SSN',
      'SOCIAL SECURITY',
      'Phone Number',
    ];

    piiInputs.forEach((input, idx) => {
      it(`should filter PII input ${idx + 1}: "${input.substring(0, 30)}"`, () => {
        const result = guardText(input);
        expect(result).toContain('[filtered]');
      });
    });
  });

  describe('Finance filtering', () => {
    const financeInputs = [
      'get a loan',
      'mortgage rates',
      'stock market tips',
      'investment advice',
      'buy bitcoin',
      'cryptocurrency trading',
      'forex signals',
      'options trading strategy',
      'brokerage account',
      'LOAN',
      'Bitcoin',
      'CRYPTO',
    ];

    financeInputs.forEach((input, idx) => {
      it(`should filter finance input ${idx + 1}: "${input}"`, () => {
        const result = guardText(input);
        expect(result).toContain('[filtered]');
      });
    });
  });

  describe('Medical filtering', () => {
    const medicalInputs = [
      'give me a diagnosis',
      'prescription medication',
      'medical advice needed',
      'treatment plan',
      'therapy session',
      'see a doctor',
      'visit clinic',
      'go to hospital',
      'DIAGNOSIS',
      'Medical Advice',
    ];

    medicalInputs.forEach((input, idx) => {
      it(`should filter medical input ${idx + 1}: "${input}"`, () => {
        const result = guardText(input);
        expect(result).toContain('[filtered]');
      });
    });
  });

  describe('Gambling filtering', () => {
    const gamblingInputs = [
      'online gambling',
      'casino games',
      'sports betting',
      'sportsbook odds',
      'play roulette',
      'blackjack strategy',
      'poker tips',
      'GAMBLING',
      'Casino',
    ];

    gamblingInputs.forEach((input, idx) => {
      it(`should filter gambling input ${idx + 1}: "${input}"`, () => {
        const result = guardText(input);
        expect(result).toContain('[filtered]');
      });
    });
  });

  describe('Self-harm filtering', () => {
    const selfHarmInputs = [
      'self-harm thoughts',
      'suicide prevention',
      'want to harm myself',
      'kill myself',
      'end my life',
    ];

    selfHarmInputs.forEach((input, idx) => {
      it(`should filter self-harm input ${idx + 1}`, () => {
        const result = guardText(input);
        expect(result).toContain('[filtered]');
      });
    });
  });

  describe('Safe content preservation', () => {
    const safeInputs = [
      'What is my fortune?',
      'Tell me about my zodiac sign',
      'Daily horoscope please',
      'Tarot card reading',
      'Astrology chart',
      'Birth chart analysis',
      'Saju reading',
      'Destiny analysis',
      'Compatibility check',
      'Lucky numbers',
    ];

    safeInputs.forEach((input, idx) => {
      it(`should preserve safe input ${idx + 1}: "${input}"`, () => {
        const result = guardText(input);
        expect(result).toBe(input);
        expect(result).not.toContain('[filtered]');
      });
    });
  });

  describe('Multiple violations', () => {
    it('should filter multiple PII terms', () => {
      const input = 'my ssn and phone number';
      const result = guardText(input);
      const filterCount = (result.match(/\[filtered\]/g) || []).length;
      expect(filterCount).toBeGreaterThan(0);
    });

    it('should filter mixed categories', () => {
      const input = 'bitcoin investment and medical advice';
      const result = guardText(input);
      expect(result).toContain('[filtered]');
    });

    it('should handle all categories at once', () => {
      const input = 'ssn bitcoin diagnosis gambling suicide';
      const result = guardText(input);
      expect(result).toContain('[filtered]');
    });
  });

  describe('Combined with XSS', () => {
    it('should clean and filter', () => {
      const input = '<script>alert(1)</script>my ssn';
      const result = guardText(input);
      expect(result).not.toContain('script');
      expect(result).toContain('[filtered]');
    });

    it('should handle tags around forbidden terms', () => {
      const input = '<div>bitcoin investment</div>';
      const result = guardText(input);
      expect(result).toContain('[filtered]');
      expect(result).not.toContain('div');
    });
  });
});

describe('textGuards MEGA - containsForbidden exhaustive tests', () => {
  beforeEach(() => {
    FORBIDDEN_PATTERNS.forEach(p => (p.lastIndex = 0));
  });

  describe('Case insensitivity', () => {
    it('should detect lowercase', () => {
      expect(containsForbidden('ssn')).toBe(true);
    });

    it('should detect uppercase', () => {
      expect(containsForbidden('SSN')).toBe(true);
    });

    it('should detect mixed case', () => {
      expect(containsForbidden('SsN')).toBe(true);
    });

    it('should detect BITCOIN', () => {
      expect(containsForbidden('BITCOIN')).toBe(true);
    });

    it('should detect BiTcOiN', () => {
      expect(containsForbidden('BiTcOiN')).toBe(true);
    });
  });

  describe('Word boundaries', () => {
    it('should detect ssn as whole word', () => {
      expect(containsForbidden('my ssn')).toBe(true);
    });

    it('should detect bitcoin as whole word', () => {
      expect(containsForbidden('buy bitcoin')).toBe(true);
    });

    it('should detect diagnosis as whole word', () => {
      expect(containsForbidden('need diagnosis')).toBe(true);
    });

    it('should detect gambling as whole word', () => {
      expect(containsForbidden('online gambling')).toBe(true);
    });
  });

  describe('All forbidden terms individually', () => {
    const forbiddenTerms = [
      'ssn',
      'social security',
      'passport',
      "driver's license",
      'phone number',
      'contact number',
      'address',
      'email',
      'loan',
      'mortgage',
      'stock',
      'investment',
      'bitcoin',
      'crypto',
      'forex',
      'options trading',
      'brokerage',
      'diagnosis',
      'prescription',
      'medical advice',
      'treatment plan',
      'therapy',
      'doctor',
      'clinic',
      'hospital',
      'gambling',
      'casino',
      'betting',
      'sportsbook',
      'roulette',
      'blackjack',
      'poker',
      'self-harm',
      'suicide',
      'harm myself',
      'kill myself',
      'end my life',
    ];

    forbiddenTerms.forEach(term => {
      it(`should detect "${term}"`, () => {
        FORBIDDEN_PATTERNS.forEach(p => (p.lastIndex = 0));
        expect(containsForbidden(term)).toBe(true);
      });
    });
  });

  describe('Safe terms should pass', () => {
    const safeTerms = [
      'fortune',
      'zodiac',
      'horoscope',
      'tarot',
      'astrology',
      'birth chart',
      'saju',
      'destiny',
      'compatibility',
      'lucky',
      'prediction',
    ];

    safeTerms.forEach(term => {
      it(`should allow safe term "${term}"`, () => {
        FORBIDDEN_PATTERNS.forEach(p => (p.lastIndex = 0));
        expect(containsForbidden(term)).toBe(false);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(containsForbidden('')).toBe(false);
    });

    it('should handle single character', () => {
      expect(containsForbidden('a')).toBe(false);
    });

    it('should handle numbers only', () => {
      expect(containsForbidden('12345')).toBe(false);
    });

    it('should handle special characters only', () => {
      expect(containsForbidden('!@#$%')).toBe(false);
    });

    it('should handle whitespace only', () => {
      expect(containsForbidden('   ')).toBe(false);
    });
  });
});

describe('textGuards MEGA - safetyMessage exhaustive tests', () => {
  describe('Korean locale variations', () => {
    const koLocales = ['ko', 'ko-KR', 'ko-kr', 'KO', 'KO-KR', 'korean'];

    koLocales.forEach(locale => {
      it(`should return Korean message for "${locale}"`, () => {
        const result = safetyMessage(locale);
        expect(result).toContain('규제');
      });
    });
  });

  describe('Japanese locale variations', () => {
    const jaLocales = ['ja', 'ja-JP', 'ja-jp', 'JA', 'JA-JP', 'japanese'];

    jaLocales.forEach(locale => {
      it(`should return Japanese message for "${locale}"`, () => {
        const result = safetyMessage(locale);
        expect(result).toContain('規制');
      });
    });
  });

  describe('Chinese locale variations', () => {
    const zhLocales = ['zh', 'zh-CN', 'zh-TW', 'zh-cn', 'ZH'];

    zhLocales.forEach(locale => {
      it(`should return Chinese message for "${locale}"`, () => {
        const result = safetyMessage(locale);
        expect(result).toContain('该主题');
      });
    });
  });

  describe('Spanish locale variations', () => {
    const esLocales = ['es', 'es-ES', 'es-MX', 'es-es', 'ES'];

    esLocales.forEach(locale => {
      it(`should return Spanish message for "${locale}"`, () => {
        const result = safetyMessage(locale);
        expect(result).toContain('restringido');
      });
    });
  });

  describe('French locale variations', () => {
    const frLocales = ['fr', 'fr-FR', 'fr-CA', 'fr-fr', 'FR'];

    frLocales.forEach(locale => {
      it(`should return French message for "${locale}"`, () => {
        const result = safetyMessage(locale);
        expect(result).toContain('restreint');
      });
    });
  });

  describe('German locale variations', () => {
    const deLocales = ['de', 'de-DE', 'de-de', 'DE'];

    deLocales.forEach(locale => {
      it(`should return German message for "${locale}"`, () => {
        const result = safetyMessage(locale);
        expect(result).toContain('Eingeschränkt');
      });
    });
  });

  describe('Portuguese locale variations', () => {
    const ptLocales = ['pt', 'pt-BR', 'pt-PT', 'pt-br', 'PT'];

    ptLocales.forEach(locale => {
      it(`should return Portuguese message for "${locale}"`, () => {
        const result = safetyMessage(locale);
        expect(result).toContain('restrito');
      });
    });
  });

  describe('Russian locale variations', () => {
    const ruLocales = ['ru', 'ru-RU', 'ru-ru', 'RU', 'russian'];

    ruLocales.forEach(locale => {
      it(`should return Russian message for "${locale}"`, () => {
        const result = safetyMessage(locale);
        expect(result).toContain('ограничена');
      });
    });
  });

  describe('English locale variations', () => {
    const enLocales = ['en', 'en-US', 'en-GB', 'en-us', 'EN', 'english'];

    enLocales.forEach(locale => {
      it(`should return English message for "${locale}"`, () => {
        const result = safetyMessage(locale);
        expect(result).toContain("can't be handled");
      });
    });
  });

  describe('Unknown locales default to English', () => {
    const unknownLocales = ['xyz', 'abc', 'unknown', '123', 'zz-ZZ'];

    unknownLocales.forEach(locale => {
      it(`should return English for unknown locale "${locale}"`, () => {
        const result = safetyMessage(locale);
        expect(result).toContain("can't be handled");
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const result = safetyMessage('');
      expect(result).toContain("can't be handled");
    });

    it('should handle null', () => {
      const result = safetyMessage(null as any);
      expect(result).toContain("can't be handled");
    });

    it('should handle undefined', () => {
      const result = safetyMessage(undefined as any);
      expect(result).toContain("can't be handled");
    });

    it('should handle numbers', () => {
      const result = safetyMessage(123 as any);
      expect(result).toContain("can't be handled");
    });
  });
});

describe('textGuards MEGA - FORBIDDEN_PATTERNS structure tests', () => {
  it('should have exactly 5 patterns', () => {
    expect(FORBIDDEN_PATTERNS).toHaveLength(5);
  });

  it('should have PII pattern at index 0', () => {
    expect(FORBIDDEN_PATTERNS[0]).toBeInstanceOf(RegExp);
  });

  it('should have finance pattern at index 1', () => {
    expect(FORBIDDEN_PATTERNS[1]).toBeInstanceOf(RegExp);
  });

  it('should have medical pattern at index 2', () => {
    expect(FORBIDDEN_PATTERNS[2]).toBeInstanceOf(RegExp);
  });

  it('should have gambling pattern at index 3', () => {
    expect(FORBIDDEN_PATTERNS[3]).toBeInstanceOf(RegExp);
  });

  it('should have self-harm pattern at index 4', () => {
    expect(FORBIDDEN_PATTERNS[4]).toBeInstanceOf(RegExp);
  });

  it('should all be case insensitive', () => {
    FORBIDDEN_PATTERNS.forEach(pattern => {
      expect(pattern.flags).toContain('i');
    });
  });

  it('should all be global', () => {
    FORBIDDEN_PATTERNS.forEach(pattern => {
      expect(pattern.flags).toContain('g');
    });
  });
});

describe('textGuards MEGA - PROMPT_BUDGET_CHARS tests', () => {
  it('should be a number', () => {
    expect(typeof PROMPT_BUDGET_CHARS).toBe('number');
  });

  it('should be exactly 15000', () => {
    expect(PROMPT_BUDGET_CHARS).toBe(15000);
  });

  it('should be positive', () => {
    expect(PROMPT_BUDGET_CHARS).toBeGreaterThan(0);
  });

  it('should be greater than default cleanText limit', () => {
    expect(PROMPT_BUDGET_CHARS).toBeGreaterThan(1800);
  });
});

describe('textGuards MEGA - integration tests', () => {
  beforeEach(() => {
    FORBIDDEN_PATTERNS.forEach(p => (p.lastIndex = 0));
  });

  it('should handle real-world XSS + forbidden content', () => {
    const input = '<script>steal(ssn)</script>';
    const result = guardText(input);
    expect(result).not.toContain('script');
    expect(result).toBe(''); // Script tags remove all content
  });

  it('should handle very long text with forbidden terms', () => {
    const input = 'a'.repeat(5000) + ' bitcoin ' + 'b'.repeat(5000);
    const result = guardText(input, 10000);
    expect(result).toContain('[filtered]');
    expect(result.length).toBeLessThanOrEqual(10000);
  });

  it('should preserve unicode while filtering', () => {
    const input = '안녕하세요 bitcoin 世界';
    const result = guardText(input);
    expect(result).toContain('안녕하세요');
    expect(result).toContain('世界');
    expect(result).toContain('[filtered]');
  });

  it('should handle containsForbidden + guardText consistency', () => {
    const input = 'my ssn is secret';
    if (containsForbidden(input)) {
      const guarded = guardText(input);
      expect(guarded).toContain('[filtered]');
    }
  });

  it('should handle cleanText + containsForbidden', () => {
    const input = '<div>bitcoin</div>';
    const cleaned = cleanText(input);
    FORBIDDEN_PATTERNS.forEach(p => (p.lastIndex = 0));
    expect(containsForbidden(cleaned)).toBe(true);
  });
});
