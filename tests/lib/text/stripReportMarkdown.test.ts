import { describe, it, expect } from 'vitest'
import { stripReportMarkdown } from '@/lib/text/stripReportMarkdown'

describe('stripReportMarkdown', () => {
  it('빈 문자열은 빈 문자열로 반환한다', () => {
    expect(stripReportMarkdown('')).toBe('')
  })

  it('마크다운이 없는 평문은 trim 외에는 건드리지 않는다', () => {
    expect(stripReportMarkdown('  당신의 사주는 안정적입니다.  ')).toBe(
      '당신의 사주는 안정적입니다.'
    )
  })

  describe('헤딩', () => {
    it('# 헤딩 prefix 를 제거하되 헤딩 텍스트는 보존한다', () => {
      expect(stripReportMarkdown('## 구조적 정체성\n내용입니다.')).toBe(
        '구조적 정체성\n내용입니다.'
      )
      expect(stripReportMarkdown('###### 작은 제목\n본문.')).toBe('작은 제목\n본문.')
    })
  })

  describe('테이블', () => {
    it('separator 행(|---|---|)은 줄째 제거한다', () => {
      const input = '| 항목 | 값 |\n|---|---|\n| 운세 | 좋음 |'
      const out = stripReportMarkdown(input)
      expect(out).not.toContain('---')
      expect(out).toContain('항목 · 값')
      expect(out).toContain('운세 · 좋음')
    })

    it('파이프 행은 "cell · cell" 산문으로 바꾼다', () => {
      expect(stripReportMarkdown('| 과거 | 현재 | 미래 |')).toBe('과거 · 현재 · 미래')
    })
  })

  describe('의사 헤딩 / 라벨', () => {
    it('이모지로 시작하는 헤딩 줄은 통째로 제거한다', () => {
      const input = '🎯 구조적 정체성\n실제 내용은 여기 있습니다.'
      expect(stripReportMarkdown(input)).toBe('실제 내용은 여기 있습니다.')
    })

    it('【제목】 standalone 줄은 제거하고 인라인 【】 는 괄호만 벗긴다', () => {
      expect(stripReportMarkdown('【양면성】\n본문입니다.')).toBe('본문입니다.')
      expect(stripReportMarkdown('당신의 【핵심】 기질')).toBe('당신의 핵심 기질')
    })

    it('standalone [라벨] 줄은 제거한다', () => {
      expect(stripReportMarkdown('[양면성]\n본문입니다.')).toBe('본문입니다.')
    })

    it('빈 줄 앞의 짧은 라벨 줄은 제거한다', () => {
      const input = '당신의 양면성\n\n이것은 충분히 긴 본문 문단입니다.'
      expect(stripReportMarkdown(input)).toBe('이것은 충분히 긴 본문 문단입니다.')
    })

    it('종결 어미("~다")로 끝나는 짧은 줄은 라벨이 아니므로 보존한다', () => {
      const input = '이건 문장이다\n\n다음 문단입니다.'
      expect(stripReportMarkdown(input)).toBe('이건 문장이다\n\n다음 문단입니다.')
    })

    it('괄호/플러스 등 내용 마커가 있는 짧은 줄은 보존한다', () => {
      const input = '사주 정인격 + 점성 MC\n\n다음 문단입니다.'
      expect(stripReportMarkdown(input)).toBe('사주 정인격 + 점성 MC\n\n다음 문단입니다.')
    })
  })

  describe('구분선 / 리스트', () => {
    it('수평선(---, ***, ___)을 제거한다', () => {
      expect(stripReportMarkdown('위 문단\n---\n아래 문단')).toBe('위 문단\n아래 문단')
      expect(stripReportMarkdown('위\n***\n아래')).toBe('위\n아래')
      expect(stripReportMarkdown('위\n___\n아래')).toBe('위\n아래')
    })

    it('불릿/번호 리스트 마커를 제거하고 내용은 보존한다', () => {
      expect(stripReportMarkdown('- 첫 항목\n* 둘째 항목\n+ 셋째 항목')).toBe(
        '첫 항목\n둘째 항목\n셋째 항목'
      )
      expect(stripReportMarkdown('1. 하나\n2. 둘')).toBe('하나\n둘')
    })

    it('장식 화살표/도형 불릿(→ ▶ ※)과 ASCII "->" 도 제거한다', () => {
      expect(stripReportMarkdown('→ 핵심 포인트')).toBe('핵심 포인트')
      expect(stripReportMarkdown('▶ 주의사항')).toBe('주의사항')
      expect(stripReportMarkdown('-> 다음 단계')).toBe('다음 단계')
    })
  })

  describe('인라인 서식', () => {
    it('인라인 백틱은 벗기고 내용은 남긴다', () => {
      expect(stripReportMarkdown('이번 달 키워드는 `남편복` 입니다.')).toBe(
        '이번 달 키워드는 남편복 입니다.'
      )
    })

    it('볼드/이탤릭은 의도적으로 보존한다', () => {
      expect(stripReportMarkdown('핵심은 **양면성** 그리고 *균형* 입니다.')).toBe(
        '핵심은 **양면성** 그리고 *균형* 입니다.'
      )
    })
  })

  it('제거로 생긴 3줄 이상의 빈 줄을 2줄로 접는다', () => {
    const input = '첫 문단입니다.\n\n\n\n둘째 문단입니다.'
    expect(stripReportMarkdown(input)).toBe('첫 문단입니다.\n\n둘째 문단입니다.')
  })

  describe('줄맞춤 / 줄 끊음', () => {
    it('줄 끝의 공백(의도치 않은 hard-break)을 제거한다', () => {
      expect(stripReportMarkdown('지금은 기다릴 때예요.   \n조금만 더 볼게요.')).toBe(
        '지금은 기다릴 때예요.\n조금만 더 볼게요.'
      )
    })

    it('탭 + 공백이 섞인 줄 끝도 정리한다', () => {
      expect(stripReportMarkdown('첫 줄 \t \n둘째 줄')).toBe('첫 줄\n둘째 줄')
    })
  })

  describe('연속 중복 제거', () => {
    it('바로 뒤에 똑같이 반복된 문단을 한 번만 남긴다', () => {
      expect(stripReportMarkdown('지금은 기다릴 때예요.\n\n지금은 기다릴 때예요.')).toBe(
        '지금은 기다릴 때예요.'
      )
    })

    it('공백만 다른 연속 중복 줄도 합친다', () => {
      expect(
        stripReportMarkdown('핵심은 균형이에요\n핵심은   균형이에요\n다음 이야기로 갈게요')
      ).toBe('핵심은 균형이에요\n다음 이야기로 갈게요')
    })

    it('떨어져 있는(연속 아닌) 반복은 의도된 것으로 보고 보존한다', () => {
      const input = '괜찮아요.\n\n그 다음 이야기예요.\n\n괜찮아요.'
      expect(stripReportMarkdown(input)).toBe(input)
    })

    it('영어 답변의 연속 중복 문단도 제거한다', () => {
      expect(
        stripReportMarkdown(
          'You are at a turning point.\n\nYou are at a turning point.\n\nLet us look closer.'
        )
      ).toBe('You are at a turning point.\n\nLet us look closer.')
    })

    it('한 줄 안의 반복(진짜 진짜)은 건드리지 않는다', () => {
      expect(stripReportMarkdown('진짜 진짜 좋아요')).toBe('진짜 진짜 좋아요')
    })
  })

  it('복합 입력: 헤딩+테이블+불릿+백틱이 섞여도 대화체 산문만 남는다', () => {
    const input = [
      '## 종합 해석',
      '',
      '| 영역 | 평가 |',
      '|---|---|',
      '| 애정운 | 상승 |',
      '',
      '- `결론`: 지금은 기다릴 때입니다.',
    ].join('\n')
    const out = stripReportMarkdown(input)
    // '## 종합 해석' 은 # 제거 후 빈 줄 앞 라벨 휴리스틱에 걸려 통째로 사라진다
    // (헤딩 + 빈 줄 = 순수 구조 마커로 취급) — 현재 계약을 그대로 잠근다.
    expect(out).toBe('영역 · 평가\n애정운 · 상승\n\n결론: 지금은 기다릴 때입니다.')
  })
})
