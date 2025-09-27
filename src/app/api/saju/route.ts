// app/api/saju/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { toDate } from 'date-fns-tz';
import { calculateSajuData } from '@/lib/Saju/saju';
import { getDaeunCycles, getAnnualCycles, getMonthlyCycles, getIljinCalendar } from '@/lib/Saju/unse';
import { StemBranchInfo, FiveElement } from '@/lib/Saju/types';
import { STEMS } from '@/lib/Saju/constants';

function formatSajuForGPT(sajuData: any): string {
  const { yearPillar, monthPillar, dayPillar, timePillar, fiveElements, daeun } = sajuData;
  let prompt = `Analyze the following Saju (Four Pillars of Destiny) information as an expert astrologer.\n\n`;
  prompt += `### 1. Basic Information\n`;
  prompt += `- **Four Pillars**: ${yearPillar.heavenlyStem.name}${yearPillar.earthlyBranch.name} Year, ${monthPillar.heavenlyStem.name}${monthPillar.earthlyBranch.name} Month, ${dayPillar.heavenlyStem.name}${dayPillar.earthlyBranch.name} Day, ${timePillar.heavenlyStem.name}${timePillar.earthlyBranch.name} Hour\n`;
  prompt += `- **Day Master (日干)**: ${dayPillar.heavenlyStem.name}\n`;
  const currentAge = new Date().getFullYear() - new Date(sajuData.birthDate).getFullYear() + 1;
  const cycles = daeun?.cycles ?? [];
  const currentDaeun = cycles.find((d: any) => currentAge >= d.age && currentAge < d.age + 10);
  if (currentDaeun) {
    prompt += `- **Current Grand Cycle (대운)**: Age ${currentDaeun.age} (${currentDaeun.heavenlyStem}${currentDaeun.earthlyBranch})\n\n`;
  } else {
    prompt += `- **Current Grand Cycle (대운)**: The first cycle (Age ${daeun?.daeunsu}) has not yet started.\n\n`;
  }
  prompt += `### 2. Five Elements Distribution\n`;
  prompt += `- **Wood (木)**: ${fiveElements.wood}\n`;
  prompt += `- **Fire (火)**: ${fiveElements.fire}\n`;
  prompt += `- **Earth (土)**: ${fiveElements.earth}\n`;
  prompt += `- **Metal (金)**: ${fiveElements.metal}\n`;
  prompt += `- **Water (水)**: ${fiveElements.water}\n\n`;
  prompt += `### 3. Analysis Request\n`;
  prompt += `Provide personality, structure, wealth/health, and this year's advice considering current Grand Cycle.\n`;
  return prompt;
}

// 문자열 → FiveElement 정규화
const asFiveElement = (e: string): FiveElement => {
  switch (e) {
    case '목': case 'wood': case '木': return '목';
    case '화': case 'fire': case '火': return '화';
    case '토': case 'earth': case '土': return '토';
    case '금': case 'metal': case '金': return '금';
    case '수': case 'water': case '水': return '수';
    default: return '토';
  }
};

// 천간: yin_yang 채워주기
const withYY = (name: string, element: string): StemBranchInfo => {
  const stem = STEMS.find(s => s.name === name);
  return { name, element: asFiveElement(element), yin_yang: stem ? stem.yin_yang : '양' };
};

