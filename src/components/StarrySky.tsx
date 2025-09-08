// 타입스크립트의 모든 의심을 차단하는 최종 방어 코드
"use client";

import React, { useEffect, useRef } from 'react';

const StarrySky: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    // Optional Chaining (?.)을 사용해 canvas가 존재할 때만 getContext를 시도합니다.
    const ctx = canvas?.getContext('2d');

    // [핵심] canvas와 ctx가 둘 다 확실히 존재할 때만 진입하는 '절대 안전 구역'
    if (canvas && ctx) {
      // 이 if 블록 안에서는 canvas와 ctx가 절대 null이 아님을 타입스크립트가 100% 보증합니다.

      let stars: Star[] = [];
      const numStars = 200;

      interface Star {
        x: number;
        y: number;
        size: number;
        speed: number;
      }

      // 별 생성 및 초기화 로직을 담는 함수
      const init = () => {
        // 이제 여기서 canvas.width를 써도 안전합니다.
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        stars = []; // 별 배열 초기화
        for (let i = 0; i < numStars; i++) {
          stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5 + 0.5,
            speed: Math.random() * 0.5 + 0.2,
          });
        }
      };

      // 애니메이션 로직을 담는 함수
      const animate = () => {
        // 이제 여기서 ctx와 canvas를 써도 안전합니다.
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';

        for (const star of stars) {
          star.y -= star.speed;
          if (star.y < 0) {
            star.y = canvas.height;
            star.x = Math.random() * canvas.width;
          }
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // requestAnimationFrame은 이 if 블록 안에서 호출되어야 합니다.
        requestAnimationFrame(animate);
      };

      // 리사이즈 이벤트 핸들러
      const handleResize = () => {
        // 이 함수도 '절대 안전 구역' 안에 있으므로 canvas, ctx 사용이 안전합니다.
        init();
      };
      
      // 모든 준비가 끝났으니 실행!
      init();
      animate();

      // 이벤트 리스너 등록
      window.addEventListener('resize', handleResize);

      // 컴포넌트가 사라질 때 이벤트 리스너를 정리합니다.
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []); // useEffect는 처음 한 번만 실행됩니다.

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: 'black',
      }}
    />
  );
};

export default StarrySky;