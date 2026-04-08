import type { MatrixCalculationInput, MatrixSummary } from '../types'
import type { ReportCoreViewModel } from './reportCoreHelpers'

export interface ReportLifeSectionDeps {
  calculateProfileAge: (
    birthDate: string | undefined,
    currentDateIso: string | undefined
  ) => number | null
  formatNarrativeParagraphs: (text: string, lang: 'ko' | 'en') => string
  getReportDomainLabel: (domain: string | undefined, lang: 'ko' | 'en') => string
  localizeReportNarrativeText: (text: string, lang: 'ko' | 'en') => string
  sanitizeUserFacingNarrative: (text: string) => string
}

function normalizeNarrativeLabel(label: string | null | undefined, lang: 'ko' | 'en'): string {
  const value = String(label || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!value || /^(unknown|null|undefined|n\/a)$/i.test(value)) {
    return ''
  }

  const localized =
    lang === 'ko'
      ? value
          .replace(/\bdistance tuning\b/gi, '거리 조절')
          .replace(/\bcontract negotiation\b/gi, '조건 협상')
          .replace(/\bpromotion review\b/gi, '승진 검토')
          .replace(/\bspecialist track\b/gi, '전문 트랙')
      : value

  const cleaned = localized
    .replace(/^\s*[,/.-]+\s*/g, '')
    .replace(/\s*[,/.-]+\s*$/g, '')
    .trim()

  if (!cleaned || /^[,/.-]+$/.test(cleaned)) {
    return ''
  }

  return cleaned
}

function normalizeNarrativeLabels(
  labels: Array<string | null | undefined>,
  lang: 'ko' | 'en'
): string[] {
  return Array.from(
    new Set(labels.map((label) => normalizeNarrativeLabel(label, lang)).filter(Boolean))
  )
}

export function renderComprehensiveSpouseProfileSection(
  reportCore: ReportCoreViewModel,
  _matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportLifeSectionDeps
): string {
  const actionLabel = deps.getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const riskLabel =
    reportCore.riskAxisLabel || deps.getReportDomainLabel(reportCore.riskAxisDomain, lang)

  if (lang === 'ko') {
    return deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          '오래 가는 관계는 감정의 세기보다 생활 리듬, 책임감, 속도를 함께 맞출 수 있는 사람과의 관계에서 나옵니다. 당신은 설렘이 커도 기준이 맞지 않으면 오래 버티지 않는 편이고, 반대로 속도와 기준이 맞는 관계에서는 깊이를 천천히 키워 갑니다.',
          `지금 삶의 전면에 ${actionLabel} 문제가 올라와 있기 때문에, 관계 역시 말보다 실제 일정과 책임을 함께 운영할 수 있는 사람이 더 잘 맞습니다. 함께 시간을 쓰는 방식, 약속을 지키는 방식, 서로의 일을 존중하는 태도가 중요합니다.`,
          '배우자상으로 보면 겉으로 화려한 사람보다 기준이 분명하고, 감정이 흔들릴 때도 생활을 무너뜨리지 않는 사람이 더 맞습니다. 대화가 잘 되는 것만큼이나 속도 조절과 경계 감각이 맞는지가 핵심입니다.',
          riskLabel
            ? `${riskLabel} 문제가 예민해질수록 관계도 감정적으로 몰입하기보다 서로의 리듬을 보호해 줄 수 있는지가 더 중요해집니다. 같이 있을 때 편해지는 사람, 무리한 속도를 강요하지 않는 사람이 오래 갑니다.`
            : '관계는 결론을 서두르는 사람보다, 서로의 속도와 경계를 먼저 맞추는 사람과 더 안정적으로 깊어집니다.',
        ].join(' ')
      ),
      lang
    )
  }

  return deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        'Long-term partner fit depends less on intensity and more on pace, responsibility, and the ability to keep shared standards.',
        `Because ${actionLabel} is on the front line of life right now, relationship fit also has to survive real scheduling, pressure, and obligation.`,
        `When ${riskLabel} becomes sensitive, the better match is the person who can protect rhythm and trust, not just chemistry.`,
      ].join(' ')
    ),
    lang
  )
}

export function renderComprehensiveLifeStagesSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  _matrixSummary: MatrixSummary | undefined,
  deps: ReportLifeSectionDeps
): string {
  const age = deps.calculateProfileAge(
    matrixInput.profileContext?.birthDate,
    matrixInput.currentDateIso
  )
  const focusLabel = deps.getReportDomainLabel(reportCore.focusDomain, lang)
  const actionLabel = deps.getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )

  if (lang === 'ko') {
    const stageLead =
      age === null
        ? '지금 구간은 기준을 다시 세우고 삶의 우선순위를 정리해야 하는 시기로 읽힙니다.'
        : age < 20
          ? '초년기에는 주변 환경 안에서 배운 기준이 성격과 선택의 바탕이 되는 흐름이 강합니다.'
          : age < 35
            ? '청년기에는 관계와 현실 조건이 삶의 배경을 흔들고, 실제로는 자기 자리를 만드는 쪽에서 방향이 정해집니다.'
            : age < 55
              ? '중년기에는 지금 세우는 기준이 평판과 성과로 굳어지면서, 무엇을 맡고 무엇을 줄일지의 판단이 더 중요해집니다.'
              : '후반부로 갈수록 더 넓히는 것보다 무엇을 남기고 무엇을 정리할지를 아는 힘이 삶의 안정성을 만듭니다.'

    return deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          '이 사람의 삶은 한 번에 뒤집히는 사건보다, 시기마다 무엇을 기준으로 선택하느냐에 따라 방향이 분명하게 갈리는 구조입니다. 그래서 생애 흐름도 감정의 파도보다 기준의 변화로 읽는 편이 정확합니다.',
          `${focusLabel} 문제는 삶의 배경에서 계속 작동하고, 실제로 손을 대고 움직이게 만드는 쪽은 ${actionLabel} 영역으로 모입니다. ${stageLead}`,
          '초년기에는 주변 환경이 준 기준을 배우는 시간이 길고, 청년기에는 사람과 현실 조건을 동시에 맞추면서 자기 자리를 만들게 됩니다. 이후에는 지금 세운 기준이 성과와 평판으로 굳어질 가능성이 큽니다.',
          `예를 들어, 지금 세우는 ${actionLabel} 기준은 앞으로 더 큰 선택을 할 때 흔들리지 않는 뼈대가 됩니다. 지금 대충 넘긴 문제는 나중에 더 큰 비용으로 돌아올 수 있습니다.`,
        ].join(' ')
      ),
      lang
    )
  }

  return deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        'Early life is shaped less by emotion itself and more by the standards learned inside the surrounding environment.',
        `In young adulthood, ${focusLabel} keeps setting the background while ${actionLabel} is where real positioning happens.`,
        'Midlife turns today’s standards into reputation, structure, and durable consequence.',
        'Later life rewards discernment: knowing what to keep, what to reduce, and what should outlast the current phase.',
      ].join(' ')
    ),
    lang
  )
}

export function renderComprehensiveTurningPointsSection(
  reportCore: ReportCoreViewModel,
  _matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportLifeSectionDeps
): string {
  const actionLabel = deps.getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const branches = (reportCore.branchSet || []).slice(0, 3)
  const branchLabels = normalizeNarrativeLabels(
    branches.map((branch) =>
      deps.sanitizeUserFacingNarrative(
        deps.localizeReportNarrativeText(branch.label || branch.summary || '', lang)
      )
    ),
    lang
  )

  if (lang === 'ko') {
    return deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          `이 사람의 큰 변곡점은 감정 하나로 뒤집히기보다, 현실에서 맡는 역할과 조건을 다시 정리해야 할 때 강하게 들어옵니다. 가장 직접적인 변곡점은 ${actionLabel} 문제를 어떻게 다루느냐에 달려 있습니다.`,
          '그래서 변화는 한 사건으로 오기보다 일, 사람, 돈의 조건이 동시에 재배열되는 식으로 들어올 가능성이 큽니다. 무엇을 계속 가져가고 무엇을 끊어낼지 결정해야 할 때가 바로 변곡점입니다.',
          branchLabels.length > 0
            ? `현실적으로는 ${branchLabels.join(', ')} 같은 경로를 비교하면서 판이 갈릴 가능성이 큽니다. 한 방향만 정답처럼 밀기보다 여러 경로를 놓고 손실과 되돌림 비용을 함께 봐야 합니다.`
            : '현실적인 분기점은 하나의 정답보다 몇 가지 가능한 경로를 비교하는 과정에서 열릴 가능성이 큽니다.',
          '결국 변곡점의 본질은 속도를 올리는 데 있지 않습니다. 지금까지의 기준으로 더는 버틸 수 없을 때, 무엇을 새 기준으로 삼을지 결정하는 데 있습니다.',
        ].join(' ')
      ),
      lang
    )
  }

  return deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        `The strongest turning points arrive where ${actionLabel} has to be reorganized first.`,
        'The shift is more likely to arrive as a reordering of role, people, and conditions than as a single dramatic event.',
        branchLabels.length > 0
          ? `Realistically, the choice will narrow through paths such as ${branchLabels.join(', ')}.`
          : 'The turning point will likely open through comparison rather than a single obvious answer.',
      ].join(' ')
    ),
    lang
  )
}

