import type { PillarData } from '../../../../lib/Saju';
import {
  ELEMENT_COLOR_CLASSES,
  getElementOfChar,
} from '../../constants/elements';

const PillarBox = ({
  title,
  heavenlyStem,
  earthlyBranch,
}: {
  title: string;
  heavenlyStem: PillarData['heavenlyStem'];
  earthlyBranch: PillarData['earthlyBranch'];
}) => {
  const stemName = typeof heavenlyStem === 'string' ? heavenlyStem : (heavenlyStem?.name ?? '');
  const stemSibsin = typeof heavenlyStem === 'string' ? '' : (heavenlyStem?.sibsin ?? '');
  const branchName = typeof earthlyBranch === 'string' ? earthlyBranch : (earthlyBranch?.name ?? '');
  const branchSibsin = typeof earthlyBranch === 'string' ? '' : (earthlyBranch?.sibsin ?? '');

  const stemEl = getElementOfChar(stemName);
  const branchEl = getElementOfChar(branchName);

  return (
    <div className="text-center flex flex-col items-center" role="group" aria-label={`${title} 기둥`}>
      <div className="text-sm text-slate-400 mb-1">{title}</div>
      <div className="text-xs text-gray-500 h-5 flex items-center justify-center">{String(stemSibsin)}</div>
      <div
        className={`w-14 h-14 flex items-center justify-center text-2xl font-extrabold text-white rounded-xl shadow-lg ${
          stemEl ? ELEMENT_COLOR_CLASSES[stemEl] : 'bg-blue-500'
        }`}
        aria-label={`천간: ${stemName}`}
      >
        {String(stemName)}
      </div>
      <div className="h-2" />
      <div
        className={`w-14 h-14 flex items-center justify-center text-2xl font-extrabold text-white rounded-xl shadow-lg ${
          branchEl ? ELEMENT_COLOR_CLASSES[branchEl] : 'bg-amber-500'
        }`}
        aria-label={`지지: ${branchName}`}
      >
        {String(branchName)}
      </div>
      <div className="text-xs text-gray-500 mt-1.5 h-5 flex items-center justify-center">{String(branchSibsin)}</div>
    </div>
  );
};

export default PillarBox;
