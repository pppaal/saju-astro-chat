// scripts/auto-post-daily-fortune.mjs
// 매일 자동으로 12별자리 운세를 생성하고 소셜 미디어에 포스팅

import Replicate from 'replicate';

/**
 * Replicate로 운세 이미지 생성
 */
async function generateFortuneImage(signData) {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  const prompt = `Beautiful mystical cosmic background for ${signData.nameKo} zodiac sign ${signData.emoji}, magical starry atmosphere, gradient colors ${signData.colors.join(' and ')}, dreamy ethereal lighting, professional social media post design, 1080x1920 portrait format, ultra high quality`;

  console.log(`  🎨 Generating AI image for ${signData.nameKo}...`);

  try {
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt,
          negative_prompt: "text, words, letters, watermark, signature, blurry, low quality, ugly, distorted",
          width: 1080,
          height: 1920,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 25,
        }
      }
    );

    return output[0];
  } catch (error) {
    console.error(`  ❌ Image generation failed:`, error.message);
    return null;
  }
}

/**
 * Instagram에 포스팅
 */
async function postToInstagram(imageUrl, caption) {
  const { INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID } = process.env;

  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_ACCOUNT_ID) {
    console.log('  ⏭️  Instagram not configured, skipping...');
    return null;
  }

  try {
    // Step 1: Container 생성
    const containerRes = await fetch(
      `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: INSTAGRAM_ACCESS_TOKEN,
        }),
      }
    );

    const containerData = await containerRes.json();
    if (!containerRes.ok) {
      throw new Error(`Container creation failed: ${JSON.stringify(containerData)}`);
    }

    // Step 2: 발행
    const publishRes = await fetch(
      `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: INSTAGRAM_ACCESS_TOKEN,
        }),
      }
    );

    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      throw new Error(`Publish failed: ${JSON.stringify(publishData)}`);
    }

    console.log(`  ✅ Instagram: https://instagram.com/p/${publishData.id}`);
    return publishData.id;

  } catch (error) {
    console.error(`  ❌ Instagram post failed:`, error.message);
    return null;
  }
}

/**
 * 12별자리 데이터
 */
const ZODIAC_SIGNS = [
  { sign: 'aries', nameKo: '양자리', emoji: '♈', colors: ['red', 'orange'], dates: '3/21~4/19' },
  { sign: 'taurus', nameKo: '황소자리', emoji: '♉', colors: ['green', 'pink'], dates: '4/20~5/20' },
  { sign: 'gemini', nameKo: '쌍둥이자리', emoji: '♊', colors: ['yellow', 'light blue'], dates: '5/21~6/21' },
  { sign: 'cancer', nameKo: '게자리', emoji: '♋', colors: ['silver', 'white'], dates: '6/22~7/22' },
  { sign: 'leo', nameKo: '사자자리', emoji: '♌', colors: ['gold', 'orange'], dates: '7/23~8/22' },
  { sign: 'virgo', nameKo: '처녀자리', emoji: '♍', colors: ['navy', 'gray'], dates: '8/23~9/22' },
  { sign: 'libra', nameKo: '천칭자리', emoji: '♎', colors: ['pink', 'light blue'], dates: '9/23~10/23' },
  { sign: 'scorpio', nameKo: '전갈자리', emoji: '♏', colors: ['black', 'red'], dates: '10/24~11/22' },
  { sign: 'sagittarius', nameKo: '궁수자리', emoji: '♐', colors: ['purple', 'blue'], dates: '11/23~12/21' },
  { sign: 'capricorn', nameKo: '염소자리', emoji: '♑', colors: ['brown', 'gray'], dates: '12/22~1/19' },
  { sign: 'aquarius', nameKo: '물병자리', emoji: '♒', colors: ['turquoise', 'electric blue'], dates: '1/20~2/18' },
  { sign: 'pisces', nameKo: '물고기자리', emoji: '♓', colors: ['sea green', 'lavender'], dates: '2/19~3/20' },
];

/**
 * 운세 점수 생성 (날짜 기반 시드)
 */
function generateScores(sign, date) {
  const seed = date.getTime() + ZODIAC_SIGNS.findIndex(z => z.sign === sign) * 7;
  const random = (s) => {
    const x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };

  return {
    overall: Math.round(40 + random(seed) * 55),
    love: Math.round(40 + random(seed + 1) * 55),
    career: Math.round(40 + random(seed + 2) * 55),
    wealth: Math.round(40 + random(seed + 3) * 55),
    health: Math.round(40 + random(seed + 4) * 55),
  };
}

/**
 * 캡션 생성
 */
function generateCaption(signData, scores, date) {
  const dateStr = date.toISOString().split('T')[0];

  return `${signData.emoji} ${signData.nameKo} 오늘의 운세 (${dateStr})

⭐ 종합: ${scores.overall}점
❤️ 연애: ${scores.love}점
💼 업무: ${scores.career}점
💰 재물: ${scores.wealth}점
💪 건강: ${scores.health}점

${scores.overall >= 80 ? '🌟 오늘은 행운의 날! 적극적으로 도전하세요!' :
  scores.overall >= 60 ? '✨ 긍정적인 에너지가 흐르는 하루입니다!' :
  scores.overall >= 50 ? '☕ 평온한 하루, 여유를 가지세요.' :
  '🌙 신중한 선택이 필요한 날입니다.'}

#운세 #오늘의운세 #${signData.nameKo} #별자리운세 #데일리운세 #DestinyPal

📱 더 자세한 운세는 DestinyPal에서
https://destinypal.com`;
}

/**
 * 메인 함수
 */
async function main() {
  const today = new Date();
  console.log('🔮 Daily Fortune Auto-Post Starting...');
  console.log('📅 Date:', today.toISOString().split('T')[0]);
  console.log('');

  const results = [];

  for (const signData of ZODIAC_SIGNS) {
    console.log(`🌟 Processing ${signData.emoji} ${signData.nameKo}...`);

    try {
      // 1. 운세 점수 생성
      const scores = generateScores(signData.sign, today);
      console.log(`  📊 Scores: Overall ${scores.overall}, Love ${scores.love}, Career ${scores.career}`);

      // 2. AI 이미지 생성
      const imageUrl = await generateFortuneImage(signData);

      if (!imageUrl) {
        console.log(`  ⚠️  Skipping post due to image generation failure`);
        results.push({ sign: signData.nameKo, success: false, reason: 'image_gen_failed' });
        continue;
      }

      console.log(`  ✅ Image generated: ${imageUrl.substring(0, 50)}...`);

      // 3. 캡션 생성
      const caption = generateCaption(signData, scores, today);

      // 4. Instagram 포스팅
      const postId = await postToInstagram(imageUrl, caption);

      if (postId) {
        results.push({ sign: signData.nameKo, success: true, postId });
      } else {
        results.push({ sign: signData.nameKo, success: false, reason: 'post_failed' });
      }

      // Rate limit 방지 (2초 대기)
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
      results.push({ sign: signData.nameKo, success: false, reason: error.message });
    }

    console.log('');
  }

  // 결과 요약
  console.log('='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${results.length}`);
  console.log(`Success: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log('');

  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.sign}`);
  });

  console.log('\n🎉 Auto-post completed!');
}

// 실행
main().catch(console.error);
