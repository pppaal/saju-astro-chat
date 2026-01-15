// src/lib/marketing/imageGenerator.ts
// Daily 운세 이미지 생성 (Replicate AI + Canvas)

import Replicate from 'replicate';
import type { DailyFortune } from './dailyFortuneGenerator';
import { logger } from '@/lib/logger';

/**
 * Replicate를 사용한 AI 이미지 생성
 */

export interface ImageGeneratorOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
  useAI?: boolean; // AI 이미지 사용 여부
  style?: 'modern' | 'mystical' | 'minimal' | 'vibrant'; // 이미지 스타일
}

/**
 * 그라데이션 배경 생성
 */
function getGradientColors(sign: string): [string, string] {
  const gradients: Record<string, [string, string]> = {
    aries: ['#FF6B6B', '#FF8E53'],
    taurus: ['#4ECDC4', '#44A08D'],
    gemini: ['#FFD93D', '#FFA53D'],
    cancer: ['#A8E6CF', '#8FD3F4'],
    leo: ['#FFB347', '#FF6B9D'],
    virgo: ['#C1E1C1', '#98D8C8'],
    libra: ['#F7ACCF', '#D896FF'],
    scorpio: ['#8E44AD', '#C0392B'],
    sagittarius: ['#6C5CE7', '#A29BFE'],
    capricorn: ['#636E72', '#2D3436'],
    aquarius: ['#74B9FF', '#0984E3'],
    pisces: ['#A29BFE', '#6C5CE7'],
  };

  return gradients[sign] || ['#6C5CE7', '#A29BFE'];
}

/**
 * 점수 바 색상
 */
function getScoreColor(score: number): string {
  if (score >= 80) return '#2ECC71'; // 녹색
  if (score >= 60) return '#F39C12'; // 주황
  if (score >= 40) return '#E67E22'; // 진한 주황
  return '#E74C3C'; // 빨강
}

/**
 * Replicate AI로 배경 이미지 생성
 */
export async function generateAIBackground(
  fortune: DailyFortune,
  style: string = 'modern'
): Promise<string> {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN || '',
  });

  // 별자리 테마에 맞는 프롬프트 생성
  const prompts: Record<string, string> = {
    modern: `Modern gradient background for ${fortune.signKo} zodiac sign, abstract cosmic art, smooth gradients, dreamy atmosphere, professional design, high quality, 1080x1920 portrait`,
    mystical: `Mystical cosmic background for ${fortune.signKo} zodiac sign, magical atmosphere, stars and nebula, ethereal lighting, spiritual energy, 1080x1920 portrait`,
    minimal: `Minimalist elegant background for ${fortune.signKo} zodiac sign, clean design, subtle gradients, professional aesthetic, modern style, 1080x1920 portrait`,
    vibrant: `Vibrant colorful background for ${fortune.signKo} zodiac sign, energetic atmosphere, bold colors, dynamic composition, eye-catching design, 1080x1920 portrait`,
  };

  const prompt = prompts[style] || prompts.modern;

  try {
    // SDXL 또는 Flux 모델 사용
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt,
          negative_prompt: "text, watermark, signature, blurry, low quality, ugly",
          width: 1080,
          height: 1920,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 30,
        }
      }
    ) as string[];

    return output[0];
  } catch (error) {
    logger.error('[Replicate AI Error]', error);
    // Fallback to gradient
    return '';
  }
}

/**
 * HTML Canvas로 이미지 생성 (브라우저용)
 */
export async function generateFortuneImageHTML(
  fortune: DailyFortune,
  options: ImageGeneratorOptions = {}
): Promise<Blob> {
  const { width = 1080, height = 1920, format = 'png', quality = 0.95, useAI = false, style = 'modern' } = options;

  // Canvas 생성
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 배경 그라데이션
  const [color1, color2] = getGradientColors(fortune.sign);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 헤더 (날짜)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 48px "Pretendard", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(fortune.date, width / 2, 120);

  // 별자리 이모지 & 이름
  ctx.font = 'bold 120px "Pretendard", sans-serif';
  ctx.fillText(fortune.emoji, width / 2, 280);

  ctx.font = 'bold 72px "Pretendard", sans-serif';
  ctx.fillText(fortune.signKo, width / 2, 380);

  // 종합 점수 (큰 원)
  const centerY = 600;
  const circleRadius = 180;

  ctx.beginPath();
  ctx.arc(width / 2, centerY, circleRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fill();
  ctx.strokeStyle = getScoreColor(fortune.scores.overall);
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.fillStyle = '#2C3E50';
  ctx.font = 'bold 96px "Pretendard", sans-serif';
  ctx.fillText(`${fortune.scores.overall}`, width / 2, centerY + 10);

  ctx.font = 'bold 36px "Pretendard", sans-serif';
  ctx.fillText('점', width / 2, centerY + 60);

  // 카테고리별 점수
  const categories = [
    { label: '❤️ 연애', score: fortune.scores.love, y: 900 },
    { label: '💼 업무', score: fortune.scores.career, y: 1000 },
    { label: '💰 재물', score: fortune.scores.wealth, y: 1100 },
    { label: '💪 건강', score: fortune.scores.health, y: 1200 },
  ];

  categories.forEach(({ label, score, y }) => {
    // 라벨
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 42px "Pretendard", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, 100, y);

    // 점수 바 배경
    const barX = 360;
    const barY = y - 32;
    const barWidth = 500;
    const barHeight = 40;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // 점수 바
    const scoreWidth = (score / 100) * barWidth;
    ctx.fillStyle = getScoreColor(score);
    ctx.fillRect(barX, barY, scoreWidth, barHeight);

    // 점수 텍스트
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 36px "Pretendard", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${score}`, width - 100, y);
  });

  // 행운 요소
  const luckyY = 1380;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = 'bold 40px "Pretendard", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🍀 행운의 색: ${fortune.luckyColor}`, width / 2, luckyY);
  ctx.fillText(`🎲 행운의 숫자: ${fortune.luckyNumber}`, width / 2, luckyY + 60);
  ctx.fillText(`🎁 ${fortune.luckyItem}`, width / 2, luckyY + 120);

  // 메시지
  ctx.font = 'bold 38px "Pretendard", sans-serif';
  const messageY = 1620;
  const lines = wrapText(ctx, fortune.message, width - 200, 44);
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, messageY + i * 50);
  });

  // 하단 브랜딩
  ctx.font = 'bold 32px "Pretendard", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText('DestinyPal 🔮', width / 2, height - 80);

  // Blob으로 변환
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, `image/${format}`, quality);
  });
}

