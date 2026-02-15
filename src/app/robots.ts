import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/private/',
          '/myjourney/',
          '/auth/',
          '/profile/',
          '/success/',
          '/test-credit-modal/',
          '/notifications/',
          '/api-docs/',
          '/offline/',
          '/shared/',
          '/demo/',
          '/astrology/',
          '/saju/',
          '/numerology/',
          '/dream/',
          '/iching/',
          '/past-life/',
          '/destiny-match/',
          '/life-prediction/',
          '/personality/',
          '/icp/',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
