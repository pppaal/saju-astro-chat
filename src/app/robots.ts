import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

  // 비공개·기능 경로 — 모든 크롤러(AI 포함)에게 동일하게 차단.
  const disallow = [
    '/api/',
    '/admin/',
    '/_next/',
    '/private/',
    '/auth/',
    '/profile/',
    '/success/',
    '/api-docs/',
    '/offline/',
    '/shared/',
    '/tarot/history/',
  ]

  // GEO(생성형 엔진 최적화) — ChatGPT·Perplexity·Claude·Gemini 등 AI 답변에
  // 인용/노출되도록 주요 AI 크롤러를 명시적으로 허용한다. 검색·브라우징(인용)
  // 봇과 학습 봇 모두 허용하되, 위 비공개 경로는 동일하게 차단한다.
  // (직전엔 GPTBot·CCBot 을 전면 차단해 AI 학습/인용에서 빠져 있었음.)
  const aiBots = [
    'GPTBot', // OpenAI 학습 크롤러
    'OAI-SearchBot', // ChatGPT 검색 인용
    'ChatGPT-User', // ChatGPT 사용자 브라우징
    'CCBot', // Common Crawl (다수 AI 데이터셋)
    'ClaudeBot', // Anthropic 크롤러
    'anthropic-ai',
    'Claude-User',
    'PerplexityBot', // Perplexity 색인
    'Perplexity-User', // Perplexity 사용자 인용
    'Google-Extended', // Gemini / AI Overviews grounding
    'Applebot-Extended', // Apple Intelligence
  ]

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...aiBots.map((userAgent) => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
