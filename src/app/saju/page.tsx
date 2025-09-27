// src/app/saju/page.tsx

'use client'; // ◀◀◀ 1. 이 줄을 추가하세요.

import SajuAnalyzer from "@/components/saju/SajuAnalyzer";
import { useRouter } from 'next/navigation';

export default function SajuPage() {
   const router = useRouter();
  return (
    // 전체 화면을 차지하는 컨테이너에 밤하늘 배경 스타일을 적용합니다.
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#1a1a2e', // 어두운 남색 배경
      color: '#ffffff', // 기본 텍스트 색상을 흰색으로
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem' // 모바일 화면을 위한 여백
    }}>
     <button
        onClick={() => router.back()}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          width: '44px',
          height: '44px',
          background: '#1e1e2f',
          color: '#e0e0e0',
          border: '1px solid #4f4f7a',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          cursor: 'pointer',
          zIndex: 10,
          transition: 'background-color 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = '#2a2a3e'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = '#1e1e2f'}
      >
        ←
      </button>
      {/* 상단 타이틀 */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Eastern Astrology Analysis</h1>
        <p style={{ fontSize: '1.1rem', color: '#e0e0e0' }}>
          Enter your birth information to discover your Four Pillars chart.
        </p>
      </div>

      {/* 입력 폼이 들어있는 컴포넌트를 이곳에 렌더링합니다. */}
      <SajuAnalyzer />
    </main>
  );
}