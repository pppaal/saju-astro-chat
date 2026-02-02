// src/lib/destiny-matrix/ai-report/pdfGenerator.ts
// Destiny Fusion Matrix™ - Premium PDF Generator
// 고급 멀티페이지 PDF 리포트 생성

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { AIPremiumReport } from './reportTypes'

// pdf-lib 타입 추출
type PDFDocumentType = Awaited<ReturnType<typeof PDFDocument.create>>
type PDFPageType = ReturnType<PDFDocumentType['addPage']>
type PDFFontType = Awaited<ReturnType<PDFDocumentType['embedFont']>>

// ===========================
// 컬러 팔레트 (오행 기반)
// ===========================

const ELEMENT_COLORS = {
  목: { primary: rgb(0.2, 0.6, 0.3), secondary: rgb(0.85, 0.95, 0.85) },
  화: { primary: rgb(0.85, 0.2, 0.2), secondary: rgb(1.0, 0.92, 0.9) },
  토: { primary: rgb(0.7, 0.55, 0.2), secondary: rgb(0.98, 0.95, 0.85) },
  금: { primary: rgb(0.5, 0.5, 0.55), secondary: rgb(0.95, 0.95, 0.97) },
  수: { primary: rgb(0.15, 0.35, 0.6), secondary: rgb(0.9, 0.93, 0.98) },
} as const

const GRADE_COLORS = {
  S: rgb(0.8, 0.6, 0.0), // Gold
  A: rgb(0.6, 0.4, 0.8), // Purple
  B: rgb(0.2, 0.5, 0.7), // Blue
  C: rgb(0.4, 0.6, 0.4), // Green
  D: rgb(0.5, 0.5, 0.5), // Gray
}

// ===========================
// PDF 생성 옵션
// ===========================

interface PDFGenerationOptions {
  includeMatrixChart?: boolean
  includeWatermark?: boolean
  watermarkText?: string
}

// ===========================
// 유틸리티 함수
// ===========================

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) {
        lines.push(currentLine)
      }
      currentLine = word
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

// 한글 텍스트를 영어로 변환 (pdf-lib는 한글 폰트 미지원)
function sanitizeForPdf(text: string, lang: 'ko' | 'en'): string {
  if (lang === 'en') {
    return text
  }

  // 한글 -> ASCII 변환 (실제로는 한글 폰트 임베딩 필요)
  // 여기서는 간단히 처리
  return text
}

// ===========================
// 페이지 렌더러
// ===========================

class PremiumPDFRenderer {
  private pdf: PDFDocumentType
  private currentPage: PDFPageType | null = null
  private titleFont!: PDFFontType
  private bodyFont!: PDFFontType
  private colors: (typeof ELEMENT_COLORS)['목']
  private yPosition: number = 800
  private pageNumber: number = 0
  private lang: 'ko' | 'en'

  constructor(pdf: PDFDocumentType, element: string, lang: 'ko' | 'en') {
    this.pdf = pdf
    this.colors = ELEMENT_COLORS[element as keyof typeof ELEMENT_COLORS] || ELEMENT_COLORS['토']
    this.lang = lang
  }

  async initialize() {
    this.titleFont = await this.pdf.embedFont(StandardFonts.HelveticaBold)
    this.bodyFont = await this.pdf.embedFont(StandardFonts.Helvetica)
  }

