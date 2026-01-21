'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface ReportSection {
  title: string;
  content: string;
}

interface ReportData {
  id: string;
  type: 'timing' | 'themed' | 'comprehensive';
  title: string;
  summary: string;
  createdAt: string;
  period?: string;
  theme?: string;
  score?: number;
  sections: ReportSection[];
  keywords?: string[];
}

export default function ReportResultPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();

  const reportId = params.id as string;
  const reportType = searchParams.get('type') || 'comprehensive';

  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // 리포트 데이터 로드 (실제로는 API에서 가져옴)
    // 여기서는 URL 파라미터로 전달된 리포트 ID를 사용하여 로컬 스토리지 또는 API에서 조회
    const loadReport = async () => {
      try {
        // TODO: 실제 API 호출로 대체
        // const response = await fetch(`/api/reports/${reportId}`);
        // const data = await response.json();

        // 임시: 세션 스토리지에서 리포트 데이터 로드
        const storedReport = sessionStorage.getItem(`report_${reportId}`);
        if (storedReport) {
          setReport(JSON.parse(storedReport));
        } else {
          // 데모 데이터 (실제로는 API에서 가져옴)
          setReport({
            id: reportId,
            type: reportType as 'timing' | 'themed' | 'comprehensive',
            title: getReportTitle(reportType),
            summary: '사주 분석 결과, 현재 시기는 전체적으로 긍정적인 에너지가 흐르고 있습니다.',
            createdAt: new Date().toISOString(),
            score: 78,
            sections: getDemoSections(reportType),
            keywords: ['목 에너지', '상승 운기', '인내심', '새로운 시작'],
          });
        }
      } catch (err) {
        setError('리포트를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, [reportId, reportType, status, router]);

  const getReportTitle = (type: string): string => {
    switch (type) {
      case 'timing':
        return '타이밍 운세 리포트';
      case 'themed':
        return '테마별 심화 리포트';
      default:
        return '종합 운세 리포트';
    }
  };

  const getDemoSections = (type: string): ReportSection[] => {
    // 실제로는 API에서 받아온 데이터 사용
    return [
      {
        title: '총평',
        content: '현재 시기의 전반적인 에너지 흐름을 분석한 결과입니다. 사주 원국의 목(木) 에너지가 강하게 작용하고 있으며, 이는 새로운 시작과 성장의 기운을 나타냅니다.',
      },
      {
        title: '에너지 분석',
        content: '올해의 세운과 본인의 사주가 상생 관계에 있어, 전반적으로 운기가 상승하는 시기입니다. 특히 인간관계와 커리어 방면에서 좋은 기회가 찾아올 수 있습니다.',
      },
      {
        title: '기회 시기',
        content: '3월과 7월에 중요한 전환점이 예상됩니다. 이 시기에는 적극적으로 새로운 도전을 시도해보시는 것이 좋겠습니다.',
      },
      {
        title: '주의 사항',
        content: '건강 관리에 특히 신경 써야 할 시기입니다. 무리한 일정은 피하고, 충분한 휴식을 취하시기 바랍니다.',
      },
      {
        title: '실천 가이드',
        content: '1. 아침 명상이나 가벼운 운동으로 하루를 시작하세요.\n2. 중요한 결정은 오전에 내리는 것이 유리합니다.\n3. 주변 사람들과의 소통을 늘려보세요.',
      },
    ];
  };

  const handleDownloadPDF = async () => {
    // TODO: PDF 다운로드 구현
    alert('PDF 다운로드 기능은 준비 중입니다.');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: report?.title,
          text: report?.summary,
          url: window.location.href,
        });
      } catch {
        // 사용자가 공유를 취소한 경우
      }
    } else {
      // 클립보드에 복사
      await navigator.clipboard.writeText(window.location.href);
      alert('링크가 복사되었습니다.');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">리포트 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || '리포트를 찾을 수 없습니다.'}</p>
          <Link href="/premium-reports" className="text-purple-400 hover:text-purple-300">
            리포트 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="py-8 px-4 border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/premium-reports"
            className="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1"
          >
            ← 리포트 목록으로
          </Link>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{report.title}</h1>
              <p className="text-gray-400 text-sm mt-1">
                생성일: {new Date(report.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm flex items-center gap-2"
              >
                📄 PDF 다운로드
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm flex items-center gap-2"
              >
                🔗 공유하기
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Score Card */}
      {report.score && (
        <div className="max-w-4xl mx-auto px-4 -mt-6">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">오늘의 운세 점수</p>
                <p className="text-4xl font-bold text-white">{report.score}점</p>
              </div>
              <div className="text-6xl">
                {report.score >= 80 ? '🌟' : report.score >= 60 ? '✨' : '💫'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-bold text-white mb-3">핵심 요약</h2>
          <p className="text-gray-300">{report.summary}</p>

          {report.keywords && report.keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {report.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section Navigation */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
          {report.sections.map((section, index) => (
            <button
              key={index}
              onClick={() => setActiveSection(index)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeSection === index
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>
      </div>

      {/* Section Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-xl font-bold text-white mb-4">
            {report.sections[activeSection].title}
          </h2>
          <div className="text-gray-300 whitespace-pre-line leading-relaxed">
            {report.sections[activeSection].content}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setActiveSection((prev) => Math.max(0, prev - 1))}
            disabled={activeSection === 0}
            className={`px-4 py-2 rounded-lg ${
              activeSection === 0
                ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            ← 이전
          </button>
          <button
            onClick={() =>
              setActiveSection((prev) => Math.min(report.sections.length - 1, prev + 1))
            }
            disabled={activeSection === report.sections.length - 1}
            className={`px-4 py-2 rounded-lg ${
              activeSection === report.sections.length - 1
                ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            다음 →
          </button>
        </div>
      </main>
    </div>
  );
}
