import { describe, it, expect } from 'vitest'
import { GLOSSARY, type GlossarySection } from '@/components/report/integrated/reportGlossary'

const HANGUL = /[가-힣]/

describe('reportGlossary — ko/en 패리티 계약', () => {
  const sections = Object.keys(GLOSSARY) as GlossarySection[]

  it('모든 섹션에 항목이 있다', () => {
    expect(sections.length).toBeGreaterThan(0)
    for (const sec of sections) {
      expect(GLOSSARY[sec].length, `${sec} 섹션 항목 수`).toBeGreaterThan(0)
    }
  })

  it('모든 항목이 ko·en term/body 를 비지 않게 채운다', () => {
    for (const sec of sections) {
      for (const [i, e] of GLOSSARY[sec].entries()) {
        expect(e.term.ko.trim(), `${sec}[${i}] term.ko`).not.toBe('')
        expect(e.term.en.trim(), `${sec}[${i}] term.en`).not.toBe('')
        expect(e.body.ko.trim(), `${sec}[${i}] body.ko`).not.toBe('')
        expect(e.body.en.trim(), `${sec}[${i}] body.en`).not.toBe('')
      }
    }
  })

  it('영어 면(term.en/body.en)에는 한글이 없다', () => {
    for (const sec of sections) {
      for (const [i, e] of GLOSSARY[sec].entries()) {
        expect(HANGUL.test(e.term.en), `${sec}[${i}] term.en has Hangul: ${e.term.en}`).toBe(false)
        expect(HANGUL.test(e.body.en), `${sec}[${i}] body.en has Hangul: ${e.body.en}`).toBe(false)
      }
    }
  })
})
