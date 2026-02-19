import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { AIPremiumReport } from './reportTypes'
import type { ThemedAIPremiumReport, TimingAIPremiumReport } from './types'

export interface PDFGenerationOptions {
  fixedPages?: number
}

type AnyAIReport = AIPremiumReport | ThemedAIPremiumReport | TimingAIPremiumReport
type PDFDocumentType = Awaited<ReturnType<typeof PDFDocument.create>>
type PDFPageType = ReturnType<PDFDocumentType['addPage']>
type PDFFontType = Awaited<ReturnType<PDFDocumentType['embedFont']>>

type EmbeddedFonts = {
  body: PDFFontType
  bold: PDFFontType
}

const FONT_URLS = {
  regular:
    'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk/Sans/OTF/Korean/NotoSansCJKkr-Regular.otf',
  bold: 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk/Sans/OTF/Korean/NotoSansCJKkr-Bold.otf',
}

const A4 = {
  width: 595,
  height: 842,
}

const PADDING_X = 44
const CONTENT_WIDTH = A4.width - PADDING_X * 2

async function tryFetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { cache: 'force-cache' })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  } catch {
    return null
  }
}

async function loadFonts(pdf: PDFDocumentType): Promise<EmbeddedFonts> {
  pdf.registerFontkit(fontkit)
  const [regularBytes, boldBytes] = await Promise.all([
    tryFetchBytes(FONT_URLS.regular),
    tryFetchBytes(FONT_URLS.bold),
  ])

  if (regularBytes && boldBytes) {
    const [body, bold] = await Promise.all([
      pdf.embedFont(regularBytes, { subset: true }),
      pdf.embedFont(boldBytes, { subset: true }),
    ])
    return { body, bold }
  }

  const [body, bold] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
  ])
  return { body, bold }
}

function scoreFromReport(report: AnyAIReport): number {
  if ('matrixSummary' in report) return Math.round(report.matrixSummary.overallScore)
  if ('themeScore' in report) return Math.round(report.themeScore.overall)
  return Math.round(report.periodScore.overall)
}

function gradeFromScore(score: number): string {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}

function profileLines(report: AnyAIReport): string[] {
  const profile = report.profile
  return [
    `Name: ${profile.name || 'User'}`,
    `Birth: ${profile.birthDate || 'Not provided'}`,
    `Day Master: ${profile.dayMaster}`,
    `Dominant: ${profile.dominantElement}`,
  ]
}

function reportLabel(report: AnyAIReport): string {
  if ('theme' in report) return `Theme Report: ${report.themeLabel}`
  if ('period' in report) return `Timing Report: ${report.periodLabel}`
  return 'Comprehensive Report'
}

function collectSectionEntries(report: AnyAIReport): Array<{ title: string; content: string }> {
  if ('theme' in report) {
    const s = report.sections
    return [
      { title: 'Deep Analysis', content: s.deepAnalysis || '' },
      { title: 'Patterns', content: s.patterns || '' },
      { title: 'Theme Timing', content: s.timing || '' },
      {
        title: 'Strategy',
        content: s.strategy || s.compatibility || s.prevention || s.dynamics || '',
      },
      { title: 'Action Plan', content: s.actionPlan || '' },
      { title: 'Recommendations', content: (s.recommendations || []).join(' / ') },
    ]
  }
  if ('period' in report) {
    const s = report.sections
    return [
      { title: 'Overview', content: s.overview || '' },
      { title: 'Energy', content: s.energy || '' },
      { title: 'Opportunities', content: s.opportunities || '' },
      { title: 'Cautions', content: s.cautions || '' },
      {
        title: 'Domains',
        content: `Career: ${s.domains?.career || ''}\nLove: ${s.domains?.love || ''}\nWealth: ${s.domains?.wealth || ''}\nHealth: ${s.domains?.health || ''}`,
      },
      { title: 'Action Plan', content: s.actionPlan || '' },
      { title: 'Lucky Elements', content: s.luckyElements || '' },
    ]
  }

  const s = report.sections
  return [
    { title: 'Introduction', content: s.introduction || '' },
    { title: 'Personality', content: s.personalityDeep || '' },
    { title: 'Career', content: s.careerPath || '' },
    { title: 'Relationship', content: s.relationshipDynamics || '' },
    { title: 'Wealth', content: s.wealthPotential || '' },
    { title: 'Health', content: s.healthGuidance || '' },
    { title: 'Life Mission', content: s.lifeMission || '' },
    { title: 'Timing Advice', content: s.timingAdvice || '' },
    { title: 'Action Plan', content: s.actionPlan || '' },
    { title: 'Conclusion', content: s.conclusion || '' },
  ]
}

function textWidth(font: PDFFontType, text: string, size: number): number {
  return font.widthOfTextAtSize(text, size)
}

function wrapByWidth(text: string, font: PDFFontType, size: number, maxWidth: number): string[] {
  const words = (text || '').replace(/\r/g, '').split(/\s+/).filter(Boolean)
  if (!words.length) return ['']
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (textWidth(font, next, size) <= maxWidth) {
      line = next
      continue
    }
    if (line) lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  return lines
}

