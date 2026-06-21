import { describe, it, expect } from 'vitest'
import {
  deriveDayDomains,
  type DayEvidenceInput,
  type DayScoreBand,
} from '@/lib/calendar-engine/derivers/dayDomains'

/**
 * deriveDayDomains — 일진 십신을 6개 생활 분야 조언으로 푸는 deriver.
 * 순수 함수라 입력에 대해 결정적 출력을 검증한다.
 */

const ALL_KEYS = ['love', 'money', 'career', 'people', 'study', 'health']

function find(res: NonNullable<ReturnType<typeof deriveDayDomains>>, key: string) {
  const d = res.domains.find((x) => x.key === key)
  if (!d) throw new Error(`domain ${key} missing`)
  return d
}

describe('deriveDayDomains — 기본 구조', () => {
  it('알 수 없는 십신이면 null 을 반환한다', () => {
    expect(deriveDayDomains({ iljinSibsin: '없는십신', sex: '남', scoreBand: 'good' })).toBeNull()
    expect(deriveDayDomains({ iljinSibsin: '', sex: '남', scoreBand: 'good' })).toBeNull()
  })

  it('유효한 십신이면 6개 분야를 META 순서대로 반환한다', () => {
    const res = deriveDayDomains({ iljinSibsin: '비견', sex: '남', scoreBand: 'good' })!
    expect(res).not.toBeNull()
    expect(res.domains.map((d) => d.key)).toEqual(ALL_KEYS)
    for (const d of res.domains) {
      expect(d.label).toBeTruthy()
      expect(d.labelEn).toBeTruthy()
      expect(d.icon).toBeTruthy()
      expect(d.body).toBeTruthy()
      expect(d.bodyEn).toBeTruthy()
      expect(Array.isArray(d.evidence)).toBe(true)
    }
  })
})

describe('deriveDayDomains — band note (3개 구간)', () => {
  const bands: DayScoreBand[] = ['good', 'mid', 'low']
  for (const band of bands) {
    it(`${band} 밴드 머리말이 ko/en 모두 채워진다`, () => {
      const res = deriveDayDomains({ iljinSibsin: '정재', sex: '남', scoreBand: band })!
      expect(res.bandNote).toBeTruthy()
      expect(res.bandNoteEn).toBeTruthy()
    })
  }

  it('good/mid/low 머리말이 서로 다르다', () => {
    const notes = bands.map(
      (b) => deriveDayDomains({ iljinSibsin: '정재', sex: '남', scoreBand: b })!.bandNote
    )
    expect(new Set(notes).size).toBe(3)
  })
})

describe('activeDomains — 십신 카테고리별 켜지는 분야', () => {
  it('비견(self): health, people 켜짐', () => {
    const res = deriveDayDomains({ iljinSibsin: '비견', sex: '남', scoreBand: 'good' })!
    expect(find(res, 'health').active).toBe(true)
    expect(find(res, 'people').active).toBe(true)
    expect(find(res, 'love').active).toBe(false)
  })

  it('식신(output): love, career 켜짐', () => {
    const res = deriveDayDomains({ iljinSibsin: '식신', sex: '남', scoreBand: 'good' })!
    expect(find(res, 'love').active).toBe(true)
    expect(find(res, 'career').active).toBe(true)
  })

  it('정재(wealth) 남성: money + love 켜짐', () => {
    const res = deriveDayDomains({ iljinSibsin: '정재', sex: '남', scoreBand: 'good' })!
    expect(find(res, 'money').active).toBe(true)
    expect(find(res, 'love').active).toBe(true)
  })

  it('정재(wealth) 여성: money 켜지지만 love 는 안 켜짐', () => {
    const res = deriveDayDomains({ iljinSibsin: '정재', sex: '여', scoreBand: 'good' })!
    expect(find(res, 'money').active).toBe(true)
    expect(find(res, 'love').active).toBe(false)
  })

  it('정관(officer) 여성: career + love 켜짐', () => {
    const res = deriveDayDomains({ iljinSibsin: '정관', sex: '여', scoreBand: 'good' })!
    expect(find(res, 'career').active).toBe(true)
    expect(find(res, 'love').active).toBe(true)
  })

  it('정관(officer) 남성: career 켜지지만 love 는 안 켜짐', () => {
    const res = deriveDayDomains({ iljinSibsin: '정관', sex: '남', scoreBand: 'good' })!
    expect(find(res, 'career').active).toBe(true)
    expect(find(res, 'love').active).toBe(false)
  })

  it('정인(resource): study, people 켜짐', () => {
    const res = deriveDayDomains({ iljinSibsin: '정인', sex: '남', scoreBand: 'good' })!
    expect(find(res, 'study').active).toBe(true)
    expect(find(res, 'people').active).toBe(true)
  })
})

