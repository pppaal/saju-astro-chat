/**
 * advancedSajuSection.ts - 고급 사주 분석 섹션 빌더
 */

import type {
  SibsinRelation,
  CareerAptitude,
  BranchInteraction,
  TuechulItem,
  HoegukItem,
} from '../prompt-types'

/**
 * 고급 사주 분석 데이터 추출
 */
export function extractAdvancedAnalysis(adv: Record<string, unknown> | undefined) {
  if (!adv) {
    return {
      strengthText: '-',
      geokgukText: '-',
      geokgukDesc: '',
      yongsinPrimary: '-',
      yongsinSecondary: '-',
      yongsinAvoid: '-',
      sibsinDistText: '',
      sibsinDominant: '-',
      sibsinMissing: '-',
      relationshipText: '-',
      careerText: '-',
      chungText: '-',
      hapText: '-',
      samhapText: '-',
      healthWeak: '-',
      suitableCareers: '-',
      scoreText: '-',
      tonggeunText: '-',
      tuechulText: '-',
      hoegukText: '-',
      deukryeongText: '-',
      jonggeokText: '',
      iljuText: '',
      gongmangText: '',
    }
  }

  // 신강/신약
  const extended = adv.extended as Record<string, any> | undefined
  const strengthObj = extended?.strength as
    | { level?: string; score?: number; rootCount?: number }
    | undefined
  const strengthText = strengthObj
    ? `${strengthObj.level ?? '-'} (${strengthObj.score ?? 0}점, 통근${strengthObj.rootCount ?? 0}개)`
    : '-'

  // 격국
  const geokgukObj = (adv.geokguk ?? extended?.geokguk) as
    | { type?: string; description?: string }
    | undefined
  const geokgukText = geokgukObj?.type ?? '-'
  const geokgukDesc = geokgukObj?.description ?? ''

  // 용신/희신/기신
  const yongsinObj = (adv.yongsin ?? extended?.yongsin) as
    | {
        primary?: { element?: string } | string
        secondary?: { element?: string } | string
        avoid?: { element?: string } | string
      }
    | undefined
  const yongsinPrimary =
    typeof yongsinObj?.primary === 'object'
      ? (yongsinObj.primary as { element?: string }).element
      : ((yongsinObj?.primary as string | undefined) ?? '-')
  const yongsinSecondary =
    typeof yongsinObj?.secondary === 'object'
      ? (yongsinObj.secondary as { element?: string }).element
      : ((yongsinObj?.secondary as string | undefined) ?? '-')
  const yongsinAvoid =
    typeof yongsinObj?.avoid === 'object'
      ? (yongsinObj.avoid as { element?: string }).element
      : ((yongsinObj?.avoid as string | undefined) ?? '-')

  // 십신 분석
  const sibsin = adv.sibsin as Record<string, unknown> | undefined
  const sibsinDist = sibsin?.count ?? sibsin?.distribution ?? sibsin?.counts ?? {}
  const sibsinDistText = Object.entries(sibsinDist as Record<string, number>)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}(${v})`)
    .join(', ')
  const sibsinDominant =
    (sibsin?.dominantSibsin as string[] | undefined)?.join(', ') ??
    sibsin?.dominant ??
    sibsin?.primary ??
    '-'
  const sibsinMissing =
    (sibsin?.missingSibsin as string[] | undefined)?.join(', ') ??
    (sibsin?.missing as string[] | undefined)?.join(', ') ??
    '-'

  // 십신 기반 인간관계/직업
  const sibsinRelationships = (sibsin?.relationships ?? []) as SibsinRelation[]
  const sibsinCareerAptitudes = (sibsin?.careerAptitudes ?? []) as CareerAptitude[]
  const relationshipText = Array.isArray(sibsinRelationships)
    ? sibsinRelationships
        .slice(0, 3)
        .map((r: SibsinRelation) => `${r.type}:${r.quality ?? r.description ?? ''}`)
        .join('; ')
    : '-'
  const careerText = Array.isArray(sibsinCareerAptitudes)
    ? sibsinCareerAptitudes
        .slice(0, 4)
        .map((c: CareerAptitude) => `${c.field}(${c.score ?? 0})`)
        .join(', ')
    : '-'

  // 형충회합
  const hyeongchung = (adv.hyeongchung as Record<string, unknown> | undefined) ?? {}
  const chungText = (hyeongchung.chung as BranchInteraction[] | undefined)?.length
    ? (hyeongchung.chung as BranchInteraction[])
        .map((c: BranchInteraction) => `${c.branch1 ?? c.from}-${c.branch2 ?? c.to}`)
        .join(', ')
    : '-'
  const hapText = (hyeongchung.hap as BranchInteraction[] | undefined)?.length
    ? (hyeongchung.hap as BranchInteraction[])
        .map(
          (h: BranchInteraction) => `${h.branch1 ?? h.from}-${h.branch2 ?? h.to}→${h.result ?? ''}`
        )
        .join(', ')
    : '-'
  const samhapText = (hyeongchung.samhap as Array<{ branches?: string[] }> | undefined)?.length
    ? (hyeongchung.samhap as Array<{ branches?: string[] }>)
        .map((s) => s.branches?.join('-') ?? '-')
        .join('; ')
    : '-'

  // 건강/직업
  const healthCareer = (adv.healthCareer as Record<string, unknown> | undefined) ?? {}
  const healthWeak =
    (
      healthCareer.health as { vulnerabilities?: string[]; weakOrgans?: string[] } | undefined
    )?.vulnerabilities?.join(', ') ??
    (
      healthCareer.health as { vulnerabilities?: string[]; weakOrgans?: string[] } | undefined
    )?.weakOrgans?.join(', ') ??
    '-'
  const suitableCareers =
    (
      healthCareer.career as { suitableFields?: string[]; aptitudes?: string[] } | undefined
    )?.suitableFields?.join(', ') ??
    (
      healthCareer.career as { suitableFields?: string[]; aptitudes?: string[] } | undefined
    )?.aptitudes?.join(', ') ??
    '-'

  // 종합 점수
  const score = (adv.score as Record<string, number> | undefined) ?? {}
  const scoreText =
    (score.total ?? score.overall)
      ? `총${score.total ?? score.overall}/100 (사업${score.business ?? score.career ?? 0}, 재물${score.wealth ?? score.finance ?? 0}, 건강${score.health ?? 0})`
      : '-'

  // 통근/투출/회국/득령
  const tonggeunText = adv.tonggeun
    ? `${(adv.tonggeun as { stem?: string; rootBranch?: string; strength?: string }).stem ?? '-'}→${(adv.tonggeun as { stem?: string; rootBranch?: string; strength?: string }).rootBranch ?? '-'} (${(adv.tonggeun as { stem?: string; rootBranch?: string; strength?: string }).strength ?? '-'})`
    : '-'
  const tuechulText = (adv.tuechul as TuechulItem[] | undefined)?.length
    ? (adv.tuechul as TuechulItem[])
        .slice(0, 3)
        .map((t: TuechulItem) => `${t.element ?? t.stem}(${t.type ?? '-'})`)
        .join(', ')
    : '-'
  const hoegukText = (adv.hoeguk as HoegukItem[] | undefined)?.length
    ? (adv.hoeguk as HoegukItem[])
        .slice(0, 2)
        .map((h: HoegukItem) => `${h.type ?? h.name}→${h.resultElement ?? '-'}`)
        .join('; ')
    : '-'
  const deukryeongText = adv.deukryeong
    ? `${(adv.deukryeong as { status?: string; type?: string; score?: number }).status ?? (adv.deukryeong as { status?: string; type?: string; score?: number }).type ?? '-'} (${(adv.deukryeong as { status?: string; type?: string; score?: number }).score ?? 0}점)`
    : '-'

  // 고급 분석
  const ultra = (adv.ultraAdvanced as Record<string, unknown> | undefined) ?? {}
  const jonggeokText =
    (ultra.jonggeok as { type?: string; name?: string } | undefined)?.type ??
    (ultra.jonggeok as { type?: string; name?: string } | undefined)?.name ??
    ''
  const iljuText =
    (ultra.iljuAnalysis as { character?: string; personality?: string } | undefined)?.character ??
    (ultra.iljuAnalysis as { character?: string; personality?: string } | undefined)?.personality ??
    ''
  const gongmangText =
    (
      ultra.gongmang as { branches?: string[]; emptyBranches?: string[] } | undefined
    )?.branches?.join(', ') ??
    (
      ultra.gongmang as { branches?: string[]; emptyBranches?: string[] } | undefined
    )?.emptyBranches?.join(', ') ??
    ''

  return {
    strengthText,
    geokgukText,
    geokgukDesc,
    yongsinPrimary,
    yongsinSecondary,
    yongsinAvoid,
    sibsinDistText,
    sibsinDist,
    sibsinDominant,
    sibsinMissing,
    relationshipText,
    careerText,
    chungText,
    hapText,
    samhapText,
    healthWeak,
    suitableCareers,
    scoreText,
    tonggeunText,
    tuechulText,
    hoegukText,
    deukryeongText,
    jonggeokText,
    iljuText,
    gongmangText,
  }
}