function drawHeader(page: PDFPageType, fonts: EmbeddedFonts, title: string, subtitle?: string) {
  page.drawRectangle({
    x: 0,
    y: A4.height - 72,
    width: A4.width,
    height: 72,
    color: rgb(0.1, 0.2, 0.4),
  })
  page.drawText(title, {
    x: PADDING_X,
    y: A4.height - 42,
    size: 18,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  })
  if (subtitle) {
    page.drawText(subtitle, {
      x: PADDING_X,
      y: A4.height - 60,
      size: 10,
      font: fonts.body,
      color: rgb(0.88, 0.9, 0.95),
    })
  }
}

function drawFooter(
  page: PDFPageType,
  fonts: EmbeddedFonts,
  pageNo: number,
  total: number,
  reportId: string
) {
  page.drawLine({
    start: { x: PADDING_X, y: 34 },
    end: { x: A4.width - PADDING_X, y: 34 },
    thickness: 0.8,
    color: rgb(0.8, 0.82, 0.88),
  })
  page.drawText(`Page ${pageNo}/${total}`, {
    x: A4.width - PADDING_X - 58,
    y: 20,
    size: 9,
    font: fonts.body,
    color: rgb(0.5, 0.55, 0.62),
  })
  page.drawText(`Report ID: ${reportId}`, {
    x: PADDING_X,
    y: 20,
    size: 9,
    font: fonts.body,
    color: rgb(0.5, 0.55, 0.62),
  })
}

function truncateLines(lines: string[], maxLines: number): string[] {
  if (lines.length <= maxLines) return lines
  const clipped = lines.slice(0, maxLines)
  const last = clipped[maxLines - 1]
  clipped[maxLines - 1] =
    last.length > 2 ? `${last.slice(0, Math.max(1, last.length - 2))}..` : `${last}..`
  return clipped
}

function drawBlock(
  page: PDFPageType,
  fonts: EmbeddedFonts,
  cfg: {
    title: string
    content: string
    x: number
    yTop: number
    width: number
    height: number
  }
) {
  page.drawRectangle({
    x: cfg.x,
    y: cfg.yTop - cfg.height,
    width: cfg.width,
    height: cfg.height,
    borderColor: rgb(0.8, 0.84, 0.9),
    borderWidth: 1,
    color: rgb(0.98, 0.99, 1),
  })

  page.drawText(cfg.title, {
    x: cfg.x + 10,
    y: cfg.yTop - 20,
    size: 12,
    font: fonts.bold,
    color: rgb(0.15, 0.25, 0.45),
  })

  const lines = truncateLines(
    wrapByWidth(cfg.content || '-', fonts.body, 10.5, cfg.width - 20),
    Math.floor((cfg.height - 34) / 14)
  )
  let y = cfg.yTop - 38
  for (const line of lines) {
    page.drawText(line, {
      x: cfg.x + 10,
      y,
      size: 10.5,
      font: fonts.body,
      color: rgb(0.2, 0.24, 0.31),
    })
    y -= 14
  }
}

function sectionGroupsForFivePages(
  entries: Array<{ title: string; content: string }>
): [
  Array<{ title: string; content: string }>,
  Array<{ title: string; content: string }>,
  Array<{ title: string; content: string }>,
] {
  const safe = entries.filter((e) => e.content && e.content.trim())
  if (safe.length <= 3) return [safe.slice(0, 1), safe.slice(1, 2), safe.slice(2)]
  if (safe.length <= 6) return [safe.slice(0, 2), safe.slice(2, 4), safe.slice(4)]
  return [safe.slice(0, 3), safe.slice(3, 6), safe.slice(6)]
}

function drawCover(page: PDFPageType, fonts: EmbeddedFonts, report: AnyAIReport) {
  drawHeader(page, fonts, 'Destiny Fusion Matrix AI Report', reportLabel(report))

  const score = scoreFromReport(report)
  const grade = gradeFromScore(score)

  page.drawText('Premium Personalized Report', {
    x: PADDING_X,
    y: 690,
    size: 24,
    font: fonts.bold,
    color: rgb(0.12, 0.2, 0.38),
  })

  page.drawText(`Overall Score: ${score} (${grade})`, {
    x: PADDING_X,
    y: 652,
    size: 16,
    font: fonts.bold,
    color: rgb(0.18, 0.32, 0.56),
  })

  page.drawRectangle({
    x: PADDING_X,
    y: 460,
    width: CONTENT_WIDTH,
    height: 160,
    borderColor: rgb(0.75, 0.8, 0.88),
    borderWidth: 1.2,
    color: rgb(0.98, 0.99, 1),
  })

  let y = 592
  for (const line of profileLines(report)) {
    page.drawText(line, {
      x: PADDING_X + 14,
      y,
      size: 13,
      font: fonts.body,
      color: rgb(0.2, 0.24, 0.31),
    })
    y -= 30
  }

  page.drawText(`Generated At: ${new Date(report.generatedAt).toLocaleString()}`, {
    x: PADDING_X,
    y: 430,
    size: 11,
    font: fonts.body,
    color: rgb(0.36, 0.4, 0.47),
  })
}

