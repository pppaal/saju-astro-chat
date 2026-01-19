// src/components/destiny-map/fun-insights/tabs/fortune/components/CurrentFlowSection.tsx
"use client";

import type { CurrentFlow } from '../types';

interface CurrentFlowSectionProps {
  currentFlow: CurrentFlow;
}

export default function CurrentFlowSection({ currentFlow }: CurrentFlowSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-900/30 via-cyan-900/30 to-teal-900/30 border border-blue-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{currentFlow.emoji}</span>
        <h3 className="text-lg font-bold text-blue-300">{currentFlow.title}</h3>
      </div>

      <div className="space-y-3 mb-4">
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <pre className="text-cyan-200 text-sm whitespace-pre-line font-mono">
            {currentFlow.flow}
          </pre>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20">
        <p className="text-sm flex items-start gap-3">
          <span className="text-xl">💡</span>
          <span className="text-cyan-200 leading-relaxed">{currentFlow.advice}</span>
        </p>
      </div>
    </div>
  );
}
