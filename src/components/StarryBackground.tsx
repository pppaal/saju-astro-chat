// 최종 수정을 위한 전체 코드입니다. 이 코드를 그대로 복사해서 붙여넣으세요.
"use client";

import React, { useEffect, useRef } from 'react';

const StarryBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // 1. canvas 요소가 존재하는지 확실하게 확인합니다.
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas element not found!");
      return; // canvas가 없으면 여기서 함수를 즉시 종료합니다.
    }

    // 2. 2D 컨텍스트를 가져올 수 있는지 확인합니다.
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("Failed to get 2D context!");
      return; // 컨텍스트를 못 가져와도 즉시 종료합니다.
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let stars: Star[] = [];
    const numStars = 200;

    // Star 생성자 함수: 이제 canvas와 ctx가 존재함이 보장된 상태에서만 호출됩니다.
    function Star(this: any) {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 1.5 + 0.5;
      this.speed = Math.random() * 0.5 + 0.2;
    }

    for (let i = 0; i < numStars; i++) {
      stars.push(new (Star as any)());
    }

    function animate() {
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

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        stars = []; // 별 배열을 리셋
        for (let i = 0; i < numStars; i++) {
          stars.push(new (Star as any)());
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // useEffect는 처음 마운트될 때 한 번만 실행됩니다.

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

export default StarryBackground;