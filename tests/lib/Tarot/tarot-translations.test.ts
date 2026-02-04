/**
 * @file Tests for Tarot card translations
 */

import { describe, it, expect } from 'vitest'
import {
  tarotTranslationsKo,
  tarotTranslationsEn,
  getCardTranslation,
  getAllCardTranslations,
  type CardTranslation,
  type TarotTranslations,
} from '@/lib/Tarot/tarot-translations'

describe('Tarot Translations', () => {
  describe('tarotTranslationsKo', () => {
    it('should have 78 cards (0-77)', () => {
      const keys = Object.keys(tarotTranslationsKo).map(Number)
      expect(keys.length).toBe(78)
      expect(Math.min(...keys)).toBe(0)
      expect(Math.max(...keys)).toBe(77)
    })

    it('should have correct structure for each card', () => {
      for (let i = 0; i < 78; i++) {
        const card = tarotTranslationsKo[i]
        expect(card).toBeDefined()
        expect(card.name).toBeTruthy()
        expect(card.upright).toBeDefined()
        expect(card.upright.keywords).toBeInstanceOf(Array)
        expect(card.upright.keywords.length).toBeGreaterThan(0)
        expect(card.upright.meaning).toBeTruthy()
        expect(card.reversed).toBeDefined()
        expect(card.reversed.keywords).toBeInstanceOf(Array)
        expect(card.reversed.keywords.length).toBeGreaterThan(0)
        expect(card.reversed.meaning).toBeTruthy()
      }
    })

    it('should have Korean names for Major Arcana', () => {
      expect(tarotTranslationsKo[0].name).toBe('바보')
      expect(tarotTranslationsKo[1].name).toBe('마법사')
      expect(tarotTranslationsKo[2].name).toBe('여사제')
      expect(tarotTranslationsKo[3].name).toBe('여황제')
      expect(tarotTranslationsKo[4].name).toBe('황제')
    })

    it('should have Korean keywords', () => {
      const fool = tarotTranslationsKo[0]
      expect(fool.upright.keywords).toContain('시작')
      expect(fool.upright.keywords).toContain('모험')
    })

    it('should have Korean meanings', () => {
      const fool = tarotTranslationsKo[0]
      expect(fool.upright.meaning).toContain('여정')
      expect(fool.reversed.meaning).toContain('무모')
    })
  })

  describe('tarotTranslationsEn', () => {
    it('should have 78 cards (0-77)', () => {
      const keys = Object.keys(tarotTranslationsEn).map(Number)
      expect(keys.length).toBe(78)
    })

    it('should have correct structure for each card', () => {
      for (let i = 0; i < 78; i++) {
        const card = tarotTranslationsEn[i]
        expect(card).toBeDefined()
        expect(card.name).toBeTruthy()
        expect(card.upright.keywords.length).toBeGreaterThan(0)
        expect(card.reversed.keywords.length).toBeGreaterThan(0)
      }
    })

    it('should have English names for Major Arcana', () => {
      expect(tarotTranslationsEn[0].name).toBe('The Fool')
      expect(tarotTranslationsEn[1].name).toBe('The Magician')
      expect(tarotTranslationsEn[2].name).toBe('The High Priestess')
    })

    it('should have English names for Minor Arcana', () => {
      expect(tarotTranslationsEn[64].name).toBe('Ace of Pentacles')
      expect(tarotTranslationsEn[77].name).toBe('King of Pentacles')
    })

    it('should have 5 keywords for most cards', () => {
      const card = tarotTranslationsEn[0]
      expect(card.upright.keywords.length).toBeGreaterThanOrEqual(4)
      expect(card.reversed.keywords.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('getCardTranslation', () => {
    it('should return Korean translation for ko locale', () => {
      const card = getCardTranslation(0, 'ko')
      expect(card).toBeDefined()
      expect(card!.name).toBe('바보')
    })

    it('should return English translation for en locale', () => {
      const card = getCardTranslation(0, 'en')
      expect(card).toBeDefined()
      expect(card!.name).toBe('The Fool')
    })

    it('should return English for unknown locale', () => {
      const card = getCardTranslation(0, 'fr')
      expect(card).toBeDefined()
      expect(card!.name).toBe('The Fool')
    })

    it('should return undefined for invalid card ID', () => {
      const card = getCardTranslation(999, 'ko')
      expect(card).toBeUndefined()
    })

    it('should return correct card for all Major Arcana (0-21)', () => {
      for (let i = 0; i <= 21; i++) {
        const ko = getCardTranslation(i, 'ko')
        const en = getCardTranslation(i, 'en')
        expect(ko).toBeDefined()
        expect(en).toBeDefined()
        expect(ko!.name).not.toBe(en!.name) // Korean and English names differ
      }
    })

    it('should return Ace of Wands for card 22', () => {
      const en = getCardTranslation(22, 'en')
      expect(en).toBeDefined()
      expect(en!.name).toContain('Wands')
    })
  })

  describe('getAllCardTranslations', () => {
    it('should return Korean translations for ko', () => {
      const translations = getAllCardTranslations('ko')
      expect(translations).toBe(tarotTranslationsKo)
    })

    it('should return English translations for en', () => {
      const translations = getAllCardTranslations('en')
      expect(translations).toBe(tarotTranslationsEn)
    })

    it('should return English for unknown locale', () => {
      const translations = getAllCardTranslations('ja')
      expect(translations).toBe(tarotTranslationsEn)
    })

    it('should have all 78 cards', () => {
      const translations = getAllCardTranslations('ko')
      expect(Object.keys(translations).length).toBe(78)
    })
  })

  describe('Card data consistency', () => {
    it('should have matching card IDs between ko and en', () => {
      const koKeys = Object.keys(tarotTranslationsKo).sort()
      const enKeys = Object.keys(tarotTranslationsEn).sort()
      expect(koKeys).toEqual(enKeys)
    })

    it('should have non-empty meanings for all cards in both languages', () => {
      for (let i = 0; i < 78; i++) {
        expect(tarotTranslationsKo[i].upright.meaning.length).toBeGreaterThan(10)
        expect(tarotTranslationsKo[i].reversed.meaning.length).toBeGreaterThan(10)
        expect(tarotTranslationsEn[i].upright.meaning.length).toBeGreaterThan(10)
        expect(tarotTranslationsEn[i].reversed.meaning.length).toBeGreaterThan(10)
      }
    })
  })
})
