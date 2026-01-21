'use client';

import { useState } from 'react';

type ReportTheme = 'love' | 'career' | 'wealth' | 'health' | 'family';

interface ThemedSection {
  key: string;
  title: string;
  content: string;
}

export interface ThemedReportData {
  id: string;
  theme: ReportTheme;
  score: number;
  summary: string;
  deepAnalysis: string;
  patterns: string;
  timing: string;
  compatibility?: string;  // love
  strategy?: string;       // career, wealth
  prevention?: string;     // health
  dynamics?: string;       // family
  actionPlan: string;
  keywords: string[];
  createdAt: string;
}

interface ThemedReportViewProps {
  report: ThemedReportData;
  onDownloadPDF?: () => void;
  onShare?: () => void;
}

const THEME_META: Record<ReportTheme, {
  label: string;
  emoji: string;
  color: string;
  gradientBg: string;
}> = {
  love: {
    label: '사랑 운세',
    emoji: '💕',
    color: 'text-pink-400',
    gradientBg: 'from-pink-500 to-rose-500',
  },
  career: {
    label: '커리어 운세',
    emoji: '💼',
    color: 'text-blue-400',
    gradientBg: 'from-blue-500 to-indigo-500',
  },
  wealth: {
    label: '재물 운세',
    emoji: '💰',
    color: 'text-yellow-400',
    gradientBg: 'from-yellow-500 to-amber-500',
  },
  health: {
    label: '건강 운세',
    emoji: '🏥',
    color: 'text-green-400',
    gradientBg: 'from-green-500 to-emerald-500',
  },
  family: {
    label: '가족 운세',
    emoji: '👨‍👩‍👧‍👦',
    color: 'text-purple-400',
    gradientBg: 'from-purple-500 to-violet-500',
  },
};

export function ThemedReportView({ report, onDownloadPDF, onShare }: ThemedReportViewProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('deepAnalysis');
  const themeMeta = THEME_META[report.theme];

  const getScoreEmoji = (score: number) => {
    if (score >= 80) return '🌟';
    if (score >= 60) return '✨';
    if (score >= 40) return '💫';
    return '🌙';
  };

  // 테마별 특수 섹션 결정
  const getSpecialSection = (): ThemedSection | null => {
    switch (report.theme) {
      case 'love':
        return report.compatibility
          ? { key: 'compatibility', title: '궁합 분석', content: report.compatibility }
          : null;
      case 'career':
      case 'wealth':
        return report.strategy
          ? { key: 'strategy', title: '전략 제안', content: report.strategy }
          : null;
      case 'health':
        return report.prevention
          ? { key: 'prevention', title: '예방 가이드', content: report.prevention }
          : null;
      case 'family':
        return report.dynamics
          ? { key: 'dynamics', title: '가족 역학', content: report.dynamics }
          : null;
      default:
        return null;
    }
  };

  const sections: ThemedSection[] = [
    { key: 'deepAnalysis', title: '심층 분석', content: report.deepAnalysis },
    { key: 'patterns', title: '패턴 분석', content: report.patterns },
    { key: 'timing', title: '타이밍 분석', content: report.timing },
  ];

  const specialSection = getSpecialSection();
  if (specialSection) {
    sections.push(specialSection);
  }

  sections.push({ key: 'actionPlan', title: '실천 가이드', content: report.actionPlan });

  const toggleSection = (key: string) => {
    setExpandedSection(expandedSection === key ? null : key);
  };

  return (
    <div className="space-y-6">
      {/* Theme Header */}
      <div className={`bg-gradient-to-r ${themeMeta.gradientBg} rounded-2xl p-6 shadow-lg`}>
        <div className="flex items-center gap-4">
          <div className="text-5xl">{themeMeta.emoji}</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{themeMeta.label}</h2>
            <p className="text-white/80 text-sm mt-1">
              AI 기반 심층 분석 리포트
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl">{getScoreEmoji(report.score)}</div>
            <p className="text-white font-bold text-xl">{report.score}점</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h3 className="text-lg font-bold text-white mb-3">핵심 요약</h3>
        <p className="text-gray-300 leading-relaxed">{report.summary}</p>

        {/* Keywords */}
        {report.keywords && report.keywords.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {report.keywords.map((keyword, index) => (
              <span
                key={index}
                className={`px-3 py-1 rounded-full ${themeMeta.color} bg-white/10 text-sm`}
              >
                #{keyword}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Accordion Sections */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.key}
            className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
          >
            <button
              onClick={() => toggleSection(section.key)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
            >
              <h3 className="text-lg font-bold text-white">{section.title}</h3>
              <span
                className={`text-gray-400 transition-transform duration-200 ${
                  expandedSection === section.key ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>
            {expandedSection === section.key && (
              <div className="px-5 pb-5">
                <div className="pt-2 border-t border-slate-700/50">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line mt-3">
                    {section.content}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-700/50">
        {onDownloadPDF && (
          <button
            onClick={onDownloadPDF}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            📄 PDF 다운로드
          </button>
        )}
        {onShare && (
          <button
            onClick={onShare}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            🔗 공유하기
          </button>
        )}
      </div>

      {/* Created At */}
      <p className="text-gray-500 text-sm text-center">
        생성일: {new Date(report.createdAt).toLocaleDateString('ko-KR')}
      </p>
    </div>
  );
}
