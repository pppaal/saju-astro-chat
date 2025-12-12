import { prisma } from "@/lib/db/prisma";

interface SaveConsultationParams {
  userId: string;
  theme: string;
  summary: string;
  fullReport: string;
  jungQuotes?: any;
  signals?: any;
  userQuestion?: string;
  locale?: string;
}

/**
 * 상담 기록 저장 및 페르소나 기억 업데이트
 * 서버 사이드에서만 호출 가능
 */
export async function saveConsultation(params: SaveConsultationParams) {
  const {
    userId,
    theme,
    summary,
    fullReport,
    jungQuotes,
    signals,
    userQuestion,
    locale = "ko",
  } = params;

  try {
    // 1. 상담 기록 저장
    const consultation = await prisma.consultationHistory.create({
      data: {
        userId,
        theme,
        summary,
        fullReport,
        jungQuotes: jungQuotes || null,
        signals: signals || null,
        userQuestion: userQuestion || null,
        locale,
      },
    });

    // 2. 페르소나 기억 업데이트
    await updatePersonaMemory(userId, theme);

    return { success: true, consultationId: consultation.id };
  } catch (err) {
    console.error("[saveConsultation error]", err);
    // 저장 실패해도 에러를 throw하지 않음 (메인 기능에 영향 주지 않음)
    return { success: false, error: err };
  }
}

/**
 * 페르소나 기억 업데이트 헬퍼
 * - 세션 카운트 증가
 * - 테마를 dominantThemes, lastTopics에 추가
 */
async function updatePersonaMemory(userId: string, theme: string) {
  try {
    const existing = await prisma.personaMemory.findUnique({
      where: { userId },
    });

    if (existing) {
      const currentThemes = (existing.dominantThemes as string[]) || [];
      const lastTopics = (existing.lastTopics as string[]) || [];

      // 테마 빈도 업데이트
      if (!currentThemes.includes(theme)) {
        currentThemes.push(theme);
      }

      // 최근 토픽 업데이트 (최대 10개, 중복 제거)
      const updatedLastTopics = [theme, ...lastTopics.filter((t) => t !== theme)].slice(0, 10);

      await prisma.personaMemory.update({
        where: { userId },
        data: {
          dominantThemes: currentThemes,
          lastTopics: updatedLastTopics,
          sessionCount: existing.sessionCount + 1,
        },
      });
    } else {
      // 새 기억 생성
      await prisma.personaMemory.create({
        data: {
          userId,
          dominantThemes: [theme],
          lastTopics: [theme],
          sessionCount: 1,
        },
      });
    }
  } catch (err) {
    console.error("[updatePersonaMemory error]", err);
  }
}

/**
 * 사용자의 페르소나 기억 조회
 */
export async function getPersonaMemory(userId: string) {
  try {
    const memory = await prisma.personaMemory.findUnique({
      where: { userId },
    });
    return memory;
  } catch (err) {
    console.error("[getPersonaMemory error]", err);
    return null;
  }
}

/**
 * 요약문 생성 헬퍼 (첫 1-2 문장 추출)
 */
export function extractSummary(fullReport: string, maxLength = 200): string {
  if (!fullReport) return "";

  // 문장 단위로 분리
  const sentences = fullReport.split(/[.!?。]\s+/).filter(Boolean);

  if (sentences.length === 0) {
    return fullReport.slice(0, maxLength);
  }

  // 첫 1-2 문장 사용
  let summary = sentences[0];
  if (sentences.length > 1 && summary.length < 80) {
    summary += ". " + sentences[1];
  }

  // 최대 길이 제한
  if (summary.length > maxLength) {
    summary = summary.slice(0, maxLength - 3) + "...";
  }

  return summary;
}
