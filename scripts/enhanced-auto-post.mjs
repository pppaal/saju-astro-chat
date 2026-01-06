// scripts/enhanced-auto-post.mjs
// 매일 자동으로 운세/타로 콘텐츠를 생성하고 여러 SNS에 포스팅

import Replicate from 'replicate';
import fetch from 'node-fetch';

/**
 * Replicate로 이미지 생성
 */
async function generateImage(prompt, aspectRatio = '9:16') {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  console.log(`  🎨 Generating AI image...`);

  try {
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt,
          negative_prompt: "text, words, letters, watermark, signature, blurry, low quality",
          width: aspectRatio === '1:1' ? 1080 : 1080,
          height: aspectRatio === '1:1' ? 1080 : 1920,
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
      throw new Error(`Instagram container creation failed: ${JSON.stringify(containerData)}`);
    }

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
      throw new Error(`Instagram publish failed: ${JSON.stringify(publishData)}`);
    }

    console.log(`  ✅ Instagram posted: ${publishData.id}`);
    return publishData.id;

  } catch (error) {
    console.error(`  ❌ Instagram post failed:`, error.message);
    return null;
  }
}

/**
 * Facebook 페이지에 포스팅
 */
async function postToFacebook(imageUrl, message) {
  const { FACEBOOK_ACCESS_TOKEN, FACEBOOK_PAGE_ID } = process.env;

  if (!FACEBOOK_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
    console.log('  ⏭️  Facebook not configured, skipping...');
    return null;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/photos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imageUrl,
          caption: message,
          access_token: FACEBOOK_ACCESS_TOKEN,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Facebook post failed: ${JSON.stringify(data)}`);
    }

    console.log(`  ✅ Facebook posted: ${data.id}`);
    return data.id;

  } catch (error) {
    console.error(`  ❌ Facebook post failed:`, error.message);
    return null;
  }
}

/**
 * 카카오 스토리에 포스팅 (요청 형식)
 * Note: 카카오 API는 실제 서비스 등록 필요
 */
async function postToKakaoStory(imageUrl, content) {
  const { KAKAO_ACCESS_TOKEN } = process.env;

  if (!KAKAO_ACCESS_TOKEN) {
    console.log('  ⏭️  Kakao Story not configured, skipping...');
    return null;
  }

  try {
    // 카카오 스토리 API - 실제 사용 시 수정 필요
    console.log(`  ℹ️  Kakao Story: Would post "${content.substring(0, 50)}..."`);
    return 'kakao_story_mock_id';

  } catch (error) {
    console.error(`  ❌ Kakao Story post failed:`, error.message);
    return null;
  }
}

/**
 * 콘텐츠 타입들
 */
const CONTENT_TYPES = {
  DAILY_FORTUNE: 'daily_fortune',
  TAROT_CARD: 'tarot_card',
  SAJU_TIP: 'saju_tip',
  MOTIVATION: 'motivation',
};

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
 * 타로 카드 데이터 (일부)
 */
const TAROT_CARDS = [
  { name: 'The Fool', nameKo: '바보', number: 0, keywords: ['새로운 시작', '순수함', '모험'] },
  { name: 'The Magician', nameKo: '마법사', number: 1, keywords: ['창조', '능력', '의지'] },
  { name: 'The High Priestess', nameKo: '여사제', number: 2, keywords: ['직관', '신비', '내면'] },
  { name: 'The Empress', nameKo: '여황제', number: 3, keywords: ['풍요', '창조', '양육'] },
  { name: 'The Emperor', nameKo: '황제', number: 4, keywords: ['권위', '안정', '질서'] },
  { name: 'The Lovers', nameKo: '연인', number: 6, keywords: ['사랑', '선택', '조화'] },
  { name: 'The Chariot', nameKo: '전차', number: 7, keywords: ['의지', '승리', '방향'] },
  { name: 'Strength', nameKo: '힘', number: 8, keywords: ['용기', '인내', '자제'] },
  { name: 'The Hermit', nameKo: '은둔자', number: 9, keywords: ['성찰', '지혜', '고독'] },
  { name: 'Wheel of Fortune', nameKo: '운명의 수레바퀴', number: 10, keywords: ['변화', '운명', '순환'] },
];

/**
 * 운세 점수 생성
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
 * 오늘의 별자리 운세 콘텐츠 생성
 */
async function createDailyFortuneContent(date) {
  // 랜덤으로 3개 별자리 선택
  const selectedSigns = ZODIAC_SIGNS
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const posts = [];

  for (const signData of selectedSigns) {
    const scores = generateScores(signData.sign, date);

    const prompt = `Beautiful mystical cosmic background for ${signData.nameKo} zodiac sign ${signData.emoji}, magical starry atmosphere, gradient colors ${signData.colors.join(' and ')}, dreamy ethereal lighting, professional social media post design, 1080x1920 portrait format, ultra high quality`;

    const imageUrl = await generateImage(prompt, '9:16');

    if (!imageUrl) continue;

    const caption = `${signData.emoji} ${signData.nameKo} 오늘의 운세

⭐ 종합: ${scores.overall}점
❤️ 연애: ${scores.love}점
💼 업무: ${scores.career}점
💰 재물: ${scores.wealth}점

${scores.overall >= 80 ? '🌟 오늘은 행운의 날! 적극적으로 도전하세요!' :
  scores.overall >= 60 ? '✨ 긍정적인 에너지가 흐르는 하루!' :
  '☕ 평온하게 하루를 시작하세요.'}

📱 무료로 내 운세 보기 👉 destinypal.com

#운세 #오늘의운세 #${signData.nameKo} #별자리운세 #무료운세 #DestinyPal`;

    posts.push({
      type: 'daily_fortune',
      imageUrl,
      caption,
      signData,
      scores,
    });
  }

  return posts;
}

