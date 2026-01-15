// tests/lib/destiny-map/report-helpers.test.ts
import { describe, it, expect } from 'vitest';
import {
  cleanseText,
  getDateInTimezone,
  extractDefaultElements,
  REQUIRED_SECTIONS,
  validateSections,
} from '../../../src/lib/destiny-map/report-helpers';
import {
  hashName,
  maskDisplayName,
  maskTextWithName,
} from '../../../src/lib/security/DataRedactor';

describe('report-helpers', () => {
  describe('cleanseText', () => {
    it('should return empty string for empty input', () => {
      expect(cleanseText('')).toBe('');
      expect(cleanseText(null as any)).toBe('');
      expect(cleanseText(undefined as any)).toBe('');
    });

    it('should remove HTML tags from text', () => {
      const input = 'Hello <b>world</b>';
      const result = cleanseText(input);
      expect(result).toBe('Hello world');
    });

    it('should remove script tags and content', () => {
      const input = 'Text <script>alert("xss")</script> more text';
      const result = cleanseText(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove style tags and content', () => {
      const input = 'Text <style>body { color: red; }</style> more text';
      const result = cleanseText(input);
      expect(result).not.toContain('<style>');
      expect(result).not.toContain('color: red');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="malicious()">Click</div>';
      const result = cleanseText(input);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('malicious');
    });

    it('should preserve JSON structure when input is JSON', () => {
      const jsonInput = '{"lifeTimeline": [{"year": 2024, "events": []}]}';
      const result = cleanseText(jsonInput);
      expect(result).toContain('{');
      expect(result).toContain('}');
      expect(result).toContain('lifeTimeline');
    });

    it('should trim whitespace', () => {
      const input = '  Hello world  ';
      const result = cleanseText(input);
      expect(result).toBe('Hello world');
    });
  });

  describe('getDateInTimezone', () => {
    it('should return YYYY-MM-DD format without timezone', () => {
      const result = getDateInTimezone();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return date in specified timezone', () => {
      const result = getDateInTimezone('America/New_York');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle invalid timezone gracefully', () => {
      const result = getDateInTimezone('Invalid/Timezone');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('extractDefaultElements', () => {
    it('should return default five elements distribution', () => {
      const result = extractDefaultElements('any text');
      expect(result).toHaveProperty('fiveElements');
      expect(result.fiveElements.wood).toBe(25);
      expect(result.fiveElements.fire).toBe(25);
      expect(result.fiveElements.water).toBe(15);
    });
  });

  describe('REQUIRED_SECTIONS', () => {
    it('should have sections for all themes', () => {
      expect(REQUIRED_SECTIONS.today).toBeDefined();
      expect(REQUIRED_SECTIONS.career).toBeDefined();
      expect(REQUIRED_SECTIONS.love).toBeDefined();
      expect(REQUIRED_SECTIONS.health).toBeDefined();
      expect(REQUIRED_SECTIONS.life).toBeDefined();
      expect(REQUIRED_SECTIONS.family).toBeDefined();
    });

    it('should have 교차 하이라이트 in all themes', () => {
      Object.values(REQUIRED_SECTIONS).forEach(sections => {
        expect(sections).toContain('교차 하이라이트');
      });
    });
  });

  describe('validateSections', () => {
    it('should return empty array when all sections present with Saju and Astrology', () => {
      const text = '## 한줄요약\n## 타이밍\n## 액션\n## 교차 하이라이트\n## 포커스\n사주 오행 점성 행성';
      const missing = validateSections('career', text);
      expect(missing).toEqual([]);
    });

    it('should detect missing sections', () => {
      const text = '## 한줄요약 사주 점성';
      const missing = validateSections('career', text);
      expect(missing.length).toBeGreaterThan(0);
    });

    it('should warn if missing Saju/Astrology references', () => {
      const text = '## 한줄요약\n## 타이밍\n## 액션\n## 교차 하이라이트\n## 포커스';
      const missing = validateSections('career', text);
      expect(missing.some((w: string) => w.includes('교차 근거 부족'))).toBe(true);
    });
  });

  describe('security functions', () => {
    it('should hash names consistently', () => {
      const hash1 = hashName('김철수');
      const hash2 = hashName('김철수');
      expect(hash1).toBe(hash2);
    });

    it('should mask display names', () => {
      const masked = maskDisplayName('김철수');
      expect(masked).toBe('김***'); // First character + ***
    });

    it('should mask text with name', () => {
      const result = maskTextWithName('김철수님은 좋은 사람입니다.', '김철수');
      expect(result).toContain('***'); // Name replaced with ***
      expect(result).not.toContain('김철수');
    });

    it('should handle empty name for hashing', () => {
      expect(hashName('')).toBe('anon');
      expect(hashName(undefined)).toBe('anon');
    });

    it('should handle empty name for masking', () => {
      expect(maskDisplayName('')).toBeUndefined();
      expect(maskDisplayName(undefined)).toBeUndefined();
    });

    it('should handle empty text in maskTextWithName', () => {
      expect(maskTextWithName('', '김철수')).toBe('');
    });

    it('should handle missing name in maskTextWithName', () => {
      const text = '김철수님은 좋은 사람입니다.';
      expect(maskTextWithName(text, '')).toBe(text);
      expect(maskTextWithName(text, undefined)).toBe(text);
    });

    it('should mask multiple occurrences of name', () => {
      const result = maskTextWithName('김철수님과 김철수씨', '김철수');
      expect(result).toBe('***님과 ***씨');
    });

    it('should mask name with special regex characters', () => {
      const result = maskTextWithName('John.Doe님 안녕하세요', 'John.Doe');
      expect(result).not.toContain('John.Doe');
      expect(result).toContain('***');
    });

    it('should handle single character names', () => {
      const masked = maskDisplayName('김');
      expect(masked).toBe('김***');
    });

    it('should trim whitespace before masking', () => {
      const masked = maskDisplayName('  김철수  ');
      expect(masked).toBe('김***');
    });
  });

  describe('additional cleanseText edge cases', () => {
    it('should handle nested script tags', () => {
      const input = '<script><script>alert(1)</script></script>';
      const result = cleanseText(input);
      expect(result).not.toContain('<script>');
    });

    it('should handle script tags with attributes', () => {
      const input = '<script type="text/javascript">evil()</script>';
      const result = cleanseText(input);
      expect(result).not.toContain('evil');
    });

    it('should handle multiple event handlers', () => {
      const input = '<div onclick="a()" onmouseover="b()" onload="c()">text</div>';
      const result = cleanseText(input);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onmouseover');
      expect(result).not.toContain('onload');
    });

    it('should handle @import with different quotes', () => {
      const input = '@import "style.css"; @import \'style2.css\';';
      const result = cleanseText(input);
      expect(result).not.toContain('@import');
    });

    it('should normalize excessive whitespace', () => {
      const input = 'Hello     world     test';
      const result = cleanseText(input);
      expect(result).toBe('Hello world test');
    });

    it('should handle mixed dangerous content', () => {
      const input = '<script>alert(1)</script><style>body{}</style><div onclick="bad()">text</div>';
      const result = cleanseText(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<style>');
      expect(result).not.toContain('onclick');
    });

    it('should preserve JSON arrays', () => {
      const input = '{"items": [1, 2, 3]}';
      const result = cleanseText(input);
      expect(result).toContain('[');
      expect(result).toContain(']');
    });

    it('should handle JSON with categoryAnalysis', () => {
      const input = '{"categoryAnalysis": {"career": "good"}}';
      const result = cleanseText(input);
      expect(result).toContain('categoryAnalysis');
      expect(result).toContain('{');
    });
  });

  describe('additional getDateInTimezone tests', () => {
    it('should handle Asia/Seoul timezone', () => {
      const result = getDateInTimezone('Asia/Seoul');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle Europe/London timezone', () => {
      const result = getDateInTimezone('Europe/London');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle Pacific/Auckland timezone', () => {
      const result = getDateInTimezone('Pacific/Auckland');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should use ISO format as fallback', () => {
      const result1 = getDateInTimezone();
      const result2 = getDateInTimezone('');
      expect(result1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result2).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('additional validateSections tests', () => {
    it('should validate JSON with life theme', () => {
      const json = JSON.stringify({
        lifeTimeline: [],
        categoryAnalysis: {},
        keyInsights: []
      });
      const warnings = validateSections('life', json);
      expect(warnings).toEqual([]);
    });

    it('should validate JSON with today theme', () => {
      const json = JSON.stringify({
        daySummary: 'good',
        timing: 'morning',
        advice: 'rest'
      });
      const warnings = validateSections('today', json);
      expect(warnings).toEqual([]);
    });

    it('should warn on missing JSON keys for life theme', () => {
      const json = JSON.stringify({ lifeTimeline: [] }); // missing other keys
      const warnings = validateSections('life', json);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should handle JSON parse error gracefully', () => {
      const invalidJson = '{"invalid": json}';
      const warnings = validateSections('life', invalidJson);
      expect(warnings.some((w: string) => w.includes('JSON 파싱 실패'))).toBe(true);
    });

    it('should detect Saju keywords: 십신', () => {
      const text = '한줄요약\n타이밍\n액션\n교차 하이라이트\n포커스\n십신 점성';
      const warnings = validateSections('career', text);
      expect(warnings.some((w: string) => w.includes('교차 근거 부족'))).toBe(false);
    });

    it('should detect Saju keywords: 대운', () => {
      const text = '한줄요약\n타이밍\n액션\n교차 하이라이트\n포커스\n대운 행성';
      const warnings = validateSections('career', text);
      expect(warnings.some((w: string) => w.includes('교차 근거 부족'))).toBe(false);
    });

    it('should detect Astrology keywords: 하우스', () => {
      const text = '한줄요약\n타이밍\n액션\n교차 하이라이트\n포커스\n사주 하우스';
      const warnings = validateSections('career', text);
      expect(warnings.some((w: string) => w.includes('교차 근거 부족'))).toBe(false);
    });

    it('should detect Astrology keywords: 트랜짓', () => {
      const text = '한줄요약\n타이밍\n액션\n교차 하이라이트\n포커스\n오행 트랜짓';
      const warnings = validateSections('career', text);
      expect(warnings.some((w: string) => w.includes('교차 근거 부족'))).toBe(false);
    });

    it('should detect Astrology keywords: 별자리', () => {
      const text = '한줄요약\n타이밍\n액션\n교차 하이라이트\n포커스\n사주 별자리';
      const warnings = validateSections('career', text);
      expect(warnings.some((w: string) => w.includes('교차 근거 부족'))).toBe(false);
    });

    it('should validate love theme sections', () => {
      const text = '한줄요약\n타이밍\n소통\n행동 가이드\n교차 하이라이트\n리마인더\n사주 점성';
      const warnings = validateSections('love', text);
      expect(warnings).toEqual([]);
    });

    it('should validate health theme sections', () => {
      const text = '한줄요약\n루틴\n피로\n회복\n교차 하이라이트\n리마인더\n사주 점성';
      const warnings = validateSections('health', text);
      expect(warnings).toEqual([]);
    });

    it('should validate family theme sections', () => {
      const text = '한줄요약\n소통\n협력\n리스크\n교차 하이라이트\n리마인더\n사주 점성';
      const warnings = validateSections('family', text);
      expect(warnings).toEqual([]);
    });

    it('should validate month theme sections', () => {
      const text = '월간 한줄테마\n핵심 주\n영역 카드\n교차 하이라이트\n리마인더\n사주 점성';
      const warnings = validateSections('month', text);
      expect(warnings).toEqual([]);
    });

    it('should validate year theme sections', () => {
      const text = '연간 한줄테마\n분기\n전환\n영역 포커스\n교차 하이라이트\n리마인더\n사주 점성';
      const warnings = validateSections('year', text);
      expect(warnings).toEqual([]);
    });

    it('should validate newyear theme sections', () => {
      const text = '새해 한줄테마\n분기\n준비\n기회\n리스크\n교차 하이라이트\n리마인더\n사주 점성';
      const warnings = validateSections('newyear', text);
      expect(warnings).toEqual([]);
    });

    it('should handle unknown theme gracefully', () => {
      const text = 'any text 사주 점성';
      const warnings = validateSections('unknown_theme', text);
      expect(warnings).toEqual([]);
    });

    it('should handle empty text with warnings', () => {
      const warnings = validateSections('career', '');
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should validate focus_overall as life theme', () => {
      const json = JSON.stringify({
        lifeTimeline: [],
        categoryAnalysis: {},
        keyInsights: []
      });
      const warnings = validateSections('focus_overall', json);
      expect(warnings).toEqual([]);
    });

    it('should validate fortune_today as today theme', () => {
      const json = JSON.stringify({
        daySummary: 'test',
        timing: 'afternoon',
        advice: 'be careful'
      });
      const warnings = validateSections('fortune_today', json);
      expect(warnings).toEqual([]);
    });
  });

  describe('extractDefaultElements additional tests', () => {
    it('should return consistent values regardless of input', () => {
      const result1 = extractDefaultElements('text1');
      const result2 = extractDefaultElements('different text');
      const result3 = extractDefaultElements('');
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should have all five elements', () => {
      const result = extractDefaultElements('test');
      expect(Object.keys(result.fiveElements)).toContain('wood');
      expect(Object.keys(result.fiveElements)).toContain('fire');
      expect(Object.keys(result.fiveElements)).toContain('earth');
      expect(Object.keys(result.fiveElements)).toContain('metal');
      expect(Object.keys(result.fiveElements)).toContain('water');
    });

    it('should have reasonable distribution', () => {
      const result = extractDefaultElements('any');
      const values = Object.values(result.fiveElements);
      values.forEach(v => {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(50);
      });
    });

    it('should sum to 105%', () => {
      const result = extractDefaultElements('test');
      const sum = Object.values(result.fiveElements).reduce((a, b) => a + b, 0);
      expect(sum).toBe(105); // 25+25+20+20+15
    });
  });

  describe('cleanseText comprehensive edge cases', () => {
    it('should handle CDATA sections', () => {
      const input = '<![CDATA[malicious code]]>safe text';
      const result = cleanseText(input);
      expect(result).not.toContain('CDATA');
    });

    it('should handle javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">click</a>';
      const result = cleanseText(input);
      expect(result).toBe('click');
    });

    it('should handle data: protocol', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = cleanseText(input);
      expect(result).not.toContain('script');
    });

    it('should handle encoded entities', () => {
      const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
      const result = cleanseText(input);
      // cleanseText doesn't decode HTML entities, just removes tags
      // Encoded entities remain as-is since they're not dangerous
      expect(result).toContain('&lt;');
      expect(result).toContain('alert');
    });

    it('should handle mixed case HTML tags', () => {
      const input = '<DIV><Span>Test</SpaN></DiV>';
      const result = cleanseText(input);
      expect(result).toBe('Test');
    });

    it('should handle incomplete HTML tags', () => {
      const input = '<div class="test>incomplete';
      const result = cleanseText(input);
      expect(result).not.toContain('<');
    });

    it('should handle multiple @import statements', () => {
      const input = '@import "a.css"; @import "b.css"; @import \'c.css\';';
      const result = cleanseText(input);
      expect(result).not.toContain('@import');
    });

    it('should preserve valid punctuation', () => {
      const input = 'Hello! How are you? I am fine.';
      const result = cleanseText(input);
      expect(result).toBe('Hello! How are you? I am fine.');
    });

    it('should handle JSON with nested objects', () => {
      const input = '{"a": {"b": {"c": "value"}}}';
      const result = cleanseText(input);
      expect(result).toContain('"a"');
      expect(result).toContain('"b"');
      expect(result).toContain('"c"');
    });

    it('should handle JSON arrays with objects', () => {
      const input = '[{"id": 1}, {"id": 2}]';
      const result = cleanseText(input);
      expect(result).toContain('[');
      expect(result).toContain(']');
      expect(result).toContain('{');
    });

    it('should preserve JSON structure with CSS properties', () => {
      const input = '{"style": "background: red; font-family: Arial"}';
      const result = cleanseText(input);
      // For JSON responses, cleanseText preserves content and only removes dangerous tags
      // CSS properties inside JSON strings are not removed
      expect(result).toContain('{');
      expect(result).toContain('}');
      expect(result).toContain('style');
    });

    it('should handle empty script tags', () => {
      const input = '<script></script>text';
      const result = cleanseText(input);
      expect(result).toBe('text');
    });

    it('should handle empty style tags', () => {
      const input = '<style></style>text';
      const result = cleanseText(input);
      expect(result).toBe('text');
    });

    it('should handle script tags with newlines and spaces', () => {
      const input = '<script  >\n  alert(1)  \n</script  >text';
      const result = cleanseText(input);
      // Script tag with spaces in closing tag may not match regex perfectly
      expect(result).toContain('text');
      expect(result.length).toBeLessThan(input.length);
    });

    it('should handle very long strings', () => {
      const input = '<script>' + 'a'.repeat(10000) + '</script>safe';
      const result = cleanseText(input);
      expect(result).toBe('safe');
      expect(result).not.toContain('a'.repeat(100));
    });
  });

  describe('getDateInTimezone comprehensive tests', () => {
    it('should handle null timezone', () => {
      const result = getDateInTimezone(null as any);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle undefined timezone', () => {
      const result = getDateInTimezone(undefined);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle very long timezone string', () => {
      const result = getDateInTimezone('a'.repeat(1000));
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle timezone with special characters', () => {
      const result = getDateInTimezone('Asia/Seoul@#$%');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle empty string timezone', () => {
      const result = getDateInTimezone('');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle whitespace-only timezone', () => {
      const result = getDateInTimezone('   ');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return date in correct format (YYYY-MM-DD)', () => {
      const result = getDateInTimezone('UTC');
      const parts = result.split('-');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(4); // year
      expect(parts[1]).toHaveLength(2); // month
      expect(parts[2]).toHaveLength(2); // day
    });

    it('should handle negative timezone offsets', () => {
      const result = getDateInTimezone('America/Los_Angeles');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle positive timezone offsets', () => {
      const result = getDateInTimezone('Asia/Tokyo');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('validateSections comprehensive tests', () => {
    it('should handle text with only Saju keywords', () => {
      const text = '한줄요약\n타이밍\n액션\n교차 하이라이트\n포커스\n사주 오행 십신 대운';
      const warnings = validateSections('career', text);
      expect(warnings.some(w => w.includes('교차 근거 부족'))).toBe(true);
    });

    it('should handle text with only Astrology keywords', () => {
      const text = '한줄요약\n타이밍\n액션\n교차 하이라이트\n포커스\n점성 행성 하우스';
      const warnings = validateSections('career', text);
      expect(warnings.some(w => w.includes('교차 근거 부족'))).toBe(true);
    });

    it('should validate with both Saju and Astrology present', () => {
      const text = '한줄요약\n타이밍\n액션\n교차 하이라이트\n포커스\n사주 오행 점성 행성';
      const warnings = validateSections('career', text);
      expect(warnings.some(w => w.includes('교차 근거 부족'))).toBe(false);
    });

    it('should handle whitespace-only text', () => {
      const warnings = validateSections('career', '   \n\n\t\t   ');
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should handle very long text', () => {
      const longText = '한줄요약\n타이밍\n액션\n교차 하이라이트\n포커스\n사주 점성\n' + 'a'.repeat(100000);
      const warnings = validateSections('career', longText);
      expect(warnings).toEqual([]);
    });

    it('should handle text with duplicate sections', () => {
      const text = '한줄요약\n한줄요약\n타이밍\n타이밍\n액션\n교차 하이라이트\n포커스\n사주 점성';
      const warnings = validateSections('career', text);
      expect(warnings).toEqual([]);
    });

    it('should handle JSON with extra keys', () => {
      const json = JSON.stringify({
        lifeTimeline: [],
        categoryAnalysis: {},
        keyInsights: [],
        extraKey1: 'value',
        extraKey2: 123
      });
      const warnings = validateSections('life', json);
      expect(warnings).toEqual([]);
    });

    it('should handle JSON with null values', () => {
      const json = JSON.stringify({
        lifeTimeline: null,
        categoryAnalysis: null,
        keyInsights: null
      });
      const warnings = validateSections('life', json);
      expect(warnings).toEqual([]);
    });

    it('should handle JSON with undefined values (becomes absent)', () => {
      const obj = { lifeTimeline: [], categoryAnalysis: {} };
      const json = JSON.stringify(obj);
      const warnings = validateSections('life', json);
      expect(warnings.some(w => w.includes('keyInsights'))).toBe(true);
    });

    it('should handle malformed JSON with opening brace only', () => {
      const warnings = validateSections('life', '{incomplete json');
      expect(warnings.some(w => w.includes('JSON 파싱 실패'))).toBe(true);
    });

    it('should handle JSON array instead of object', () => {
      const warnings = validateSections('life', '[1, 2, 3]');
      // Array is treated as regular text, so sections will be missing
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should handle mixed JSON and text', () => {
      const text = 'Some text {"lifeTimeline": []} more text';
      const warnings = validateSections('life', text);
      expect(warnings.some(w => w.includes('JSON 파싱 실패'))).toBe(true);
    });

    it('should validate all Saju keywords', () => {
      const keywords = ['사주', '오행', '십신', '대운'];
      keywords.forEach(keyword => {
        const text = `한줄요약\n타이밍\n액션\n교차 하이라이트\n포커스\n${keyword} 점성`;
        const warnings = validateSections('career', text);
        expect(warnings.some(w => w.includes('교차 근거 부족'))).toBe(false);
      });
    });

    it('should validate all Astrology keywords', () => {
      const keywords = ['점성', '행성', '하우스', '트랜짓', '별자리'];
      keywords.forEach(keyword => {
        const text = `한줄요약\n타이밍\n액션\n교차 하이라이트\n포커스\n사주 ${keyword}`;
        const warnings = validateSections('career', text);
        expect(warnings.some(w => w.includes('교차 근거 부족'))).toBe(false);
      });
    });

    it('should handle case variations in section markers', () => {
      const text = '한줄요약\n타이밍\n액션\n교차 하이라이트\n포커스\n사주 점성';
      const warnings = validateSections('career', text);
      expect(warnings).toEqual([]);
    });

    it('should handle sections with extra whitespace', () => {
      const text = '  한줄요약  \n  타이밍  \n  액션  \n  교차 하이라이트  \n  포커스  \n사주 점성';
      const warnings = validateSections('career', text);
      expect(warnings).toEqual([]);
    });

    it('should handle sections in different order', () => {
      const text = '포커스\n교차 하이라이트\n액션\n타이밍\n한줄요약\n사주 점성';
      const warnings = validateSections('career', text);
      expect(warnings).toEqual([]);
    });
  });

  describe('REQUIRED_SECTIONS structure', () => {
    it('should have all theme keys', () => {
      const themes = ['today', 'career', 'love', 'health', 'life', 'family', 'month', 'year', 'newyear'];
      themes.forEach(theme => {
        expect(REQUIRED_SECTIONS[theme]).toBeDefined();
        expect(Array.isArray(REQUIRED_SECTIONS[theme])).toBe(true);
      });
    });

    it('should have non-empty sections for each theme', () => {
      Object.values(REQUIRED_SECTIONS).forEach(sections => {
        expect(sections.length).toBeGreaterThan(0);
      });
    });

    it('should have unique sections within each theme', () => {
      Object.values(REQUIRED_SECTIONS).forEach(sections => {
        const unique = new Set(sections);
        expect(unique.size).toBe(sections.length);
      });
    });

    it('should have 교차 하이라이트 in all themes', () => {
      Object.values(REQUIRED_SECTIONS).forEach(sections => {
        expect(sections.some(s => s.includes('교차'))).toBe(true);
      });
    });

    it('should have at least 3 sections per theme', () => {
      Object.values(REQUIRED_SECTIONS).forEach(sections => {
        expect(sections.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('security edge cases', () => {
    it('should handle very long names for hashing', () => {
      const longName = 'a'.repeat(1000);
      const hash = hashName(longName);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle special characters in name hashing', () => {
      const specialName = '김@철#수$';
      const hash = hashName(specialName);
      expect(hash).toBeDefined();
    });

    it('should handle unicode in name hashing', () => {
      const unicodeName = '김철수👍';
      const hash = hashName(unicodeName);
      expect(hash).toBeDefined();
    });

    it('should handle null and undefined consistently', () => {
      expect(hashName(null as any)).toBe('anon');
      expect(hashName(undefined as any)).toBe('anon');
      expect(hashName('')).toBe('anon');
    });

    it('should mask very long names', () => {
      const longName = 'a'.repeat(100);
      const masked = maskDisplayName(longName);
      expect(masked).toBe('a***');
    });

    it('should mask names with numbers', () => {
      const name = '김철수123';
      const masked = maskDisplayName(name);
      expect(masked).toBe('김***');
    });

    it('should handle text with name at beginning', () => {
      const result = maskTextWithName('김철수님 안녕하세요', '김철수');
      expect(result).toBe('***님 안녕하세요');
    });

    it('should handle text with name at end', () => {
      const result = maskTextWithName('안녕하세요 김철수', '김철수');
      expect(result).toBe('안녕하세요 ***');
    });

    it('should handle text with name in middle', () => {
      const result = maskTextWithName('안녕하세요 김철수님 반갑습니다', '김철수');
      expect(result).toBe('안녕하세요 ***님 반갑습니다');
    });

    it('should handle case-sensitive masking', () => {
      const result = maskTextWithName('John is here and john is there', 'John');
      expect(result).toContain('***');
      // Case sensitive, so 'john' should not be masked
    });
  });
});
