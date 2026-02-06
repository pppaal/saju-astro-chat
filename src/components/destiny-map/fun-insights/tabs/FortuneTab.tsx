"use client";

import { memo, useMemo } from 'react';
import type { TabProps } from './types';
import { getMatrixAnalysis, getTimingOverlayAnalysis, getRelationAspectAnalysis, getAdvancedAnalysisResult, getExtraPointAnalysis } from '../analyzers';
import { PremiumReportCTA } from '../components';

import type { SajuDataExtended, PlanetData, CurrentFlow } from './fortune/types';
import { findPlanetSign, findPlanetHouse } from './fortune/utils';
import { calculateYearFortune, calculateMonthFortune, calculateTodayFortune } from './fortune/hooks';
import {
  EnergyStatusSection,
  CurrentFlowSection,
  YearFortuneSection,
  MonthFortuneSection,
  TodayFortuneSection,
  LifeCycleSection,
  TimingOverlaySection,
  RelationAspectSection,
  AdvancedAnalysisSection,
  ExtraPointsSection
} from './fortune/components';

function FortuneTab({ saju, astro, lang, isKo, data }: TabProps) {
  // Memoize expensive layer analysis calculations to prevent re-computation on every render
  const matrixAnalysis = useMemo(
    () => getMatrixAnalysis(saju ?? undefined, astro ?? undefined, lang),
    [saju, astro, lang]
  );

  const timingOverlays = useMemo(
    () => getTimingOverlayAnalysis(saju ?? undefined, astro ?? undefined, lang),
    [saju, astro, lang]
  );

  const relationAspects = useMemo(
    () => getRelationAspectAnalysis(saju ?? undefined, astro ?? undefined, lang),
    [saju, astro, lang]
  );

  const advancedAnalysis = useMemo(
    () => getAdvancedAnalysisResult(saju ?? undefined, astro ?? undefined, lang),
    [saju, astro, lang]
  );

  const extraPoints = useMemo(
    () => getExtraPointAnalysis(saju ?? undefined, astro ?? undefined, lang),
    [saju, astro, lang]
  );

  // Early return if data is null
  if (!data) {
    return <div className="text-gray-400 text-center p-6">Loading...</div>;
  }

  const currentFlow = data.currentFlow as CurrentFlow | null;
  const dayElement = data.dayElement as string | undefined;

  // Extract saju data
  const sajuExt = saju as SajuDataExtended | undefined;
  const dayMaster = sajuExt?.dayMaster?.name ?? sajuExt?.dayMaster?.heavenlyStem ?? sajuExt?.fourPillars?.day?.heavenlyStem ?? "";
  const dayMasterElement = sajuExt?.dayMaster?.element ?? "";
  const daeun = sajuExt?.daeun ?? sajuExt?.bigFortune;
  const currentDaeun = Array.isArray(daeun) ? daeun.find((d) => d.current || d.isCurrent) : null;

  // Extract astrology data
  const planets = astro?.planets as PlanetData[] | undefined;
  const jupiterSign = findPlanetSign(planets, 'jupiter');
  const jupiterHouse = findPlanetHouse(planets, 'jupiter');
  const saturnSign = findPlanetSign(planets, 'saturn');
  const saturnHouse = findPlanetHouse(planets, 'saturn');

  // Calculate fortunes
  const dayMasterName = data.dayMasterName || "";
  const yearFortune = calculateYearFortune({ sajuExt, dayMasterName, dayElement, isKo });
  const monthFortune = calculateMonthFortune({ sajuExt, isKo });
  const todayFortune = calculateTodayFortune({ sajuExt, isKo });

  return (
    <div className="space-y-6">
      {/* Energy Status Summary */}
      <EnergyStatusSection
        dayMaster={dayMaster}
        dayMasterElement={dayMasterElement}
        currentDaeun={currentDaeun ?? null}
        jupiterSign={jupiterSign}
        jupiterHouse={jupiterHouse}
        saturnSign={saturnSign}
        saturnHouse={saturnHouse}
        isKo={isKo}
      />

      {/* Current Flow (Daeun + Seun) */}
      {currentFlow && <CurrentFlowSection currentFlow={currentFlow} />}

      {/* Year Fortune */}
      {yearFortune && (
        <YearFortuneSection
          yearFortune={yearFortune}
          dayMaster={dayMaster}
          isKo={isKo}
        />
      )}

      {/* Month Fortune */}
      {monthFortune && (
        <MonthFortuneSection monthFortune={monthFortune} isKo={isKo} />
      )}

      {/* Today Fortune */}
      {todayFortune && (
        <TodayFortuneSection todayFortune={todayFortune} isKo={isKo} />
      )}

      {/* Life Cycle Section */}
      {matrixAnalysis && matrixAnalysis.lifeCycles.length > 0 && (
        <LifeCycleSection lifeCycles={matrixAnalysis.lifeCycles} isKo={isKo} />
      )}

      {/* Layer 4: Timing Overlay */}
      <TimingOverlaySection timingOverlays={timingOverlays} isKo={isKo} />

      {/* Layer 5: Relation-Aspect */}
      <RelationAspectSection relationAspects={relationAspects} isKo={isKo} />

      {/* Layer 7: Advanced Analysis */}
      <AdvancedAnalysisSection advancedAnalysis={advancedAnalysis} isKo={isKo} />

      {/* Layer 10: Extra Points */}
      <ExtraPointsSection extraPoints={extraPoints} isKo={isKo} />

      {/* AI Premium Report CTA */}
      <PremiumReportCTA section="fortune" />
    </div>
  );
}

export default memo(FortuneTab);
