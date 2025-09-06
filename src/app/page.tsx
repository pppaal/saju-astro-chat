// app/page.tsx
"use client";

import React, { useRef, useEffect, useState, FormEvent } from 'react';

// 별 배경 컴포넌트 (수정 없음, 그대로 두셔도 됩니다)
const StarryBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let stars: any[] = [];
    const numStars = 500;
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    function Star(this: any) {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 1.5 + 0.5;
      this.speed = Math.random() * 0.5 + 0.2;
    }
    Star.prototype.draw = function () {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    };
    Star.prototype.update = function () {
      this.y += this.speed;
      if (this.y > canvas.height) {
        this.y = 0 - this.size;
        this.x = Math.random() * canvas.width;
      }
    };
    function init() {
      setCanvasSize();
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push(new (Star as any)());
      }
    }
    let animationFrameId: number;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(star => {
        star.update();
        star.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    }
    init();
    animate();
    window.addEventListener('resize', init);
    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  return <canvas ref={canvasRef} id="star-canvas" />;
};


// =======================================================================
// ✨✨✨ 메인 페이지 컴포넌트 (수정된 최종 버전) ✨✨✨
// =======================================================================
export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setAnalysisResult('');
    setError('');

    const formData = new FormData(event.currentTarget);
    const birthdate = formData.get('birthdate');
    const birthtime = formData.get('birthtime');
    const gender = formData.get('gender');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthdate, birthtime, gender }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '서버에서 알 수 없는 오류가 발생했습니다.');
      }
      setAnalysisResult(data.result);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // '다시 분석하기' 또는 에러 확인 후 처음으로 돌아가는 함수
  const resetState = () => {
    setAnalysisResult('');
    setError('');
    setIsLoading(false);
  }

  return (
    <>
      <StarryBackground />
      <main className="content-wrapper" style={{ overflowY: 'auto', maxHeight: '100vh', paddingTop: '5rem', paddingBottom: '5rem' }}>
        
        {/* 
          🚨 여기가 수정된 핵심 부분입니다! 🚨
          이전: {!analysisResult && ( ... )}
          수정: {!analysisResult && !isLoading && ( ... )}
          '로딩 중이 아닐 때' 라는 조건을 추가하여, 로딩이 시작되면 폼이 사라지도록 합니다.
        */}
        {!analysisResult && !isLoading && (
          <>
            <h1 className="main-title">Destiny Tracker</h1>
            <p className="subtitle">Your story, written in the stars.</p>
            <form className="destiny-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="birthdate">Date of Birth</label>
                <input type="date" id="birthdate" name="birthdate" defaultValue="1995-02-09" required />
              </div>
              <div className="form-group">
                <label htmlFor="birthtime">Time of Birth</label>
                <input type="time" id="birthtime" name="birthtime" defaultValue="06:40" required />
              </div>
              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select id="gender" name="gender" defaultValue="male" required>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <button type="submit" className="submit-button" disabled={isLoading}>
                Begin Analysis
              </button>
            </form>
          </>
        )}

        {/* 로딩 중일 때 표시되는 화면 */}
        {isLoading && <div className="subtitle">별의 기운을 읽는 중...</div>}
        
        {/* 에러가 발생했을 때 표시되는 화면 */}
        {error && (
            <div style={{color: '#ffdddd', marginTop: '1rem', backgroundColor: 'rgba(255,0,0,0.2)', padding: '1.5rem', borderRadius: '8px'}}>
                <h3 style={{fontSize: '1.2rem', marginBottom: '1rem'}}>오류가 발생했습니다</h3>
                <p>{error}</p>
                <button onClick={resetState} style={{marginTop: '1.5rem'}} className="submit-button">
                    처음으로 돌아가기
                </button>
            </div>
        )}

        {/* 분석 결과가 성공적으로 도착했을 때 표시되는 화면 */}
        {analysisResult && (
          <div style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            padding: '2rem', 
            borderRadius: '15px', 
            maxWidth: '600px',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.8'
          }}>
            <h2 className="main-title" style={{fontSize: '2rem', marginBottom: '1.5rem'}}>당신의 우주적 분석</h2>
            <div dangerouslySetInnerHTML={{ __html: analysisResult.replace(/\n/g, '<br />') }} />
            <button onClick={resetState} style={{marginTop: '2rem'}} className="submit-button">
              다시 분석하기
            </button>
          </div>
        )}
      </main>
    </>
  );
}