/**
 * 텍스트 줄바꿈
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * SVG 템플릿으로 이미지 생성 (서버 사이드용)
 */
export function generateFortuneSVG(fortune: DailyFortune): string {
  const [color1, color2] = getGradientColors(fortune.sign);

  return `
<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- 배경 -->
  <rect width="1080" height="1920" fill="url(#bgGradient)" />

  <!-- 날짜 -->
  <text x="540" y="120" font-family="Pretendard, sans-serif" font-size="48" font-weight="bold"
        fill="rgba(255,255,255,0.9)" text-anchor="middle">${fortune.date}</text>

  <!-- 별자리 이모지 -->
  <text x="540" y="280" font-size="120" text-anchor="middle">${fortune.emoji}</text>

  <!-- 별자리 이름 -->
  <text x="540" y="380" font-family="Pretendard, sans-serif" font-size="72" font-weight="bold"
        fill="rgba(255,255,255,0.95)" text-anchor="middle">${fortune.signKo}</text>

  <!-- 종합 점수 원 -->
  <circle cx="540" cy="600" r="180" fill="rgba(255,255,255,0.95)"
          stroke="${getScoreColor(fortune.scores.overall)}" stroke-width="12" />
  <text x="540" y="630" font-family="Pretendard, sans-serif" font-size="96" font-weight="bold"
        fill="#2C3E50" text-anchor="middle">${fortune.scores.overall}</text>
  <text x="540" y="680" font-family="Pretendard, sans-serif" font-size="36" font-weight="bold"
        fill="#2C3E50" text-anchor="middle">점</text>

  <!-- 카테고리별 점수 -->
  ${renderScoreBar('❤️ 연애', fortune.scores.love, 900)}
  ${renderScoreBar('💼 업무', fortune.scores.career, 1000)}
  ${renderScoreBar('💰 재물', fortune.scores.wealth, 1100)}
  ${renderScoreBar('💪 건강', fortune.scores.health, 1200)}

  <!-- 행운 요소 -->
  <text x="540" y="1380" font-family="Pretendard, sans-serif" font-size="40" font-weight="bold"
        fill="rgba(255,255,255,0.95)" text-anchor="middle">🍀 행운의 색: ${fortune.luckyColor}</text>
  <text x="540" y="1440" font-family="Pretendard, sans-serif" font-size="40" font-weight="bold"
        fill="rgba(255,255,255,0.95)" text-anchor="middle">🎲 행운의 숫자: ${fortune.luckyNumber}</text>
  <text x="540" y="1500" font-family="Pretendard, sans-serif" font-size="40" font-weight="bold"
        fill="rgba(255,255,255,0.95)" text-anchor="middle">🎁 ${fortune.luckyItem}</text>

  <!-- 메시지 -->
  <text x="540" y="1620" font-family="Pretendard, sans-serif" font-size="38" font-weight="bold"
        fill="rgba(255,255,255,0.95)" text-anchor="middle">${fortune.message}</text>

  <!-- 브랜딩 -->
  <text x="540" y="1840" font-family="Pretendard, sans-serif" font-size="32" font-weight="bold"
        fill="rgba(255,255,255,0.8)" text-anchor="middle">DestinyPal 🔮</text>
</svg>
  `.trim();
}

function renderScoreBar(label: string, score: number, y: number): string {
  const barX = 360;
  const barY = y - 32;
  const barWidth = 500;
  const barHeight = 40;
  const scoreWidth = (score / 100) * barWidth;

  return `
    <text x="100" y="${y}" font-family="Pretendard, sans-serif" font-size="42" font-weight="bold"
          fill="rgba(255,255,255,0.95)" text-anchor="start">${label}</text>
    <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="rgba(255,255,255,0.3)" />
    <rect x="${barX}" y="${barY}" width="${scoreWidth}" height="${barHeight}" fill="${getScoreColor(score)}" />
    <text x="980" y="${y}" font-family="Pretendard, sans-serif" font-size="36" font-weight="bold"
          fill="rgba(255,255,255,0.95)" text-anchor="end">${score}</text>
  `;
}
