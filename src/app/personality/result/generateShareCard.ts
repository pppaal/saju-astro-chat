import type { PersonaAnalysis } from '@/lib/persona/types';

export async function generateShareCard(analysis: PersonaAnalysis, locale: string): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {return null;}

  canvas.width = 1200;
  canvas.height = 630;

  // Background gradient - more vibrant
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0d0d1f');
  gradient.addColorStop(0.3, '#1a1a35');
  gradient.addColorStop(0.7, '#1f1a2e');
  gradient.addColorStop(1, '#0d0d1f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add more stars with varying sizes
  for (let i = 0; i < 150; i++) {
    const opacity = Math.random() * 0.6 + 0.1;
    const size = Math.random() * 2.5;
    ctx.fillStyle = `rgba(168, 237, 234, ${opacity})`;
    ctx.beginPath();
    ctx.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      size,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Multiple glow effects
  const glowGradient = ctx.createRadialGradient(600, 280, 0, 600, 280, 350);
  glowGradient.addColorStop(0, 'rgba(168, 237, 234, 0.2)');
  glowGradient.addColorStop(0.5, 'rgba(254, 214, 227, 0.1)');
  glowGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Decorative border
  ctx.strokeStyle = 'rgba(168, 237, 234, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(30, 30, canvas.width - 60, canvas.height - 60, 20);
  ctx.stroke();

  // Brand title
  ctx.font = '600 22px sans-serif';
  ctx.fillStyle = 'rgba(168, 237, 234, 0.9)';
  ctx.textAlign = 'center';
  ctx.fillText('\u2728 NOVA PERSONA \u2728', 600, 75);

  // Type code badge background
  ctx.fillStyle = 'rgba(168, 237, 234, 0.15)';
  ctx.beginPath();
  ctx.roundRect(500, 95, 200, 50, 25);
  ctx.fill();
  ctx.strokeStyle = 'rgba(168, 237, 234, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Type code
  ctx.font = '700 28px monospace';
  ctx.fillStyle = '#a8edea';
  ctx.fillText(analysis.typeCode, 600, 130);

  // Persona name - larger and more prominent
  ctx.font = '800 52px sans-serif';
  const nameGradient = ctx.createLinearGradient(300, 170, 900, 220);
  nameGradient.addColorStop(0, '#a8edea');
  nameGradient.addColorStop(0.5, '#ffffff');
  nameGradient.addColorStop(1, '#fed6e3');
  ctx.fillStyle = nameGradient;
  ctx.fillText(analysis.personaName, 600, 210);

  // Summary - better text wrapping for Korean
  ctx.font = '400 20px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const summaryText = analysis.summary;
  const maxWidth = 900;
  const lineHeight = 32;
  let y = 270;

  // Better text wrapping for both Korean and English
  let currentLine = '';
  for (let i = 0; i < summaryText.length; i++) {
    const char = summaryText[i];
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine !== '') {
      ctx.fillText(currentLine, 600, y);
      currentLine = char;
      y += lineHeight;
      if (y > 370) {
        currentLine += '...';
        break;
      }
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine && y <= 370) {
    ctx.fillText(currentLine, 600, y);
  }

  // Axes visualization - improved design
  const axisLabels = locale === 'ko'
    ? ['\uc5d0\ub108\uc9c0', '\uc778\uc9c0', '\uacb0\uc815', '\ub9ac\ub4ec']
    : ['Energy', 'Cognition', 'Decision', 'Rhythm'];

  const axes = [
    { label: axisLabels[0], score: analysis.axes.energy.score },
    { label: axisLabels[1], score: analysis.axes.cognition.score },
    { label: axisLabels[2], score: analysis.axes.decision.score },
    { label: axisLabels[3], score: analysis.axes.rhythm.score },
  ];

  const barWidth = 220;
  const barHeight = 14;
  const startX = 160;
  const startY = 480;

  // Background panel for axes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.beginPath();
  ctx.roundRect(100, 420, 1000, 150, 15);
  ctx.fill();

  axes.forEach((axis, i) => {
    const x = startX + i * 250;

    // Label
    ctx.font = '600 16px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText(axis.label, x + barWidth / 2, startY - 20);

    // Track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(x, startY, barWidth, barHeight, 7);
    ctx.fill();

    // Fill with gradient
    const fillGradient = ctx.createLinearGradient(x, startY, x + barWidth, startY);
    fillGradient.addColorStop(0, '#a8edea');
    fillGradient.addColorStop(1, '#fed6e3');
    ctx.fillStyle = fillGradient;
    ctx.beginPath();
    ctx.roundRect(x, startY, (barWidth * axis.score) / 100, barHeight, 7);
    ctx.fill();

    // Score
    ctx.font = '700 18px sans-serif';
    ctx.fillStyle = '#fed6e3';
    ctx.fillText(`${Math.round(axis.score)}%`, x + barWidth / 2, startY + 40);
  });

  // Footer with CTA
  ctx.font = '500 16px sans-serif';
  ctx.fillStyle = 'rgba(168, 237, 234, 0.8)';
  ctx.textAlign = 'center';
  const footerText = locale === 'ko'
    ? '\ub098\ub3c4 \ud14c\uc2a4\ud2b8\ud558\uae30 \u2192 DestinyPal.me'
    : 'Take the test \u2192 DestinyPal.me';
  ctx.fillText(footerText, 600, 595);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}
