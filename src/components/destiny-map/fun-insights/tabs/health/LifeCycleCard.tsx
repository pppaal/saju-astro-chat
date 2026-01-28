import type { HealthMatrixResult } from '../../analyzers/matrixAnalyzer';

interface LifeCycleCardProps {
  lifeCycleStage: NonNullable<HealthMatrixResult['lifeCycleStage']>;
  isKo: boolean;
}

export default function LifeCycleCard({ lifeCycleStage, isKo }: LifeCycleCardProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-cyan-900/20 border border-cyan-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🔄</span>
        <h3 className="text-lg font-bold text-cyan-300">
          {isKo ? "현재 생명력 사이클" : "Current Life Cycle Stage"}
        </h3>
      </div>

      <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-cyan-400">
            {lifeCycleStage.stage}
          </span>
          <div className="flex items-center gap-1">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-4 rounded-sm ${
                  i < lifeCycleStage.vitalityLevel ? 'bg-cyan-400' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>
        <p className="text-gray-300 text-sm mb-2">
          {isKo ? lifeCycleStage.description.ko : lifeCycleStage.description.en}
        </p>
        <p className="text-cyan-200 text-sm">💡 {lifeCycleStage.advice}</p>
      </div>
    </div>
  );
}
