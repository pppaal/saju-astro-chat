import type { HealthStory, HealthItem } from './types';

interface HealthCheckPointsProps {
  healthStory: HealthStory;
  healthAnalysis: HealthItem[] | null;
  isKo: boolean;
}

export default function HealthCheckPoints({ healthStory, healthAnalysis, isKo }: HealthCheckPointsProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-red-900/20 border border-red-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">💪</span>
        <h3 className="text-lg font-bold text-red-300">{isKo ? "건강 체크 포인트" : "Health Check Points"}</h3>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-300 font-bold mb-2 text-sm">🎯 {isKo ? "관리가 필요한 부위" : "Areas Needing Care"}</p>
          <p className="text-gray-200 text-sm leading-relaxed">{healthStory.focus}</p>
        </div>

        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <p className="text-orange-300 font-bold mb-2 text-sm">⚠️ {isKo ? "이럴 때 조심하세요" : "Watch Out For This"}</p>
          <p className="text-gray-300 text-sm leading-relaxed">{healthStory.warning}</p>
        </div>

        {healthAnalysis && healthAnalysis.length > 0 && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-purple-300 font-bold mb-3 text-sm">🔮 {isKo ? "오행 불균형에 따른 주의점" : "Element Imbalance Effects"}</p>
            <div className="space-y-2">
              {healthAnalysis.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">{item.emoji}</span>
                  <div>
                    <span className="text-purple-300 text-sm font-medium">{item.organ}:</span>
                    <span className="text-gray-300 text-sm ml-1">{item.advice}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-green-300 font-bold mb-2 text-sm">💚 {isKo ? "건강하게 사는 법" : "Healthy Living Tips"}</p>
          <p className="text-gray-300 text-sm leading-relaxed">{healthStory.lifestyle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-cyan-300 font-bold mb-2 text-sm">🏃 {isKo ? "추천 운동" : "Recommended Exercise"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{healthStory.exercise}</p>
          </div>
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-yellow-300 font-bold mb-2 text-sm">🍎 {isKo ? "좋은 음식" : "Good Foods"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{healthStory.food}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
          <p className="text-sm flex items-start gap-3">
            <span className="text-xl">🧘</span>
            <span className="text-blue-200 leading-relaxed">{healthStory.stress}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
