"use client";

import React, { useRef, useEffect } from 'react';

const StarryBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
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

  return <canvas ref={canvasRef} id="star-canvas" style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, width: '100vw', height: '100vh', background: 'black' }} />;
};

export default StarryBackground;