function drawSummary(page: PDFPageType, fonts: EmbeddedFonts, report: AnyAIReport) {
  drawHeader(page, fonts, 'Summary')

  const sections = collectSectionEntries(report)
  const highlights = sections
    .slice(0, 3)
    .map((s) => `${s.title}: ${s.content}`)
    .join('\n\n')

  drawBlock(page, fonts, {
    title: 'Top Highlights',
    content: highlights || '-',
    x: PADDING_X,
    yTop: 730,
    width: CONTENT_WIDTH,
    height: 300,
  })

  let sideContent = ''
  if ('theme' in report) {
    sideContent = `Theme Score\nOverall ${report.themeScore.overall}\nPotential ${report.themeScore.potential}\nTiming ${report.themeScore.timing}\nHarmony ${report.themeScore.compatibility}\n\nKeywords\n${(report.keywords || []).join(', ')}`
  } else if ('period' in report) {
    sideContent = `Period Score\nOverall ${report.periodScore.overall}\nCareer ${report.periodScore.career}\nLove ${report.periodScore.love}\nWealth ${report.periodScore.wealth}\nHealth ${report.periodScore.health}\n\nTarget\n${report.periodLabel}`
  } else {
    sideContent = `Matrix Grade\n${report.matrixSummary.grade} (${report.matrixSummary.overallScore})\n\nStrengths\n${report.matrixSummary.keyStrengths.slice(0, 4).join(', ')}\n\nGrowth Areas\n${report.matrixSummary.keyChallenges.slice(0, 4).join(', ')}`
  }

  drawBlock(page, fonts, {
    title: 'Scoreboard',
    content: sideContent,
    x: PADDING_X,
    yTop: 405,
    width: CONTENT_WIDTH,
    height: 250,
  })
}

function drawGroupedSections(
  page: PDFPageType,
  fonts: EmbeddedFonts,
  title: string,
  group: Array<{ title: string; content: string }>
) {
  drawHeader(page, fonts, title)
  const blockHeight = 220
  let yTop = 740

  for (const entry of group.slice(0, 3)) {
    drawBlock(page, fonts, {
      title: entry.title,
      content: entry.content || '-',
      x: PADDING_X,
      yTop,
      width: CONTENT_WIDTH,
      height: blockHeight,
    })
    yTop -= blockHeight + 12
  }
}

function drawClosing(page: PDFPageType, fonts: EmbeddedFonts, report: AnyAIReport) {
  drawHeader(page, fonts, 'Final Insights')

  const entries = collectSectionEntries(report)
  const action = entries.find((x) => /action/i.test(x.title))?.content || ''
  const conclusion = entries[entries.length - 1]?.content || ''
  const body = [action, conclusion].filter(Boolean).join('\n\n')

  drawBlock(page, fonts, {
    title: 'Execution Guide',
    content: body || 'Use this report as a practical decision aid for the next 30-90 days.',
    x: PADDING_X,
    yTop: 730,
    width: CONTENT_WIDTH,
    height: 360,
  })

  page.drawText('Disclaimer', {
    x: PADDING_X,
    y: 300,
    size: 12,
    font: fonts.bold,
    color: rgb(0.2, 0.24, 0.31),
  })

  const disclaimer = wrapByWidth(
    'This report is for insight and reflection. Final decisions in health, legal, and finance should be made with certified professionals.',
    fonts.body,
    10,
    CONTENT_WIDTH
  )
  let y = 282
  for (const line of disclaimer) {
    page.drawText(line, {
      x: PADDING_X,
      y,
      size: 10,
      font: fonts.body,
      color: rgb(0.35, 0.39, 0.46),
    })
    y -= 14
  }
}

export async function generateFivePagePDF(
  report: AnyAIReport,
  options: PDFGenerationOptions = {}
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const fonts = await loadFonts(pdf)
  const fixedPages = options.fixedPages ?? 5
  const totalPages = Math.max(5, fixedPages)

  const pages: PDFPageType[] = []
  for (let i = 0; i < totalPages; i += 1) {
    pages.push(pdf.addPage([A4.width, A4.height]))
  }

  drawCover(pages[0], fonts, report)
  drawSummary(pages[1], fonts, report)

  const [g1, g2, g3] = sectionGroupsForFivePages(collectSectionEntries(report))
  drawGroupedSections(pages[2], fonts, 'Analysis I', g1)
  drawGroupedSections(pages[3], fonts, 'Analysis II', g2.length ? g2 : g3)
  drawClosing(pages[4], fonts, report)

  for (let i = 5; i < pages.length; i += 1) {
    drawGroupedSections(pages[i], fonts, `Appendix ${i - 4}`, g3)
  }

  for (let i = 0; i < pages.length; i += 1) {
    drawFooter(pages[i], fonts, i + 1, pages.length, report.id)
  }

  return pdf.save()
}

export async function generatePremiumPDF(
  report: AIPremiumReport,
  options: PDFGenerationOptions = {}
): Promise<Uint8Array> {
  return generateFivePagePDF(report, options)
}
