"use client";

import React, { useEffect, useRef } from 'react';

const StarryBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // [핵심 수정 1] canvas가 없으면 아무것도 실행하지 않도록 방어 코드 추가
    const canvas = canvasRef.current;
    if (!canvas) {
      return; // 캔버스가 없으면 여기서 함수를 즉시 종료합니다.
    }

    const ctx = canvas.getContext('2d');
    
    // [핵심 수정 2] context(ctx)가 없을 가능성도 방어합니다.
    if (!ctx) {
      return;
    }

    // --- 이제 이 아래의 모든 코드는 canvas와 ctx가 100% 존재한다고 보장됩니다. ---

    let stars: Star[] = [];
    const numStars = 200;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Star 클래스 또는 함수 정의 (이제 canvas를 안전하게 사용 가능)
    function Star(this: any) {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 1.5 + 0.5;
      this.speed = Math.random() * 0.5 + 0.2;
    }

    Star.prototype.draw = function() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
    };

    Star.prototype.update = function() {
      this.y -= this.speed;
      if (this.y < 0) {
        this.y = canvas.height;
        this.x = Math.random() * canvas.width;
      }
    };

    const init = () => {
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push(new (Star as any)());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(star => {
        star.update();
        star.draw();
      });
      requestAnimationFrame(animate);
    };

    setCanvasSize();
    init();
    animate();

    window.addEventListener('resize', () => {
        setCanvasSize();
        init();
    });

    // 컴포넌트가 사라질 때 이벤트 리스너 정리
    return () => {
      window.removeEventListener('resize', () => {
        setCanvasSize();
        init();
      });
    };
  }, []); // 빈 배열: 컴포넌트가 처음 마운트될 때 한 번만 실행

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, background: 'black' }} />;
};

export default StarryBackground;