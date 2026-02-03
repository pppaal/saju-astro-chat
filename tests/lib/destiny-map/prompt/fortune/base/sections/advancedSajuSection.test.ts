/**
 * advancedSajuSection.test.ts - 고급 사주 분석 섹션 테스트
 */

import { describe, it, expect } from 'vitest'
import { extractAdvancedAnalysis } from '@/lib/destiny-map/prompt/fortune/base/sections/advancedSajuSection'

describe('advancedSajuSection', () => {
  describe('extractAdvancedAnalysis', () => {
    it('should return default values for undefined input', () => {
      const result = extractAdvancedAnalysis(undefined)

      expect(result.strengthText).toBe('-')
      expect(result.geokgukText).toBe('-')
      expect(result.yongsinPrimary).toBe('-')
      expect(result.sibsinDistText).toBe('')
      expect(result.relationshipText).toBe('-')
      expect(result.careerText).toBe('-')
    })

    it('should extract strength information', () => {
      const adv = {
        extended: {
          strength: {
            level: '신강',
            score: 75,
            rootCount: 3,
          },
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.strengthText).toBe('신강 (75점, 통근3개)')
    })

    it('should handle missing strength data', () => {
      const adv = {
        extended: {},
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.strengthText).toBe('-')
    })

    it('should extract geokguk (격국) information', () => {
      const adv = {
        geokguk: {
          type: '정재격',
          description: '재물운이 좋은 격국',
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.geokgukText).toBe('정재격')
      expect(result.geokgukDesc).toBe('재물운이 좋은 격국')
    })

    it('should extract geokguk from extended if not in root', () => {
      const adv = {
        extended: {
          geokguk: {
            type: '식신격',
            description: '창의성이 뛰어난 격국',
          },
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.geokgukText).toBe('식신격')
      expect(result.geokgukDesc).toBe('창의성이 뛰어난 격국')
    })

    it('should extract yongsin (용신) with object format', () => {
      const adv = {
        yongsin: {
          primary: { element: '木' },
          secondary: { element: '水' },
          avoid: { element: '金' },
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.yongsinPrimary).toBe('木')
      expect(result.yongsinSecondary).toBe('水')
      expect(result.yongsinAvoid).toBe('金')
    })

    it('should extract yongsin with string format', () => {
      const adv = {
        extended: {
          yongsin: {
            primary: '火',
            secondary: '木',
            avoid: '水',
          },
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.yongsinPrimary).toBe('火')
      expect(result.yongsinSecondary).toBe('木')
      expect(result.yongsinAvoid).toBe('水')
    })

    it('should extract sibsin (십신) distribution', () => {
      const adv = {
        sibsin: {
          count: {
            정재: 2,
            편재: 1,
            정관: 1,
            식신: 3,
          },
          dominantSibsin: ['식신', '정재'],
          missingSibsin: ['인수', '겁재'],
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.sibsinDistText).toContain('정재(2)')
      expect(result.sibsinDistText).toContain('편재(1)')
      expect(result.sibsinDistText).toContain('식신(3)')
      expect(result.sibsinDominant).toBe('식신, 정재')
      expect(result.sibsinMissing).toBe('인수, 겁재')
    })

    it('should handle alternative sibsin property names', () => {
      const adv = {
        sibsin: {
          distribution: {
            정재: 2,
            편관: 1,
          },
          dominant: '정재',
          missing: ['편인'],
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.sibsinDistText).toContain('정재(2)')
      expect(result.sibsinDominant).toBe('정재')
    })

    it('should filter out zero values in sibsin distribution', () => {
      const adv = {
        sibsin: {
          count: {
            정재: 2,
            편재: 0,
            정관: 1,
          },
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.sibsinDistText).toContain('정재(2)')
      expect(result.sibsinDistText).toContain('정관(1)')
      expect(result.sibsinDistText).not.toContain('편재')
    })

    it('should extract sibsin relationships', () => {
      const adv = {
        sibsin: {
          relationships: [
            { type: '배우자', quality: '조화로움' },
            { type: '친구', description: '좋은 관계' },
            { type: '직장상사', quality: '긴장감' },
          ],
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.relationshipText).toBe('배우자:조화로움; 친구:좋은 관계; 직장상사:긴장감')
    })

    it('should limit relationships to 3 items', () => {
      const adv = {
        sibsin: {
          relationships: [
            { type: 'A', quality: '1' },
            { type: 'B', quality: '2' },
            { type: 'C', quality: '3' },
            { type: 'D', quality: '4' },
          ],
        },
      }

      const result = extractAdvancedAnalysis(adv)

      const relationshipCount = result.relationshipText.split(';').length
      expect(relationshipCount).toBe(3)
    })

    it('should extract career aptitudes', () => {
      const adv = {
        sibsin: {
          careerAptitudes: [
            { field: '예술', score: 85 },
            { field: '경영', score: 70 },
            { field: '교육', score: 65 },
          ],
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.careerText).toBe('예술(85), 경영(70), 교육(65)')
    })

    it('should limit career aptitudes to 4 items', () => {
      const adv = {
        sibsin: {
          careerAptitudes: [
            { field: 'A', score: 1 },
            { field: 'B', score: 2 },
            { field: 'C', score: 3 },
            { field: 'D', score: 4 },
            { field: 'E', score: 5 },
          ],
        },
      }

      const result = extractAdvancedAnalysis(adv)

      const careerCount = result.careerText.split(',').length
      expect(careerCount).toBe(4)
    })

    it('should extract hyeongchung (형충회합) - chung', () => {
      const adv = {
        hyeongchung: {
          chung: [
            { branch1: '子', branch2: '午' },
            { from: '寅', to: '申' },
          ],
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.chungText).toBe('子-午, 寅-申')
    })

    it('should extract hyeongchung - hap with result', () => {
      const adv = {
        hyeongchung: {
          hap: [
            { branch1: '子', branch2: '丑', result: '土' },
            { from: '寅', to: '亥', result: '木' },
          ],
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.hapText).toBe('子-丑→土, 寅-亥→木')
    })

    it('should extract hyeongchung - samhap', () => {
      const adv = {
        hyeongchung: {
          samhap: [{ branches: ['申', '子', '辰'] }, { branches: ['寅', '午', '戌'] }],
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.samhapText).toBe('申-子-辰; 寅-午-戌')
    })

    it('should extract health and career information', () => {
      const adv = {
        healthCareer: {
          health: {
            vulnerabilities: ['간', '눈'],
          },
          career: {
            suitableFields: ['예술', '교육', '상담'],
          },
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.healthWeak).toBe('간, 눈')
      expect(result.suitableCareers).toBe('예술, 교육, 상담')
    })

    it('should handle alternative health property names', () => {
      const adv = {
        healthCareer: {
          health: {
            weakOrgans: ['폐', '피부'],
          },
          career: {
            aptitudes: ['기술', '연구'],
          },
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.healthWeak).toBe('폐, 피부')
      expect(result.suitableCareers).toBe('기술, 연구')
    })

    it('should extract score information', () => {
      const adv = {
        score: {
          total: 85,
          business: 75,
          wealth: 80,
          health: 70,
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.scoreText).toBe('총85/100 (사업75, 재물80, 건강70)')
    })

    it('should handle alternative score property names', () => {
      const adv = {
        score: {
          overall: 90,
          career: 80,
          finance: 85,
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.scoreText).toContain('총90/100')
      expect(result.scoreText).toContain('사업80')
      expect(result.scoreText).toContain('재물85')
    })

    it('should extract tonggeun, tuechul, hoeguk, deukryeong', () => {
      const adv = {
        tonggeun: {
          stem: '甲',
          rootBranch: '寅',
          strength: '강',
        },
        tuechul: [
          { element: '木', type: '투출', stem: '甲' },
          { element: '火', type: '투출', stem: '丙' },
        ],
        hoeguk: [{ type: '목국', name: '목국', resultElement: '木' }],
        deukryeong: {
          status: '득령',
          type: '득령',
          score: 90,
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.tonggeunText).toBe('甲→寅 (강)')
      expect(result.tuechulText).toContain('木(투출)')
      expect(result.hoegukText).toContain('목국→木')
      expect(result.deukryeongText).toBe('득령 (90점)')
    })

    it('should extract ultra advanced analysis', () => {
      const adv = {
        ultraAdvanced: {
          jonggeok: {
            type: '종재격',
            name: '종재격',
          },
          iljuAnalysis: {
            character: '성실하고 근면함',
            personality: '책임감이 강함',
          },
          gongmang: {
            branches: ['午', '未'],
            emptyBranches: ['午', '未'],
          },
        },
      }

      const result = extractAdvancedAnalysis(adv)

      expect(result.jonggeokText).toBe('종재격')
      expect(result.iljuText).toBe('성실하고 근면함')
      expect(result.gongmangText).toBe('午, 未')
    })

    it('should handle complex nested data structure', () => {
      const adv = {
        extended: {
          strength: { level: '신약', score: 45, rootCount: 1 },
          geokguk: { type: '식상격', description: '창의적' },
          yongsin: { primary: '土', secondary: '火', avoid: '木' },
        },
        sibsin: {
          count: { 식신: 3, 상관: 2, 정재: 1 },
          dominantSibsin: ['식신', '상관'],
          missingSibsin: ['정인', '편인'],
          relationships: [{ type: '친구', quality: '좋음' }],
          careerAptitudes: [{ field: '예술', score: 90 }],
        },
        hyeongchung: {
          chung: [{ branch1: '子', branch2: '午' }],
          hap: [{ branch1: '寅', branch2: '亥', result: '木' }],
        },
        healthCareer: {
          health: { vulnerabilities: ['간'] },
          career: { suitableFields: ['예술', '디자인'] },
        },
        score: {
          total: 80,
          business: 70,
          wealth: 75,
          health: 65,
        },
      }

      const result = extractAdvancedAnalysis(adv)

      // Verify all sections were extracted
      expect(result.strengthText).toContain('신약')
      expect(result.geokgukText).toBe('식상격')
      expect(result.yongsinPrimary).toBe('土')
      expect(result.sibsinDistText).toContain('식신(3)')
      expect(result.sibsinDominant).toBe('식신, 상관')
      expect(result.relationshipText).toContain('친구:좋음')
      expect(result.careerText).toContain('예술(90)')
      expect(result.chungText).toBe('子-午')
      expect(result.hapText).toContain('寅-亥→木')
      expect(result.healthWeak).toBe('간')
      expect(result.suitableCareers).toContain('예술')
      expect(result.scoreText).toContain('총80/100')
    })
  })
})
