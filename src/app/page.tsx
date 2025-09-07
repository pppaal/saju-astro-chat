"use client";

import React, { useState } from 'react';
// 우리가 만든 부품들을 모두 가져옵니다.
import StarryBackground from '@/components/StarryBackground';
import SajuAnalyzer from '@/components/SajuAnalyzer';
import TarotReader from '@/components/TarotReader';

export default function HomePage() {
  // 'menu', 'saju', 'tarot' 세 가지 상태만 관리합니다.
  // [핵심!] 처음 상태를 'menu'로 설정하여 메뉴 선택 화면부터 보여줍니다.
  const [mode, setMode] = useState<'menu' | 'saju' | 'tarot'>('menu');

  // 상태(mode)에 따라 적절한 부품을 조립해서 보여주는 함수
  const renderContent = () => {
    switch (mode) {
      case 'saju':
        // '사주' 모드일 때는 SajuAnalyzer를 보여줍니다.
        return <SajuAnalyzer onBack={() => setMode('menu')} />;
      case 'tarot':
        // '타로' 모드일 때는 TarotReader를 보여줍니다.
        return <TarotReader onBack={() => setMode('menu')} />;
      case 'menu':
      default:
        // 기본 '메뉴' 모드일 때는 두 개의 버튼을 보여줍니다.
        return (
          <>
            <h1 className="main-title">Destiny Tracker</h1>
            <p className="subtitle">Your story, written in the stars.</p>
            <div className="menu-buttons">
              {/* 이 버튼을 누르면 mode가 'saju'로 바뀝니다. */}
              <button onClick={() => setMode('saju')} className="submit-button">사주 분석</button>
              {/* 이 버튼을 누르면 mode가 'tarot'로 바뀝니다. */}
              <button onClick={() => setMode('tarot')} className="submit-button">오늘의 타로</button>
            </div>
          </>
        );
    }
  };

  return (
    <>
      <StarryBackground /> {/* 배경은 항상 보입니다. */}
      <main className="content-wrapper">
        {/* renderContent 함수가 현재 mode에 맞는 화면을 그려줍니다. */}
        {renderContent()}
      </main>
    </>
  );
}