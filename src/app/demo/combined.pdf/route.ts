import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getDemoCombinedPayload } from '@/lib/demo/demoPipelines'
import { requireDemoTokenForApi } from '@/lib/demo/requireDemoToken'

export const dynamic = 'force-dynamic'

type PdfDoc = Awaited<ReturnType<typeof PDFDocument.create>>
type PdfPage = ReturnType<PdfDoc['addPage']>
type PdfFont = Awaited<ReturnType<PdfDoc['embedFont']>>

function toPdfText(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, '?')
}

function drawFooter(page: PdfPage, font: PdfFont, pageNumber: number) {
  page.drawText(`Page ${pageNumber}`, {
    x: 280,
    y: 20,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  })
}

function drawBarChart(
  page: PdfPage,
  font: PdfFont,
  title: string,
  rows: Array<{ label: string; value: number }>,
  originY: number
) {
  page.drawText(title, {
    x: 60,
    y: originY,
    size: 14,
    font,
    color: rgb(0.1, 0.1, 0.1),
  })

  const startY = originY - 28
  rows.forEach((row, idx) => {
    const y = startY - idx * 28
    page.drawText(`${row.label} ${row.value}`, {
      x: 60,
      y: y + 5,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.2),
    })

    page.drawRectangle({
      x: 180,
      y,
      width: 320,
      height: 16,
      color: rgb(0.92, 0.92, 0.92),
    })
    page.drawRectangle({
      x: 180,
      y,
      width: Math.max(1, Math.round((320 * row.value) / 100)),
      height: 16,
      color: rgb(0.22, 0.47, 0.85),
    })
  })
}