describe('loveLine — 성별 분기 (영문/한글 표기)', () => {
  it('wealth + 남성 vs 여성 본문이 다르다', () => {
    const m = deriveDayDomains({ iljinSibsin: '편재', sex: '남', scoreBand: 'good' })!
    const f = deriveDayDomains({ iljinSibsin: '편재', sex: '여', scoreBand: 'good' })!
    expect(find(m, 'love').body).not.toBe(find(f, 'love').body)
  })

  it('officer + 여성 vs 남성 본문이 다르다', () => {
    const m = deriveDayDomains({ iljinSibsin: '편관', sex: '남', scoreBand: 'good' })!
    const f = deriveDayDomains({ iljinSibsin: '편관', sex: '여', scoreBand: 'good' })!
    expect(find(m, 'love').body).not.toBe(find(f, 'love').body)
  })

  it('output/self/resource 카테고리도 love 본문을 가진다', () => {
    for (const sb of ['식신', '비견', '편인']) {
      const res = deriveDayDomains({ iljinSibsin: sb, sex: '남', scoreBand: 'good' })!
      expect(find(res, 'love').body).toBeTruthy()
    }
  })

  it('영문 성별 표기(male/female/m/f)도 인식한다', () => {
    const male = deriveDayDomains({ iljinSibsin: '편재', sex: 'male', scoreBand: 'good' })!
    expect(find(male, 'love').active).toBe(true)
    const f = deriveDayDomains({ iljinSibsin: '편관', sex: 'F', scoreBand: 'good' })!
    expect(find(f, 'love').active).toBe(true)
  })

  it('알 수 없는 성별이면 wealth/officer love 가 켜지지 않는다', () => {
    const res = deriveDayDomains({ iljinSibsin: '편재', sex: '?', scoreBand: 'good' })!
    expect(find(res, 'love').active).toBe(false)
  })
})

describe('classifyEvidence — 트랜짓 라우팅', () => {
  it('금성 트랜짓이 love/money 분야에 칩으로 붙는다 (ko 표기)', () => {
    const evidence: DayEvidenceInput = {
      transits: [{ body: 'Venus', aspect: 'trine', polarity: 2 }],
      shinsal: [],
      crossActivations: [],
    }
    const res = deriveDayDomains({ iljinSibsin: '식신', sex: '남', scoreBand: 'good', evidence })!
    const love = find(res, 'love')
    expect(love.evidence.some((e) => e.kind === 'astro' && e.text.includes('금성'))).toBe(true)
    expect(find(res, 'money').evidence.some((e) => e.text.includes('금성'))).toBe(true)
  })

  it('영문 로케일(ko:false)이면 영문 행성/각 표기를 쓴다', () => {
    const evidence: DayEvidenceInput = {
      transits: [{ body: 'Venus', aspect: 'trine', polarity: 2 }],
      shinsal: [],
      crossActivations: [],
    }
    const res = deriveDayDomains({
      iljinSibsin: '식신',
      sex: '남',
      scoreBand: 'good',
      evidence,
      ko: false,
    })!
    const chip = find(res, 'love').evidence.find((e) => e.kind === 'astro')!
    expect(chip.text).toContain('Venus')
    expect(chip.text).toContain('trine')
  })

  it('알 수 없는 행성은 무시된다', () => {
    const evidence: DayEvidenceInput = {
      transits: [{ body: 'Nibiru', aspect: 'trine', polarity: 2 }],
      shinsal: [],
      crossActivations: [],
    }
    const res = deriveDayDomains({ iljinSibsin: '식신', sex: '남', scoreBand: 'good', evidence })!
    for (const k of ALL_KEYS) expect(find(res, k).evidence.length).toBe(0)
  })

  it('같은 행성 여러 각이 들어오면 분야당 가장 센 한 칩만 남는다(dedup)', () => {
    const evidence: DayEvidenceInput = {
      transits: [
        { body: 'Mercury', aspect: 'square', polarity: 1 },
        { body: 'Mercury', aspect: 'trine', polarity: 3 },
        { body: 'Mercury', aspect: 'sextile', polarity: 2 },
      ],
      shinsal: [],
      crossActivations: [],
    }
    const res = deriveDayDomains({ iljinSibsin: '정인', sex: '남', scoreBand: 'good', evidence })!
    const study = find(res, 'study')
    const merc = study.evidence.filter((e) => e.kind === 'astro' && e.text.startsWith('수성'))
    expect(merc.length).toBe(1)
    // 가장 센(폴라리티 3, trine=삼각) 칩이 남는다.
    expect(merc[0].text).toContain('삼각')
  })

  it('빈 aspect 도 처리한다(공백 trim)', () => {
    const evidence: DayEvidenceInput = {
      transits: [{ body: 'Sun', polarity: 1 }],
      shinsal: [],
      crossActivations: [],
    }
    const res = deriveDayDomains({ iljinSibsin: '정관', sex: '남', scoreBand: 'good', evidence })!
    const chip = find(res, 'career').evidence.find((e) => e.kind === 'astro')!
    expect(chip.text).toBe('태양')
  })
})

