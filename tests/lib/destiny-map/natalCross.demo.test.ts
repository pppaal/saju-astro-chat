/**
 * 데모 — 샘플 한 명의 사주+점성을 평가기에 넣어 운세 차트 교차표(9행)와
 * 종합 문장을 콘솔에 그대로 출력한다. (UI 가 렌더하는 내용과 동일한 판정)
 * 실행: npx vitest run tests/lib/destiny-map/natalCross.demo.test.ts
 */
import { describe, it, expect } from 'vitest'
import {
  evalIdentity,
  evalNeeds,
  evalSocialRole,
  evalFortune,
  evalRelations,
  evalStrength,
  evalTemperament,
  evalEnergyDirection,
  evalPersona,
  synthesize,
  type CrossVerdict,
} from '@/lib/destiny-map/natalCross'

describe('운세 차트 교차표 — 데모 출력', () => {
  it('샘플 한 명의 9영역 교차 + 종합', () => {
    // ── 샘플 인물: 일간 甲(목), 정관격, 관성 우세, 일주 건록+도화 ──
    const saju = {
      dayMaster: { name: '甲', element: '목' },
      fiveElements: { wood: 2, fire: 1, earth: 2, metal: 2, water: 1 },
      yongsin: '수',
      geokguk: '정관격',
      strengthDetails: { 비겁: 2, 인성: 1, 식상: 1, 재성: 1, 관성: 3 },
      dayStage: '건록',
      dayShinsal: ['도화'],
      hap: 2,
      chung: 1,
    }
    const astro = {
      sun: 'Leo', // 불
      moon: 'Sagittarius', // 불 (용신 수와 상극 → 긴장 데모)
      mcSign: 'Capricorn', // 토성 입궁
      asc: 'Aries', // 불
      // 전체 행성 sign (기질·강조행성 집계용)
      planetSigns: ['Leo', 'Sagittarius', 'Virgo', 'Libra', 'Aries', 'Pisces', 'Capricorn'],
      emphasized: new Set(['Saturn', 'Mars', 'Jupiter']), // 입궁/앵귤러 행성
      topDignity: { planet: 'Saturn', status: 'domicile' },
      harmonious: 3, // 조화각(삼각·육각)
      hard: 1, // 긴장각(직각·대립)
    }

    const lang = 'ko' as const
    const rows: Array<{ cat: string; v: CrossVerdict | null }> = [
      { cat: '정체성   ', v: evalIdentity(saju.dayMaster.element, astro.sun) },
      { cat: '욕망     ', v: evalNeeds(saju.yongsin, astro.moon) },
      { cat: '사회역할 ', v: evalSocialRole(saju.geokguk, astro.mcSign) },
      { cat: '길흉     ', v: evalFortune(saju.dayShinsal) },
      { cat: '관계     ', v: evalRelations(saju.hap, saju.chung, astro.harmonious, astro.hard) },
      { cat: '강점     ', v: evalStrength(saju.dayStage, astro.topDignity) },
      { cat: '기질     ', v: evalTemperament(saju.fiveElements, astro.planetSigns) },
      { cat: '에너지   ', v: evalEnergyDirection(saju.strengthDetails, astro.emphasized) },
      { cat: '드러나는나', v: evalPersona(saju.dayMaster.element, astro.asc) },
    ]

    const TONE_KO: Record<string, string> = {
      resonant: '동조 ✓',
      complement: '보완',
      tension: '긴장 ⚡',
      neutral: '중립',
    }
    const verdicts = rows.map((r) => r.v).filter((v): v is CrossVerdict => !!v)
    const synth = synthesize(verdicts)

    const out: string[] = []
    out.push('')
    out.push('╔══════════════════════════════════════════════════════════════════╗')
    out.push('║  🧬 운세 차트 — 사주 ↔ 점성 교차 (샘플: 일간 甲/정관격)           ║')
    out.push('╚══════════════════════════════════════════════════════════════════╝')
    if (synth) out.push(`  [종합] ${synth.text[lang]}`)
    out.push('  ──────────────────────────────────────────────────────────────')
    for (const r of rows) {
      if (!r.v) {
        out.push(`  ${r.cat} │ (데이터 없음)`)
        continue
      }
      out.push(`  ${r.cat} │ ${TONE_KO[r.v.tone]}`)
      out.push(`           └ ${r.v.reason[lang]}`)
    }
    out.push('  ──────────────────────────────────────────────────────────────')
    // eslint-disable-next-line no-console
    console.log(out.join('\n'))

    expect(verdicts.length).toBe(9)
    expect(synth).not.toBeNull()
  })
})