  addPage(): PDFPageType {
    this.currentPage = this.pdf.addPage([595, 842]) // A4
    this.pageNumber++
    this.yPosition = 800

    // Background
    this.currentPage.drawRectangle({
      x: 0,
      y: 0,
      width: 595,
      height: 842,
      color: this.colors.secondary,
    })

    // Header stripe
    this.currentPage.drawRectangle({
      x: 0,
      y: 800,
      width: 595,
      height: 42,
      color: this.colors.primary,
    })

    // Page number
    this.currentPage.drawText(`${this.pageNumber}`, {
      x: 550,
      y: 20,
      size: 10,
      font: this.bodyFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    return this.currentPage
  }

  drawCoverPage(report: AIPremiumReport) {
    const page = this.addPage()

    // Large background circle
    page.drawEllipse({
      x: 297.5,
      y: 500,
      xScale: 200,
      yScale: 200,
      color: this.colors.primary,
      opacity: 0.15,
    })

    // Title
    const title = this.lang === 'ko' ? 'Destiny Fusion Matrix' : 'Destiny Fusion Matrix'
    page.drawText(title, {
      x: 50,
      y: 700,
      size: 32,
      font: this.titleFont,
      color: this.colors.primary,
    })

    const subtitle = this.lang === 'ko' ? 'AI Premium Report' : 'AI Premium Report'
    page.drawText(subtitle, {
      x: 50,
      y: 665,
      size: 18,
      font: this.bodyFont,
      color: rgb(0.4, 0.4, 0.4),
    })

    // Profile box
    page.drawRectangle({
      x: 50,
      y: 480,
      width: 495,
      height: 150,
      borderColor: this.colors.primary,
      borderWidth: 2,
      color: rgb(1, 1, 1),
      opacity: 0.8,
    })

    const profile = report.profile
    const profileLines = [
      `Name: ${profile.name || 'Not provided'}`,
      `Birth Date: ${profile.birthDate || 'Not provided'}`,
      `Day Master: ${profile.dayMaster}`,
      `Pattern: ${profile.geokguk || 'N/A'}`,
    ]

    let profileY = 610
    for (const line of profileLines) {
      page.drawText(line, {
        x: 70,
        y: profileY,
        size: 14,
        font: this.bodyFont,
        color: rgb(0.2, 0.2, 0.2),
      })
      profileY -= 25
    }

    // Score badge
    const { grade, overallScore } = report.matrixSummary
    const gradeColor = GRADE_COLORS[grade as keyof typeof GRADE_COLORS] || rgb(0.5, 0.5, 0.5)

    page.drawEllipse({
      x: 470,
      y: 555,
      xScale: 45,
      yScale: 45,
      color: gradeColor,
    })

    page.drawText(grade, {
      x: 455,
      y: 545,
      size: 36,
      font: this.titleFont,
      color: rgb(1, 1, 1),
    })

    page.drawText(`${overallScore}/100`, {
      x: 440,
      y: 500,
      size: 12,
      font: this.bodyFont,
      color: rgb(0.3, 0.3, 0.3),
    })

    // Key strengths
    page.drawText(this.lang === 'ko' ? 'Key Strengths' : 'Key Strengths', {
      x: 50,
      y: 430,
      size: 14,
      font: this.titleFont,
      color: this.colors.primary,
    })

    let strengthY = 410
    for (const strength of report.matrixSummary.keyStrengths.slice(0, 3)) {
      page.drawText(`• ${strength}`, {
        x: 60,
        y: strengthY,
        size: 11,
        font: this.bodyFont,
        color: rgb(0.3, 0.3, 0.3),
      })
      strengthY -= 18
    }

    // Key challenges
    page.drawText(this.lang === 'ko' ? 'Growth Areas' : 'Growth Areas', {
      x: 300,
      y: 430,
      size: 14,
      font: this.titleFont,
      color: this.colors.primary,
    })

    let challengeY = 410
    for (const challenge of report.matrixSummary.keyChallenges.slice(0, 3)) {
      page.drawText(`• ${challenge}`, {
        x: 310,
        y: challengeY,
        size: 11,
        font: this.bodyFont,
        color: rgb(0.3, 0.3, 0.3),
      })
      challengeY -= 18
    }

    // Footer
    page.drawText(`Generated: ${new Date(report.generatedAt).toLocaleDateString()}`, {
      x: 50,
      y: 50,
      size: 10,
      font: this.bodyFont,
      color: rgb(0.5, 0.5, 0.5),
    })

    page.drawText('Destiny Fusion Matrix™ • AI Premium Report', {
      x: 330,
      y: 50,
      size: 10,
      font: this.bodyFont,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  drawSectionPage(title: string, content: string, sectionNumber: number) {
    const page = this.addPage()

    // Section number badge
    page.drawEllipse({
      x: 50,
      y: 770,
      xScale: 20,
      yScale: 20,
      color: this.colors.primary,
    })

    page.drawText(`${sectionNumber}`, {
      x: 44,
      y: 763,
      size: 16,
      font: this.titleFont,
      color: rgb(1, 1, 1),
    })

    // Section title
    page.drawText(title, {
      x: 80,
      y: 765,
      size: 20,
      font: this.titleFont,
      color: this.colors.primary,
    })

    // Decorative line
    page.drawLine({
      start: { x: 50, y: 745 },
      end: { x: 545, y: 745 },
      thickness: 2,
      color: this.colors.primary,
      opacity: 0.3,
    })

    // Content
    const maxWidth = 80 // chars per line
    const lines = wrapText(content, maxWidth)
    let y = 720

    for (const line of lines) {
      if (y < 80) {
        // New page needed
        this.drawSectionContinuation(title)
        y = 750
      }

      page.drawText(line, {
        x: 50,
        y,
        size: 11,
        font: this.bodyFont,
        color: rgb(0.2, 0.2, 0.2),
        lineHeight: 16,
      })
      y -= 18
    }
  }

  private drawSectionContinuation(title: string) {
    const page = this.addPage()

    page.drawText(`${title} (continued)`, {
      x: 50,
      y: 775,
      size: 14,
      font: this.titleFont,
      color: this.colors.primary,
    })

    page.drawLine({
      start: { x: 50, y: 765 },
      end: { x: 545, y: 765 },
      thickness: 1,
      color: this.colors.primary,
      opacity: 0.3,
    })
  }

  drawClosingPage(report: AIPremiumReport) {
    const page = this.addPage()

    // Decorative element
    page.drawEllipse({
      x: 297.5,
      y: 550,
      xScale: 150,
      yScale: 150,
      color: this.colors.primary,
      opacity: 0.1,
    })

    // Thank you message
    const thankYou =
      this.lang === 'ko'
        ? 'Thank You for Using Destiny Fusion Matrix'
        : 'Thank You for Using Destiny Fusion Matrix'

    page.drawText(thankYou, {
      x: 100,
      y: 600,
      size: 18,
      font: this.titleFont,
      color: this.colors.primary,
    })

    // Conclusion text
    const conclusion = report.sections.conclusion || ''
    const lines = wrapText(conclusion, 70)
    let y = 550

    for (const line of lines) {
      page.drawText(line, {
        x: 80,
        y,
        size: 12,
        font: this.bodyFont,
        color: rgb(0.3, 0.3, 0.3),
      })
      y -= 20
    }

    // Meta info
    page.drawText('Report Information', {
      x: 50,
      y: 200,
      size: 12,
      font: this.titleFont,
      color: rgb(0.4, 0.4, 0.4),
    })

    const metaLines = [
      `Report ID: ${report.id}`,
      `Generated: ${new Date(report.generatedAt).toISOString()}`,
      `AI Model: ${report.meta.modelUsed}`,
      `Version: ${report.meta.reportVersion}`,
    ]

    let metaY = 180
    for (const line of metaLines) {
      page.drawText(line, {
        x: 50,
        y: metaY,
        size: 9,
        font: this.bodyFont,
        color: rgb(0.5, 0.5, 0.5),
      })
      metaY -= 14
    }

    // Disclaimer
    const disclaimer =
      this.lang === 'ko'
        ? 'This report is for entertainment and self-reflection purposes only.'
        : 'This report is for entertainment and self-reflection purposes only.'

    page.drawText(disclaimer, {
      x: 50,
      y: 50,
      size: 8,
      font: this.bodyFont,
      color: rgb(0.6, 0.6, 0.6),
    })
  }
}

// ===========================
// 메인 PDF 생성 함수
// ===========================

export async function generatePremiumPDF(
  report: AIPremiumReport,
  options: PDFGenerationOptions = {}
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()

  const renderer = new PremiumPDFRenderer(pdf, report.profile.dayMaster, report.lang)

  await renderer.initialize()

  // 1. Cover page
  renderer.drawCoverPage(report)

  // 2. Section pages
  const sectionTitles: Record<keyof AIPremiumReport['sections'], { ko: string; en: string }> = {
    introduction: { ko: 'Introduction', en: 'Introduction' },
    personalityDeep: { ko: 'Personality Analysis', en: 'Personality Analysis' },
    careerPath: { ko: 'Career & Aptitude', en: 'Career & Aptitude' },
    relationshipDynamics: { ko: 'Relationships', en: 'Relationships' },
    wealthPotential: { ko: 'Wealth & Finance', en: 'Wealth & Finance' },
    healthGuidance: { ko: 'Health Guide', en: 'Health Guide' },
    lifeMission: { ko: 'Life Mission', en: 'Life Mission' },
    timingAdvice: { ko: 'Timing & Periods', en: 'Timing & Periods' },
    actionPlan: { ko: 'Action Plan', en: 'Action Plan' },
    conclusion: { ko: 'Closing Message', en: 'Closing Message' },
  }

  const sectionOrder: (keyof AIPremiumReport['sections'])[] = [
    'introduction',
    'personalityDeep',
    'careerPath',
    'relationshipDynamics',
    'wealthPotential',
    'healthGuidance',
    'lifeMission',
    'timingAdvice',
    'actionPlan',
  ]

  let sectionNum = 1
  for (const sectionKey of sectionOrder) {
    const content = report.sections[sectionKey]
    if (content && content.trim()) {
      const title = sectionTitles[sectionKey][report.lang]
      renderer.drawSectionPage(title, content, sectionNum)
      sectionNum++
    }
  }

  // 3. Closing page
  renderer.drawClosingPage(report)

  // Save and return
  const pdfBytes = await pdf.save();
  return pdfBytes
}

// ===========================
// Export
// ===========================

export { type PDFGenerationOptions }
