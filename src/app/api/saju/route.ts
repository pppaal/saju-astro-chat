// src/app/api/saju/route.ts

import { NextResponse } from 'next/server';
import { toDate } from 'date-fns-tz';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { calculateSajuData } from '@/lib/Saju/saju';
import { getClientIp } from '@/lib/request-ip';
import { getCreditBalance } from '@/lib/credits/creditService';
import { apiClient } from '@/lib/api/ApiClient';
import { getNowInTimezone } from '@/lib/datetime';
import {
  getDaeunCycles,
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
} from '@/lib/Saju/unse';
import type { SajuPillars } from '@/lib/Saju/types';
import {
  getShinsalHits,
  getTwelveStagesForPillars,
  getTwelveShinsalSingleByPillar,
} from '@/lib/Saju/shinsal';
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations';
import { logger } from '@/lib/logger';
import { sanitizeError } from '@/lib/security/errorSanitizer';

import { parseRequestBody } from '@/lib/api/requestParser';
// Services
import {
  checkPremiumStatus,
  withYY,
  toBranch,
  pickLucky,
  formatSajuForGPT,
  coerceJijanggan,
  enrichSibsin,
  buildJijangganRaw,
  performAdvancedAnalysis,
  isRecord,
} from './services';

/* -----------------------------
   Handler
------------------------------*/
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers as Headers);
    const body = await parseRequestBody<any>(req, { context: 'Saju' });
    if (!body) {
      return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
    }

    const { birthDate: birthDateString, birthTime: birthTimeRaw, gender, calendarType, timezone, userTimezone } = body;
    if (!birthDateString || !birthTimeRaw || !gender || !calendarType || !timezone) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // 세션 및 크레딧 확인
    const session = await getServerSession(authOptions);

    // 크레딧 시스템으로 프리미엄 체크 (새로운 방식)
    let isPremium = false;
    let creditBalance = null;

    if (session?.user?.id) {
      // 초기 사주 분석은 무료 (크레딧 차감 없음)
      // 상담사 채팅만 크레딧 차감

      // 플랜 기반 프리미엄 체크
      creditBalance = await getCreditBalance(session.user.id);
      isPremium = creditBalance.plan !== "free";
    } else {
      // 비로그인 사용자: 기존 Stripe 체크 (호환성)
      isPremium = session?.user?.email
        ? await checkPremiumStatus(session.user.email, ip)
        : false;
    }

    // 사용자 현재 위치 타임존 (운세 계산용) - 없으면 출생 타임존 사용
    const effectiveUserTz = userTimezone || timezone;

    const birthDate = toDate(`${birthDateString}T${birthTimeRaw}:00`, { timeZone: timezone });
    const adjustedBirthTime = String(birthTimeRaw);

    const sajuResult = calculateSajuData(
      birthDateString,
      adjustedBirthTime,
      gender,
      calendarType,
      timezone,
      false
    );

    // sajuResult has both formats: { yearPillar, monthPillar, dayPillar, timePillar } AND { pillars: { year, month, day, time } }
    const sajuPillars: SajuPillars = {
      year: {
        heavenlyStem: withYY(sajuResult.yearPillar.heavenlyStem),
        earthlyBranch: toBranch(sajuResult.yearPillar.earthlyBranch),
        jijanggan: sajuResult.yearPillar.jijanggan,
      },
      month: {
        heavenlyStem: withYY(sajuResult.monthPillar.heavenlyStem),
        earthlyBranch: toBranch(sajuResult.monthPillar.earthlyBranch),
        jijanggan: sajuResult.monthPillar.jijanggan,
      },
      day: {
        heavenlyStem: withYY(sajuResult.dayPillar.heavenlyStem),
        earthlyBranch: toBranch(sajuResult.dayPillar.earthlyBranch),
        jijanggan: sajuResult.dayPillar.jijanggan,
      },
      time: {
        heavenlyStem: withYY(sajuResult.timePillar.heavenlyStem),
        earthlyBranch: toBranch(sajuResult.timePillar.earthlyBranch),
        jijanggan: sajuResult.timePillar.jijanggan,
      },
    };

    // 운세들
    const daeunInfo = getDaeunCycles(
      birthDate,
      gender,
      sajuPillars,
      sajuResult.dayMaster,
      'Asia/Seoul'
    );
    // 사용자 타임존 기준 현재 날짜로 운세 계산
    const userNow = getNowInTimezone(effectiveUserTz);
    const yeonun = getAnnualCycles(userNow.year, 10, sajuResult.dayMaster);
    const wolun = getMonthlyCycles(userNow.year, sajuResult.dayMaster);
    const iljin = getIljinCalendar(userNow.year, userNow.month, sajuResult.dayMaster);

    // 12운성/신살/길성
    const twelveStages = getTwelveStagesForPillars(sajuPillars);

    // your 규칙 적용
    const twelveShinsalSingle = getTwelveShinsalSingleByPillar(sajuPillars, {
  includeTwelveAll: true,
  useMonthCompletion: false,
  ruleSet: 'your',
});

