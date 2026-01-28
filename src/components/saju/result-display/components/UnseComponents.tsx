import { useCallback, type FC, type ReactNode } from 'react';
import {
  ELEMENT_COLOR_CLASSES,
  getElementOfChar,
} from '../../constants/elements';

type GanjiValue = string | { name: string } | null | undefined;

function getGanjiName(val: GanjiValue): string {
  if (typeof val === 'string') {return val;}
  if (val && typeof val === 'object' && 'name' in val) {return val.name;}
  return '';
}

export const UnseFlowContainer: FC<{ children: ReactNode; 'aria-label'?: string }> = ({ children, 'aria-label': ariaLabel }) => (
  <div
    className="flex overflow-x-auto py-4 px-2 bg-slate-800 rounded-xl border border-slate-600"
    role="listbox"
    aria-label={ariaLabel}
  >
    {children}
  </div>
);

interface UnsePillarProps<T> {
  topText: string;
  topSubText: string | object;
  cheon: GanjiValue;
  ji: GanjiValue;
  bottomSubText: string | object;
  onClick?: (item: T) => void;
  item?: T;
  isSelected?: boolean;
}

export function UnsePillar<T>({
  topText, topSubText, cheon, ji, bottomSubText, onClick, item, isSelected,
}: UnsePillarProps<T>) {
  const cheonStr = getGanjiName(cheon);
  const jiStr = getGanjiName(ji);
  const topSubStr = typeof topSubText === 'string' ? topSubText : String(topSubText ?? '');
  const bottomSubStr = typeof bottomSubText === 'string' ? bottomSubText : String(bottomSubText ?? '');

  const topEl = getElementOfChar(cheonStr);
  const bottomEl = getElementOfChar(jiStr);

  const handleClick = useCallback(() => {
    if (onClick && item !== undefined) {
      onClick(item);
    }
  }, [onClick, item]);

  return (
    <button
      type="button"
      className={`flex-none w-16 text-center px-1 py-1.5 rounded-lg transition-all duration-200
        ${isSelected
          ? 'bg-blue-500/20 border border-blue-500'
          : 'border border-transparent hover:bg-white/5'
        }
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      onClick={handleClick}
      role="option"
      aria-selected={isSelected}
      aria-label={`${topText} ${cheonStr}${jiStr}`}
    >
      <div className="text-xs text-gray-400 whitespace-nowrap">{topText}</div>
      <div className="text-xs text-gray-500 h-5 flex items-center justify-center">{topSubStr}</div>
      <div
        className={`py-2.5 text-lg font-bold rounded text-white border-b border-slate-700 ${
          topEl ? ELEMENT_COLOR_CLASSES[topEl] : 'bg-slate-700'
        }`}
      >
        {cheonStr}
      </div>
      <div
        className={`py-2.5 text-lg font-bold rounded text-white ${
          bottomEl ? ELEMENT_COLOR_CLASSES[bottomEl] : 'bg-slate-700'
        }`}
      >
        {jiStr}
      </div>
      <div className="text-xs text-gray-500 h-5 flex items-center justify-center">{bottomSubStr}</div>
    </button>
  );
}
