// 파일 위치: src/components/TarotReader.tsx

"use client";

import React, { useState } from 'react';

// [핵심!] onBack 함수를 props로 받기 위한 타입 정의
interface TarotReaderProps {
  onBack: () => void;
}

// [핵심!] props로 onBack을 받도록 수정
const TarotReader: React.FC<TarotReaderProps> = ({ onBack }) => {
  // 여기에 기존에 있던 타로 관련 코드(useState, 카드 데이터, 함수 등)가 그대로 있으면 됩니다.

  return (
    <div style={{ color: 'white', textAlign: 'center', padding: '2rem', zIndex: 10, width: '100%' }}>
      {/* [핵심!] 메뉴로 돌아가는 버튼 추가 */}
      <button 
        onClick={onBack} 
        style={{ position: 'absolute', top: '20px', left: '20px', background: 'none', border: '1px solid white', color: 'white', padding: '8px 12px', cursor: 'pointer', zIndex: 20 }}
      >
        ← 메뉴로
      </button>

      {/* --- 여기부터는 TarotReader의 기존 내용입니다 --- */}
      <h1>오늘의 타로</h1>
      <p>마음을 집중하고 카드를 선택하세요.</p>
      {/* ... 기존의 타로 카드 UI ... */}
      {/* ----------------------------------------- */}

    </div>
  );
};

export default TarotReader;