export async function GET(request: NextRequest) {
  const tokenValidation = requireDemoTokenForApi(request)
  if (tokenValidation instanceof NextResponse) {
    return tokenValidation
  }

  const demo = getDemoCombinedPayload()
  const pdf = await PDFDocument.create()
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica)

  // 1. Cover page
  const cover = pdf.addPage([595, 842])
  cover.drawText('DestinyPal Demo Review', {
    x: 60,
    y: 760,
    size: 28,
    font: titleFont,
    color: rgb(0.1, 0.1, 0.1),
  })
  cover.drawText('ICP + Personality + Combined Report', {
    x: 60,
    y: 725,
    size: 16,
    font: bodyFont,
    color: rgb(0.25, 0.25, 0.25),
  })
  cover.drawText(toPdfText(`User: ${demo.user_name} | Locale: ${demo.locale}`), {
    x: 60,
    y: 690,
    size: 12,
    font: bodyFont,
    color: rgb(0.3, 0.3, 0.3),
  })
  cover.drawText(toPdfText(`Hybrid: ${demo.hybrid.name} (${demo.hybrid.id})`), {
    x: 60,
    y: 665,
    size: 12,
    font: bodyFont,
    color: rgb(0.3, 0.3, 0.3),
  })
  drawFooter(cover, bodyFont, 1)

  // 2. ICP summary + chart
  const icpPage = pdf.addPage([595, 842])
  icpPage.drawText('ICP Result', { x: 60, y: 780, size: 20, font: titleFont })
  icpPage.drawText(toPdfText(demo.icp.narrative.main_text), {
    x: 60,
    y: 750,
    size: 11,
    font: bodyFont,
    color: rgb(0.2, 0.2, 0.2),
    maxWidth: 470,
    lineHeight: 14,
  })
  drawBarChart(
    icpPage,
    bodyFont,
    'Chart 1: ICP Axes',
    [
      { label: 'Dominance', value: demo.icp.scores.dominance },
      { label: 'Affiliation', value: demo.icp.scores.affiliation },
      { label: 'Boundary', value: demo.icp.scores.boundary },
      { label: 'Resilience', value: demo.icp.scores.resilience },
    ],
    660
  )
  drawFooter(icpPage, bodyFont, 2)

  // 3. Personality summary + chart
  const personaPage = pdf.addPage([595, 842])
  personaPage.drawText('Personality Result', { x: 60, y: 780, size: 20, font: titleFont })
  personaPage.drawText(toPdfText(demo.personality.narrative.main_text), {
    x: 60,
    y: 750,
    size: 11,
    font: bodyFont,
    color: rgb(0.2, 0.2, 0.2),
    maxWidth: 470,
    lineHeight: 14,
  })
  drawBarChart(
    personaPage,
    bodyFont,
    'Chart 2: Persona Axes',
    [
      { label: 'Energy', value: demo.personality.traits.axes.energy.score },
      { label: 'Cognition', value: demo.personality.traits.axes.cognition.score },
      { label: 'Decision', value: demo.personality.traits.axes.decision.score },
      { label: 'Rhythm', value: demo.personality.traits.axes.rhythm.score },
    ],
    660
  )
  drawFooter(personaPage, bodyFont, 3)

  // 4. Combined insights
  const combinedPage = pdf.addPage([595, 842])
  combinedPage.drawText('Combined Insights', { x: 60, y: 780, size: 20, font: titleFont })
  let y = 745
  demo.combined_summary.forEach((item, idx) => {
    combinedPage.drawText(toPdfText(`${idx + 1}. ${item.insight}`), {
      x: 60,
      y,
      size: 11,
      font: bodyFont,
      maxWidth: 470,
      lineHeight: 14,
      color: rgb(0.15, 0.15, 0.15),
    })
    y -= 62
  })
  drawFooter(combinedPage, bodyFont, 4)

  // 5. Segments table
  const segmentPage = pdf.addPage([595, 842])
  segmentPage.drawText('ICP Segments + Messaging Table', {
    x: 60,
    y: 780,
    size: 20,
    font: titleFont,
  })
  let tableY = 735
  demo.recommended_icp_segments.forEach((row) => {
    segmentPage.drawRectangle({
      x: 60,
      y: tableY - 64,
      width: 475,
      height: 58,
      borderColor: rgb(0.75, 0.75, 0.75),
      borderWidth: 1,
    })
    segmentPage.drawText(toPdfText(row.segment), {
      x: 68,
      y: tableY - 20,
      size: 11,
      font: titleFont,
      maxWidth: 450,
    })
    segmentPage.drawText(toPdfText(`Reason: ${row.reason}`), {
      x: 68,
      y: tableY - 36,
      size: 10,
      font: bodyFont,
      maxWidth: 450,
    })
    segmentPage.drawText(toPdfText(`Messaging: ${row.messaging_style}`), {
      x: 68,
      y: tableY - 50,
      size: 10,
      font: bodyFont,
      maxWidth: 450,
    })
    tableY -= 74
  })
  drawFooter(segmentPage, bodyFont, 5)

  // 6. Action plan
  const planPage = pdf.addPage([595, 842])
  planPage.drawText('Action Plan (7-day + 30-day)', { x: 60, y: 780, size: 20, font: titleFont })
  planPage.drawText('7-day', { x: 60, y: 740, size: 14, font: titleFont })
  let planY = 715
  demo.action_plan.seven_day.forEach((item) => {
    planPage.drawText(toPdfText(`- ${item}`), {
      x: 68,
      y: planY,
      size: 11,
      font: bodyFont,
      maxWidth: 460,
      lineHeight: 14,
    })
    planY -= 28
  })
  planPage.drawText('30-day', { x: 60, y: planY - 12, size: 14, font: titleFont })
  planY -= 38
  demo.action_plan.thirty_day.forEach((item) => {
    planPage.drawText(toPdfText(`- ${item}`), {
      x: 68,
      y: planY,
      size: 11,
      font: bodyFont,
      maxWidth: 460,
      lineHeight: 14,
    })
    planY -= 28
  })
  drawFooter(planPage, bodyFont, 6)

  const bytes = await pdf.save()

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="demo-combined-report.pdf"',
      'Cache-Control': 'no-store',
    },
  })
}
