"use client";

import React, { useState, FormEvent } from 'react';
import UserInfoForm from './UserInfoForm'; // '웨이터' 컴포넌트 호출

interface SajuAnalyzerProps {
  onBack: () => void; // '처음으로' 돌아가기 기능
}

const SajuAnalyzer = ({ onBack }: SajuAnalyzerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [error, setError] = useState('');

  // '웨이터(UserInfoForm)'가 전달해준 주문서를 받아 '주방(API)'에 전달하는 함수
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setAnalysisResult('');
    setError('');
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '서버 오류');
      setAnalysisResult(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 결과/오류 화면은 이전과 동일
  if (analysisResult) return (
    <div className="result-container">
      <h2 className="main-title">당신의 우주적 분석</h2>
      <div className="analysis-result" dangerouslySetInnerHTML={{ __html: analysisResult.replace(/\n/g, '<br />') }} />
      <button onClick={() => setAnalysisResult('')} className="submit-button">다시 분석하기</button>
    </div>
  );

  if (error) return (
    <div className="result-container">
      <h3 className="error-title">오류가 발생했습니다</h3>
      <p>{error}</p>
      <button onClick={() => setError('')} className="submit-button">다시 시도하기</button>
    </div>
  );

  // 기본 화면: 이제 '웨이터(UserInfoForm)'를 불러와서 보여줍니다.
  return (
    <>
      <h1 className="main-title">사주 분석</h1>
      <p className="subtitle">별들이 기억하는 당신의 이야기를 확인하세요.</p>
      <UserInfoForm onSubmit={handleSubmit} isLoading={isLoading} />
      <button onClick={onBack} className="back-button">처음으로</button>
    </>
  );
};

export default SajuAnalyzer;