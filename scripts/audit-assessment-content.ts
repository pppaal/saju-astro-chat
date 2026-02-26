import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runAudit as runPersonalityAudit } from './audit-personality-questions'
import { ICP_V2_QUESTIONS } from '../src/lib/icpTest/questions'
import {
  INTEGRATED_ICP_ITEM_IDS,
  INTEGRATED_PROFILE_IDS,
} from '../src/lib/assessment/integratedProfile'
import { INTEGRATED_PROFILES } from '../src/lib/assessment/integratedProfiles'

type AuditIssue = { scope: string; message: string }

const FORBIDDEN_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: '조심 계열', regex: /조심(?:하세요|해요|하십시오|하라)/ },
  { label: '피하 계열', regex: /피하(?:세요|십시오|라|자)\b/ },
  { label: '문제될 수 계열', regex: /문제될\s*수/ },
  { label: '운/운이 계열', regex: /운이/ },
]

const ICP_ALLOWED_ENDINGS = [
  '편이다.',
  '한다.',
  '할 수 있다.',
  '수 있다.',
  '많다.',
  '둔다.',
  '있다.',
]

function checkForbiddenTone(text: string): string[] {
  return FORBIDDEN_PATTERNS.filter((pattern) => pattern.regex.test(text)).map(
    (pattern) => pattern.label
  )
}

function auditIcpContent(): AuditIssue[] {
  const issues: AuditIssue[] = []
  const quizPagePath = path.join(process.cwd(), 'src', 'app', 'icp', 'quiz', 'page.tsx')
  const quizSource = fs.readFileSync(quizPagePath, 'utf8')
  const pageSizeMatch = quizSource.match(/const\s+QUESTIONS_PER_PAGE\s*=\s*(\d+)/)
  const pageSize = pageSizeMatch ? Number(pageSizeMatch[1]) : null

  if (pageSize !== 8) {
    issues.push({
      scope: 'icp',
      message: `QUESTIONS_PER_PAGE가 8이 아닙니다 (${String(pageSize)}).`,
    })
  }

  if (INTEGRATED_ICP_ITEM_IDS.length !== 8) {
    issues.push({
      scope: 'icp',
      message: `통합 ICP 항목 수가 8개가 아닙니다 (${INTEGRATED_ICP_ITEM_IDS.length}개).`,
    })
  }

  const byId = new Map(ICP_V2_QUESTIONS.map((question) => [question.id, question]))
  INTEGRATED_ICP_ITEM_IDS.forEach((id) => {
    const question = byId.get(id)
    if (!question) {
      issues.push({ scope: 'icp', message: `통합 ICP 항목 ${id}가 질문 목록에 없습니다.` })
      return
    }

    if (!question.textKo.endsWith('.')) {
      issues.push({
        scope: 'icp',
        message: `ICP 문항 ${id}가 마침표로 끝나지 않습니다: "${question.textKo}"`,
      })
    }

    if (!ICP_ALLOWED_ENDINGS.some((ending) => question.textKo.endsWith(ending))) {
      issues.push({
        scope: 'icp',
        message: `ICP 문항 ${id} 끝맺음이 기준과 다릅니다: "${question.textKo}"`,
      })
    }

    checkForbiddenTone(question.textKo).forEach((label) => {
      issues.push({
        scope: 'icp',
        message: `ICP 문항 ${id}에 금지 어투(${label})가 있습니다.`,
      })
    })
  })

  return issues
}

function auditIntegratedProfiles(): AuditIssue[] {
  const issues: AuditIssue[] = []
  const profileIds = Object.keys(INTEGRATED_PROFILES)

  if (profileIds.length !== 12) {
    issues.push({
      scope: 'integrated',
      message: `Integrated profile 수가 12개가 아닙니다 (${profileIds.length}개).`,
    })
  }

  if (profileIds.join('|') !== INTEGRATED_PROFILE_IDS.join('|')) {
    issues.push({
      scope: 'integrated',
      message: 'Integrated profile ID 목록이 기준 순서/구성과 다릅니다.',
    })
  }

  INTEGRATED_PROFILE_IDS.forEach((id) => {
    const profile = INTEGRATED_PROFILES[id]
    if (!profile) {
      issues.push({ scope: 'integrated', message: `프로필 ${id}가 비어 있습니다.` })
      return
    }

    const requiredStrings: Array<[string, string]> = [
      ['nameKo', profile.nameKo],
      ['nameEn', profile.nameEn],
      ['oneLineKo', profile.oneLineKo],
      ['oneLineEn', profile.oneLineEn],
      ['playbookKo.conflictOpener', profile.communicationPlaybookKo.conflictOpener],
      ['playbookKo.boundarySetting', profile.communicationPlaybookKo.boundarySetting],
      ['playbookKo.repairReconnect', profile.communicationPlaybookKo.repairReconnect],
      ['playbookEn.conflictOpener', profile.communicationPlaybookEn.conflictOpener],
      ['playbookEn.boundarySetting', profile.communicationPlaybookEn.boundarySetting],
      ['playbookEn.repairReconnect', profile.communicationPlaybookEn.repairReconnect],
    ]

    requiredStrings.forEach(([field, value]) => {
      if (!value || !value.trim()) {
        issues.push({ scope: 'integrated', message: `${id}.${field} 값이 비어 있습니다.` })
      }
    })

    const requiredLists: Array<[string, string[]]> = [
      ['strengthsKo', profile.strengthsKo],
      ['strengthsEn', profile.strengthsEn],
      ['watchoutsKo', profile.watchoutsKo],
      ['watchoutsEn', profile.watchoutsEn],
      ['howYouShowUpKo.dating', profile.howYouShowUpKo.dating],
      ['howYouShowUpKo.work', profile.howYouShowUpKo.work],
      ['howYouShowUpKo.friendsFamily', profile.howYouShowUpKo.friendsFamily],
      ['howYouShowUpEn.dating', profile.howYouShowUpEn.dating],
      ['howYouShowUpEn.work', profile.howYouShowUpEn.work],
      ['howYouShowUpEn.friendsFamily', profile.howYouShowUpEn.friendsFamily],
    ]

    requiredLists.forEach(([field, list]) => {
      if (!Array.isArray(list) || list.length === 0) {
        issues.push({ scope: 'integrated', message: `${id}.${field} 항목이 비어 있습니다.` })
        return
      }
      list.forEach((item, index) => {
        if (!item || !item.trim()) {
          issues.push({
            scope: 'integrated',
            message: `${id}.${field}[${index}] 값이 비어 있습니다.`,
          })
        }
      })
    })
  })

  return issues
}

export function runAssessmentContentAudit(): number {
  const personalityStatus = runPersonalityAudit()
  const issues: AuditIssue[] = [...auditIcpContent(), ...auditIntegratedProfiles()]

  if (issues.length === 0 && personalityStatus === 0) {
    console.log('[assessment-audit] OK: personality/icp/integrated checks passed')
    return 0
  }

  if (personalityStatus !== 0) {
    console.error('[assessment-audit] Personality audit failed.')
  }
  issues.forEach((issue) => {
    console.error(`[assessment-audit] [${issue.scope}] ${issue.message}`)
  })
  return 1
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isDirectRun) {
  process.exit(runAssessmentContentAudit())
}
