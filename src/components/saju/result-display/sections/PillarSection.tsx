'use client';

import type { FC } from 'react';
import type { PillarData } from '../../../../lib/Saju';
import { Section, PillarBox } from '../components';
import PillarSummaryTable from '../../PillarSummaryTable';
import { buildPillarView } from '../../../../adapters/map-12';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  yearPillar: PillarData;
  monthPillar: PillarData;
  dayPillar: PillarData;
  timePillar: PillarData;
  dayMasterDisplay: { name: string; element: string };
  tableByPillar?: unknown;
}

const PillarSection: FC<Props> = ({
  yearPillar, monthPillar, dayPillar, timePillar,
  dayMasterDisplay, tableByPillar,
}) => {
  const { t } = useI18n();

  return (
  <Section title="사주 명식 (Four Pillars)">
    <div className="grid grid-cols-[64px_1fr] gap-x-3 bg-slate-800 p-3.5 rounded-xl border border-slate-600">
      {/* Rail labels */}
      <div className="grid grid-rows-[28px_56px_8px_56px_12px] items-center justify-items-start">
        <div className="h-full" />
        <span className="h-7 inline-flex items-center justify-center px-2.5 rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-blue-300">
          {t("saju.stem")}
        </span>
        <div className="h-2" />
        <span className="h-7 inline-flex items-center justify-center px-2.5 rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-amber-300">
          {t("saju.branch")}
        </span>
        <div className="h-full" />
      </div>

      {/* Pillars */}
      <div className="grid grid-cols-4 justify-items-center items-start gap-4">
        <PillarBox title="시주" heavenlyStem={timePillar.heavenlyStem} earthlyBranch={timePillar.earthlyBranch} />
        <PillarBox title="일주" heavenlyStem={dayPillar.heavenlyStem} earthlyBranch={dayPillar.earthlyBranch} />
        <PillarBox title="월주" heavenlyStem={monthPillar.heavenlyStem} earthlyBranch={monthPillar.earthlyBranch} />
        <PillarBox title="연주" heavenlyStem={yearPillar.heavenlyStem} earthlyBranch={yearPillar.earthlyBranch} />
      </div>
    </div>

    <PillarSummaryTable
      data={buildPillarView(tableByPillar as unknown as Parameters<typeof buildPillarView>[0])}
    />

    <p className="text-center mt-4 text-base text-gray-400">
      당신의 일간(日干)은{' '}
      <span className="text-amber-500 font-bold">
        {dayMasterDisplay.name}{' '}
        ({dayMasterDisplay.element})
      </span>{' '}
      입니다.
    </p>
  </Section>
  );
};

export default PillarSection;