describe('classifyEvidence — 신살 라우팅', () => {
  it('도화는 love, 문창은 study, 귀인은 people 로 라우팅된다', () => {
    const evidence: DayEvidenceInput = {
      transits: [],
      shinsal: ['도화살', '문창귀인', '천을귀인'],
      crossActivations: [],
    }
    const res = deriveDayDomains({ iljinSibsin: '비견', sex: '남', scoreBand: 'good', evidence })!
    expect(find(res, 'love').evidence.some((e) => e.kind === 'saju' && e.text === '도화살')).toBe(
      true
    )
    expect(find(res, 'study').evidence.some((e) => e.text === '문창귀인')).toBe(true)
    expect(find(res, 'people').evidence.some((e) => e.kind === 'saju')).toBe(true)
  })

  it('매칭 안되는 신살은 무시된다', () => {
    const evidence: DayEvidenceInput = {
      transits: [],
      shinsal: ['무관신살'],
      crossActivations: [],
    }
    const res = deriveDayDomains({ iljinSibsin: '비견', sex: '남', scoreBand: 'good', evidence })!
    for (const k of ALL_KEYS) expect(find(res, k).evidence.length).toBe(0)
  })
})

describe('classifyEvidence — 교차활성 라우팅', () => {
  it('route 키워드로 분야가 결정된다', () => {
    const evidence: DayEvidenceInput = {
      transits: [],
      shinsal: [],
      crossActivations: [{ sajuSide: '재성', astroSide: '목성', route: '재성 재물', polarity: 2 }],
    }
    const res = deriveDayDomains({ iljinSibsin: '비견', sex: '남', scoreBand: 'good', evidence })!
    const money = find(res, 'money')
    expect(money.evidence.some((e) => e.kind === 'cross' && e.text.includes('↔'))).toBe(true)
  })

  it('route 가 없으면 sajuSide/astroSide/meaning 으로 폴백한다', () => {
    const evidence: DayEvidenceInput = {
      transits: [],
      shinsal: [],
      crossActivations: [
        { sajuSide: '관성', astroSide: 'Saturn', meaning: '직업 변동', polarity: 1 },
      ],
    }
    const res = deriveDayDomains({ iljinSibsin: '비견', sex: '남', scoreBand: 'good', evidence })!
    expect(find(res, 'career').evidence.some((e) => e.kind === 'cross')).toBe(true)
  })
})

