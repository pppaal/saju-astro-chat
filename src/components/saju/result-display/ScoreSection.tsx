import React from 'react';
import type { ComprehensiveScore } from '@/lib/Saju/saju-result.types';

interface ScoreSectionProps {
  score: ComprehensiveScore;
}

export function ScoreSection({ score }: ScoreSectionProps) {
  return (
    <div className="flex flex-col gap-6 bg-slate-800 p-6 rounded-xl border border-slate-600">
      {/* Total Score Box */}
      <div className="text-center p-4 bg-gradient-to-br from-blue-500/15 to-yellow-500/15 rounded-xl">
        <div className="text-sm text-gray-400 mb-2">종합 점수</div>
        <div className="text-4xl font-extrabold text-yellow-400">{score.overall ?? '-'}</div>
        {score.grade && <div className="text-base text-blue-400 mt-1">{score.grade}등급</div>}
      </div>

      {/* Score Breakdown */}
      <div className="flex flex-col gap-3" role="list" aria-label="점수 상세">
        {score.strength && (
          <ScoreBar
            label="신강/신약"
            value={score.strength.total || 0}
            suffix={score.strength.level}
          />
        )}

        {score.geokguk && (
          <>
            <ScoreBar label="격국 순수도" value={score.geokguk.purity || 0} />
            <ScoreBar label="격국 안정도" value={score.geokguk.stability || 0} />
          </>
        )}

        {score.yongsin && (
          <ScoreBar label="용신 적합도" value={score.yongsin.fitScore || 0} />
        )}
      </div>

      {/* Summary */}
      {score.summary && (
        <p className="text-xs text-slate-400 leading-relaxed p-2 bg-white/[0.03] rounded-md mt-4">
          {score.summary}
        </p>
      )}

      {/* Strengths */}
      {score.strengths && score.strengths.length > 0 && (
        <div className="mt-3">
          <span className="block text-gray-400 text-sm mb-1">강점:</span>
          <ul className="list-disc pl-5 text-emerald-400 text-sm" role="list">
            {score.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {score.weaknesses && score.weaknesses.length > 0 && (
        <div className="mt-2">
          <span className="block text-gray-400 text-sm mb-1">약점:</span>
          <ul className="list-disc pl-5 text-red-400 text-sm" role="list">
            {score.weaknesses.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {score.recommendations && score.recommendations.length > 0 && (
        <div className="mt-2">
          <span className="block text-gray-400 text-sm mb-1">추천:</span>
          <ul className="list-disc pl-5 text-yellow-400 text-sm" role="list">
            {score.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  value: number;
  suffix?: string;
}

function ScoreBar({ label, value, suffix }: ScoreBarProps) {
  return (
    <div className="flex items-center gap-2" role="listitem">
      <span className="w-24 text-xs text-gray-400 shrink-0">{label}:</span>
      <div
        className="flex-1 h-2 bg-slate-700 rounded overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} ${value}점`}
      >
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
}
