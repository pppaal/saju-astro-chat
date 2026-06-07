/**
 * React 통합 리포트를 실데이터로 정적 HTML 렌더 → 파일 출력 (시각 QA용).
 * CSS 모듈은 "키=클래스명"으로 목킹하고 원본 .module.css 를 인라인.
 */
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// CSS 모듈 → 키를 그대로 클래스명으로 반환 (원본 CSS 의 .elWood 등과 매칭)
vi.mock('@/components/report/integrated/IntegratedReport.module.css', () => ({
  default: new Proxy({}, { get: (_t, k) => k }),
}))

import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { natalToReportData, buildCrossRows } from '@/components/report/integrated/adapter'
import { IntegratedReport } from '@/components/report/integrated/IntegratedReport'

describe('통합 리포트 — 정적 HTML 렌더', () => {
  it('실데이터로 HTML 파일 생성', async () => {
    const ctx = (await buildNatalContext({
      birthDate: '1992-03-15',
      birthTime: '09:20',
      gender: 'female',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })) as Record<string, unknown>
    const saju = ctx.saju as Record<string, unknown>
    saju.twelveStages = getTwelveStagesForPillars(saju.pillars as never)
    ctx.input = {
      ...(ctx.input as object),
      name: '내담자',
      gender: 'female',
      place: '대한민국 서울',
      timeZone: 'Asia/Seoul (UTC+9)',
      isoUTC: '1992-03-15T00:20:00Z',
    }

    const data = natalToReportData(ctx)
    const cross = buildCrossRows(ctx)
    const markup = renderToStaticMarkup(React.createElement(IntegratedReport, { data, cross }))

    const cssPath = resolve(
      __dirname,
      '../../../src/components/report/integrated/IntegratedReport.module.css'
    )
    const css = readFileSync(cssPath, 'utf8')

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&family=Noto+Sans+Symbols+2&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>body{margin:0}${css}</style></head><body>${markup}</body></html>`

    writeFileSync(resolve(process.cwd(), 'report-render.html'), html, 'utf8')
    expect(markup.length).toBeGreaterThan(1000)
  }, 30000)
})
