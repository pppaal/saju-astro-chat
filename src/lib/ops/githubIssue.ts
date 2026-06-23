// src/lib/ops/githubIssue.ts
//
// 에러 자동수정 루프의 한 조각 — Sentry 알림을 받아 GitHub 이슈를 자동
// 생성한다. 라벨이 붙은 이슈는 Claude Code(web)가 받아 바로 고칠 수 있다.
//
// 전부 env 게이트 — 키가 없으면 조용히 비활성(no-op). 운영에 키를 넣는
// 순간 켜진다. 서버 전용.

import { logger } from '@/lib/logger'

export interface CreateGithubIssueInput {
  title: string
  body: string
  /** 추가 라벨(기본 라벨에 합쳐짐). */
  labels?: string[]
}

export interface GithubIssueResult {
  number: number
  htmlUrl: string
}

/** "owner/repo" 형식 저장소. 미설정이면 비활성. */
function repoSlug(): string | null {
  const v = (process.env.AUTOFIX_GITHUB_REPO || '').trim()
  return /^[^/\s]+\/[^/\s]+$/.test(v) ? v : null
}

function githubToken(): string | null {
  const v = (process.env.AUTOFIX_GITHUB_TOKEN || '').trim()
  return v || null
}

/** 기본 라벨 — env(AUTOFIX_GITHUB_LABELS, 콤마구분) 또는 폴백. */
function defaultLabels(): string[] {
  const raw = (process.env.AUTOFIX_GITHUB_LABELS || 'sentry,claude-fix').trim()
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** GitHub 이슈 자동생성이 켜져 있는지(저장소+토큰 모두 설정). */
export function isGithubAutofixConfigured(): boolean {
  return repoSlug() !== null && githubToken() !== null
}

/**
 * GitHub 이슈를 만든다. 미설정이면 null(호출부가 skip 처리).
 * 실패 시 throw — 호출부(웹훅)가 5xx 로 돌려 Sentry 가 재시도하게 한다.
 */
export async function createGithubIssue(
  input: CreateGithubIssueInput
): Promise<GithubIssueResult | null> {
  const repo = repoSlug()
  const token = githubToken()
  if (!repo || !token) {
    logger.info('[githubIssue] not configured — skipping issue creation')
    return null
  }

  const labels = Array.from(new Set([...defaultLabels(), ...(input.labels ?? [])]))
  // GitHub 제목 길이 안전선(256). 본문은 넉넉.
  const title = input.title.slice(0, 256)

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'destinypal-autofix',
    },
    body: JSON.stringify({ title, body: input.body.slice(0, 60000), labels }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GitHub issue create failed: ${res.status} ${text.slice(0, 300)}`)
  }

  const json = (await res.json()) as { number?: number; html_url?: string }
  if (typeof json.number !== 'number' || !json.html_url) {
    throw new Error('GitHub issue create: unexpected response shape')
  }
  logger.info('[githubIssue] created', { number: json.number, repo })
  return { number: json.number, htmlUrl: json.html_url }
}
