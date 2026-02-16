import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { blogPosts } from '@/data/blog-posts'
import { isBlockedBlogPost } from '@/data/blog/publicFilters'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd } from '@/components/seo/SEO'
import BlogPostClient from './BlogPostClient'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (isBlockedBlogPost({ slug })) {
    return {
      title: 'Blog | DestinyPal',
      description: 'Explore DestinyPal blog posts and guides.',
      keywords: ['blog', 'destiny', 'saju', 'astrology', 'tarot', 'i ching', 'dream'],
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'}/blog`,
      },
    }
  }
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post || isBlockedBlogPost(post)) {
    return {
      title: 'Post Not Found | DestinyPal Blog',
      description: 'The requested blog post could not be found.',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

  return {
    title: `${post.title} | DestinyPal Blog`,
    description: post.excerpt,
    keywords: [
      post.category,
      'fortune telling',
      'divination',
      'destiny',
      'saju',
      'astrology',
      'tarot',
    ],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: ['DestinyPal'],
      tags: [post.category],
      url: `${baseUrl}/blog/${post.slug}`,
      siteName: 'DestinyPal',
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [`${baseUrl}/og-image.png`],
    },
    alternates: {
      canonical: `${baseUrl}/blog/${post.slug}`,
      languages: {
        en: `${baseUrl}/blog/${post.slug}`,
        ko: `${baseUrl}/blog/${post.slug}`,
      },
    },
  }
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  if (isBlockedBlogPost({ slug })) {
    redirect('/blog')
  }
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post || isBlockedBlogPost(post)) {
    notFound()
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

  const articleJsonLd = generateJsonLd({
    type: 'Article',
    name: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    image: `${baseUrl}/og-image.png`,
    url: `${baseUrl}/blog/${post.slug}`,
    author: { name: 'DestinyPal', url: baseUrl },
  })

  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: 'Home', url: baseUrl },
      { name: 'Blog', url: `${baseUrl}/blog` },
      { name: post.title, url: `${baseUrl}/blog/${post.slug}` },
    ],
  })

  const relatedPosts = blogPosts
    .filter((p) => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3)

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <BlogPostClient post={post} relatedPosts={relatedPosts} />
    </>
  )
}
