'use client';

// src/app/destiny-matrix/viewer/MatrixViewer.tsx
// Destiny Fusion Matrix™ - Protected Summary Viewer
// © 2024 All Rights Reserved. Proprietary Technology.

import { useState, useEffect } from 'react';
import styles from './viewer.module.css';

interface ReportResult {
  success: boolean;
  report?: {
    overallScore: {
      total: number;
      grade: string;
      dataCompleteness?: number;
      insightCount?: number;
    };
    topInsights?: Array<{ title: string; score: number; layer: number }>;
    domainAnalysis?: Array<{ domain: string; score: number; hasData: boolean }>;
  };
  error?: { message: string };
}

interface MatrixSummary {
  name: string;
  version: string;
  copyright: string;
  layers: Array<{ layer: number; name: string; nameKo: string; cells: number }>;
  totalCells: number;
  interactionLevels: Array<{ level: string; meaning: string; scoreRange: string }>;
  notice: string;
}

const LAYER_DESCRIPTIONS: Record<number, { descriptionKo: string; rowLabel: string; colLabel: string }> = {
  1: { descriptionKo: '동양 오행(목화토금수)과 서양 4원소(불,흙,공기,물)의 상호작용을 정의합니다.', rowLabel: '오행', colLabel: '서양 4원소' },
  2: { descriptionKo: '십신(비견,겁재,식신 등 10종)과 행성(태양,달,수성 등 10개)의 역할 조합입니다.', rowLabel: '십신', colLabel: '행성' },
  3: { descriptionKo: '십신이 12하우스(자아,재물,소통 등)에서 어떻게 발현되는지 정의합니다.', rowLabel: '십신', colLabel: '12하우스' },
  4: { descriptionKo: '대운/세운/월운/일운과 행성 트랜짓의 타이밍 조합입니다. 역행 영향도 포함됩니다.', rowLabel: '운(運) 주기', colLabel: '트랜짓 주기' },
  5: { descriptionKo: '지지 관계(삼합,육합,충,형 등)와 행성 애스펙트(합,삼분,사분 등)의 유사성을 매핑합니다.', rowLabel: '지지 관계', colLabel: '애스펙트' },
  6: { descriptionKo: '십이운성(장생,목욕,관대 등)이 12하우스에서 어떤 생명력을 가지는지 정의합니다.', rowLabel: '십이운성', colLabel: '12하우스' },
  7: { descriptionKo: '격국(19종)과 용신(5행)을 프로그레션/리턴과 연결하여 심화 분석합니다.', rowLabel: '격국/용신', colLabel: '프로그레션' },
  8: { descriptionKo: '34개 신살(천을귀인,역마,문창귀인 등)이 행성 에너지와 어떻게 공명하는지 정의합니다.', rowLabel: '신살', colLabel: '행성' },
  9: { descriptionKo: '4대 소행성(세레스,팔라스,주노,베스타)이 하우스와 오행에서 어떻게 작용하는지 정의합니다.', rowLabel: '소행성', colLabel: '하우스/오행' },
  10: { descriptionKo: 'Chiron, Lilith, North/South Node 등 특수 포인트와 오행/십신의 연결입니다.', rowLabel: '엑스트라포인트', colLabel: '오행/십신' },
};

