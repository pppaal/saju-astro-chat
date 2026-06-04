'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useI18n } from '@/i18n/I18nProvider'
import ScrollToTop from '@/components/ui/ScrollToTop'
import { EmptyState } from '@/components/ui/EmptyState'
import { categories } from '@/data/blog-categories'
import { getBlogPostsIndex } from '@/data/blogPostLoader'
import type { BlogPost } from '@/data/blog-posts'
import blogMetadata from '@/data/blog/metadata/blog-metadata.json'
import { isBlockedBlogPost } from '@/data/blog/publicFilters'
import BlogArt, { BlogHeroArt, StarGlyph, ClockGlyph } from './BlogArt'
import styles from './blog.module.css'

const fallbackBlogPosts = (blogMetadata as BlogPost[]).filter((post) => !isBlockedBlogPost(post))

export default function BlogClient() {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const [activeCategory, setActiveCategory] = useState('all')
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(fallbackBlogPosts)

  useEffect(() => {
    getBlogPostsIndex()
      .then((posts) => {
        setBlogPosts(posts.length > 0 ? posts : fallbackBlogPosts)
      })
      .catch(() => {
        setBlogPosts(fallbackBlogPosts)
      })
  }, [])

  const filteredPosts = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '-')
    const posts =
      activeCategory === 'all'
        ? blogPosts
        : blogPosts.filter((post) => normalize(post.category) === normalize(activeCategory))
    // 최신 날짜순 정렬
    return [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [activeCategory, blogPosts])

  const postsForRender = useMemo(() => {
    if (filteredPosts.length > 0) {
      return filteredPosts
    }
    if (blogPosts.length === 0) {
      return []
    }
    return [...blogPosts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [blogPosts, filteredPosts])

  const featuredPost = postsForRender.find((post) => post.featured)
  const regularPosts = postsForRender.filter((post) => !post.featured)
  const guideLabel = isKo ? '상시 가이드' : 'Evergreen Guide'

  return (
    <main className={styles.page}>
      <div className={styles.stars} />

      <div className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroIcon} role="img" aria-label={isKo ? '블로그' : 'Blog'}>
            <BlogHeroArt />
          </div>
          <p className={styles.eyebrow}>DestinyPal Blog</p>
          <h1 className={styles.title}>{isKo ? '인사이트 & 가이드' : 'Insights & Guides'}</h1>
          <p className={styles.subtitle}>
            {isKo
              ? '업데이트되는 상시 가이드로 점성술·사주·타로 인사이트를 빠르게 확인하세요'
              : 'Explore evergreen guides for practical insights across astrology, Saju, and Tarot'}
          </p>
        </section>

        {/* Category Filter */}
        <nav
          className={styles.categoryFilter}
          aria-label={isKo ? '블로그 카테고리 필터' : 'Blog category filter'}
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.categoryBtn} ${activeCategory === cat.id ? styles.active : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              aria-label={isKo ? `${cat.nameKo} 카테고리 필터` : `Filter by ${cat.name}`}
              aria-pressed={activeCategory === cat.id}
            >
              {isKo ? cat.nameKo : cat.name}
            </button>
          ))}
        </nav>

        {/* Blog Grid */}
        <div className={styles.blogGrid}>
          {/* Featured Post */}
          {featuredPost && activeCategory === 'all' && (
            <Link
              href={`/blog/${featuredPost.slug}`}
              className={`${styles.blogCard} ${styles.featuredPost}`}
            >
              <div className={styles.cardImage}>
                <div
                  className={styles.cardImagePlaceholder}
                  role="img"
                  aria-label={isKo ? featuredPost.categoryKo : featuredPost.category}
                >
                  <BlogArt slug={featuredPost.slug} category={featuredPost.category} />
                </div>
              </div>
              <div className={styles.cardContent}>
                <span className={styles.featuredBadge}>
                  <StarGlyph />{' '}
                  {isKo ? '추천' : 'Featured'}
                </span>
                <span className={styles.cardCategory}>
                  {isKo ? featuredPost.categoryKo : featuredPost.category}
                </span>
                <h2 className={styles.cardTitle}>
                  {isKo ? featuredPost.titleKo : featuredPost.title}
                </h2>
                <p className={styles.cardExcerpt}>
                  {isKo ? featuredPost.excerptKo : featuredPost.excerpt}
                </p>
                <div className={styles.cardMeta}>
                  <span className={styles.cardGuide}>{guideLabel}</span>
                  <span className={styles.cardReadTime}>
                    <ClockGlyph />{' '}
                    {featuredPost.readTime} {isKo ? '분' : 'min read'}
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Regular Posts */}
          {regularPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.blogCard}>
              <div className={styles.cardImage}>
                <div
                  className={styles.cardImagePlaceholder}
                  role="img"
                  aria-label={isKo ? post.categoryKo : post.category}
                >
                  <BlogArt slug={post.slug} category={post.category} />
                </div>
              </div>
              <div className={styles.cardContent}>
                <span className={styles.cardCategory}>
                  {isKo ? post.categoryKo : post.category}
                </span>
                <h2 className={styles.cardTitle}>{isKo ? post.titleKo : post.title}</h2>
                <p className={styles.cardExcerpt}>{isKo ? post.excerptKo : post.excerpt}</p>
                <div className={styles.cardMeta}>
                  <span className={styles.cardGuide}>{guideLabel}</span>
                  <span className={styles.cardReadTime}>
                    <ClockGlyph />{' '}
                    {post.readTime} {isKo ? '분' : 'min read'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {postsForRender.length === 0 && (
          <EmptyState
            icon="📝"
            title={isKo ? '이 카테고리에 아직 글이 없습니다' : 'No posts in this category yet'}
            description={isKo ? '다른 카테고리를 탐색해보세요' : 'Try exploring other categories'}
            actionLabel={isKo ? '전체 보기' : 'View All'}
            onAction={() => setActiveCategory('all')}
          />
        )}
      </div>

      <ScrollToTop label={isKo ? '맨 위로' : 'Top'} />
    </main>
  )
}
