import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  // 웹사이트의 실제 주소를 여기에 정확하게 입력해야 합니다.
  const baseUrl = 'https://destinypal.com';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: `${baseUrl}/destiny-map`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // 나중에 다른 페이지를 추가하면 여기에 계속 추가할 수 있습니다.
  ]
}