export function renderComprehensiveFutureOutlookSection(
  reportCore: ReportCoreViewModel,
  _matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  deps: ReportLifeSectionDeps
): string {
  const matrixRow = (reportCore.matrixView || []).find(
    (row) => row.domain === (reportCore.actionFocusDomain || reportCore.focusDomain)
  )
  const topBranches = (reportCore.branchSet || []).slice(0, 3)
  const riskLabel =
    reportCore.riskAxisLabel || deps.getReportDomainLabel(reportCore.riskAxisDomain, lang)

  if (lang === 'ko') {
    const timingLine = matrixRow?.cells?.length
      ? (() => {
          const cells = matrixRow.cells.slice(0, 3)
          const avgAgreement =
            cells.reduce((sum, cell) => sum + (cell.agreement || 0), 0) / Math.max(1, cells.length)
          const avgContradiction =
            cells.reduce((sum, cell) => sum + (cell.contradiction || 0), 0) /
            Math.max(1, cells.length)
          if (avgAgreement >= 0.82 && avgContradiction <= 0.18) {
            return '가까운 시기부터 중기까지는 전반적으로 흐름이 잘 맞는 편이라, 조건만 맞추면 실제 성과로 이어질 가능성이 큽니다.'
          }
          if (avgContradiction >= 0.3) {
            return '앞으로 몇 년은 기회와 부담이 함께 들어올 수 있으니, 무리하게 넓히기보다 감당 가능한 범위를 먼저 정하는 편이 맞습니다.'
          }
          return '앞으로 몇 년은 열려 있는 흐름이 이어지지만, 속도 조절과 기준 관리가 결과를 더 크게 가를 가능성이 큽니다.'
        })()
      : ''

    const branchLabels = normalizeNarrativeLabels(
      topBranches.map((branch) =>
        deps.sanitizeUserFacingNarrative(
          deps.localizeReportNarrativeText(branch.label || branch.summary || '', lang)
        )
      ),
      lang
    )

    const branchLine =
      branchLabels.length > 0
        ? `현실적인 경로는 ${branchLabels.join(', ')} 쪽으로 열려 있습니다. 한 번에 확정하기보다 비교 가능한 경로부터 좁혀가는 편이 맞습니다.`
        : ''

    return deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        [
          `앞으로 3~5년은 한 번의 큰 승부보다, 반복 가능한 기준을 만드는 사람이 더 멀리 갑니다. 실제로 판을 움직이는 중심은 ${deps.getReportDomainLabel(reportCore.actionFocusDomain || reportCore.focusDomain, lang)} 쪽입니다.`,
          timingLine,
          branchLine,
          riskLabel
            ? `${riskLabel} 관리를 놓치면 좋은 기회가 소모로 바뀔 수 있습니다. 결과는 능력만이 아니라 회복과 운영의 안정성에 크게 좌우됩니다.`
            : '',
        ].join(' ')
      ),
      lang
    )
  }

  return deps.formatNarrativeParagraphs(
    deps.sanitizeUserFacingNarrative(
      [
        'Over the next three to five years, repeatable standards matter more than one dramatic move.',
        matrixRow?.cells?.length
          ? matrixRow.cells
              .slice(0, 3)
              .map((cell) =>
                deps.sanitizeUserFacingNarrative(
                  deps.localizeReportNarrativeText(cell.summary || '', lang)
                )
              )
              .filter(Boolean)
              .join(' / ')
          : '',
        (() => {
          const branchLabels = normalizeNarrativeLabels(
            topBranches.map((branch) =>
              deps.sanitizeUserFacingNarrative(
                deps.localizeReportNarrativeText(branch.label || branch.summary || '', lang)
              )
            ),
            lang
          )
          return branchLabels.length > 0
            ? `The realistic paths are ${branchLabels.join(', ')}.`
            : ''
        })(),
        riskLabel ? `Longer-term results depend heavily on how well ${riskLabel} is managed.` : '',
      ].join(' ')
    ),
    lang
  )
}
