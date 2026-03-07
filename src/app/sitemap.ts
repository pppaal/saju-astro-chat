import { MetadataRoute } from 'next'
import { blogPosts } from '@/data/blog-posts'
import { isBlockedBlogPost } from '@/data/blog/publicFilters'
import { ENABLED_SERVICES, REMOVED_PUBLIC_SERVICE_PREFIXES } from '@/config/enabledServices'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date().toISOString()

  // Main public pages
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/premium-reports`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/destiny-counselor`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about/features`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/about/matrix`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]

  const servicePaths = [
    ...ENABLED_SERVICES.map((service) => service.href),
    ...REMOVED_PUBLIC_SERVICE_PREFIXES,
  ]

  const servicePages: MetadataRoute.Sitemap = Array.from(new Set(servicePaths)).map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Policy pages
  const policyPages: MetadataRoute.Sitemap = ['terms', 'privacy', 'refund'].map((policy) => ({
    url: `${BASE_URL}/policy/${policy}`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  // Blog posts
  const blogPages: MetadataRoute.Sitemap = blogPosts
    .filter((post) => !isBlockedBlogPost(post))
    .map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.date || currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

  return [...mainPages, ...servicePages, ...policyPages, ...blogPages]
}
