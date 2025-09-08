// 파일 위치: src/components/SajuAnalyzer.tsx

"use client";

import React from 'react';

// [핵심!] onBack 함수를 props로 받기 위한 타입 정의
interface SajuAnalyzerProps {
  onBack: () => void;
}

// [핵심!] props로 onBack을 받도록 수정
const SajuAnalyzer: React.FC<SajuAnalyzerProps> = ({ onBack }) => {
  // 여기에 기존에 있던 사주 분석 관련 코드(useState, 함수 등)가 그대로 있으면 됩니다.
  // 이 부분은 건드리지 않으셔도 됩니다.

  return (
    // 컴포넌트의 최상위 태그 (div, section 등)
    <div style={{ color: 'white', textAlign: 'center', padding: '2rem', zIndex: 10, width: '100%' }}>
      {/* [핵심!] 메뉴로 돌아가는 버튼 추가 */}
      <button 
        onClick={onBack} 
        style={{ position: 'absolute', top: '20px', left: '20px', background: 'none', border: '1px solid white', color: 'white', padding: '8px 12px', cursor: 'pointer', zIndex: 20 }}
      >
        ← 메뉴로
      </button>

      {/* --- 여기부터는 SajuAnalyzer의 기존 내용입니다 --- */}
      <h1>사주 분석</h1>
      <p>생년월일시를 입력하여 당신의 사주를 분석해보세요.</p>
      {/* 예시: <UserInfoForm /> 같은 컴포넌트가 여기에 있을 수 있습니다. */}
      {/* ... 기존의 사주 분석 UI ... */}
      {/* ------------------------------------------- */}

    </div>
  );
};

export default SajuAnalyzer;