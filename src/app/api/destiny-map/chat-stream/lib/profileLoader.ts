// src/app/api/destiny-map/chat-stream/lib/profileLoader.ts
// User profile and persona memory loading

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import type { SajuDataStructure, AstroDataStructure } from './types'
import type { Chart } from '@/lib/astrology'

export interface ProfileLoadResult {
  birthDate?: string
  birthTime?: string
  gender?: string
  latitude?: number
  longitude?: number
  saju?: SajuDataStructure
  astro?: AstroDataStructure
}

export interface MemoryLoadResult {
  personaMemoryContext: string
  recentSessionSummaries: string
}

/**
 * Load user birth profile from database if not provided
 */
export async function loadUserProfile(
  userId: string,
  currentBirthDate?: string,
  currentBirthTime?: string,
  currentLatitude?: number,
  currentLongitude?: number,
  currentSaju?: SajuDataStructure,
  currentAstro?: AstroDataStructure
): Promise<ProfileLoadResult> {
  const result: ProfileLoadResult = {}

  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        birthDate: true,
        birthTime: true,
        gender: true,
        birthCity: true,
        personaMemory: {
          select: {
            sajuProfile: true,
            birthChart: true,
          },
        },
      },
    })

    if (userProfile) {
      // Use cached saju/astro from PersonaMemory if available
      const cachedSaju = userProfile.personaMemory?.sajuProfile
      const cachedAstro = userProfile.personaMemory?.birthChart

      if (cachedSaju && !currentSaju) {
        result.saju = cachedSaju as SajuDataStructure
        logger.debug('[profileLoader] Using cached saju from PersonaMemory')
      }
      if (cachedAstro && !currentAstro) {
        result.astro = cachedAstro as Chart
        logger.debug('[profileLoader] Using cached astro from PersonaMemory')
      }

      // Fill in missing birth info from user profile
      if (!currentBirthDate && userProfile.birthDate) {
        result.birthDate = userProfile.birthDate
        logger.debug('[profileLoader] Auto-loaded birthDate from profile')
      }
      if (!currentBirthTime && userProfile.birthTime) {
        result.birthTime = userProfile.birthTime
        logger.debug('[profileLoader] Auto-loaded birthTime from profile')
      }
      if (userProfile.gender) {
        result.gender =
          userProfile.gender === 'M' ? 'male' : userProfile.gender === 'F' ? 'female' : undefined
      }
    }
  } catch (e) {
    logger.warn('[profileLoader] Failed to auto-load birth profile:', e)
  }

  return result
}

/**
 * Load persona memory and recent session summaries
 */
export async function loadPersonaMemory(
  userId: string,
  theme: string,
  lang: string
): Promise<MemoryLoadResult> {
  let personaMemoryContext = ''
  let recentSessionSummaries = ''

  try {
    // 1. PersonaMemory 로드 (핵심 인사이트, 반복 이슈, 감정 톤)
    const personaMemory = await prisma.personaMemory.findUnique({
      where: { userId },
      select: {
        sessionCount: true,
        dominantThemes: true,
        keyInsights: true,
        emotionalTone: true,
        growthAreas: true,
        lastTopics: true,
        recurringIssues: true,
      },
    })

    if (personaMemory && personaMemory.sessionCount > 0) {
      const parts: string[] = []

      // 세션 카운트
      parts.push(
        lang === 'ko'
          ? `상담 횟수: ${personaMemory.sessionCount}회`
          : `Session count: ${personaMemory.sessionCount}`
      )

      // 최근 주제
      const lastTopics = personaMemory.lastTopics as string[] | null
      if (lastTopics?.length) {
        parts.push(
          lang === 'ko'
            ? `최근 관심사: ${lastTopics.slice(0, 3).join(', ')}`
            : `Recent interests: ${lastTopics.slice(0, 3).join(', ')}`
        )
      }

      // 감정 톤
      if (personaMemory.emotionalTone) {
        parts.push(
          lang === 'ko'
            ? `감정 상태: ${personaMemory.emotionalTone}`
            : `Emotional state: ${personaMemory.emotionalTone}`
        )
      }

      // 핵심 인사이트
      const insights = personaMemory.keyInsights as string[] | null
      if (insights?.length) {
        parts.push(
          lang === 'ko'
            ? `핵심 인사이트: ${insights.slice(0, 2).join('; ')}`
            : `Key insights: ${insights.slice(0, 2).join('; ')}`
        )
      }

      // 반복 이슈
      const issues = personaMemory.recurringIssues as string[] | null
      if (issues?.length) {
        parts.push(
          lang === 'ko'
            ? `반복 이슈: ${issues.slice(0, 2).join(', ')}`
            : `Recurring issues: ${issues.slice(0, 2).join(', ')}`
        )
      }

      // 성장 영역
      const growth = personaMemory.growthAreas as string[] | null
      if (growth?.length) {
        parts.push(
          lang === 'ko'
            ? `성장 영역: ${growth.slice(0, 2).join(', ')}`
            : `Growth areas: ${growth.slice(0, 2).join(', ')}`
        )
      }

      if (parts.length > 0) {
        personaMemoryContext = parts.join(' | ')
        logger.debug(`[profileLoader] PersonaMemory loaded: ${personaMemory.sessionCount} sessions`)
      }
    }

    // 2. 최근 세션 요약 로드 (이전 대화 컨텍스트)
    const recentSessions = await prisma.counselorChatSession.findMany({
      where: {
        userId,
        theme: theme || undefined,
      },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: {
        summary: true,
        keyTopics: true,
        updatedAt: true,
      },
    })

    const sessionSummaries = recentSessions
      .filter((s) => s.summary)
      .map((s) => {
        const date = new Date(s.updatedAt)
        const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
        const timeLabel =
          daysAgo === 0
            ? lang === 'ko'
              ? '오늘'
              : 'today'
            : daysAgo === 1
              ? lang === 'ko'
                ? '어제'
                : 'yesterday'
              : lang === 'ko'
                ? `${daysAgo}일 전`
                : `${daysAgo} days ago`
        return `[${timeLabel}] ${s.summary}`
      })

    if (sessionSummaries.length > 0) {
      recentSessionSummaries = sessionSummaries.join('\n')
      logger.debug(`[profileLoader] Loaded ${sessionSummaries.length} recent session summaries`)
    }
  } catch (e) {
    logger.warn('[profileLoader] Failed to load persona memory:', e)
  }

  return { personaMemoryContext, recentSessionSummaries }
}
