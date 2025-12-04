"use client";

import React from 'react';
import IChingReader from '../../components/iching/IChingReader';

//--- IchingPage Component ---//
export default function IchingPage() {
    
  const handleBack = () => {
    window.history.back();
  };

  return (
    <>
      <style jsx>{`
        @keyframes pan-background-iching {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes pulse-glow {
          0% {
            box-shadow: 0 0 8px rgba(255, 215, 0, 0.4), 0 0 12px rgba(255, 255, 255, 0.2);
          }
          50% {
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.9), 0 0 30px rgba(255, 255, 255, 0.4);
          }
          100% {
            box-shadow: 0 0 8px rgba(255, 215, 0, 0.4), 0 0 12px rgba(255, 255, 255, 0.2);
          }
        }

        /* 🆕 타이틀 관련 애니메이션 */
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }

        /* 🆕 타이틀 텍스트 */
        .title {
          font-family: var(--font-cinzel), serif;
          font-size: 3rem;
          font-weight: 700;
          color: #ffd700;
          text-align: center;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.8),
                       0 0 20px rgba(255, 215, 0, 0.6);
          margin-top: 2rem;
        }

        /* 🆕 주역 괘 심볼 */
        .hexagram-symbol {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 6px;
          animation: float 4s ease-in-out infinite;
          margin: 2rem auto 1rem auto;
        }
        .hex-line {
          width: 80px;
          height: 8px;
          background: #fff;
          border-radius: 2px;
        }
        .hex-line.broken {
          position: relative;
          background: transparent;
        }
        .hex-line.broken::before,
        .hex-line.broken::after {
          content: "";
          position: absolute;
          top: 0;
          width: 34px;
          height: 8px;
          background: #fff;
          border-radius: 2px;
        }
        .hex-line.broken::before { left: 0; }
        .hex-line.broken::after { right: 0; }

        /* 기존 버튼 스타일 */
        .submit-button {
          background: linear-gradient(135deg, #ffd700, #ff9d00);
          border: 2px solid #fff3b0;
          color: #000;
          padding: 16px 36px;
          border-radius: 50px;
          cursor: pointer;
          font-size: 1.2rem;
          font-weight: bold;
          transition: all 0.3s ease;
          animation: pulse-glow 3s infinite ease-in-out;
        }
        .submit-button:hover {
          background: linear-gradient(135deg, #ffe066, #ffc233);
          border-color: #ffffff;
          transform: scale(1.08);
          box-shadow: 0 0 24px rgba(255, 255, 200, 0.9);
        }
      `}</style>
      
      <main style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', width: '100%',
        color: '#ffffff', padding: '2rem',
        backgroundImage: "url('https://images.unsplash.com/photo-1542892650-763d34a42e39?q=80&w=1974&auto-format&fit=crop')",
        backgroundSize: '150% auto', backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        animation: 'pan-background-iching 150s linear infinite',
        position: 'relative'
      }}>
        
        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1
        }}></div>
        
        {/* 🆕 타이틀 + 주역 괘 영역 */}
        <div style={{ zIndex: 2, textAlign: 'center' }}>
          <div className="hexagram-symbol">
            <div className="hex-line"></div>
            <div className="hex-line broken"></div>
            <div className="hex-line"></div>
            <div className="hex-line"></div>
            <div className="hex-line broken"></div>
            <div className="hex-line"></div>
          </div>
          <h1 className="title">Wisdom of the IChing</h1>
        </div>

        {/* 기존 리더 컴포넌트 */}
        <div style={{ zIndex: 2, width: '100%', marginTop: '2rem' }}>
          <IChingReader onBack={handleBack} />
        </div>

      </main>
    </>
  );
}