import type { TabProps } from '../types';
import { elementTraits } from '../../data';

interface EnergyBalanceSectionProps {
  data: NonNullable<TabProps['data']>;
  isKo: boolean;
}

export default function EnergyBalanceSection({ data, isKo }: EnergyBalanceSectionProps) {
  if (!data.normalizedElements || data.normalizedElements.length === 0) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-purple-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">⚖️</span>
        <h3 className="text-lg font-bold text-purple-300">{isKo ? "내 에너지 균형" : "My Energy Balance"}</h3>
      </div>

      {/* 오행 바 차트 */}
      <div className="space-y-3 mb-4">
        {data.normalizedElements.map((item) => {
          const t = elementTraits[item.element];
          const isStrong = item.element === data.strongest?.[0];
          const isWeak = item.element === data.weakest?.[0];
          return (
            <div key={item.element} className="flex items-center gap-3">
              <span className="w-8 text-xl text-center flex-shrink-0">{t?.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isStrong ? 'text-green-400' : isWeak ? 'text-amber-400' : 'text-gray-300'}`}>
                    {isKo ? t?.ko : t?.en}
                    {isStrong && <span className="ml-2 text-xs">{isKo ? "강점" : "strong"}</span>}
                    {isWeak && <span className="ml-2 text-xs">{isKo ? "보완" : "boost"}</span>}
                  </span>
                  <span className="text-sm font-bold" style={{ color: t?.color }}>{item.value}%</span>
                </div>
                <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${item.value}%`,
                      backgroundColor: t?.color,
                      boxShadow: `0 0 8px ${t?.color}`
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 보완 팁 */}
      {data.luckyItems && data.luckyItems.length > 0 && data.weakest?.[0] && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <p className="text-purple-300 font-bold mb-2 flex items-center gap-2">
            <span>{elementTraits[data.weakest[0]]?.emoji}</span>
            {isKo ? `이걸로 균형 맞추세요` : `Balance with these`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {data.luckyItems.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <span className="text-lg">{item.item.split(" ")[0]}</span>
                <span className="text-gray-300 text-xs">{item.item.replace(/^[^\s]+\s/, "")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
