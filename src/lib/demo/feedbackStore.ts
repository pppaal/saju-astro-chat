import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type DemoFeedbackCategory = 'bug' | 'copy' | 'ux' | 'idea'
export type DemoFeedbackSeverity = 'low' | 'med' | 'high'
export type DemoFeedbackStatus = 'open' | 'acknowledged' | 'fixed'

export type DemoFeedbackDebug = {
  pageUrl?: string
  pathname?: string
  locale?: string
  userAgent?: string
  timestamp?: string
  appVersion?: string
  commit?: string
  selectedCategory?: DemoFeedbackCategory
  selectedSeverity?: DemoFeedbackSeverity
  [key: string]: unknown
}

export type DemoFeedbackItem = {
  id: string
  createdAt: string
  category: DemoFeedbackCategory
  severity: DemoFeedbackSeverity
  message: string
  pageUrl: string
  locale: string
  email?: string
  attachmentUrl?: string
  status: DemoFeedbackStatus
  debugJson: DemoFeedbackDebug
}

export type DemoFeedbackCreateInput = {
  category: DemoFeedbackCategory
  severity: DemoFeedbackSeverity
  message: string
  pageUrl: string
  locale: string
  email?: string
  attachmentUrl?: string
  debugJson?: DemoFeedbackDebug
}

const FEEDBACK_DIR = path.join(process.cwd(), 'out')
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'demo_feedback.json')

async function ensureFeedbackFile(): Promise<void> {
  await mkdir(FEEDBACK_DIR, { recursive: true })
  try {
    await readFile(FEEDBACK_FILE, 'utf8')
  } catch {
    await writeFile(FEEDBACK_FILE, '[]', 'utf8')
  }
}

async function readAllFeedback(): Promise<DemoFeedbackItem[]> {
  await ensureFeedbackFile()
  try {
    const raw = await readFile(FEEDBACK_FILE, 'utf8')
    const parsed = JSON.parse(raw) as DemoFeedbackItem[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

async function writeAllFeedback(items: DemoFeedbackItem[]): Promise<void> {
  await ensureFeedbackFile()
  await writeFile(FEEDBACK_FILE, JSON.stringify(items, null, 2), 'utf8')
}

export async function listDemoFeedback(limit = 50): Promise<DemoFeedbackItem[]> {
  const items = await readAllFeedback()
  return items
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, Math.max(1, Math.min(limit, 200)))
}

export async function createDemoFeedback(
  input: DemoFeedbackCreateInput
): Promise<DemoFeedbackItem> {
  const items = await readAllFeedback()
  const now = new Date().toISOString()
  const nextItem: DemoFeedbackItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    category: input.category,
    severity: input.severity,
    message: input.message.trim(),
    pageUrl: input.pageUrl.trim(),
    locale: input.locale.trim() || 'unknown',
    email: input.email?.trim() || undefined,
    attachmentUrl: input.attachmentUrl?.trim() || undefined,
    status: 'open',
    debugJson: input.debugJson || {},
  }

  items.push(nextItem)
  await writeAllFeedback(items)
  return nextItem
}

export async function updateDemoFeedbackStatus(
  id: string,
  status: DemoFeedbackStatus
): Promise<DemoFeedbackItem | null> {
  const items = await readAllFeedback()
  const idx = items.findIndex((item) => item.id === id)
  if (idx < 0) {
    return null
  }
  items[idx] = { ...items[idx], status }
  await writeAllFeedback(items)
  return items[idx]
}
