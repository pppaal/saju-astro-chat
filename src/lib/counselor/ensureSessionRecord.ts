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
import { grantReferralRewardOnActivation } from '@/lib/referral'
import { isCounselorSessionDeleted } from '@/lib/counselor/sessionTombstone'

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
  /**
   * 존재 보장 전용 모드(궁합 상담사). 클라가 chat-history 에 *append* 방식으로
   * 저장하는 경로에서는, 서버가 같은 턴 메시지를 미리 써두면 클라 append 와
   * 합쳐져 메시지가 중복된다(destiny 의 session/save 는 overwrite 라 안전했음).
   * 그래서 compat 에서는 메시지를 비운 채(messages:[]) 행만 만들어 "차감된 턴은
   * 세션 행이 반드시 존재"라는 불변식(어드민 활동 = 행 수)만 보장하고, 실제
   * 내용은 클라 append 가 채우게 둔다. 제목은 메시지가 아니라 중복되지 않으므로
   * 첫 질문에서 뽑아 둔다.
   */
  existenceOnly?: boolean
  /** existenceOnly 모드에서 행 제목으로 쓸 사용자 질문(앞부분만 잘라 저장). */
  title?: string
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

function deriveTitleFromText(text: string): string | null {
  const cleaned = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return null
  if (cleaned.length <= CHAT_TITLE_MAX) return cleaned
  return `${cleaned.slice(0, CHAT_TITLE_MAX - 1).trim()}…`
}

function deriveTitle(messages: PersistMessage[]): string | null {
  return deriveTitleFromText(messages.find((m) => m.role === 'user')?.content ?? '')
}

/**
 * 세션 행이 없으면 생성한다(create-if-missing). 이미 있거나 입력이 부실하면
 * 아무것도 하지 않는다. 절대 throw 하지 않는다 — 스트림/과금 경로를 깨면 안 됨.
 */
export async function ensureCounselorSessionRecord(
  args: EnsureCounselorSessionArgs
): Promise<EnsureCounselorSessionResult> {
  const { sessionId, userId, existenceOnly } = args
  if (!sessionId || !userId) return 'skipped'
  if (sessionId.length > MAX_SESSION_ID_LEN) return 'skipped'

  // existenceOnly(궁합): 메시지는 클라 append 가 채우므로 서버는 비워 둔다.
  const normalized = existenceOnly
    ? []
    : (args.messages ?? [])
        .filter(
          (m): m is PersistMessage =>
            !!m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.trim() !== ''
        )
        // chat-history 라우트가 저장하는 shape 와 동일하게 맞춘다({role, content,
        // timestamp}). 클라 저장이 나중에 같은 id 로 덮어쓸 때도 형식이 일관.
        .map((m) => ({ role: m.role, content: m.content, timestamp: new Date().toISOString() }))

  // seed 모드(destiny)는 실제 메시지가 있어야 의미가 있다. existenceOnly 는
  // 메시지가 비어도(행만 만들면 되므로) 진행한다 — 단 제목/질문 단서는 필요.
  const title = existenceOnly ? deriveTitleFromText(args.title ?? '') : deriveTitle(normalized)
  // seed 모드는 빈 대화면 만들 의미가 없다. existenceOnly 는 제목이 없어도
  // (행 존재 자체가 목적이라) 진행한다.
  if (!existenceOnly && normalized.length === 0) return 'skipped'

  // 스트리밍 도중 사용자가 이 채팅을 삭제했다면(묘비 존재), 안전망이 방금 지운
  // 세션을 되살리면 안 된다 — 생성 스킵.
  if (await isCounselorSessionDeleted(sessionId)) return 'skipped'

  try {
    // PK 단건 조회(인덱스) — 행이 있으면(클라 저장 성공 or 타 사용자 소유) 건드리지
    // 않는다. 갱신은 클라 자동 저장의 책임이라 여기서 덮으면 lost-update 위험.
    const existing = await prisma.counselorChatSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    })
    if (existing) return 'exists'

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
    // 활성화(첫 상담 완료) — 추천으로 가입한 사용자라면 추천 보상을 발화시킨다.
    // 멱등하며 절대 throw 하지 않는다(내부에서 모두 catch). 새 세션이 실제로
    // 생성된 순간에만 실행돼 과금/스트림 경로 오버헤드가 낮다.
    await grantReferralRewardOnActivation(userId)
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
