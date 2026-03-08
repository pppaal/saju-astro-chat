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
    expect(target.date).toBe('2026-02-15')
    expect(typeof target.title).toBe('string')
    expect(target.title.length).toBeGreaterThan(0)
    expect(typeof target.summary).toBe('string')
    expect(target.summary.length).toBeGreaterThan(0)
    expect(typeof target.displayScore).toBe('number')
    expect(target.displayScore).toBeGreaterThan(0)
    expect(typeof target.evidence?.confidence).toBe('number')
    expect(Array.isArray(target.recommendations)).toBe(true)
    expect(Array.isArray(target.warnings)).toBe(true)
    expect(Array.isArray(target.evidence?.cross?.bridges || [])).toBe(true)

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