const LEVEL_INFO = {
  extreme: { bg: 'linear-gradient(135deg, #9333ea, #7c3aed)', text: '#fff', label: '극강 시너지', icon: '💥', score: '9-10' },
  amplify: { bg: 'linear-gradient(135deg, #22c55e, #16a34a)', text: '#fff', label: '증폭/강화', icon: '🚀', score: '7-8' },
  balance: { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', text: '#fff', label: '균형/안정', icon: '⚖️', score: '5-6' },
  clash: { bg: 'linear-gradient(135deg, #eab308, #ca8a04)', text: '#000', label: '충돌/주의', icon: '⚡', score: '3-4' },
  conflict: { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', text: '#fff', label: '갈등/위험', icon: '❌', score: '1-2' },
};

const TEST_DATA = {
  minimal: {
    label: '최소 데이터',
    data: { dayMasterElement: '목', lang: 'ko' }
  },
  basic: {
    label: '기본 데이터',
    data: { dayMasterElement: '목', geokguk: 'jeonggwan', lang: 'ko' }
  },
  full: {
    label: '풀 데이터',
    data: {
      dayMasterElement: '목',
      geokguk: 'jeonggwan',
      yongsin: '화',
      sibsinDistribution: { '정관': 2, '정인': 1, '식신': 1 },
      shinsalList: ['천을귀인', '역마', '문창귀인'],
      planetHouses: { Sun: 10, Moon: 4, Mercury: 9 },
      dominantWesternElement: 'fire',
      lang: 'ko'
    }
  }
};

export default function MatrixViewer() {
  const [summary, setSummary] = useState<MatrixSummary | null>(null);
  const [activeLayer, setActiveLayer] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/destiny-matrix');
      if (!res.ok) {throw new Error('매트릭스 요약을 불러오지 못했어요.');}
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      const looksKorean = /[가-힣]/.test(raw);
      setError(looksKorean ? raw : '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const testReport = async (testType: keyof typeof TEST_DATA) => {
    setReportLoading(true);
    try {
      const res = await fetch('/api/destiny-matrix/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_DATA[testType].data),
      });
      const data = await res.json();
      setReportResult(data);
      setShowReport(true);
    } catch {
      setReportResult({ success: false, error: { message: 'Request failed' } });
      setShowReport(true);
    } finally {
      setReportLoading(false);
    }
  };

  const activeInfo = summary?.layers.find(l => l.layer === activeLayer);
  const layerDesc = LAYER_DESCRIPTIONS[activeLayer];

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⚛️</span>
          <h1>Destiny Fusion Matrix™</h1>
        </div>
        <p className={styles.subtitle}>사주 × 점성술 융합 해석 시스템</p>

        <div className={styles.headerStats}>
          <div className={styles.headerStat}>
            <span>{summary?.layers.length || 10}</span> Layers
          </div>
          <div className={styles.headerStat}>
            <span>{summary?.totalCells?.toLocaleString() || '1,206'}</span> Cells
          </div>
          <div className={styles.headerStat}>
            <span>5</span> Levels
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.reportBtns}>
          <span className={styles.reportLabel}>리포트 테스트:</span>
          {Object.entries(TEST_DATA).map(([key, val]) => (
            <button
              key={key}
              className={styles.reportBtn}
              onClick={() => testReport(key as keyof typeof TEST_DATA)}
              disabled={reportLoading}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report Result Modal */}
      {showReport && reportResult && (
        <div className={styles.modal} onClick={() => setShowReport(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowReport(false)}>×</button>
            <h3>리포트 테스트 결과</h3>
            {reportResult.success ? (
              <div className={styles.reportResult}>
                <div className={styles.reportScore}>
                  <span className={styles.scoreNum}>{reportResult.report?.overallScore.total}</span>
                  <span className={styles.scoreGrade}>{reportResult.report?.overallScore.grade}</span>
                </div>
                <div className={styles.reportMeta}>
                  <p>데이터 완성도: {reportResult.report?.overallScore.dataCompleteness || 0}%</p>
                  <p>생성된 인사이트: {reportResult.report?.overallScore.insightCount || 0}개</p>
                </div>
                {reportResult.report?.topInsights && (
                  <div className={styles.reportInsights}>
                    <h4>주요 인사이트</h4>
                    {reportResult.report.topInsights.map((insight, i) => (
                      <div key={i} className={styles.insightItem}>
                        <span className={styles.insightLayer}>L{insight.layer}</span>
                        <span className={styles.insightTitle}>{insight.title}</span>
                        <span className={styles.insightScore}>{insight.score}점</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={styles.reportDomains}>
                  <h4>도메인별 분석</h4>
                  {reportResult.report?.domainAnalysis?.map(d => (
                    <div key={d.domain} className={`${styles.domainItem} ${d.hasData ? '' : styles.noData}`}>
                      <span>{d.domain}</span>
                      <span>{d.hasData ? `${d.score}점` : '데이터 없음'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className={styles.reportError}>Error: {reportResult.error?.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Loading / Error States */}
      {loading && <div className={styles.loading}>Loading...</div>}
      {error && <div className={styles.error}>Error: {error}</div>}

      {!loading && !error && summary && (
        <>
          {/* Layer Tabs */}
          <nav className={styles.tabs}>
            {summary.layers.map(layer => (
              <button
                key={layer.layer}
                className={`${styles.tab} ${activeLayer === layer.layer ? styles.activeTab : ''}`}
                onClick={() => setActiveLayer(layer.layer)}
              >
                <span className={styles.tabNum}>L{layer.layer}</span>
                <span className={styles.tabName}>{layer.nameKo}</span>
                <span className={styles.tabCells}>{layer.cells}셀</span>
              </button>
            ))}
          </nav>

          {/* Layer Description */}
          {activeInfo && layerDesc && (
            <div className={styles.layerDesc}>
              <div className={styles.layerHeader}>
                <h2>Layer {activeInfo.layer}: {activeInfo.nameKo}</h2>
                <span className={styles.layerSize}>{activeInfo.cells}셀</span>
              </div>
              <p className={styles.descText}>{layerDesc.descriptionKo}</p>
              <div className={styles.descMeta}>
                <span className={styles.metaItem}>
                  <strong>행:</strong> {layerDesc.rowLabel}
                </span>
                <span className={styles.metaItem}>
                  <strong>열:</strong> {layerDesc.colLabel}
                </span>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className={styles.legend}>
            <span className={styles.legendTitle}>상호작용 레벨:</span>
            {Object.entries(LEVEL_INFO).map(([level, info]) => (
              <div key={level} className={styles.legendItem}>
                <span className={styles.legendIcon}>{info.icon}</span>
                <span className={styles.legendColor} style={{ background: info.bg }} />
                <span className={styles.legendLabel}>{info.label}</span>
                <span className={styles.legendScore}>({info.score})</span>
              </div>
            ))}
          </div>

          {/* Protected Matrix Display */}
          <div className={styles.matrixContainer}>
            <div className={styles.protectedNotice}>
              <span className={styles.lockIcon}>🔒</span>
              <div>
                <h3>매트릭스 데이터 보호됨</h3>
                <p>
                  Destiny Fusion Matrix™의 원본 데이터는 지적재산권 보호를 위해
                  외부에 노출되지 않습니다. 리포트 테스트를 통해 시스템이 정상 작동하는지
                  확인할 수 있습니다.
                </p>
                <p className={styles.copyright}>
                  © 2024 Destiny Fusion Matrix™. All Rights Reserved.
                </p>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <section className={styles.howItWorks}>
            <h3>이 매트릭스는 어떻게 사용되나요?</h3>
            <div className={styles.steps}>
              <div className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <div>
                  <h4>입력 데이터 수집</h4>
                  <p>사용자의 사주(일간, 십신, 격국 등)와 점성술 차트(행성 위치, 하우스 등)를 수집합니다.</p>
                </div>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <div>
                  <h4>서버 측 매트릭스 조회</h4>
                  <p>10개 레이어에서 해당하는 셀들을 <strong>서버에서만</strong> 조회합니다. (데이터 보호)</p>
                </div>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <div>
                  <h4>인사이트 생성</h4>
                  <p>조회된 셀의 상호작용(극강~갈등)을 바탕으로 개인화된 해석을 생성합니다.</p>
                </div>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>4</span>
                <div>
                  <h4>리포트 출력</h4>
                  <p>도메인별(성격, 재물, 관계 등) 점수와 조언이 담긴 종합 리포트를 생성합니다.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Copyright Footer */}
          <footer className={styles.footer}>
            <p>© 2024 Destiny Fusion Matrix™. All Rights Reserved.</p>
            <p className={styles.footerNotice}>
              본 시스템의 알고리즘, 데이터 구조, 해석 체계는 독점적 지적재산입니다.
              무단 복제, 리버스 엔지니어링, 자동화된 데이터 수집을 금지합니다.
            </p>
          </footer>
        </>
      )}
    </div>
  );
}
