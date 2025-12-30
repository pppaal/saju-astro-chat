// src/lib/marketing/socialMediaPoster.ts
// 소셜 미디어 자동 포스팅 시스템 (Instagram, Twitter/X)

import type { DailyFortune } from './dailyFortuneGenerator';
import { generateShareText } from './dailyFortuneGenerator';

/**
 * Instagram Graph API 설정
 * https://developers.facebook.com/docs/instagram-api
 */
interface InstagramConfig {
  accessToken: string;
  instagramAccountId: string;
}

/**
 * Twitter API v2 설정
 */
interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

/**
 * 포스팅 결과
 */
export interface PostResult {
  success: boolean;
  platform: 'instagram' | 'twitter';
  postId?: string;
  error?: string;
  url?: string;
}

/**
 * Instagram에 이미지 포스팅
 *
 * 필요한 권한:
 * - instagram_basic
 * - instagram_content_publish
 * - pages_read_engagement
 *
 * 프로세스:
 * 1. 이미지 업로드 (Container 생성)
 * 2. Container 발행 (실제 게시)
 */
export async function postToInstagram(
  imageUrl: string,
  caption: string,
  config: InstagramConfig
): Promise<PostResult> {
  try {
    const { accessToken, instagramAccountId } = config;

    // Step 1: 미디어 컨테이너 생성
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: accessToken,
        }),
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.json();
      throw new Error(`Instagram container creation failed: ${JSON.stringify(error)}`);
    }

    const containerData = await containerResponse.json() as { id: string };
    const creationId = containerData.id;

    // Step 2: 컨테이너 발행 (게시)
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(`Instagram publish failed: ${JSON.stringify(error)}`);
    }

    const publishData = await publishResponse.json() as { id: string };

    return {
      success: true,
      platform: 'instagram',
      postId: publishData.id,
      url: `https://www.instagram.com/p/${publishData.id}/`,
    };

  } catch (error) {
    console.error('[Instagram Post Error]', error);
    return {
      success: false,
      platform: 'instagram',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Instagram Stories에 포스팅
 */
export async function postToInstagramStory(
  imageUrl: string,
  config: InstagramConfig
): Promise<PostResult> {
  try {
    const { accessToken, instagramAccountId } = config;

    // Step 1: 스토리 컨테이너 생성
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          media_type: 'STORIES',
          access_token: accessToken,
        }),
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.json();
      throw new Error(`Instagram story container failed: ${JSON.stringify(error)}`);
    }

    const containerData = await containerResponse.json() as { id: string };

    // Step 2: 발행
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(`Instagram story publish failed: ${JSON.stringify(error)}`);
    }

    const publishData = await publishResponse.json() as { id: string };

    return {
      success: true,
      platform: 'instagram',
      postId: publishData.id,
    };

  } catch (error) {
    console.error('[Instagram Story Error]', error);
    return {
      success: false,
      platform: 'instagram',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Twitter/X에 이미지와 함께 트윗
 *
 * Twitter API v2 사용
 * https://developer.twitter.com/en/docs/twitter-api
 */
export async function postToTwitter(
  imageUrl: string,
  text: string,
  config: TwitterConfig
): Promise<PostResult> {
  try {
    // 이미지를 먼저 업로드해야 함
    const mediaId = await uploadMediaToTwitter(imageUrl, config);

    // 트윗 생성
    const tweetResponse = await fetch(
      'https://api.twitter.com/2/tweets',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.accessToken}`,
        },
        body: JSON.stringify({
          text: text.slice(0, 280), // 280자 제한
          media: {
            media_ids: [mediaId],
          },
        }),
      }
    );

    if (!tweetResponse.ok) {
      const error = await tweetResponse.json();
      throw new Error(`Twitter post failed: ${JSON.stringify(error)}`);
    }

    const tweetData = await tweetResponse.json() as { data: { id: string } };

    return {
      success: true,
      platform: 'twitter',
      postId: tweetData.data.id,
      url: `https://twitter.com/i/web/status/${tweetData.data.id}`,
    };

  } catch (error) {
    console.error('[Twitter Post Error]', error);
    return {
      success: false,
      platform: 'twitter',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Twitter에 미디어 업로드
 */
async function uploadMediaToTwitter(
  imageUrl: string,
  config: TwitterConfig
): Promise<string> {
  // 이미지 다운로드
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();

  // Twitter Media Upload API (v1.1 사용)
  const formData = new FormData();
  formData.append('media', new Blob([imageBuffer]));

  const uploadResponse = await fetch(
    'https://upload.twitter.com/1.1/media/upload.json',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: formData,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(`Twitter media upload failed: ${JSON.stringify(error)}`);
  }

  const uploadData = await uploadResponse.json() as { media_id_string: string };
  return uploadData.media_id_string;
}

/**
 * 모든 플랫폼에 동시 포스팅
 */
export async function postToAllPlatforms(
  fortune: DailyFortune,
  imageUrl: string,
  platforms: {
    instagram?: InstagramConfig;
    twitter?: TwitterConfig;
  }
): Promise<PostResult[]> {
  const results: PostResult[] = [];
  const shareText = generateShareText(fortune);

  // Instagram 포스팅
  if (platforms.instagram) {
    const instagramResult = await postToInstagram(
      imageUrl,
      shareText,
      platforms.instagram
    );
    results.push(instagramResult);

    // Instagram Stories도 추가
    const storyResult = await postToInstagramStory(
      imageUrl,
      platforms.instagram
    );
    results.push(storyResult);
  }

  // Twitter 포스팅
  if (platforms.twitter) {
    const twitterResult = await postToTwitter(
      imageUrl,
      shareText,
      platforms.twitter
    );
    results.push(twitterResult);
  }

  return results;
}

/**
 * 환경 변수에서 설정 로드
 */
export function loadSocialMediaConfig(): {
  instagram?: InstagramConfig;
  twitter?: TwitterConfig;
} {
  const config: {
    instagram?: InstagramConfig;
    twitter?: TwitterConfig;
  } = {};

  // Instagram 설정
  if (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCOUNT_ID) {
    config.instagram = {
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
      instagramAccountId: process.env.INSTAGRAM_ACCOUNT_ID,
    };
  }

  // Twitter 설정
  if (
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_TOKEN_SECRET
  ) {
    config.twitter = {
      apiKey: process.env.TWITTER_API_KEY,
      apiSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    };
  }

  return config;
}
