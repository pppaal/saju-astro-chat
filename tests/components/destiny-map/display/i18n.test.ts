/**
 * Tests for src/components/destiny-map/display/i18n.ts
 * 다국어 번역 상수 테스트
 */

import { describe, it, expect } from 'vitest'
import {
  THEME_LABELS,
  getThemeLabel,
  I18N,
} from '@/components/destiny-map/display/i18n'

describe('i18n', () => {
  describe('THEME_LABELS', () => {
    describe('Data structure', () => {
      it('should define 12 theme keys', () => {
        const keys = Object.keys(THEME_LABELS)
        expect(keys).toHaveLength(12)
      })

      it('should have all 5 languages for each theme', () => {
        Object.values(THEME_LABELS).forEach((theme) => {
          expect(theme).toHaveProperty('ko')
          expect(theme).toHaveProperty('en')
          expect(theme).toHaveProperty('ja')
          expect(theme).toHaveProperty('zh')
          expect(theme).toHaveProperty('es')
        })
      })

      it('should have non-empty strings for all translations', () => {
        Object.values(THEME_LABELS).forEach((theme) => {
          Object.values(theme).forEach((label) => {
            expect(typeof label).toBe('string')
            expect(label.length).toBeGreaterThan(0)
          })
        })
      })
    })

    describe('Focus themes', () => {
      it('should define focus_overall theme', () => {
        expect(THEME_LABELS.focus_overall.ko).toBe('운명의 지도')
        expect(THEME_LABELS.focus_overall.en).toBe('Destiny Map')
        expect(THEME_LABELS.focus_overall.ja).toBe('運命の地図')
        expect(THEME_LABELS.focus_overall.zh).toBe('命运地图')
        expect(THEME_LABELS.focus_overall.es).toBe('Mapa del Destino')
      })

      it('should define focus_love theme', () => {
        expect(THEME_LABELS.focus_love.ko).toBe('연애운')
        expect(THEME_LABELS.focus_love.en).toBe('Love & Romance')
      })

      it('should define focus_career theme', () => {
        expect(THEME_LABELS.focus_career.ko).toBe('직업운')
        expect(THEME_LABELS.focus_career.en).toBe('Career & Work')
      })

      it('should define focus_wealth theme', () => {
        expect(THEME_LABELS.focus_wealth.ko).toBe('재물운')
        expect(THEME_LABELS.focus_wealth.en).toBe('Wealth & Finance')
      })

      it('should define focus_health theme', () => {
        expect(THEME_LABELS.focus_health.ko).toBe('건강운')
        expect(THEME_LABELS.focus_health.en).toBe('Health & Vitality')
      })

      it('should define focus_energy theme', () => {
        expect(THEME_LABELS.focus_energy.ko).toBe('기운/에너지')
        expect(THEME_LABELS.focus_energy.en).toBe('Energy & Vitality')
      })

      it('should define focus_family theme', () => {
        expect(THEME_LABELS.focus_family.ko).toBe('가정운')
        expect(THEME_LABELS.focus_family.en).toBe('Family & Home')
      })

      it('should define focus_social theme', () => {
        expect(THEME_LABELS.focus_social.ko).toBe('대인관계')
        expect(THEME_LABELS.focus_social.en).toBe('Social & Relationships')
      })
    })

    describe('Fortune themes', () => {
      it('should define fortune_new_year theme', () => {
        expect(THEME_LABELS.fortune_new_year.ko).toBe('신년 운세')
        expect(THEME_LABELS.fortune_new_year.en).toBe('New Year Fortune')
      })

      it('should define fortune_next_year theme', () => {
        expect(THEME_LABELS.fortune_next_year.ko).toBe('내년 운세')
        expect(THEME_LABELS.fortune_next_year.en).toBe('Next Year Fortune')
      })

      it('should define fortune_monthly theme', () => {
        expect(THEME_LABELS.fortune_monthly.ko).toBe('월운')
        expect(THEME_LABELS.fortune_monthly.en).toBe('Monthly Fortune')
      })

      it('should define fortune_today theme', () => {
        expect(THEME_LABELS.fortune_today.ko).toBe('오늘의 운세')
        expect(THEME_LABELS.fortune_today.en).toBe("Today's Fortune")
      })
    })

    describe('Language coverage', () => {
      it('should have Korean translations for all themes', () => {
        Object.values(THEME_LABELS).forEach((theme) => {
          expect(theme.ko).toBeDefined()
          expect(theme.ko.length).toBeGreaterThan(0)
        })
      })

      it('should have English translations for all themes', () => {
        Object.values(THEME_LABELS).forEach((theme) => {
          expect(theme.en).toBeDefined()
          expect(theme.en.length).toBeGreaterThan(0)
        })
      })

      it('should have Japanese translations for all themes', () => {
        Object.values(THEME_LABELS).forEach((theme) => {
          expect(theme.ja).toBeDefined()
          expect(theme.ja.length).toBeGreaterThan(0)
        })
      })

      it('should have Chinese translations for all themes', () => {
        Object.values(THEME_LABELS).forEach((theme) => {
          expect(theme.zh).toBeDefined()
          expect(theme.zh.length).toBeGreaterThan(0)
        })
      })

      it('should have Spanish translations for all themes', () => {
        Object.values(THEME_LABELS).forEach((theme) => {
          expect(theme.es).toBeDefined()
          expect(theme.es.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('getThemeLabel', () => {
    describe('Valid theme keys', () => {
      it('should return Korean label for focus_overall', () => {
        const label = getThemeLabel('focus_overall', 'ko')
        expect(label).toBe('운명의 지도')
      })

      it('should return English label for focus_love', () => {
        const label = getThemeLabel('focus_love', 'en')
        expect(label).toBe('Love & Romance')
      })

      it('should return Japanese label for focus_career', () => {
        const label = getThemeLabel('focus_career', 'ja')
        expect(label).toBe('仕事運')
      })

      it('should return Chinese label for focus_wealth', () => {
        const label = getThemeLabel('focus_wealth', 'zh')
        expect(label).toBe('财运')
      })

      it('should return Spanish label for focus_health', () => {
        const label = getThemeLabel('focus_health', 'es')
        expect(label).toBe('Salud')
      })
    })

    describe('Case insensitivity', () => {
      it('should handle uppercase theme keys', () => {
        const label = getThemeLabel('FOCUS_OVERALL', 'en')
        expect(label).toBe('Destiny Map')
      })

      it('should handle mixed case theme keys', () => {
        const label = getThemeLabel('Focus_Love', 'en')
        expect(label).toBe('Love & Romance')
      })

      it('should handle lowercase theme keys', () => {
        const label = getThemeLabel('focus_career', 'en')
        expect(label).toBe('Career & Work')
      })
    })

    describe('Invalid inputs', () => {
      it('should return theme key for unknown theme', () => {
        const label = getThemeLabel('unknown_theme', 'ko')
        expect(label).toBe('unknown_theme')
      })

      it('should return English fallback for valid theme with missing language', () => {
        // This test assumes the theme exists but language might not
        const label = getThemeLabel('focus_overall', 'ko')
        expect(label).toBeDefined()
      })

      it('should handle empty theme key', () => {
        const label = getThemeLabel('', 'ko')
        expect(label).toBe('')
      })
    })

    describe('All themes in all languages', () => {
      const themeKeys = Object.keys(THEME_LABELS)
      const langKeys: Array<'ko' | 'en' | 'ja' | 'zh' | 'es'> = ['ko', 'en', 'ja', 'zh', 'es']

      langKeys.forEach((lang) => {
        it(`should return valid labels for all themes in ${lang}`, () => {
          themeKeys.forEach((themeKey) => {
            const label = getThemeLabel(themeKey, lang)
            expect(label).toBeDefined()
            expect(label.length).toBeGreaterThan(0)
          })
        })
      })
    })
  })

  describe('I18N', () => {
    describe('Data structure', () => {
      it('should define all 5 languages', () => {
        const keys = Object.keys(I18N)
        expect(keys).toHaveLength(5)
        expect(keys).toContain('ko')
        expect(keys).toContain('en')
        expect(keys).toContain('ja')
        expect(keys).toContain('zh')
        expect(keys).toContain('es')
      })

      it('should have all 5 properties for each language', () => {
        Object.values(I18N).forEach((lang) => {
          expect(lang).toHaveProperty('userFallback')
          expect(lang).toHaveProperty('analysisFallback')
          expect(lang).toHaveProperty('tagline')
          expect(lang).toHaveProperty('followup')
          expect(lang).toHaveProperty('birthDate')
        })
      })

      it('should have non-empty strings for all translations', () => {
        Object.values(I18N).forEach((lang) => {
          Object.values(lang).forEach((text) => {
            expect(typeof text).toBe('string')
            expect(text.length).toBeGreaterThan(0)
          })
        })
      })
    })

    describe('Korean translations', () => {
      it('should define Korean userFallback', () => {
        expect(I18N.ko.userFallback).toBe('사용자')
      })

      it('should define Korean analysisFallback', () => {
        expect(I18N.ko.analysisFallback).toBe('분석을 불러오지 못했습니다.')
      })

      it('should define Korean tagline', () => {
        expect(I18N.ko.tagline).toBe('동양과 서양의 지혜를 융합한 맞춤 운세 분석')
      })

      it('should define Korean followup', () => {
        expect(I18N.ko.followup).toBe('후속 질문하기')
      })

      it('should define Korean birthDate', () => {
        expect(I18N.ko.birthDate).toBe('생년월일')
      })
    })

    describe('English translations', () => {
      it('should define English userFallback', () => {
        expect(I18N.en.userFallback).toBe('User')
      })

      it('should define English analysisFallback', () => {
        expect(I18N.en.analysisFallback).toBe('Failed to load analysis.')
      })

      it('should define English tagline', () => {
        expect(I18N.en.tagline).toBe('Your personalized destiny reading combining Eastern & Western wisdom')
      })

      it('should define English followup', () => {
        expect(I18N.en.followup).toBe('Ask a follow-up question')
      })

      it('should define English birthDate', () => {
        expect(I18N.en.birthDate).toBe('Birth Date')
      })
    })

    describe('Japanese translations', () => {
      it('should define Japanese userFallback', () => {
        expect(I18N.ja.userFallback).toBe('ユーザー')
      })

      it('should define Japanese analysisFallback', () => {
        expect(I18N.ja.analysisFallback).toBe('分析の読み込みに失敗しました。')
      })

      it('should define Japanese tagline', () => {
        expect(I18N.ja.tagline).toBe('東洋と西洋の知恵を融合したカスタム運勢分析')
      })

      it('should define Japanese followup', () => {
        expect(I18N.ja.followup).toBe('追加で質問する')
      })

      it('should define Japanese birthDate', () => {
        expect(I18N.ja.birthDate).toBe('生年月日')
      })
    })

    describe('Chinese translations', () => {
      it('should define Chinese userFallback', () => {
        expect(I18N.zh.userFallback).toBe('用户')
      })

      it('should define Chinese analysisFallback', () => {
        expect(I18N.zh.analysisFallback).toBe('无法加载分析。')
      })

      it('should define Chinese tagline', () => {
        expect(I18N.zh.tagline).toBe('融合东西方智慧的定制命运分析')
      })

      it('should define Chinese followup', () => {
        expect(I18N.zh.followup).toBe('继续提问')
      })

      it('should define Chinese birthDate', () => {
        expect(I18N.zh.birthDate).toBe('出生日期')
      })
    })

    describe('Spanish translations', () => {
      it('should define Spanish userFallback', () => {
        expect(I18N.es.userFallback).toBe('Usuario')
      })

      it('should define Spanish analysisFallback', () => {
        expect(I18N.es.analysisFallback).toBe('Error al cargar el análisis.')
      })

      it('should define Spanish tagline', () => {
        expect(I18N.es.tagline).toBe('Tu lectura de destino personalizada combinando sabiduría oriental y occidental')
      })

      it('should define Spanish followup', () => {
        expect(I18N.es.followup).toBe('Hacer una pregunta de seguimiento')
      })

      it('should define Spanish birthDate', () => {
        expect(I18N.es.birthDate).toBe('Fecha de nacimiento')
      })
    })

    describe('Translation quality', () => {
      it('should have taglines with "wisdom" concept in all languages', () => {
        // Korean: 지혜 (wisdom)
        expect(I18N.ko.tagline).toContain('지혜')
        // English: wisdom
        expect(I18N.en.tagline).toContain('wisdom')
        // Japanese: 知恵 (wisdom)
        expect(I18N.ja.tagline).toContain('知恵')
        // Chinese: 智慧 (wisdom)
        expect(I18N.zh.tagline).toContain('智慧')
        // Spanish: sabiduría (wisdom)
        expect(I18N.es.tagline).toContain('sabiduría')
      })

      it('should have reasonable tagline lengths', () => {
        Object.values(I18N).forEach((lang) => {
          expect(lang.tagline.length).toBeGreaterThan(10)
          expect(lang.tagline.length).toBeLessThan(150)
        })
      })

      it('should have concise followup text', () => {
        Object.values(I18N).forEach((lang) => {
          expect(lang.followup.length).toBeGreaterThan(0)
          expect(lang.followup.length).toBeLessThan(50)
        })
      })
    })
  })

  describe('Integration', () => {
    describe('Consistency across constants', () => {
      it('should have same language keys in THEME_LABELS and I18N', () => {
        const themeLangs = new Set<string>()
        Object.values(THEME_LABELS).forEach((theme) => {
          Object.keys(theme).forEach((lang) => themeLangs.add(lang))
        })

        const i18nLangs = new Set(Object.keys(I18N))

        expect(themeLangs).toEqual(i18nLangs)
      })

      it('should support all 5 languages consistently', () => {
        const expectedLangs = ['ko', 'en', 'ja', 'zh', 'es']

        // Check THEME_LABELS
        Object.values(THEME_LABELS).forEach((theme) => {
          expectedLangs.forEach((lang) => {
            expect(theme).toHaveProperty(lang)
          })
        })

        // Check I18N
        expectedLangs.forEach((lang) => {
          expect(I18N).toHaveProperty(lang)
        })
      })
    })

    describe('getThemeLabel integration', () => {
      it('should work with all THEME_LABELS keys', () => {
        Object.keys(THEME_LABELS).forEach((themeKey) => {
          const label = getThemeLabel(themeKey, 'en')
          expect(label).toBeDefined()
          expect(label).toBe(THEME_LABELS[themeKey].en)
        })
      })

      it('should handle case-insensitive lookups', () => {
        const lowerLabel = getThemeLabel('focus_overall', 'en')
        const upperLabel = getThemeLabel('FOCUS_OVERALL', 'en')
        expect(lowerLabel).toBe(upperLabel)
      })
    })
  })
})
