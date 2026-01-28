import type { FC } from 'react';

const PILLAR_LABEL_MAP: Record<'year'|'month'|'day'|'time', string> = {
  time: '시지', day: '일지', month: '월지', year: '연지'
};

const RelationsPanel: FC<{ relations?: { kind: string; pillars: ('year'|'month'|'day'|'time')[]; detail?: string }[] }> = ({ relations }) => {
  if (!relations || relations.length === 0) {
    return <div className="text-slate-400">표시할 합·충 정보가 없습니다.</div>;
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-slate-800 border border-slate-600 rounded-xl p-3"
      role="list"
      aria-label="합충 관계 목록"
    >
      {relations.map((r, i) => (
        <div
          key={i}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5"
          role="listitem"
        >
          <div className="font-extrabold text-yellow-400 mb-1.5">{r.kind}</div>
          <div className="text-sm text-slate-300">{r.pillars.map((p) => PILLAR_LABEL_MAP[p]).join(' · ')}</div>
          {r.detail && <div className="mt-1.5 text-xs text-slate-400">{r.detail}</div>}
        </div>
      ))}
    </div>
  );
};

export default RelationsPanel;
