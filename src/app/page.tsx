// 파일 위치: src/app/page.tsx
"use client";

import React, { useState } from 'react';
// 우리가 만든 부품들을 모두 가져옵니다.
import StarrySky from '@/components/StarrySky';
import SajuAnalyzer from '@/components/SajuAnalyzer';
import TarotReader from '@/components/TarotReader';
// [추가!] 새로 만든 주역 컴포넌트를 가져옵니다.
import IChingReader from '@/components/IChingReader';

export default function HomePage() {
  // [수정!] 'iching' 상태를 추가합니다.
  const [mode, setMode] = useState<'menu' | 'saju' | 'tarot' | 'iching'>('menu');

  // 상태(mode)에 따라 적절한 부품을 조립해서 보여주는 함수
  const renderContent = () => {
    switch (mode) {
      case 'saju':
        return <SajuAnalyzer onBack={() => setMode('menu')} />;
      case 'tarot':
        return <TarotReader onBack={() => setMode('menu')} />;
      // [추가!] 'iching' 모드일 때의 화면을 정의합니다.
      case 'iching':
        return <IChingReader onBack={() => setMode('menu')} />;
      case 'menu':
      default:
        // 기본 '메뉴' 모드일 때는 버튼들을 보여줍니다.
        return (
          <>
            <h1 className="main-title">Destiny Tracker</h1>
            <p className="subtitle">Your story, written in the stars.</p>
            <div className="menu-buttons">
              <button onClick={() => setMode('saju')} className="submit-button">사주 분석</button>
              <button onClick={() => setMode('tarot')} className="submit-button">오늘의 타로</button>
              {/* [추가!] 주역 메뉴로 가는 버튼을 추가합니다. */}
              <button onClick={() => setMode('iching')} className="submit-button">주역으로 지혜 구하기</button>
            </div>
          </>
        );
    }
  };

  return (
    <>
      <StarrySky /> {/* 배경은 항상 보입니다. */}
      <main className="content-wrapper">
        {/* renderContent 함수가 현재 mode에 맞는 화면을 그려줍니다. */}
        {renderContent()}
      </main>
    </>
  );
}