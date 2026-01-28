import type { ReactNode, FC } from 'react';

const AnalysisCard: FC<{ title: string; colorClass: string; children: ReactNode }> = ({ title, colorClass, children }) => (
  <div className={`bg-slate-800 p-4 rounded-xl border flex-1 min-w-[280px] ${colorClass.split(' ')[0]}`}>
    <h4 className={`text-base font-semibold mb-3 pb-2 border-b border-current/30 ${colorClass.split(' ')[1] || colorClass}`}>
      {title}
    </h4>
    {children}
  </div>
);

export default AnalysisCard;