/**
 * 오늘의 타로 카드 콘텐츠 생성
 */
async function createTarotCardContent(date) {
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const card = TAROT_CARDS[dayOfYear % TAROT_CARDS.length];

  const prompt = `Beautiful mystical tarot card illustration for ${card.name}, magical atmosphere, golden borders, ethereal lighting, professional tarot card design, cosmic background, 1080x1080 square format, ultra high quality`;

  const imageUrl = await generateImage(prompt, '1:1');

  if (!imageUrl) return null;

  const caption = `🔮 오늘의 타로 카드: ${card.nameKo}

✨ 키워드: ${card.keywords.join(', ')}

${card.keywords[0]}의 에너지가 당신을 감싸고 있습니다.
오늘은 이런 마음가짐으로 하루를 시작해보세요!

더 자세한 타로 풀이가 궁금하다면? 👇
📱 destinypal.com에서 무료로 보기

#타로 #오늘의타로 #타로카드 #타로점 #무료타로 #DestinyPal`;

  return {
    type: 'tarot_card',
    imageUrl,
    caption,
    card,
  };
}

/**
 * 메인 함수
 */
async function main() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  console.log('🔮 Enhanced Auto-Post Starting...');
  console.log('📅 Date:', dateStr);
  console.log('');

  const allResults = [];

  // 1. 별자리 운세 포스팅 (3개)
  console.log('🌟 Creating daily fortune content...');
  const fortunePosts = await createDailyFortuneContent(today);

  for (const post of fortunePosts) {
    console.log(`\n📝 Posting ${post.signData.emoji} ${post.signData.nameKo}...`);

    const instagramId = await postToInstagram(post.imageUrl, post.caption);
    const facebookId = await postToFacebook(post.imageUrl, post.caption);

    allResults.push({
      type: 'fortune',
      sign: post.signData.nameKo,
      instagram: !!instagramId,
      facebook: !!facebookId,
    });

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // 2. 타로 카드 포스팅 (1개)
  console.log('\n\n🔮 Creating tarot card content...');
  const tarotPost = await createTarotCardContent(today);

  if (tarotPost) {
    console.log(`\n📝 Posting ${tarotPost.card.nameKo}...`);

    const instagramId = await postToInstagram(tarotPost.imageUrl, tarotPost.caption);
    const facebookId = await postToFacebook(tarotPost.imageUrl, tarotPost.caption);

    allResults.push({
      type: 'tarot',
      card: tarotPost.card.nameKo,
      instagram: !!instagramId,
      facebook: !!facebookId,
    });
  }

  // 결과 요약
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total posts: ${allResults.length}`);
  console.log(`Instagram: ${allResults.filter(r => r.instagram).length} posted`);
  console.log(`Facebook: ${allResults.filter(r => r.facebook).length} posted`);
  console.log('');

  allResults.forEach(r => {
    const ig = r.instagram ? '✅' : '❌';
    const fb = r.facebook ? '✅' : '❌';
    const name = r.sign || r.card;
    console.log(`${r.type.padEnd(10)} ${name.padEnd(15)} IG:${ig} FB:${fb}`);
  });

  console.log('\n🎉 Auto-post completed!');
}

// 실행
main().catch(console.error);