const rawShinsal = getShinsalHits(sajuPillars, {
  includeLucky: true,
  includeUnlucky: true,
  includeTwelveAll: true,
  useMonthCompletion: false,
  includeGeneralShinsal: true,
  includeLuckyDetails: true,
  ruleSet: 'your',
});

    // 표시 데이터 구성
    const dayMasterStem = sajuResult.dayPillar.heavenlyStem.name;

    const buildPillar = (pillar: 'time' | 'day' | 'month' | 'year') => {
      const p = sajuResult[`${pillar}Pillar` as const];
      const jgRaw = buildJijangganRaw(p.jijanggan);
      const jgObj = enrichSibsin(coerceJijanggan(p.jijanggan), dayMasterStem);
      const display = (['chogi', 'junggi', 'jeonggi'] as const)
        .map((k) => {
          const it = jgObj[k];
          if (!it?.name) {return '';}
          const han = it.name; // hanja
          const sib = it.sibsin ? `(${it.sibsin})` : '';
          return `${han}${sib}`;
        })
        .filter(Boolean)
        .join(' · ');
      const shinsalKinds = rawShinsal.filter(h => h.pillars.includes(pillar)).map(h => h.kind);

      // Use top-level LUCKY_ORDER/LUCKY_SET constants (already defined above)

      return {
        stem: p.heavenlyStem.name,
        branch: p.earthlyBranch.name,
        jijanggan: {
          raw: jgRaw.raw,
          list: jgRaw.list,
          display,
          object: jgObj,
        },
        twelveStage: twelveStages[pillar],
        twelveShinsal: Array.isArray(twelveShinsalSingle[pillar])
          ? twelveShinsalSingle[pillar]
          : [twelveShinsalSingle[pillar]].filter(Boolean),
        lucky: pickLucky(rawShinsal, pillar),
        shinsal: shinsalKinds,
        shinsalSummary: pickLucky(rawShinsal, pillar).join('·'),
      };
    };

    const byPillar = {
      time: buildPillar('time'),
      day: buildPillar('day'),
      month: buildPillar('month'),
      year: buildPillar('year'),
    };

    // 관계 분석
    const relationsInput = toAnalyzeInputFromSaju(
      {
        year: sajuResult.yearPillar,
        month: sajuResult.monthPillar,
        day: sajuResult.dayPillar,
        time: sajuResult.timePillar,
      },
      sajuResult.dayPillar.heavenlyStem.name
    );
    const relations = analyzeRelations(relationsInput);

    // ======== 고급 분석 (서비스 호출) ========
    const timePillarSimple = {
      stem: sajuResult.timePillar.heavenlyStem.name,
      branch: sajuResult.timePillar.earthlyBranch.name,
    };
    const simplePillars = {
      year: { stem: sajuResult.yearPillar.heavenlyStem.name, branch: sajuResult.yearPillar.earthlyBranch.name },
      month: { stem: sajuResult.monthPillar.heavenlyStem.name, branch: sajuResult.monthPillar.earthlyBranch.name },
      day: { stem: sajuResult.dayPillar.heavenlyStem.name, branch: sajuResult.dayPillar.earthlyBranch.name },
      time: timePillarSimple,
      hour: timePillarSimple,
    };
    const pillarsWithHour = {
      year: simplePillars.year,
      month: simplePillars.month,
      day: simplePillars.day,
      hour: simplePillars.time,
    };

    const advancedResult = performAdvancedAnalysis(
      simplePillars,
      pillarsWithHour,
      sajuPillars,
      dayMasterStem,
      sajuResult.monthPillar.earthlyBranch.name,
      twelveStages,
      sajuResult.fiveElements
    );

    const gptPrompt = formatSajuForGPT({
      ...sajuResult,
      birthDate: birthDateString,
      daeun: daeunInfo,
    });

    // 분석 기준일 (사용자 타임존)
    const analysisDate = `${userNow.year}-${String(userNow.month).padStart(2, '0')}-${String(userNow.day).padStart(2, '0')}`;

    // 프리미엄 사용자용 전체 분석 (서비스에서 반환된 결과 사용)
    const fullAdvancedAnalysis = advancedResult;

    // ======== AI 백엔드 호출 (GPT) ========
    let aiInterpretation = '';
    let aiModelUsed = '';

    try {
      const response = await apiClient.post('/ask', {
        theme: 'saju',
        prompt: gptPrompt,
        saju: {
          dayMaster: sajuResult.dayMaster,
          fiveElements: sajuResult.fiveElements,
          pillars: simplePillars,
          daeun: daeunInfo,
          yeonun,
          wolun,
        },
        locale: body.locale || 'ko',
        advancedSaju: isPremium ? fullAdvancedAnalysis : null,
      }, { timeout: 90000 });

      if (response.ok) {
        const data = (response.data as any)?.data;
        aiInterpretation = data?.fusion_layer || data?.report || '';
        aiModelUsed = data?.model || 'gpt-4o';
      }
    } catch (aiErr) {
      logger.warn('[Saju API] AI backend call failed:', aiErr);
      // AI 실패 시 기본 해석 제공
      const locale = body.locale || 'ko';
      const dayMasterName = sajuResult.dayMaster?.name || '';
      aiInterpretation = locale === 'ko'
        ? `${dayMasterName} 일간으로 태어나셨습니다. 현재 AI 해석 서비스가 일시적으로 이용 불가합니다. 기본 사주 분석 결과를 확인해주세요.`
        : `You were born with ${dayMasterName} as your day master. AI interpretation is temporarily unavailable. Please check the basic Saju analysis results.`;
      aiModelUsed = 'fallback';
    }

    // ======== 기록 저장 (로그인 사용자만) ========
    if (session?.user?.id) {
      try {
        await prisma.reading.create({
          data: {
            userId: session.user.id,
            type: 'saju',
            title: `${sajuResult.dayMaster?.name || ''} 일간 사주 분석`,
            content: JSON.stringify({
              birthDate: birthDateString,
              birthTime: adjustedBirthTime,
              gender,
              timezone,
              dayMaster: sajuResult.dayMaster,
              fiveElements: sajuResult.fiveElements,
              pillars: {
                year: sajuResult.yearPillar,
                month: sajuResult.monthPillar,
                day: sajuResult.dayPillar,
                time: sajuResult.timePillar,
              },
            }),
          },
        });
      } catch (saveErr) {
        logger.warn('[Saju API] Failed to save reading:', saveErr);
      }
    }

    return NextResponse.json({
      // 프리미엄 상태 플래그 - 크레딧/플랜 기반으로 체크
      isPremium,
      isLoggedIn: !!session?.user?.id,

      birthYear: new Date(birthDateString).getFullYear(),
      birthDate: birthDateString,
      analysisDate,
      userTimezone: effectiveUserTz,
      yearPillar: sajuResult.yearPillar,
      monthPillar: sajuResult.monthPillar,
      dayPillar: sajuResult.dayPillar,
      timePillar: sajuResult.timePillar,
      fiveElements: sajuResult.fiveElements,
      dayMaster: sajuResult.dayMaster,

      daeun: daeunInfo,
      yeonun,
      wolun,
      iljin,

      // 표 렌더링용
      table: { byPillar },

      // 카드 렌더링용 신살
      shinsal: (rawShinsal || [])
        .map(h => {
          const first = h.pillars?.[0];
          const scope =
            first === 'year' ? '연주' :
            first === 'month' ? '월주' :
            first === 'day' ? '일주' :
            first === 'time' ? '시주' : '';
          return {
            name: h.kind,
            scope,
            from: h.target ?? '',
            to: '',
            note: h.detail ?? '',
          };
        })
        .filter(x => x.name && x.scope),

      // 디버깅 원본
      shinsalRaw: rawShinsal,

      relations,
      gptPrompt,

      // ======== AI 해석 결과 (GPT) ========
      aiInterpretation,
      aiModelUsed,

      // ======== 고급 분석 결과 - 모든 사용자에게 제공 ========
      advancedAnalysis: fullAdvancedAnalysis,
    });
  } catch (error) {
    logger.error('[API /api/saju] Uncaught error:', error);
    const sanitized = sanitizeError(error, 'internal');
    return NextResponse.json(sanitized, { status: 500 });
  }
}
