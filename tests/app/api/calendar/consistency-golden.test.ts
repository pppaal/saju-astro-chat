import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { GET as calendarGet } from '@/app/api/calendar/route'

const asNextRequest = (request: Request) => request as unknown as NextRequest

const IRREVERSIBLE_PATTERN =
  /(\uACC4\uC57D|\uC11C\uBA85|\uD655\uC815|\uC608\uC57D|\uACB0\uD63C\uC2DD|\uCCAD\uCCA9\uC7A5|\uC774\uC9C1\s*\uD655\uC815|\uCC3D\uC5C5\s*\uD655\uC815|\uB7F0\uCE6D|\uD070\s*\uACB0\uC815|\uC989\uC2DC\s*\uACB0\uC815|sign(?: now)?|finalize|confirm|book|wedding|invitation|big decision|resign|launch|commit now)/i

const COMM_WARNING_PATTERN =
  /(\uC7AC\uD655\uC778|\uCEE4\uBBA4\uB2C8\uCF00\uC774\uC158|communication|recheck|\uC624\uB958|retrograde|void)/i

const SAME_DIRECTION_PATTERN = /(\uAC19\uC740 \uBC29\uD5A5|same direction|aligned)/i

describe('calendar consistency golden', () => {
  const originalToken = process.env.PUBLIC_API_TOKEN

  beforeEach(() => {
    process.env.PUBLIC_API_TOKEN = 'public-token'
  })

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.PUBLIC_API_TOKEN
      return
    }
    process.env.PUBLIC_API_TOKEN = originalToken
  })

  it('keeps repro day coherent for ko locale', async () => {
    const response = await calendarGet(
      asNextRequest(
        new Request(
          'http://localhost:3000/api/calendar?birthDate=1995-02-09&birthTime=06:40&birthPlace=Seoul&year=2026&locale=ko',
          {
            headers: { 'x-api-token': 'public-token' },
          }
        )
      )
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as { allDates?: any[] }
    const target = (payload.allDates || []).find((day) => day.date === '2026-02-15')

    expect(target).toBeTruthy()

    const snapshot = {
      date: target.date,
      title: target.title,
      summary: target.summary,
      score: target.score,
      displayScore: target.displayScore,
      grade: target.grade,
      confidence: target.evidence?.confidence,
      crossAgreementPercent: target.evidence?.crossAgreementPercent,
      warnings: target.warnings,
      recommendations: target.recommendations,
      bridges: target.evidence?.cross?.bridges || [],
    }

    expect(snapshot).toMatchInlineSnapshot(`
      {
        "bridges": [
          "A1 ↔ S1: 점성 호조와 사주 지원 신호가 겹칩니다. 핵심 과제 1~2개를 밀어붙이기 좋습니다.",
          "A2 ↔ S2: 점성 호조와 사주 지원 신호가 겹칩니다. 핵심 과제 1~2개를 밀어붙이기 좋습니다.",
          "A3 ↔ S3: 점성 호조와 사주 지원 신호가 겹칩니다. 핵심 과제 1~2개를 밀어붙이기 좋습니다.",
        ],
        "confidence": 4,
        "crossAgreementPercent": 66,
        "date": "2026-02-15",
        "displayScore": 85,
        "grade": 0,
        "recommendations": [
          "검토/재확인을 우선하고 진행하세요.",
          "조건 정리 후 요약 메시지로 합의 내용을 확인하세요.",
          "초안만 만들고 확정은 24시간 후에 다시 보세요.",
        ],
        "score": 85,
        "summary": "✨ 천운이 함께하는 특별한 날! 사주·점성 시그널이 같은 방향으로 맞물립니다. 좋은 흐름이 겹치니 핵심 1~2개 목표에 집중하세요. 오늘은 선제적으로 움직일수록 체감 성과가 커집니다.",
        "title": "🌟 최고의 날",
        "warnings": [
          "커뮤니케이션 오류 가능성이 있어 재확인이 필요합니다.",
        ],
      }
    `)

    const warningsBlob = (target.warnings || []).join(' ')
    const recommendationsBlob = (target.recommendations || []).join(' ')
    if (COMM_WARNING_PATTERN.test(warningsBlob)) {
      const hasVerificationTone =
        /(\uC7AC\uD655\uC778|24\uC2DC\uAC04|review|verify|recheck|draft)/i.test(recommendationsBlob)
      const hasIrreversible = IRREVERSIBLE_PATTERN.test(recommendationsBlob) && !hasVerificationTone
      expect(hasIrreversible).toBe(false)
    }

    const sameDirectionText = `${target.summary || ''} ${((target.evidence?.cross?.bridges || []) as string[]).join(' ')}`
    if (SAME_DIRECTION_PATTERN.test(sameDirectionText)) {
      expect((target.evidence?.crossAgreementPercent ?? 0) >= 60).toBe(true)
    }
  }, 60000)
})
