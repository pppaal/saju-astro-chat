/**
 * 궁합 상담사 EN 신살 이름 = 정본 SHINSAL_NAME_EN (G14 후속, wave-12 open item).
 *
 * 개별(self) 신살 블록 · 상담 프롬프트 · 시너스트리 신살 cross 블록이 음역('Yangin' · 'Gwimun' ·
 * 'Dohwa' · 'Hongyeom' · 'Baekho' · 'Goegang' · 'Cheoneul')이 아니라 Life · 상담사 · 캘린더와 같은
 * EN 이름('Blade Edge' · 'Spirit Gate' …)을 쓴다. KO 블록은 그대로.
 */
import { describe, it, expect } from 'vitest'
import { formatPersonalShinsal, PERSONAL_SHINSAL_KEEP } from '@/lib/compatibility/personalShinsal'
import { buildCompatibilityCounselorPrompt } from '@/lib/prompts/compatibilityCounselorPrompt'
import { formatSajuSynastry } from '@/lib/compatibility/sajuSynastryFormatter'
import { SHINSAL_NAME_EN } from '@/lib/calendar-engine/derivers/signalI18n'

const ROMANIZED =
  /\b(Yangin|Gwimun|Wonjin|Gosin|Geumyeo|Cheondeok|Woldeok|Dohwa|Hongyeom|Baekho|Goegang|Cheoneul)\b/
const HANGUL = /[가-힣]/

describe('formatPersonalShinsal — EN 이름은 SHINSAL_NAME_EN', () => {
  const SHINSAL = [
    { kind: '양인', pillars: ['day'] },
    { kind: '귀문관', pillars: ['year', 'month'] },
    { kind: '도화', pillars: ['day'] }, // cross 신살 — self 블록에서 빠진다
  ]

  it('en: 정본 이름 + 기둥 + 짧은 뜻, 음역 · 한글 없음', () => {
    const line = formatPersonalShinsal('A(Sam)', SHINSAL, 'en')
    expect(line).toBe(
      'A(Sam): Blade Edge(D, sharp, aggressive) · Spirit Gate(Y·M, obsessive, sensitive)'
    )
    expect(line).not.toMatch(ROMANIZED)
    expect(line).not.toMatch(HANGUL)
  })

  it('ko: 그대로(한글 이름 · 기둥 · 뜻)', () => {
    expect(formatPersonalShinsal('A', SHINSAL, 'ko')).toBe(
      'A: 양인(일, 날카로움·과격) · 귀문관(년·월, 집착·예민)'
    )
  })

  it('화이트리스트 일곱 신살 모두 정본 EN 이름이 있다(한글로 떨어지지 않는다)', () => {
    for (const kind of Object.keys(PERSONAL_SHINSAL_KEEP)) {
      const line = formatPersonalShinsal('B', [{ kind, pillars: ['month'] }], 'en')!
      expect(line, kind).toContain(SHINSAL_NAME_EN[kind])
      expect(line, kind).not.toMatch(HANGUL)
      expect(line, kind).not.toMatch(ROMANIZED)
    }
  })

  it('남길 신살이 없으면 null', () => {
    expect(formatPersonalShinsal('A', [{ kind: '도화' }], 'en')).toBeNull()
    expect(formatPersonalShinsal('A', [], 'en')).toBeNull()
  })
})

describe('compatibilityCounselorPrompt — EN 개별 신살 규칙이 데이터 블록과 같은 이름', () => {
  it('en: 개별 · cross 신살 목록과 예시가 정본 EN 이름, 음역 없음', () => {
    const en = buildCompatibilityCounselorPrompt('en')
    expect(en).toContain(
      '(Blade Edge · Spirit Gate · Resentment Star · Solitary Star · Golden Carriage Star · Heavenly Virtue/Monthly Virtue)'
    )
    expect(en).toContain(
      '(Peach Blossom / Red Charm Star / White Tiger / Strong-Willed Star / Heavenly Benefactor)'
    )
    expect(en).toContain('A Blade Edge → once locked in, all-in; B Spirit Gate →')
    expect(en).not.toMatch(ROMANIZED)
  })

  it('ko: 한글 규칙 그대로', () => {
    expect(buildCompatibilityCounselorPrompt('ko')).toContain(
      '양인·귀문관·원진·고신·금여성·천덕/월덕귀인'
    )
  })
})

describe('formatSajuSynastry — EN 신살 cross 블록도 정본 이름', () => {
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const pillars = (seed: number) =>
    [0, 1, 2, 3].map((k) => ({
      stem: STEMS[(seed * 7 + k * 3) % 10],
      branch: BRANCHES[(seed * 5 + k * 4) % 12],
    }))

  it('넓은 기둥 조합에서 EN 출력에 음역 신살 이름이 없고, 신살 머리줄은 정본 이름', () => {
    let headers = 0
    for (let a = 0; a < 30; a++) {
      for (let b = 0; b < 30; b++) {
        const out = formatSajuSynastry({
          pillarsA: pillars(a),
          pillarsB: pillars(b + 13),
          nameA: 'A',
          nameB: 'B',
          lang: 'en',
        })
        expect(out).not.toMatch(ROMANIZED)
        if (out.includes('[CRITICAL · sinsal (')) {
          headers++
          expect(out).toContain(
            '[CRITICAL · sinsal (Peach Blossom·Red Charm Star·White Tiger·Strong-Willed Star)]'
          )
        }
      }
    }
    expect(headers).toBeGreaterThan(0)
  })
})
