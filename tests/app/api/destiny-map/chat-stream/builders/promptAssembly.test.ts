/**
 * @file Tests for Prompt Assembly
 */

import { describe, it, expect } from 'vitest'
import {
  assembleFinalPrompt,
  SECTION_PRIORITIES,
  type PromptSection,
} from '@/app/api/destiny-map/chat-stream/builders/promptAssembly'
import type { ChatMessage } from '@/app/api/destiny-map/chat-stream/lib/types'

describe('Prompt Assembly', () => {
  describe('assembleFinalPrompt', () => {
    it('should assemble all parts in correct order', () => {
      const result = assembleFinalPrompt({
        systemPrompt: 'System: You are an expert',
        baseContext: 'Base: Birth data',
        memoryContext: 'Memory: Previous insights',
        sections: [{ name: 'analysis', content: 'Analysis content', priority: 1 }],
        messages: [{ role: 'user', content: 'Hello' }],
        userQuestion: 'What is my fortune?',
      })

      expect(result).toContain('System: You are an expert')
      expect(result).toContain('Base: Birth data')
      expect(result).toContain('Memory: Previous insights')
      expect(result).toContain('Analysis content')
      expect(result).toContain('user: Hello')
      expect(result).toContain('What is my fortune?')
    })

    it('should sort sections by priority (high to low)', () => {
      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections: [
          { name: 'low', content: 'Low priority', priority: 1 },
          { name: 'high', content: 'High priority', priority: 10 },
          { name: 'medium', content: 'Medium priority', priority: 5 },
        ],
        messages: [],
        userQuestion: '',
      })

      const highIndex = result.indexOf('High priority')
      const mediumIndex = result.indexOf('Medium priority')
      const lowIndex = result.indexOf('Low priority')

      expect(highIndex).toBeLessThan(mediumIndex)
      expect(mediumIndex).toBeLessThan(lowIndex)
    })

    it('should filter out empty sections', () => {
      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections: [
          { name: 'valid', content: 'Valid content', priority: 1 },
          { name: 'empty', content: '', priority: 2 },
          { name: 'spaces', content: '   ', priority: 3 },
        ],
        messages: [],
        userQuestion: '',
      })

      expect(result).toContain('Valid content')
      expect(result).not.toContain('empty')
    })

    it('should handle empty messages array', () => {
      const result = assembleFinalPrompt({
        systemPrompt: 'System',
        baseContext: '',
        memoryContext: '',
        sections: [],
        messages: [],
        userQuestion: 'Question',
      })

      expect(result).not.toContain('대화 기록')
      expect(result).toContain('Question')
    })

    it('should format messages correctly', () => {
      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections: [],
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
        userQuestion: '',
      })

      expect(result).toContain('user: Hello')
      expect(result).toContain('assistant: Hi there')
      expect(result).toContain('대화 기록')
    })

    it('should handle all empty inputs', () => {
      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections: [],
        messages: [],
        userQuestion: '',
      })

      expect(result).toBe('')
    })

    it('should separate sections with double newlines', () => {
      const result = assembleFinalPrompt({
        systemPrompt: 'System',
        baseContext: 'Base',
        memoryContext: '',
        sections: [],
        messages: [],
        userQuestion: '',
      })

      expect(result).toContain('\n\n')
    })

    it('should add conversation history header', () => {
      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections: [],
        messages: [{ role: 'user', content: 'Test' }],
        userQuestion: '',
      })

      expect(result).toContain('--- 대화 기록 ---')
    })

    it('should add user question header', () => {
      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections: [],
        messages: [],
        userQuestion: 'My question',
      })

      expect(result).toContain('--- 사용자 질문 ---')
      expect(result).toContain('My question')
    })

    it('should handle sections with same priority', () => {
      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections: [
          { name: 'first', content: 'First', priority: 5 },
          { name: 'second', content: 'Second', priority: 5 },
        ],
        messages: [],
        userQuestion: '',
      })

      expect(result).toContain('First')
      expect(result).toContain('Second')
    })

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000)
      const result = assembleFinalPrompt({
        systemPrompt: longContent,
        baseContext: '',
        memoryContext: '',
        sections: [],
        messages: [],
        userQuestion: '',
      })

      expect(result.length).toBeGreaterThan(9000)
    })

    it('should handle special characters in content', () => {
      const result = assembleFinalPrompt({
        systemPrompt: 'Special: @#$%^&*()',
        baseContext: 'Unicode: 가나다',
        memoryContext: 'Emoji: 🎉🎊',
        sections: [],
        messages: [],
        userQuestion: '',
      })

      expect(result).toContain('@#$%^&*()')
      expect(result).toContain('가나다')
      expect(result).toContain('🎉🎊')
    })

    it('should handle multiple messages', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'First' },
        { role: 'assistant', content: 'Second' },
        { role: 'user', content: 'Third' },
      ]

      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections: [],
        messages,
        userQuestion: '',
      })

      expect(result).toContain('user: First')
      expect(result).toContain('assistant: Second')
      expect(result).toContain('user: Third')
    })

    it('should preserve content order within same priority', () => {
      const sections: PromptSection[] = [
        { name: 'a', content: 'Content A', priority: 1 },
        { name: 'b', content: 'Content B', priority: 1 },
        { name: 'c', content: 'Content C', priority: 1 },
      ]

      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections,
        messages: [],
        userQuestion: '',
      })

      expect(result.indexOf('Content A')).toBeLessThan(result.indexOf('Content B'))
      expect(result.indexOf('Content B')).toBeLessThan(result.indexOf('Content C'))
    })
  })

  describe('SECTION_PRIORITIES', () => {
    it('should be defined', () => {
      expect(SECTION_PRIORITIES).toBeDefined()
      expect(typeof SECTION_PRIORITIES).toBe('object')
    })

    it('should have numeric priority values', () => {
      Object.values(SECTION_PRIORITIES).forEach((priority) => {
        expect(typeof priority).toBe('number')
      })
    })

    it('should have positive priority values', () => {
      Object.values(SECTION_PRIORITIES).forEach((priority) => {
        expect(priority).toBeGreaterThanOrEqual(0)
      })
    })

    it('should have unique keys', () => {
      const keys = Object.keys(SECTION_PRIORITIES)
      const uniqueKeys = [...new Set(keys)]
      expect(keys.length).toBe(uniqueKeys.length)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null-like values gracefully', () => {
      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections: [],
        messages: [],
        userQuestion: '',
      })

      expect(result).toBe('')
    })

    it('should handle whitespace-only content', () => {
      const result = assembleFinalPrompt({
        systemPrompt: '   ',
        baseContext: '\n\n',
        memoryContext: '\t\t',
        sections: [{ name: 'test', content: '  ', priority: 1 }],
        messages: [],
        userQuestion: '',
      })

      expect(result.trim().length).toBeLessThan(20)
    })

    it('should handle very negative priorities', () => {
      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections: [
          { name: 'negative', content: 'Negative', priority: -100 },
          { name: 'zero', content: 'Zero', priority: 0 },
        ],
        messages: [],
        userQuestion: '',
      })

      expect(result.indexOf('Zero')).toBeLessThan(result.indexOf('Negative'))
    })

    it('should handle mixed newlines in content', () => {
      const result = assembleFinalPrompt({
        systemPrompt: 'Line1\nLine2',
        baseContext: 'Line3\r\nLine4',
        memoryContext: '',
        sections: [],
        messages: [],
        userQuestion: '',
      })

      expect(result).toContain('Line1')
      expect(result).toContain('Line4')
    })
  })

  describe('Type Safety', () => {
    it('should accept valid PromptSection type', () => {
      const section: PromptSection = {
        name: 'test',
        content: 'content',
        priority: 1,
      }

      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections: [section],
        messages: [],
        userQuestion: '',
      })

      expect(result).toContain('content')
    })

    it('should accept valid ChatMessage type', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'test message',
      }

      const result = assembleFinalPrompt({
        systemPrompt: '',
        baseContext: '',
        memoryContext: '',
        sections: [],
        messages: [message],
        userQuestion: '',
      })

      expect(result).toContain('test message')
    })
  })
})
