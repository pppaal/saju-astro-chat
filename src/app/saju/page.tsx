'use client';

import SajuAnalyzer from "@/components/saju/SajuAnalyzer";
import { useRouter } from 'next/navigation';

export default function SajuPage() {
  const router = useRouter();

  return (
    <div className="wrapper">
      <main className="page" style={{ position: 'relative' }}>
        {/* ← 버튼: .page 기준 좌상단 */}
        <button
          onClick={() => router.back()}
          aria-label="뒤로가기"
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            width: 44,
            height: 44,
            background: '#1e1e2f',
            color: '#e0e0e0',
            border: '1px solid #4f4f7a',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            cursor: 'pointer',
            zIndex: 20,
            transition: 'background-color 0.2s',
          }}
          onMouseOver={e => (e.currentTarget.style.backgroundColor = '#2a2a3e')}
          onMouseOut={e => (e.currentTarget.style.backgroundColor = '#1e1e2f')}
        >
          ←
        </button>

        <div className="card">
          <h1 className="title">Eastern Astrology Analysis</h1>
          <p className="subtitle">
            Enter your birth information to discover your Four Pillars chart.
          </p>
          <div className="form">
            <SajuAnalyzer />
          </div>
        </div>
      </main>
    </div>
  );
}