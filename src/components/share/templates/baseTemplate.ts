/**
 * Base template for share card generation
 * Provides common Canvas drawing utilities for all share cards
 */

export type CardSize = 'story' | 'og';

export const CARD_SIZES: Record<CardSize, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
};

export const COLORS = {
  bgDark: '#0d1225',
  bgMid: '#131a2e',
  bgLight: '#1a2238',
  purple: '#8b5cf6',
  cyan: '#63d2ff',
  gold: '#ffd700',
  pink: '#fed6e3',
  teal: '#a8edea',
  textPrimary: '#EAE6FF',
  textSecondary: 'rgba(234, 230, 255, 0.85)',
  textMuted: 'rgba(234, 230, 255, 0.6)',
  wood: '#22c55e',
  fire: '#ef4444',
  earth: '#f59e0b',
  metal: '#3b82f6',
  water: '#8b5cf6',
};

export function createCanvas(size: CardSize) {
  const canvas = document.createElement('canvas');
  const { width, height } = CARD_SIZES[size];
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {throw new Error('Failed to get canvas context');}
  return { canvas, ctx, width, height };
}

export function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, COLORS.bgDark);
  gradient.addColorStop(0.5, COLORS.bgMid);
  gradient.addColorStop(1, COLORS.bgLight);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function drawStars(ctx: CanvasRenderingContext2D, width: number, height: number, count = 100) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = `rgba(168, 237, 234, ${Math.random() * 0.5 + 0.1})`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawGlow(ctx: CanvasRenderingContext2D, width: number, height: number, color = 'rgba(168, 237, 234, 0.15)') {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.6;
  const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  glowGradient.addColorStop(0, color);
  glowGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, width, height);
}

export function drawBranding(ctx: CanvasRenderingContext2D, width: number, height: number, cta?: string) {
  ctx.font = '500 20px sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.textAlign = 'center';
  ctx.fillText('DestinyPal.me', width / 2, height - 40);
  if (cta) {
    ctx.font = '400 16px sans-serif';
    ctx.fillStyle = 'rgba(168, 237, 234, 0.5)';
    ctx.fillText(cta, width / 2, height - 18);
  }
}

export function drawScoreCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, score: number, label?: string) {
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * score) / 100;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  const gradient = ctx.createLinearGradient(x - radius, y, x + radius, y);
  gradient.addColorStop(0, COLORS.cyan);
  gradient.addColorStop(0.5, COLORS.purple);
  gradient.addColorStop(1, COLORS.pink);
  ctx.strokeStyle = gradient;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, radius, startAngle, endAngle);
  ctx.stroke();

  ctx.font = '700 48px sans-serif';
  ctx.fillStyle = COLORS.textPrimary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(score)}%`, x, y);

  if (label) {
    ctx.font = '400 16px sans-serif';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, y + radius + 15);
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0));
}
