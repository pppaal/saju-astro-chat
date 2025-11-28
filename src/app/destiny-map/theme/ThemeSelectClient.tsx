'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ✅ 테마 키 타입 (9개)
type ThemeKey =
  | 'fortune_new_year'
  | 'fortune_next_year'
  | 'fortune_monthly'
  | 'fortune_today'
  | 'focus_career'
  | 'focus_love'
  | 'focus_family'
  | 'focus_health'
  | 'focus_overall';

// ✅ 메뉴(테마) 구성
const THEMES: { key: ThemeKey; title: string; desc: string; emoji: string }[] = [
  { key: 'fortune_new_year', title: '신년 운세', desc: '다가올 한 해의 흐름과 기회·주의점', emoji: '🎊' },
  { key: 'fortune_next_year', title: '내년 운세', desc: '다음 해의 주요 변화와 상승 포인트', emoji: '🌟' },
  { key: 'fortune_monthly', title: '월운', desc: '한 달의 리듬과 전환점 캘린더', emoji: '🗓️' },
  { key: 'fortune_today', title: '오늘의 운세', desc: '오늘의 컨디션·관계·주의 포인트', emoji: '☀️' },
  { key: 'focus_career', title: '커리어', desc: '직업·승진·이직·역량 확장 방향', emoji: '💼' },
  { key: 'focus_love', title: '연애', desc: '감정 리듬과 관계·매력 포인트', emoji: '💖' },
  { key: 'focus_family', title: '가족', desc: '가족·팀 내 관계와 조화 포인트', emoji: '👪' },
  { key: 'focus_health', title: '건강', desc: '리커버리 루틴과 에너지 관리 지침', emoji: '💊' },
  { key: 'focus_overall', title: '인생 총운', desc: '전반적인 성향과 인생의 큰 흐름', emoji: '🌈' },
];

export default function ThemeSelectClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const baseParams = useMemo(() => new URLSearchParams(sp.toString()), [sp]);

  const onPick = (theme: ThemeKey) => {
    const params = new URLSearchParams(baseParams.toString());
    params.set('theme', theme);

    const lat = sp.get('latitude') || sp.get('lat');
    const lon = sp.get('longitude') || sp.get('lon');
    if (lat) params.set('latitude', lat);
    if (lon) params.set('longitude', lon);

    router.push(`/destiny-map/result?${params.toString()}`);
  };

  const onBack = () => {
    const lang = sp.get('lang') || 'ko';
    router.push(`/destiny-map?lang=${lang}`);
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 960,
          background: 'var(--card, #111)',
          color: 'var(--fg, #fff)',
          border: '1px solid var(--border, rgba(255,255,255,0.12))',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <button
            onClick={onBack}
            aria-label="Back"
            style={{
              marginRight: 12,
              width: 40,
              height: 40,
              borderRadius: 999,
              border: '1px solid var(--border, rgba(255,255,255,0.15))',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            ←
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>분석 테마 선택</h1>
            <p
              style={{
                margin: '6px 0 0 0',
                opacity: 0.8,
                fontSize: 14,
              }}
            >
              원하는 포커스를 선택하면, 리포트가 해당 주제에 맞춰 강조됩니다.
            </p>
          </div>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
            marginTop: 12,
          }}
        >
          {THEMES.map((th) => (
            <button
              key={th.key}
              onClick={() => onPick(th.key)}
              style={{
                textAlign: 'left',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                border: '1px solid var(--border, rgba(255,255,255,0.15))',
                padding: 16,
                borderRadius: 14,
                color: 'inherit',
                cursor: 'pointer',
                transition: 'transform .12s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = 'translateY(-2px)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ fontSize: 28 }}>{th.emoji}</div>
              <div style={{ fontWeight: 700, marginTop: 8 }}>{th.title}</div>
              <div style={{ opacity: 0.8, marginTop: 6, fontSize: 13 }}>{th.desc}</div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}