describe('classifyEvidence — 시별 달(moon) 절정', () => {
  const moonEv: DayEvidenceInput = {
    transits: [],
    shinsal: [],
    crossActivations: [],
    moon: [
      {
        body: 'Venus',
        aspectKo: '삼각',
        aspectEn: 'trine',
        when: '13-15시 (미시)',
        whenEn: '1-3pm',
        polarity: 2,
      },
    ],
  }

  it('달이 건드린 본명 점(Venus)으로 분야 라우팅 + 시각 칩', () => {
    const res = deriveDayDomains({
      iljinSibsin: '비견',
      sex: '남',
      scoreBand: 'good',
      evidence: moonEv,
    })!
    const love = find(res, 'love')
    const moonChip = love.evidence.find((e) => e.kind === 'moon')!
    expect(moonChip).toBeDefined()
    expect(moonChip.text).toContain('13-15시')
    expect(moonChip.text).toContain('달삼각')
    expect(moonChip.when).toBe('13-15시 (미시)')
  })

  it('양(+) 폴라리티 달이면 본문에 "흐름이 살아나요" 클로즈가 붙는다', () => {
    const res = deriveDayDomains({
      iljinSibsin: '비견',
      sex: '남',
      scoreBand: 'good',
      evidence: moonEv,
    })!
    expect(find(res, 'love').body).toContain('흐름이 살아나요')
  })

  it('음(-) 폴라리티 달이면 본문에 "한 박자 늦추세요" 클로즈가 붙는다', () => {
    const negMoon: DayEvidenceInput = {
      ...moonEv,
      moon: [{ ...moonEv.moon![0], polarity: -1 }],
    }
    const res = deriveDayDomains({
      iljinSibsin: '비견',
      sex: '남',
      scoreBand: 'good',
      evidence: negMoon,
    })!
    expect(find(res, 'love').body).toContain('한 박자 늦추세요')
  })

  it('알 수 없는 달 본명 점(body)은 무시된다', () => {
    const unknown: DayEvidenceInput = {
      ...moonEv,
      moon: [{ ...moonEv.moon![0], body: 'Vertex' }],
    }
    const res = deriveDayDomains({
      iljinSibsin: '비견',
      sex: '남',
      scoreBand: 'good',
      evidence: unknown,
    })!
    for (const k of ALL_KEYS) {
      expect(find(res, k).evidence.some((e) => e.kind === 'moon')).toBe(false)
    }
  })

  it('칩이 4개를 넘쳐 moon 이 밀려나도 가장 센 moon 한 개는 보장된다', () => {
    // health 분야에 강한 astro 칩 여러 개 + 약한 달 한 개.
    const evidence: DayEvidenceInput = {
      transits: [
        { body: 'Mars', aspect: 'square', polarity: 5 },
        { body: 'Saturn', aspect: 'opposition', polarity: 4 },
        { body: 'Sun', aspect: 'trine', polarity: 4 },
        { body: 'Neptune', aspect: 'square', polarity: 4 },
      ],
      shinsal: ['양인', '백호'],
      crossActivations: [],
      moon: [
        {
          body: 'Ascendant',
          aspectKo: '합',
          aspectEn: 'conjunction',
          when: '03-05시',
          whenEn: '3-5am',
          polarity: 1,
        },
      ],
    }
    const res = deriveDayDomains({ iljinSibsin: '비견', sex: '남', scoreBand: 'good', evidence })!
    const health = find(res, 'health')
    expect(health.evidence.length).toBeLessThanOrEqual(4)
    expect(health.evidence.some((e) => e.kind === 'moon')).toBe(true)
  })
})

describe('CAUTION_BODY — net-negative 분야 톤 전환', () => {
  it('폴라리티 합 ≤ -2 면 긍정 십신 조언 대신 주의 본문으로 바뀐다', () => {
    const evidence: DayEvidenceInput = {
      transits: [
        { body: 'Saturn', aspect: 'square', polarity: -2 },
        { body: 'Mars', aspect: 'opposition', polarity: -1 },
      ],
      shinsal: [],
      crossActivations: [],
    }
    const res = deriveDayDomains({ iljinSibsin: '정관', sex: '남', scoreBand: 'low', evidence })!
    const career = find(res, 'career')
    expect(career.body).toContain('마찰')
    // 주의 분야는 active 가 꺼진다(긍정 강조와 모순 방지).
    expect(career.active).toBe(false)
  })

  it('폴라리티 합 ≥ 0 이면 십신 기본 조언을 유지한다', () => {
    const evidence: DayEvidenceInput = {
      transits: [{ body: 'Saturn', aspect: 'trine', polarity: 2 }],
      shinsal: [],
      crossActivations: [],
    }
    const res = deriveDayDomains({ iljinSibsin: '정관', sex: '남', scoreBand: 'good', evidence })!
    expect(find(res, 'career').body).not.toContain('마찰')
  })
})

describe('active 플래그 — 근거 폴라리티 조건', () => {
  it('십신 관장 분야라도 근거 합이 음수면 active 가 꺼진다', () => {
    const evidence: DayEvidenceInput = {
      transits: [{ body: 'Sun', aspect: 'square', polarity: -1 }],
      shinsal: [],
      crossActivations: [],
    }
    // 정관(officer) 남성 → career active 대상. Sun 은 career/health 라우팅.
    const res = deriveDayDomains({ iljinSibsin: '정관', sex: '남', scoreBand: 'mid', evidence })!
    expect(find(res, 'career').active).toBe(false)
  })

  it('근거가 없으면(evidence undefined) 십신 관장 분야는 active 유지', () => {
    const res = deriveDayDomains({ iljinSibsin: '정관', sex: '남', scoreBand: 'mid' })!
    expect(find(res, 'career').active).toBe(true)
  })
})
