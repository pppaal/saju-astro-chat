"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { analyzePersona } from "@/lib/persona/analysis";
import type { PersonaAnalysis, PersonaQuizAnswers } from "@/lib/persona/types";

interface Props {
  lang?: string;
  compact?: boolean;
  className?: string;
}

export default function PersonalityInsight({ lang = "ko", compact = false, className = "" }: Props) {
  const [analysis, setAnalysis] = useState<PersonaAnalysis | null>(null);
  const [mounted, setMounted] = useState(false);
  const isKo = lang === "ko";

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("personaQuizAnswers")
        ?? localStorage.getItem("auraQuizAnswers")
        ?? localStorage.getItem("aura_answers");

      if (raw) {
        const parsed = JSON.parse(raw) as PersonaQuizAnswers;
        if (Object.keys(parsed).length > 0) {
          const result = analyzePersona(parsed, lang);
          setAnalysis(result);
        }
      }
    } catch {
      // ignore
    }
  }, [lang]);

  if (!mounted) {
    return null;
  }

  // No personality result - show CTA to take the test
  if (!analysis) {
    return (
      <div className={`bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧬</span>
            <div>
              <div className="text-indigo-300 text-sm font-medium">
                {isKo ? "나의 성격 유형을 알아보세요" : "Discover Your Personality Type"}
              </div>
              <div className="text-gray-400 text-xs">
                {isKo ? "노바 페르소나 테스트로 더 깊은 인사이트를 얻으세요" : "Get deeper insights with Nova Persona test"}
              </div>
            </div>
          </div>
          <Link
            href="/personality"
            className="px-4 py-2 bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-300 text-sm rounded-lg transition-colors whitespace-nowrap"
          >
            {isKo ? "테스트 하기" : "Take Test"}
          </Link>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/20 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <div className="text-purple-300 text-sm font-medium">
                {isKo ? "나의 노바 페르소나" : "My Nova Persona"}
              </div>
              <div className="text-white font-bold">{analysis.personaName}</div>
              <div className="text-gray-400 text-xs font-mono">{analysis.typeCode}</div>
            </div>
          </div>
          <Link
            href="/personality/result"
            className="text-purple-400 text-sm hover:text-purple-300 transition-colors"
          >
            {isKo ? "자세히 →" : "Details →"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-8 ${className}`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <span className="text-indigo-400 text-sm font-medium">
          {isKo ? "✨ 나의 성격 유형" : "✨ My Personality Type"}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      </div>

      <div className="bg-gradient-to-br from-slate-900/50 to-indigo-900/30 border border-indigo-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-xl">✨</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-white text-lg font-bold">{analysis.personaName}</h3>
              <span className="px-2 py-0.5 bg-indigo-500/30 rounded text-indigo-300 text-xs font-mono">{analysis.typeCode}</span>
            </div>
            <p className="text-gray-300 text-sm">{analysis.summary}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {(["energy", "cognition", "decision", "rhythm"] as const).map((axis) => {
            const result = analysis.axes[axis];
            const labels: Record<string, { ko: { n: string; l: string; r: string }; en: { n: string; l: string; r: string } }> = {
              energy: { ko: { n: "에너지", l: "내향", r: "발산" }, en: { n: "Energy", l: "Grounded", r: "Radiant" } },
              cognition: { ko: { n: "인지", l: "구조", r: "비전" }, en: { n: "Cognition", l: "Structured", r: "Visionary" } },
              decision: { ko: { n: "결정", l: "공감", r: "논리" }, en: { n: "Decision", l: "Empathic", r: "Logic" } },
              rhythm: { ko: { n: "리듬", l: "안정", r: "유동" }, en: { n: "Rhythm", l: "Anchor", r: "Flow" } },
            };
            const label = isKo ? labels[axis].ko : labels[axis].en;
            return (
              <div key={axis} className="bg-white/5 rounded-lg p-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{label.n}</span>
                  <span className="text-indigo-300">{result.score}%</span>
                </div>
                <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${result.score}%` }} />
                </div>
                <div className="flex justify-between text-[10px] mt-1 text-gray-500">
                  <span>{label.l}</span>
                  <span>{label.r}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <h4 className="text-indigo-400 text-xs font-medium mb-2">{isKo ? "💪 강점" : "💪 Strengths"}</h4>
            <div className="flex flex-wrap gap-1">
              {analysis.strengths.slice(0, 3).map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-indigo-400 text-xs font-medium mb-2">{isKo ? "⚡ 성장점" : "⚡ Growth"}</h4>
            <div className="flex flex-wrap gap-1">
              {analysis.challenges.slice(0, 3).map((c, i) => (
                <span key={i} className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded">{c}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-indigo-400 text-xs font-medium mb-2">{isKo ? "🎯 핵심 동기" : "🎯 Key Motivations"}</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.keyMotivations.map((m, i) => (
              <span key={i} className="px-2 py-1 bg-indigo-500/20 text-indigo-200 text-xs rounded-lg">{m}</span>
            ))}
          </div>
        </div>

        <div className="bg-purple-900/20 rounded-xl p-3 mb-4">
          <p className="text-gray-300 text-sm">{analysis.guidance}</p>
        </div>

        <div className="text-center">
          <Link href="/personality/result" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm rounded-lg transition-colors">
            {isKo ? "전체 결과 보기 →" : "View Full Results →"}
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 mt-3">
        {isKo ? "* 성격 유형과 운세를 함께 보면 더 깊은 통찰을 얻을 수 있습니다" : "* Combine personality with fortune for deeper insights"}
      </p>
    </div>
  );
}
