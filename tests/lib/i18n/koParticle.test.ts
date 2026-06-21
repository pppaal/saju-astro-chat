import { describe, it, expect } from 'vitest'
import { iga, eulReul, eunNeun, waGwa } from '@/lib/i18n/koParticle'

/**
 * 한국어 조사 자동 선택 유틸 테스트.
 * 받침(종성) 유무에 따라 올바른 조사가 선택되는지 검증한다.
 *   - 받침 있음(예: '강', '담', '문') → 이/을/은/과
 *   - 받침 없음(예: '나', '비', '도') → 가/를/는/와
 * euroRo 는 export 되지 않으므로(모듈 내부 함수) 테스트 대상이 아니다.
 */

describe('i18n/koParticle', () => {
  describe('iga (이/가)', () => {
    it('받침이 있는 단어는 "이"를 반환한다', () => {
      expect(iga('강')).toBe('이') // ㅇ 받침
      expect(iga('문')).toBe('이') // ㄴ 받침
      expect(iga('밥')).toBe('이') // ㅂ 받침
      expect(iga('서울')).toBe('이') // ㄹ 받침
      expect(iga('사랑')).toBe('이')
    })

    it('받침이 없는 단어는 "가"를 반환한다', () => {
      expect(iga('나')).toBe('가')
      expect(iga('비')).toBe('가')
      expect(iga('도쿄')).toBe('가')
      expect(iga('파리')).toBe('가')
      expect(iga('지구')).toBe('가')
    })
  })

  describe('eulReul (을/를)', () => {
    it('받침이 있는 단어는 "을"을 반환한다', () => {
      expect(eulReul('밥')).toBe('을')
      expect(eulReul('책')).toBe('을')
      expect(eulReul('사람')).toBe('을')
      expect(eulReul('물')).toBe('을') // ㄹ 받침
    })

    it('받침이 없는 단어는 "를"을 반환한다', () => {
      expect(eulReul('나무')).toBe('를')
      expect(eulReul('바다')).toBe('를')
      expect(eulReul('나비')).toBe('를')
    })
  })

  describe('eunNeun (은/는)', () => {
    it('받침이 있는 단어는 "은"을 반환한다', () => {
      expect(eunNeun('산')).toBe('은')
      expect(eunNeun('하늘')).toBe('은') // ㄹ 받침
      expect(eunNeun('마음')).toBe('은')
    })

    it('받침이 없는 단어는 "는"을 반환한다', () => {
      expect(eunNeun('나')).toBe('는')
      expect(eunNeun('바다')).toBe('는')
      expect(eunNeun('우주')).toBe('는')
    })
  })

  describe('waGwa (와/과)', () => {
    it('받침이 있는 단어는 "과"를 반환한다', () => {
      expect(waGwa('산')).toBe('과')
      expect(waGwa('달')).toBe('과') // ㄹ 받침
      expect(waGwa('하늘')).toBe('과')
    })

    it('받침이 없는 단어는 "와"를 반환한다', () => {
      expect(waGwa('나')).toBe('와')
      expect(waGwa('바다')).toBe('와')
      expect(waGwa('비')).toBe('와')
    })
  })

  describe('비한글 / 엣지 케이스', () => {
    it('빈 문자열은 받침 없음으로 간주한다 (가/를/는/와)', () => {
      expect(iga('')).toBe('가')
      expect(eulReul('')).toBe('를')
      expect(eunNeun('')).toBe('는')
      expect(waGwa('')).toBe('와')
    })

    it('영문으로 끝나는 단어는 한글 어말이 아니므로 받침 없음 처리', () => {
      expect(iga('Seoul')).toBe('가')
      expect(eulReul('Tokyo')).toBe('를')
      expect(eunNeun('AI')).toBe('는')
      expect(waGwa('GPT')).toBe('와')
    })

    it('숫자로 끝나는 단어는 받침 없음 처리', () => {
      expect(iga('2026')).toBe('가')
      expect(eulReul('100')).toBe('를')
    })

    it('특수문자/괄호로 끝나는 경우 받침 없음 처리', () => {
      expect(iga('천간합(甲己)')).toBe('가')
      expect(eunNeun('값!')).toBe('는')
      expect(waGwa('단어-')).toBe('와')
    })

    it('한자(CJK)로 끝나는 경우는 한글 범위 밖이므로 받침 없음 처리', () => {
      expect(iga('甲')).toBe('가')
      expect(eulReul('木')).toBe('를')
    })

    it('한글 + 비한글 혼합에서 마지막 문자만으로 판단한다', () => {
      // 마지막이 한글 '강' (받침 있음)
      expect(iga('A강')).toBe('이')
      // 마지막이 한글 '나' (받침 없음)
      expect(iga('B나')).toBe('가')
    })
  })
})
