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

// Keep this conservative: detect explicit fortune/advice wording only.
// We avoid broad stems that can trigger false positives in neutral diagnostic text.
const FORBIDDEN_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: '운세/운 계열', regex: /(?:운세|운이\s*(?:좋|나쁘)|운을)/ },
  {
    label: '조심 계열',
    regex: /(?:조심(?:해|하세요|해요|하십시오|하라|해야)|조심하는(?!\s*편이다))/,
  },
  { label: '피해야/피하는 계열', regex: /(?:피하는\s*게|피해야|피하는(?!\s*편이다))/ },
  { label: '명령형 금지(하면 안 돼)', regex: /하면\s*안\s*(?:돼|되|됩니다|된다)/ },
  { label: '문제될 수 계열', regex: /문제될\s*수/ },
]

const ICP_ALLOWED_ENDINGS = [
  '편이다.',
  '느끼는 편이다.',
  '경향이 있다.',
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
  const profileIds = Object.keys(INTEGRATED_PROFILES) as Array<
    (typeof INTEGRATED_PROFILE_IDS)[number] | string
  >
  const expectedIdSet = new Set(INTEGRATED_PROFILE_IDS)
  const actualIdSet = new Set(profileIds)

  if (profileIds.length !== 12) {
    issues.push({
      scope: 'integrated',
      message: `Integrated profile 수가 12개가 아닙니다 (${profileIds.length}개).`,
    })
  }

  INTEGRATED_PROFILE_IDS.forEach((expectedId) => {
    if (!actualIdSet.has(expectedId)) {
      issues.push({
        scope: 'integrated',
        message: `필수 Integrated profile ID(${expectedId})가 누락되었습니다.`,
      })
    }
  })

  profileIds.forEach((actualId) => {
    if (!expectedIdSet.has(actualId as (typeof INTEGRATED_PROFILE_IDS)[number])) {
      issues.push({
        scope: 'integrated',
        message: `알 수 없는 Integrated profile ID(${actualId})가 포함되어 있습니다.`,
      })
    }
  })

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

    const requiredLists: Array<[string, string[], number]> = [
      ['strengthsKo', profile.strengthsKo, 3],
      ['strengthsEn', profile.strengthsEn, 3],
      ['watchoutsKo', profile.watchoutsKo, 3],
      ['watchoutsEn', profile.watchoutsEn, 3],
      ['howYouShowUpKo.dating', profile.howYouShowUpKo.dating, 2],
      ['howYouShowUpKo.work', profile.howYouShowUpKo.work, 2],
      ['howYouShowUpKo.friendsFamily', profile.howYouShowUpKo.friendsFamily, 2],
      ['howYouShowUpEn.dating', profile.howYouShowUpEn.dating, 2],
      ['howYouShowUpEn.work', profile.howYouShowUpEn.work, 2],
      ['howYouShowUpEn.friendsFamily', profile.howYouShowUpEn.friendsFamily, 2],
    ]

    requiredLists.forEach(([field, list, expectedLength]) => {
      if (!Array.isArray(list)) {
        issues.push({ scope: 'integrated', message: `${id}.${field} 형식이 배열이 아닙니다.` })
        return
      }

      if (list.length !== expectedLength) {
        issues.push({
          scope: 'integrated',
          message: `${id}.${field} 항목 수가 ${expectedLength}개가 아닙니다 (${list.length}개).`,
        })
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
