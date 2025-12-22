"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { blogPosts, categories } from "@/data/blog-posts";
import styles from "./blog.module.css";

export default function BlogClient() {
  const { locale } = useI18n();
  const isKo = locale === "ko";
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredPosts = useMemo(() => {
    const posts =
      activeCategory === "all"
        ? blogPosts
        : blogPosts.filter((post) => post.category === activeCategory);
    // 최신 날짜순 정렬
    return [...posts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [activeCategory]);

  const featuredPost = filteredPosts.find((post) => post.featured);
  const regularPosts = filteredPosts.filter((post) => !post.featured);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isKo) {
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <main className={styles.page}>
      <div className={styles.stars} />

      <Link href="/" className={styles.backButton}>
        <span className={styles.backArrow}>←</span>
        <span>{isKo ? "홈으로" : "Home"}</span>
      </Link>

      <div className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroIcon}>📚</div>
          <p className={styles.eyebrow}>DestinyPal Blog</p>
          <h1 className={styles.title}>
            {isKo ? "인사이트 & 가이드" : "Insights & Guides"}
          </h1>
          <p className={styles.subtitle}>
            {isKo
              ? "점성술, 사주, 타로 등 동서양 점술의 지혜를 탐구하세요"
              : "Explore the wisdom of Eastern and Western divination systems"}
          </p>
        </section>

        {/* Category Filter */}
        <div className={styles.categoryFilter}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.categoryBtn} ${activeCategory === cat.id ? styles.active : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {isKo ? cat.nameKo : cat.name}
            </button>
          ))}
        </div>

        {/* Blog Grid */}
        <div className={styles.blogGrid}>
          {/* Featured Post */}
          {featuredPost && activeCategory === "all" && (
            <Link
              href={`/blog/${featuredPost.slug}`}
              className={`${styles.blogCard} ${styles.featuredPost}`}
            >
              <div className={styles.cardImage}>
                <div className={styles.cardImagePlaceholder}>
                  {featuredPost.icon}
                </div>
              </div>
              <div className={styles.cardContent}>
                <span className={styles.featuredBadge}>
                  ⭐ {isKo ? "추천" : "Featured"}
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
                  <span className={styles.cardDate}>
                    📅 {formatDate(featuredPost.date)}
                  </span>
                  <span className={styles.cardReadTime}>
                    ⏱ {featuredPost.readTime} {isKo ? "분" : "min read"}
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Regular Posts */}
          {regularPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className={styles.blogCard}
            >
              <div className={styles.cardImage}>
                <div className={styles.cardImagePlaceholder}>{post.icon}</div>
              </div>
              <div className={styles.cardContent}>
                <span className={styles.cardCategory}>
                  {isKo ? post.categoryKo : post.category}
                </span>
                <h2 className={styles.cardTitle}>
                  {isKo ? post.titleKo : post.title}
                </h2>
                <p className={styles.cardExcerpt}>
                  {isKo ? post.excerptKo : post.excerpt}
                </p>
                <div className={styles.cardMeta}>
                  <span className={styles.cardDate}>
                    📅 {formatDate(post.date)}
                  </span>
                  <span className={styles.cardReadTime}>
                    ⏱ {post.readTime} {isKo ? "분" : "min read"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <p style={{ fontSize: "18px" }}>
              {isKo
                ? "이 카테고리에 아직 글이 없습니다."
                : "No posts in this category yet."}
            </p>
          </div>
        )}
      </div>

      <ScrollToTop label={isKo ? "맨 위로" : "Top"} />
    </main>
  );
}
