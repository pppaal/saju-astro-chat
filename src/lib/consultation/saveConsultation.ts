import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

interface SaveConsultationParams {
  userId: string;
  summary: string;
  fullReport: string;
  jungQuotes?: unknown;
  signals?: unknown;
  userQuestion?: string;
  locale?: string;
}

/**
 * 상담 기록 저장 (서버 사이드 전용)
 */
export async function saveConsultation(params: SaveConsultationParams) {
  const {
    userId,
    summary,
    fullReport,
    jungQuotes,
    signals,
    userQuestion,
    locale = "ko",
  } = params;

  try {
    const consultation = await prisma.consultationHistory.create({
      data: {
        userId,
        summary,
        fullReport,
        jungQuotes: jungQuotes ? (jungQuotes as Prisma.InputJsonValue) : Prisma.JsonNull,
        signals: signals ? (signals as Prisma.InputJsonValue) : Prisma.JsonNull,
        userQuestion: userQuestion || null,
        locale,
      },
    });

    return { success: true, consultationId: consultation.id };
  } catch (err) {
    logger.error("[saveConsultation error]", err);
    // 저장 실패해도 에러를 throw하지 않음 (메인 기능에 영향 주지 않음)
    return { success: false, error: err };
  }
}

/**
 * 요약문 생성 헬퍼 (첫 1-2 문장 추출)
 */
export function extractSummary(fullReport: string, maxLength = 200): string {
  if (!fullReport) {return "";}

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
