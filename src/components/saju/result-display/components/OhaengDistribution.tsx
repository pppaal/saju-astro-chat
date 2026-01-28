import { useMemo } from 'react';
import { ELEMENT_BAR_COLORS } from '../../constants/elements';

const OHAENG_ELEMENTS = [
  { name: '목', key: 'wood' as const, colorClass: ELEMENT_BAR_COLORS.Wood },
  { name: '화', key: 'fire' as const, colorClass: ELEMENT_BAR_COLORS.Fire },
  { name: '토', key: 'earth' as const, colorClass: ELEMENT_BAR_COLORS.Earth },
  { name: '금', key: 'metal' as const, colorClass: ELEMENT_BAR_COLORS.Metal },
  { name: '수', key: 'water' as const, colorClass: ELEMENT_BAR_COLORS.Water },
] as const;

const OhaengDistribution = ({ ohaengData }: { ohaengData: { [k in 'wood'|'fire'|'earth'|'metal'|'water']: number } }) => {
  const total = useMemo(
    () => Object.values(ohaengData).reduce((s, c) => s + c, 0),
    [ohaengData]
  );

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-600" role="img" aria-label="오행 분포 차트">
      {OHAENG_ELEMENTS.map((el) => {
        const count = ohaengData[el.key] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={el.name} className="flex items-center mb-4 last:mb-0">
            <span className="w-10 text-gray-300">{el.name}</span>
            <div className="flex-1 bg-slate-700 rounded h-5 mr-4 overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-500 ${el.colorClass}`}
                style={{ width: `${percentage}%` }}
                role="progressbar"
                aria-valuenow={count}
                aria-valuemin={0}
                aria-valuemax={total}
              />
            </div>
            <span className="w-5 text-right text-gray-300">{count}</span>
          </div>
        );
      })}
    </div>
  );
};

export default OhaengDistribution;
