/**
 * Comprehensive tests for API Sanitizers
 * Tests XSS prevention, input sanitization, and data validation
 */

import {
  isRecord,
  cleanStringArray,
  normalizeMessages,
  sanitizeString,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeHtml,
  sanitizeHtmlSafe,
  sanitizeEnum,
  type ChatMessage,
} from '@/lib/api/sanitizers'

describe('API Sanitizers', () => {
  describe('isRecord', () => {
    it('should return true for plain objects', () => {
      expect(isRecord({})).toBe(true)
      expect(isRecord({ key: 'value' })).toBe(true)
      expect(isRecord({ nested: { object: true } })).toBe(true)
    })

    it('should return false for non-objects', () => {
      expect(isRecord(null)).toBe(false)
      expect(isRecord(undefined)).toBe(false)
      expect(isRecord(123)).toBe(false)
      expect(isRecord('string')).toBe(false)
      expect(isRecord(true)).toBe(false)
    })

    it('should return false for arrays', () => {
      expect(isRecord([])).toBe(false)
      expect(isRecord([1, 2, 3])).toBe(false)
    })

    it('should return false for functions', () => {
      expect(isRecord(() => {})).toBe(false)
    })

    it('should return true for special objects (Date, RegExp are objects)', () => {
      // isRecord only checks: not null, typeof object, not array
      expect(isRecord(new Date())).toBe(true)
      expect(isRecord(new RegExp(''))).toBe(true)
    })
  })

  describe('cleanStringArray', () => {
    it('should clean valid string array', () => {
      const input = ['  hello  ', 'world', '  test  ']
      const result = cleanStringArray(input)

      expect(result).toEqual(['hello', 'world', 'test'])
    })

    it('should filter out non-strings', () => {
      const input = ['valid', 123, null, undefined, true, {}, 'another']
      const result = cleanStringArray(input)

      expect(result).toEqual(['valid', 'another'])
    })

    it('should enforce max items limit', () => {
      const input = Array(30).fill('item')
      const result = cleanStringArray(input, 10)

      expect(result.length).toBe(10)
    })

    it('should enforce max length per item', () => {
      const input = ['a'.repeat(100)]
      const result = cleanStringArray(input, 20, 10)

      expect(result[0].length).toBe(10)
    })

    it('should filter out empty strings', () => {
      const input = ['valid', '  ', '', '  \n\t  ', 'another']
      const result = cleanStringArray(input)

      expect(result).toEqual(['valid', 'another'])
    })

    it('should return empty array for non-array input', () => {
      expect(cleanStringArray(null)).toEqual([])
      expect(cleanStringArray(undefined)).toEqual([])
      expect(cleanStringArray('string')).toEqual([])
      expect(cleanStringArray(123)).toEqual([])
      expect(cleanStringArray({})).toEqual([])
    })

    it('should handle empty array', () => {
      expect(cleanStringArray([])).toEqual([])
    })

    it('should use default limits', () => {
      const input = Array(30).fill('item')
      const result = cleanStringArray(input)

      expect(result.length).toBe(20) // Default maxItems
    })
  })

  describe('normalizeMessages', () => {
    it('should normalize valid messages', () => {
      const input = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ]

      const result = normalizeMessages(input)

      expect(result).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ])
    })

    it('should filter out invalid roles', () => {
      const input = [
        { role: 'user', content: 'Valid' },
        { role: 'hacker', content: 'Invalid' },
        { role: 'assistant', content: 'Valid' },
      ]

      const result = normalizeMessages(input)

      expect(result).toEqual([
        { role: 'user', content: 'Valid' },
        { role: 'assistant', content: 'Valid' },
      ])
    })

    it('should enforce max messages limit', () => {
      const input = Array(30)
        .fill(null)
        .map((_, i) => ({ role: 'user', content: `Message ${i}` }))

      const result = normalizeMessages(input, { maxMessages: 5 })

      expect(result.length).toBe(5)
      // Should take last 5 messages
      expect(result[0].content).toBe('Message 25')
      expect(result[4].content).toBe('Message 29')
    })

    it('should enforce max length per message', () => {
      const input = [{ role: 'user', content: 'a'.repeat(5000) }]

      const result = normalizeMessages(input, { maxLength: 100 })

      expect(result[0].content.length).toBe(100)
    })

    it('should trim whitespace from content', () => {
      const input = [{ role: 'user', content: '  Hello World  \n\t' }]

      const result = normalizeMessages(input)

      expect(result[0].content).toBe('Hello World')
    })

    it('should filter out messages with empty content', () => {
      const input = [
        { role: 'user', content: 'Valid' },
        { role: 'user', content: '   ' },
        { role: 'user', content: '' },
        { role: 'user', content: 'Also valid' },
      ]

      const result = normalizeMessages(input)

      expect(result).toEqual([
        { role: 'user', content: 'Valid' },
        { role: 'user', content: 'Also valid' },
      ])
    })

    it('should return empty array for non-array input', () => {
      expect(normalizeMessages(null)).toEqual([])
      expect(normalizeMessages(undefined)).toEqual([])
      expect(normalizeMessages('string')).toEqual([])
      expect(normalizeMessages(123)).toEqual([])
    })

    it('should handle maxMessages of 0', () => {
      const input = [{ role: 'user', content: 'Test' }]

      const result = normalizeMessages(input, { maxMessages: 0 })

      expect(result).toEqual([])
    })

    it('should handle custom allowed roles', () => {
      const input = [
        { role: 'user', content: 'User message' },
        { role: 'system', content: 'System message' },
        { role: 'assistant', content: 'Assistant message' },
      ]

      const allowedRoles = new Set(['user', 'assistant'] as const)
      const result = normalizeMessages(input, { allowedRoles })

      expect(result.length).toBe(2)
      expect(result.find((m) => m.role === 'system')).toBeUndefined()
    })
  })

  describe('sanitizeString', () => {
    it('should sanitize valid string', () => {
      expect(sanitizeString('  hello  ', 10)).toBe('hello')
    })

    it('should enforce max length', () => {
      expect(sanitizeString('abcdefghij', 5)).toBe('abcde')
    })

    it('should return default value for non-strings', () => {
      expect(sanitizeString(null, 10, 'default')).toBe('default')
      expect(sanitizeString(undefined, 10, 'default')).toBe('default')
      expect(sanitizeString(123, 10, 'default')).toBe('default')
      expect(sanitizeString({}, 10, 'default')).toBe('default')
    })

    it('should return default for empty string', () => {
      expect(sanitizeString('', 10, 'default')).toBe('default')
      expect(sanitizeString('   ', 10, 'default')).toBe('default')
    })

    it('should use empty string as default when not specified', () => {
      expect(sanitizeString(null, 10)).toBe('')
      expect(sanitizeString(123, 10)).toBe('')
    })
  })

  describe('sanitizeNumber', () => {
    it('should return valid number within range', () => {
      expect(sanitizeNumber(5, 0, 10, 0)).toBe(5)
    })

    it('should clamp to min', () => {
      expect(sanitizeNumber(-5, 0, 10, 0)).toBe(0)
    })

    it('should clamp to max', () => {
      expect(sanitizeNumber(15, 0, 10, 0)).toBe(10)
    })

    it('should return default for non-numbers', () => {
      expect(sanitizeNumber('5', 0, 10, 3)).toBe(3)
      expect(sanitizeNumber(null, 0, 10, 3)).toBe(3)
      expect(sanitizeNumber(undefined, 0, 10, 3)).toBe(3)
      expect(sanitizeNumber({}, 0, 10, 3)).toBe(3)
    })

    it('should return default for NaN', () => {
      expect(sanitizeNumber(NaN, 0, 10, 3)).toBe(3)
    })

    it('should return default for Infinity', () => {
      expect(sanitizeNumber(Infinity, 0, 10, 3)).toBe(3)
      expect(sanitizeNumber(-Infinity, 0, 10, 3)).toBe(3)
    })

    it('should handle negative ranges', () => {
      expect(sanitizeNumber(-5, -10, -1, 0)).toBe(-5)
      expect(sanitizeNumber(0, -10, -1, -5)).toBe(-1)
    })

    it('should handle decimal numbers', () => {
      expect(sanitizeNumber(3.7, 0, 10, 0)).toBe(3.7)
    })
  })

  describe('sanitizeBoolean', () => {
    it('should return boolean values as-is', () => {
      expect(sanitizeBoolean(true)).toBe(true)
      expect(sanitizeBoolean(false)).toBe(false)
    })

    it('should return default for non-booleans', () => {
      expect(sanitizeBoolean('true', false)).toBe(false)
      expect(sanitizeBoolean(1, false)).toBe(false)
      expect(sanitizeBoolean(0, true)).toBe(true)
      expect(sanitizeBoolean(null, true)).toBe(true)
      expect(sanitizeBoolean(undefined, true)).toBe(true)
    })

    it('should use false as default when not specified', () => {
      expect(sanitizeBoolean('true')).toBe(false)
      expect(sanitizeBoolean(1)).toBe(false)
    })
  })

  describe('sanitizeHtml - XSS Prevention', () => {
    it('should strip script tags', () => {
      const input = 'Hello <script>alert("XSS")</script> World'
      const result = sanitizeHtml(input)

      expect(result).toBe('Hello  World')
      expect(result).not.toContain('script')
    })

    it('should strip style tags', () => {
      const input = 'Text <style>body{display:none}</style> More text'
      const result = sanitizeHtml(input)

      expect(result).toBe('Text  More text')
      expect(result).not.toContain('style')
    })

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>'
      const result = sanitizeHtml(input)

      expect(result).not.toContain('onclick')
    })

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Link</a>'
      const result = sanitizeHtml(input)

      expect(result).not.toContain('javascript:')
    })

    it('should remove data:text/html URLs', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">Link</a>'
      const result = sanitizeHtml(input)

      expect(result).not.toContain('data:text/html')
    })

    it('should strip all HTML tags', () => {
      const input = '<div><p>Hello <b>World</b></p></div>'
      const result = sanitizeHtml(input)

      expect(result).toBe('Hello World')
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
    })

    it('should remove dangerous characters', () => {
      const input = 'Text with < > { } brackets'
      const result = sanitizeHtml(input)

      expect(result).toBe('Text with    brackets')
    })

    it('should enforce max length', () => {
      const input = 'a'.repeat(20000)
      const result = sanitizeHtml(input, 1000)

      expect(result.length).toBe(1000)
    })

    it('should handle nested XSS attempts', () => {
      const input = '<scr<script>ipt>alert(1)</scr</script>ipt>'
      const result = sanitizeHtml(input)

      expect(result).not.toContain('script')
      expect(result).not.toContain('alert')
    })

    it('should handle encoded XSS attempts', () => {
      const input = '&lt;script&gt;alert(1)&lt;/script&gt;'
      const result = sanitizeHtml(input)

      // Should still contain encoded entities (safe)
      expect(result).toContain('&lt;')
    })

    it('should return default for non-string', () => {
      expect(sanitizeHtml(null, 100, 'default')).toBe('default')
      expect(sanitizeHtml(123, 100, 'default')).toBe('default')
    })

    it('should use default max length', () => {
      const input = 'a'.repeat(15000)
      const result = sanitizeHtml(input)

      expect(result.length).toBe(10000)
    })
  })

  describe('sanitizeHtmlSafe', () => {
    it('should allow safe HTML tags', () => {
      const input = '<b>Bold</b> <i>Italic</i> <p>Paragraph</p>'
      const result = sanitizeHtmlSafe(input)

      expect(result).toContain('<b>')
      expect(result).toContain('</b>')
      expect(result).toContain('<i>')
      expect(result).toContain('</i>')
    })

    it('should remove dangerous tags but keep safe ones', () => {
      const input = '<script>alert(1)</script><b>Safe</b>'
      const result = sanitizeHtmlSafe(input)

      expect(result).not.toContain('script')
      expect(result).toContain('<b>Safe</b>')
    })

    it('should clean href attributes', () => {
      const input = '<a href="https://safe.com">Safe</a> <a href="javascript:alert(1)">Bad</a>'
      const result = sanitizeHtmlSafe(input)

      expect(result).toContain('https://safe.com')
      expect(result).not.toContain('javascript:')
    })

    it('should remove event handlers from safe tags', () => {
      const input = '<b onclick="alert(1)">Bold</b>'
      const result = sanitizeHtmlSafe(input)

      expect(result).not.toContain('onclick')
      expect(result).toContain('<b>')
    })

    it('should remove style tags even from safe elements', () => {
      const input = '<p><style>body{display:none}</style>Text</p>'
      const result = sanitizeHtmlSafe(input)

      expect(result).not.toContain('style')
      expect(result).toContain('<p>')
    })

    it('should only allow http/https links', () => {
      const input = '<a href="ftp://example.com">FTP</a>'
      const result = sanitizeHtmlSafe(input)

      expect(result).not.toContain('ftp://')
      expect(result).toContain('href="#"')
    })

    it('should allow relative URLs to be converted', () => {
      const input = '<a href="/relative/path">Link</a>'
      const result = sanitizeHtmlSafe(input)

      // Relative URLs should be replaced with #
      expect(result).toContain('href="#"')
    })
  })

  describe('sanitizeEnum', () => {
    const colors = ['red', 'green', 'blue'] as const

    it('should return valid enum value', () => {
      expect(sanitizeEnum('red', colors, 'red')).toBe('red')
      expect(sanitizeEnum('green', colors, 'red')).toBe('green')
    })

    it('should return default for invalid value', () => {
      expect(sanitizeEnum('yellow', colors, 'red')).toBe('red')
      expect(sanitizeEnum('', colors, 'red')).toBe('red')
    })

    it('should return default for non-string', () => {
      expect(sanitizeEnum(123, colors, 'red')).toBe('red')
      expect(sanitizeEnum(null, colors, 'red')).toBe('red')
      expect(sanitizeEnum(undefined, colors, 'red')).toBe('red')
    })

    it('should be case-sensitive', () => {
      expect(sanitizeEnum('RED', colors, 'red')).toBe('red')
      expect(sanitizeEnum('Red', colors, 'red')).toBe('red')
    })

    it('should handle empty allowed array', () => {
      const empty: readonly string[] = []
      expect(sanitizeEnum('anything', empty, 'default')).toBe('default')
    })
  })

  describe('Integration: Complex Sanitization', () => {
    it('should handle complex user input safely', () => {
      const userInput = {
        name: '  John Doe  ',
        bio: '<script>alert("XSS")</script>Developer at <b>Company</b>',
        age: '25',
        role: 'admin',
        tags: ['javascript', 123, '<b>test</b>', null, 'react'],
      }

      const sanitized = {
        name: sanitizeString(userInput.name, 100),
        bio: sanitizeHtml(userInput.bio),
        age: sanitizeNumber(parseInt(userInput.age), 0, 150, 0),
        role: sanitizeEnum(userInput.role, ['user', 'moderator'] as const, 'user'),
        tags: cleanStringArray(userInput.tags, 10, 50),
      }

      expect(sanitized.name).toBe('John Doe')
      expect(sanitized.bio).not.toContain('script')
      expect(sanitized.age).toBe(25)
      expect(sanitized.role).toBe('user') // 'admin' not in allowed
      expect(sanitized.tags).toEqual(['javascript', '<b>test</b>', 'react'])
    })

    it('should handle chat message sanitization', () => {
      const messages = [
        { role: 'user', content: '<script>alert(1)</script>Hello' },
        { role: 'assistant', content: 'Hi <b>there</b>' },
        { role: 'hacker', content: 'Evil message' },
      ]

      const normalized = normalizeMessages(messages)
      const sanitized = normalized.map((m) => ({
        ...m,
        content: sanitizeHtml(m.content),
      }))

      expect(sanitized.length).toBe(2) // hacker role filtered
      expect(sanitized[0].content).toBe('Hello')
      expect(sanitized[1].content).toBe('Hi there')
    })
  })
})
