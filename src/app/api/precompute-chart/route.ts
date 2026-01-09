// src/app/api/precompute-chart/route.ts
// 서버에서 사주/점성술 데이터 미리 계산 (swisseph 사용)

import { NextRequest, NextResponse } from 'next/server';
import type { Chart } from '@/lib/astrology/foundation/types';

export async function POST(req: NextRequest) {
  try {
    const { birthDate, birthTime, latitude, longitude, gender, timezone } = await req.json();

    if (!birthDate || !birthTime || !latitude || !longitude) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const genderVal = (gender === 'Male' || String(gender).toLowerCase() === 'male') ? 'male' : 'female';
    const userTz = timezone || 'Asia/Seoul';
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hour, minute] = birthTime.split(':').map(Number);
    const birthDateObj = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const today = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

    // 동적 import - 서버에서만 실행
    const sajuModule = await import('@/lib/Saju');
    const astroModule = await import('@/lib/astrology');

    // ========== 1. 기본 사주 계산 ==========
    let sajuData: Record<string, unknown> | null = null;
    let advancedSajuData: Record<string, unknown> | null = null;

    try {
      const sajuFacts = await sajuModule.calculateSajuData(birthDate, birthTime, genderVal, 'solar', userTz);
      if (sajuFacts) {
        const pillars = {
          year: sajuFacts.yearPillar,
          month: sajuFacts.monthPillar,
          day: sajuFacts.dayPillar,
          time: sajuFacts.timePillar,
        };
        const dayMaster = sajuFacts.dayMaster;

        let daeun: unknown[] = [];
        let annual: unknown[] = [];
        let monthly: unknown[] = [];

        if (pillars.year && pillars.month && pillars.day) {
          try {
            const d = sajuModule.getDaeunCycles(birthDateObj, genderVal, pillars, dayMaster, userTz);
            daeun = Array.isArray(d?.cycles) ? d.cycles : [];
            annual = sajuModule.getAnnualCycles(currentYear, 10, dayMaster) || [];
            monthly = sajuModule.getMonthlyCycles(currentYear, dayMaster) || [];
          } catch { /* ignore */ }
        }

        sajuData = {
          facts: { ...sajuFacts, birthDate },
          pillars,
          dayMaster,
          unse: { daeun, annual, monthly },
        };

        // 고급 사주 분석
        if (pillars.year && pillars.month && pillars.day && pillars.time) {
          try {
            const pillarsSimple = {
              year: { stem: pillars.year?.heavenlyStem?.name || '', branch: pillars.year?.earthlyBranch?.name || '' },
              month: { stem: pillars.month?.heavenlyStem?.name || '', branch: pillars.month?.earthlyBranch?.name || '' },
              day: { stem: pillars.day?.heavenlyStem?.name || '', branch: pillars.day?.earthlyBranch?.name || '' },
              hour: { stem: pillars.time?.heavenlyStem?.name || '', branch: pillars.time?.earthlyBranch?.name || '' },
              time: { stem: pillars.time?.heavenlyStem?.name || '', branch: pillars.time?.earthlyBranch?.name || '' },
            };

            const dayMasterForAnalysis = {
              name: dayMaster?.name || pillars.day?.heavenlyStem?.name || '',
              element: dayMaster?.element || pillars.day?.heavenlyStem?.element || '목',
              yin_yang: dayMaster?.yinYang || '양',
            };

            const pillarsForAnalysis = {
              year: {
                heavenlyStem: pillars.year?.heavenlyStem,
                earthlyBranch: pillars.year?.earthlyBranch,
                jijanggan: pillars.year?.jijanggan || {},
              },
              month: {
                heavenlyStem: pillars.month?.heavenlyStem,
                earthlyBranch: pillars.month?.earthlyBranch,
                jijanggan: pillars.month?.jijanggan || {},
              },
              day: {
                heavenlyStem: pillars.day?.heavenlyStem,
                earthlyBranch: pillars.day?.earthlyBranch,
                jijanggan: pillars.day?.jijanggan || {},
              },
              time: {
                heavenlyStem: pillars.time?.heavenlyStem,
                earthlyBranch: pillars.time?.earthlyBranch,
                jijanggan: pillars.time?.jijanggan || {},
              },
            } as any; // Type assertion for compatibility

            advancedSajuData = {};

            try { (advancedSajuData as Record<string, unknown>).extended = sajuModule.analyzeExtendedSaju(dayMasterForAnalysis, pillarsForAnalysis); } catch { /* ignore */ }
            try { (advancedSajuData as Record<string, unknown>).geokguk = sajuModule.determineGeokguk(pillarsSimple); } catch { /* ignore */ }
            try { (advancedSajuData as Record<string, unknown>).yongsin = sajuModule.determineYongsin(pillarsSimple); } catch { /* ignore */ }

            try {
              (advancedSajuData as Record<string, unknown>).tonggeun = sajuModule.calculateTonggeun(dayMasterForAnalysis.name, pillarsSimple);
              (advancedSajuData as Record<string, unknown>).tuechul = sajuModule.calculateTuechul(pillarsSimple);
              (advancedSajuData as Record<string, unknown>).hoeguk = sajuModule.calculateHoeguk(pillarsSimple);
              (advancedSajuData as Record<string, unknown>).deukryeong = sajuModule.calculateDeukryeong(dayMasterForAnalysis.name, pillarsSimple.month.branch);
            } catch { /* ignore */ }

            try { (advancedSajuData as Record<string, unknown>).hyeongchung = sajuModule.analyzeHyeongchung(pillarsSimple); } catch { /* ignore */ }
            try { (advancedSajuData as Record<string, unknown>).sibsin = sajuModule.analyzeSibsinComprehensive(pillarsSimple); } catch { /* ignore */ }
            try { (advancedSajuData as Record<string, unknown>).healthCareer = sajuModule.analyzeHealthCareer(pillarsSimple); } catch { /* ignore */ }
             
            try { (advancedSajuData as Record<string, unknown>).score = sajuModule.calculateComprehensiveScore(pillarsForAnalysis); } catch { /* ignore */ }
             
            try { (advancedSajuData as Record<string, unknown>).ultraAdvanced = sajuModule.performUltraAdvancedAnalysis(pillarsForAnalysis); } catch { /* ignore */ }

            (sajuData as Record<string, unknown>).advancedAnalysis = advancedSajuData;
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }

    // ========== 2. 기본 점성 계산 ==========
    let astroData: Record<string, unknown> | null = null;
    let advancedAstroData: Record<string, unknown> | null = null;

    try {
      const natalInput = { year, month, date: day, hour, minute, latitude, longitude, timeZone: userTz };
      const natalChart = await astroModule.calculateNatalChart(natalInput);

      if (natalChart) {
        // Cast to Chart type for functions that require strict ZodiacKo type
        const chartForAdvanced = natalChart as unknown as Chart;
        const getPlanet = (name: string) => natalChart.planets?.find((p: { name: string }) => p.name === name);
        const houseCusps = natalChart.houses?.map((h: { cusp: number }) => h.cusp) || [];

        astroData = {
          sun: getPlanet('Sun'), moon: getPlanet('Moon'), mercury: getPlanet('Mercury'),
          venus: getPlanet('Venus'), mars: getPlanet('Mars'), jupiter: getPlanet('Jupiter'),
          saturn: getPlanet('Saturn'), uranus: getPlanet('Uranus'), neptune: getPlanet('Neptune'),
          pluto: getPlanet('Pluto'), ascendant: natalChart.ascendant, mc: natalChart.mc,
          houses: natalChart.houses, planets: natalChart.planets,
        };

        advancedAstroData = {};

        const sunPlanet = getPlanet('Sun');
        const moonPlanet = getPlanet('Moon');
        const sunLon = sunPlanet?.longitude ?? 0;
        const moonLon = moonPlanet?.longitude ?? 0;
        const ascLon = natalChart.ascendant?.longitude ?? 0;
        const sunHouse = sunPlanet?.house ?? 1;
        const nightChart = astroModule.isNightChart(sunHouse);
        const currentAge = currentYear - year;

        try {
          (advancedAstroData as Record<string, unknown>).extraPoints = {
            chiron: astroModule.calculateChiron(0, houseCusps),
            lilith: astroModule.calculateLilith(0, houseCusps),
            partOfFortune: astroModule.calculatePartOfFortune(ascLon, sunLon, moonLon, nightChart, houseCusps),
            vertex: astroModule.calculateVertex(0, latitude, longitude, houseCusps),
          };
        } catch { /* ignore */ }

        try {
          const srChart = await astroModule.calculateSolarReturn({ natal: natalInput, year: currentYear });
          (advancedAstroData as Record<string, unknown>).solarReturn = { chart: srChart, summary: astroModule.getSolarReturnSummary(srChart) };
        } catch { /* ignore */ }

        try {
          const lrChart = await astroModule.calculateLunarReturn({ natal: natalInput, month: currentMonth, year: currentYear });
          (advancedAstroData as Record<string, unknown>).lunarReturn = { chart: lrChart, summary: astroModule.getLunarReturnSummary(lrChart) };
        } catch { /* ignore */ }

        try {
          const secProgChart = await astroModule.calculateSecondaryProgressions({ natal: natalInput, targetDate: today });
          const secProgSun = secProgChart.planets?.find((p: { name: string }) => p.name === 'Sun');
          const secProgMoon = secProgChart.planets?.find((p: { name: string }) => p.name === 'Moon');
          const secMoonPhase = secProgSun && secProgMoon ? astroModule.getProgressedMoonPhase(secProgSun.longitude, secProgMoon.longitude) : null;
          const solarArcChart = await astroModule.calculateSolarArcDirections({ natal: natalInput, targetDate: today });
          (advancedAstroData as Record<string, unknown>).progressions = {
            secondary: { chart: secProgChart, moonPhase: secMoonPhase, summary: astroModule.getProgressionSummary(secProgChart) },
            solarArc: { chart: solarArcChart, summary: astroModule.getProgressionSummary(solarArcChart) },
          };
        } catch { /* ignore */ }

        try {
          const draconicChart = astroModule.calculateDraconicChart(chartForAdvanced);
          (advancedAstroData as Record<string, unknown>).draconic = { chart: draconicChart, comparison: astroModule.compareDraconicToNatal(chartForAdvanced) };
        } catch { /* ignore */ }

        try {
          (advancedAstroData as Record<string, unknown>).harmonics = {
            h5: astroModule.calculateHarmonicChart(chartForAdvanced, 5),
            h7: astroModule.calculateHarmonicChart(chartForAdvanced, 7),
            h9: astroModule.calculateHarmonicChart(chartForAdvanced, 9),
            profile: astroModule.generateHarmonicProfile(chartForAdvanced, currentAge),
          };
        } catch { /* ignore */ }

        try {
          const jdUT = chartForAdvanced.meta?.jdUT;
          if (jdUT) {
            const allAsteroids = astroModule.calculateAllAsteroids(jdUT, houseCusps);
            (advancedAstroData as Record<string, unknown>).asteroids = {
              ceres: allAsteroids.Ceres, pallas: allAsteroids.Pallas, juno: allAsteroids.Juno, vesta: allAsteroids.Vesta,
              aspects: astroModule.findAllAsteroidAspects(allAsteroids, chartForAdvanced.planets),
            };
          }
        } catch { /* ignore */ }

        try { (advancedAstroData as Record<string, unknown>).fixedStars = astroModule.findFixedStarConjunctions(chartForAdvanced); } catch { /* ignore */ }

        try {
          const eclipseImpacts = astroModule.findEclipseImpact(chartForAdvanced);
          (advancedAstroData as Record<string, unknown>).eclipses = {
            impact: eclipseImpacts.length > 0 ? eclipseImpacts[0] : null,
            upcoming: astroModule.getUpcomingEclipses(5),
          };
        } catch { /* ignore */ }

        try {
          if (sunPlanet && moonPlanet) {
            (advancedAstroData as Record<string, unknown>).electional = {
              moonPhase: astroModule.getMoonPhase(sunPlanet.longitude, moonPlanet.longitude),
              voidOfCourse: astroModule.checkVoidOfCourse(chartForAdvanced),
              retrograde: astroModule.getRetrogradePlanets(chartForAdvanced),
            };
          }
        } catch { /* ignore */ }

        try {
          const allMidpoints = astroModule.calculateMidpoints(chartForAdvanced);
          (advancedAstroData as Record<string, unknown>).midpoints = {
            sunMoon: allMidpoints.find((m: { planet1: string; planet2: string }) => (m.planet1 === 'Sun' && m.planet2 === 'Moon') || (m.planet1 === 'Moon' && m.planet2 === 'Sun')),
            ascMc: allMidpoints.find((m: { planet1: string; planet2: string }) => (m.planet1 === 'Ascendant' && m.planet2 === 'MC') || (m.planet1 === 'MC' && m.planet2 === 'Ascendant')),
            all: allMidpoints,
            activations: astroModule.findMidpointActivations(chartForAdvanced),
          };
        } catch { /* ignore */ }

        // ========== 3. 현재 트랜짓 분석 (TIER 4) ==========
        try {
          // 현재 시점의 트랜짓 차트 계산
          const transitInput = {
            iso: now.toISOString(),
            latitude,
            longitude,
            timeZone: userTz,
          };
          const transitChart = await astroModule.calculateTransitChart(transitInput);

          if (transitChart) {
            // 네이탈-트랜짓 애스펙트 분석
            const transitAspects = astroModule.findTransitAspects(
              transitChart,
              chartForAdvanced,
              ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
              1.0
            );

            // 중요 트랜짓만 필터링 (외행성 → 내행성)
            const majorTransits = astroModule.findMajorTransits(
              transitChart,
              chartForAdvanced,
              1.0
            );

            // 트랜짓 키워드 및 테마 추출
            const transitThemes = majorTransits.slice(0, 5).map(aspect => ({
              ...astroModule.getTransitKeywords(aspect),
              aspect: aspect.type,
              transitPlanet: aspect.transitPlanet,
              natalPoint: aspect.natalPoint,
              orb: aspect.orb,
              isApplying: aspect.isApplying,
            }));

            // 외행성 현재 위치 (예측에 사용)
            const outerPlanetPositions = transitChart.planets
              .filter((p: { name: string }) => ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(p.name))
              .map((p: { name: string; longitude: number; sign: string; house: number; retrograde?: boolean }) => ({
                name: p.name,
                longitude: p.longitude,
                sign: p.sign,
                house: p.house,
                retrograde: p.retrograde,
              }));

            (advancedAstroData as Record<string, unknown>).currentTransits = {
              date: now.toISOString(),
              aspects: transitAspects.slice(0, 20), // 상위 20개 애스펙트
              majorTransits,
              themes: transitThemes,
              outerPlanets: outerPlanetPositions,
              // 트랜짓 요약 정보
              summary: {
                activeCount: transitAspects.length,
                majorCount: majorTransits.length,
                applyingCount: transitAspects.filter((a: { isApplying: boolean }) => a.isApplying).length,
                separatingCount: transitAspects.filter((a: { isApplying: boolean }) => !a.isApplying).length,
              },
            };
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }

    return NextResponse.json({
      saju: sajuData,
      astro: astroData,
      advancedAstro: advancedAstroData,
    });
  } catch (error) {
    console.error('[precompute-chart] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
