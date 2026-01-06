import {
  createCanvas,
  drawBackground,
  drawStars,
  drawGlow,
  drawBranding,
  drawScoreCircle,
  canvasToBlob,
  COLORS,
  CardSize,
} from '../templates/baseTemplate';

export type DestinyMatchData = {
  userName: string;
  matchCount: number;
  topMatchName?: string;
  topMatchScore?: number;
  zodiacSign?: string;
  sajuElement?: string;
};

export async function generateDestinyMatchCard(
  data: DestinyMatchData,
  size: CardSize = 'og'
): Promise<Blob | null> {
  const { canvas, ctx, width, height } = createCanvas(size);

  // Background
  drawBackground(ctx, width, height);
  drawStars(ctx, width, height, 100);
  drawGlow(ctx, width, height, 'rgba(139, 92, 246, 0.15)');

  const isStory = size === 'story';
  const centerX = width / 2;

  if (isStory) {
    // Story layout (vertical)
    // Title
    ctx.font = '700 48px sans-serif';
    ctx.fillStyle = COLORS.textPrimary;
    ctx.textAlign = 'center';
    ctx.fillText('🌟 Destiny Match', centerX, 120);

    // User name
    ctx.font = '600 42px sans-serif';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText(data.userName, centerX, 200);

    // Match count
    ctx.font = '800 120px sans-serif';
    const gradient = ctx.createLinearGradient(centerX - 200, 300, centerX + 200, 300);
    gradient.addColorStop(0, COLORS.pink);
    gradient.addColorStop(0.5, COLORS.purple);
    gradient.addColorStop(1, COLORS.cyan);
    ctx.fillStyle = gradient;
    ctx.fillText(data.matchCount.toString(), centerX, 350);

    ctx.font = '500 36px sans-serif';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(data.matchCount === 1 ? 'Match Found' : 'Matches Found', centerX, 420);

    // Cosmic profile
    if (data.zodiacSign || data.sajuElement) {
      ctx.font = '400 28px sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText('Cosmic Profile', centerX, 520);

      let y = 580;
      if (data.zodiacSign) {
        ctx.font = '500 32px sans-serif';
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText(`✨ ${data.zodiacSign}`, centerX, y);
        y += 60;
      }
      if (data.sajuElement) {
        ctx.font = '500 32px sans-serif';
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText(`☯️ ${data.sajuElement}`, centerX, y);
        y += 60;
      }
    }

    // Top match
    if (data.topMatchName && data.topMatchScore) {
      ctx.font = '400 28px sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText('Top Match', centerX, 780);

      ctx.font = '600 40px sans-serif';
      ctx.fillStyle = COLORS.textPrimary;
      ctx.fillText(`💕 ${data.topMatchName}`, centerX, 840);

      drawScoreCircle(ctx, centerX, 1000, 90, data.topMatchScore, 'Compatibility');
    }

    // CTA
    ctx.font = '500 32px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText('Find Your Destiny Match!', centerX, height - 180);

    drawBranding(ctx, width, height);
  } else {
    // OG layout (horizontal)
    // Left side
    const leftX = width * 0.32;

    ctx.font = '700 40px sans-serif';
    ctx.fillStyle = COLORS.textPrimary;
    ctx.textAlign = 'center';
    ctx.fillText('🌟 Destiny Match', leftX, 100);

    ctx.font = '600 36px sans-serif';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText(data.userName, leftX, 160);

    // Match count badge
    ctx.font = '800 80px sans-serif';
    const gradient = ctx.createLinearGradient(leftX - 100, 240, leftX + 100, 240);
    gradient.addColorStop(0, COLORS.pink);
    gradient.addColorStop(0.5, COLORS.purple);
    gradient.addColorStop(1, COLORS.cyan);
    ctx.fillStyle = gradient;
    ctx.fillText(data.matchCount.toString(), leftX, 260);

    ctx.font = '500 28px sans-serif';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(data.matchCount === 1 ? 'Match Found' : 'Matches Found', leftX, 310);

    // Cosmic profile
    if (data.zodiacSign || data.sajuElement) {
      let y = 380;
      ctx.font = '400 20px sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText('Cosmic Profile', leftX, y);
      y += 40;

      if (data.zodiacSign) {
        ctx.font = '500 24px sans-serif';
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText(`✨ ${data.zodiacSign}`, leftX, y);
        y += 40;
      }
      if (data.sajuElement) {
        ctx.font = '500 24px sans-serif';
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText(`☯️ ${data.sajuElement}`, leftX, y);
      }
    }

    // Right side - Top match
    if (data.topMatchName && data.topMatchScore) {
      const rightX = width * 0.72;

      ctx.font = '400 20px sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText('Top Match', rightX, 160);

      ctx.font = '600 32px sans-serif';
      ctx.fillStyle = COLORS.textPrimary;
      ctx.fillText(data.topMatchName, rightX, 210);

      drawScoreCircle(ctx, rightX, height / 2 + 40, 80, data.topMatchScore, 'Match');
    }

    // Branding
    drawBranding(ctx, width, height, 'destinypal.me/destiny-match');
  }

  return canvasToBlob(canvas);
}
