import type { FC } from 'react';

const ScoreBar: FC<{ label: string; value: number; suffix?: string }> = ({ label, value, suffix }) => (
  <div className="flex items-center gap-2">
    <span className="w-24 text-xs text-gray-400 shrink-0">{label}:</span>
    <div className="flex-1 h-2 bg-slate-700 rounded overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-400 to-yellow-400 rounded transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
    <span className="min-w-[80px] text-right text-sm text-gray-200 shrink-0">
      {value}{suffix ? ` (${suffix})` : ''}
    </span>
  </div>
);

export default ScoreBar;
