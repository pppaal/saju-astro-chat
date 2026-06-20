/**
 * ensureCounselorSessionRecord — 차감-기록 불일치 방지용 서버측 안전망.
 *
 * 배경(회귀): destiny 상담사는 "메시지당 1 credit 차감"은 서버(`counselor/
 * realtime`)에서 원자적으로 일어나지만, 대화 *기록*(CounselorChatSession)은
 * 클라이언트 자동 저장(useChatAutoSave → `session/save`)에만 의존했다. 자동
 * 저장은 best-effort(debounce 2s · beforeunload beacon · 언마운트 flush)라
 * 모바일 OS 의 백그라운드 탭 종료 / 네트워크 drop / 디바운스 만료 전 이탈이면
 * POST 가 영영 안 나가고 실패해도 조용히 무시된다. 그 결과 "크레딧은 빠졌는데
 * 활동(저장된 세션) 0" 인 어드민 화면이 만들어졌다.
 *
 * 이 헬퍼는 그 안전망이다. 답변이 실제로 생성되어 *과금이 확정된* 순간
 * (claudeSSE 의 onComplete — fullText 가 비어있지 않을 때만 호출됨, 환불 케이스
 * 와 정확히 상호배타)에 서버가 같은 세션 id 로 행을 **없으면 생성**한다.
 *
 * 충돌이 안 나는 이유: 클라가 자동 저장에 쓰는 세션 id(`chat_…`)가 그대로
 * realtime 에 `x-session-id` 로 전달된다. 서버 생성과 클라 저장이 동일 id 를
 * 공유하므로 행이 갈라지지 않는다. 이미 행이 있으면(클라 저장이 먼저 도착했거나
 * 다른 사용자 소유면) 절대 건드리지 않는다 — 갱신 권한은 클라 자동 저장이
 * 갖고, 우리는 "최소 한 줄은 반드시 존재" 라는 불변식만 보장한다.
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// sidebar 제목과 동일 규칙(=chat-history 라우트의 truncateChatTitle)을 맞춰,
// 안전망이 만든 행도 사용자가 보는 제목과 어긋나지 않게 한다.
const CHAT_TITLE_MAX = 30

// 세션 id 는 클라 생성 `chat_<ts>_<rand>` (≈25자). 비정상적으로 긴 값은
// 헤더 변조 가능성이 있으니 안전한 상한에서 거른다.
const MAX_SESSION_ID_LEN = 128

interface PersistMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface EnsureCounselorSessionArgs {
  /** 클라가 자동 저장에 쓰는 정본 세션 id(=realtime 의 x-session-id). */
  sessionId: string
  userId: string
  /** 이 턴까지의 대화(마지막 user 질문 + 그에 대한 assistant 답변 포함). */
  messages: PersistMessage[]
  locale?: string
  /** "destiny" | "compat". destiny 상담사 기본값. */
  type?: string
}

export type EnsureCounselorSessionResult = 'created' | 'exists' | 'skipped'

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}

function deriveTitle(messages: PersistMessage[]): string | null {
  const firstUser = messages.find((m) => m.role === 'user')?.content ?? ''
  const cleaned = firstUser.replace(/\s+/g, ' ').trim()
  if (!cleaned) return null
  if (cleaned.length <= CHAT_TITLE_MAX) return cleaned
  return `${cleaned.slice(0, CHAT_TITLE_MAX - 1).trim()}…`
}

/**
 * 세션 행이 없으면 생성한다(create-if-missing). 이미 있거나 입력이 부실하면
 * 아무것도 하지 않는다. 절대 throw 하지 않는다 — 스트림/과금 경로를 깨면 안 됨.
 */
export async function ensureCounselorSessionRecord(
  args: EnsureCounselorSessionArgs
): Promise<EnsureCounselorSessionResult> {
  const { sessionId, userId } = args
  if (!sessionId || !userId) return 'skipped'
  if (sessionId.length > MAX_SESSION_ID_LEN) return 'skipped'

  const normalized = (args.messages ?? [])
    .filter(
      (m): m is PersistMessage =>
        !!m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim() !== ''
    )
    // chat-history 라우트가 저장하는 shape 와 동일하게 맞춘다({role, content,
    // timestamp}). 클라 자동 저장이 나중에 같은 id 로 덮어쓸 때도 형식이 일관.
    .map((m) => ({ role: m.role, content: m.content, timestamp: new Date().toISOString() }))

  if (normalized.length === 0) return 'skipped'

  try {
    // PK 단건 조회(인덱스) — 행이 있으면(클라 저장 성공 or 타 사용자 소유) 건드리지
    // 않는다. 갱신은 클라 자동 저장의 책임이라 여기서 덮으면 lost-update 위험.
    const existing = await prisma.counselorChatSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    })
    if (existing) return 'exists'

    const title = deriveTitle(normalized)
    await prisma.counselorChatSession.create({
      data: {
        id: sessionId,
        userId,
        locale: args.locale ?? 'ko',
        type: args.type ?? 'destiny',
        ...(title ? { title } : {}),
        messages: normalized,
        messageCount: normalized.length,
        lastMessageAt: new Date(),
      },
    })
    logger.info('[ensureCounselorSessionRecord] safety-net record created', {
      sessionId,
      userId,
      messageCount: normalized.length,
    })
    return 'created'
  } catch (err) {
    // find 와 create 사이에 클라 자동 저장이 같은 id 로 먼저 만든 race — 충돌은
    // 곧 "이미 존재"이므로 안전망 목적상 성공으로 본다.
    if (isUniqueConstraintError(err)) return 'exists'
    // 그 외 오류(DB 일시 장애 등)는 삼키고 스트림을 깨지 않는다. 활동 기록이
    // 잠깐 비더라도 과금/응답 경로는 정상 동작해야 한다.
    logger.warn('[ensureCounselorSessionRecord] failed', { err, sessionId, userId })
    return 'skipped'
  }
}