// 지지: yin_yang는 사용 안 하므로 기본값
const toBranch = (ganji: { name: string; element: string }): StemBranchInfo => ({
  name: ganji.name,
  element: asFiveElement(ganji.element),
  yin_yang: '양',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
    }

    const { birthDate: birthDateString, birthTime, gender, calendarType, cityName } = body;

    if (!birthDateString || !birthTime || !gender || !calendarType || !cityName) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const apiKey = process.env.OPENCAGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'OpenCage API key is not configured.' }, { status: 500 });
    }

    // 1) 위치 조회
    const geoUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(cityName)}&key=${apiKey}&limit=1&language=en`;
    const geoResponse = await fetch(geoUrl).catch(err => {
      console.error('OpenCage fetch error:', err);
      return null;
    });
    if (!geoResponse) {
      return NextResponse.json({ message: 'Failed to call geocoding service.' }, { status: 502 });
    }
    const geoData = await geoResponse.json().catch(err => {
      console.error('OpenCage parse error:', err);
      return null;
    });
    if (!geoData || !geoData.results || geoData.results.length === 0) {
      return NextResponse.json({ message: `Could not find location data for "${cityName}"` }, { status: 404 });
    }

    const { lng: longitude } = geoData.results[0].geometry;
    const { name: timezone } = geoData.results[0].annotations.timezone;

    // 2) 출생지 시간대 Date
    const fullBirthString = `${birthDateString}T${birthTime}:00`;
    const birthDate = toDate(fullBirthString, { timeZone: timezone });

    // 3) 한국(KST) 보정(요구사항)
    let adjustedBirthTime = birthTime;
    if (timezone === 'Asia/Seoul') {
      const tempDate = new Date(birthDate);
      tempDate.setMinutes(tempDate.getMinutes() - 30);
      const hours = String(tempDate.getHours()).padStart(2, '0');
      const minutes = String(tempDate.getMinutes()).padStart(2, '0');
      adjustedBirthTime = `${hours}:${minutes}`;
    }

    // 4) 사주 계산
    let sajuResult: any;
    try {
      sajuResult = calculateSajuData(
        birthDateString,
        adjustedBirthTime,
        gender,
        calendarType,
        timezone,
        longitude
      );
    } catch (e) {
      console.error('calculateSajuData error:', e);
      return NextResponse.json({ message: 'Failed to calculate saju data.' }, { status: 500 });
    }

    // 5) sajuPillars 구성 (yin_yang 포함)
    const sajuPillars = {
      year: {
        heavenlyStem: withYY(sajuResult.yearPillar.heavenlyStem.name, sajuResult.yearPillar.heavenlyStem.element),
        earthlyBranch: toBranch(sajuResult.yearPillar.earthlyBranch),
      },
      month: {
        heavenlyStem: withYY(sajuResult.monthPillar.heavenlyStem.name, sajuResult.monthPillar.heavenlyStem.element),
        earthlyBranch: toBranch(sajuResult.monthPillar.earthlyBranch),
      },
      day: {
        heavenlyStem: withYY(sajuResult.dayPillar.heavenlyStem.name, sajuResult.dayPillar.heavenlyStem.element),
        earthlyBranch: toBranch(sajuResult.dayPillar.earthlyBranch),
      },
      time: {
        heavenlyStem: withYY(sajuResult.timePillar.heavenlyStem.name, sajuResult.timePillar.heavenlyStem.element),
        earthlyBranch: toBranch(sajuResult.timePillar.earthlyBranch),
      },
    };

    // 6) 대운
    const daeunInfo = getDaeunCycles(
      birthDate,
      gender,
      sajuPillars,
      sajuResult.dayMaster,
      'Asia/Seoul'
    );

    // 7) 연/월/일 운
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const yeonun = getAnnualCycles(currentYear, 10, sajuResult.dayMaster);
    const wolun = getMonthlyCycles(currentYear, sajuResult.dayMaster);
    const iljin = getIljinCalendar(currentYear, currentMonth, sajuResult.dayMaster);

    // 8) 프롬프트
    const gptPrompt = formatSajuForGPT({
      ...sajuResult,
      birthDate: birthDateString,
      daeun: daeunInfo,
    });

    // 9) 응답
    return NextResponse.json({
      birthYear: new Date(birthDateString).getFullYear(),
      birthDate: birthDateString,
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
      gptPrompt,
    });
  } catch (error) {
    console.error('[API /api/saju] Uncaught error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: `Internal Server Error: ${msg}` }, { status: 500 });
  }
}