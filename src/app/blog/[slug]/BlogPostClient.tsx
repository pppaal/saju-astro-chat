"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { blogPosts, BlogPost } from "@/data/blog-posts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./post.module.css";

interface BlogPostClientProps {
  post: BlogPost;
}

export default function BlogPostClient({ post }: BlogPostClientProps) {
  const { locale } = useI18n();
  const isKo = locale === "ko";

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

  const content = isKo ? post.contentKo : post.content;

  // Find related posts (same category, excluding current)
  const relatedPosts = blogPosts
    .filter((p) => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3);

  return (
    <main className={styles.page}>
      <div className={styles.stars} />

      <Link href="/blog" className={styles.backButton}>
        <span className={styles.backArrow}>←</span>
        <span>{isKo ? "블로그" : "Blog"}</span>
      </Link>

      <article className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerIcon}>{post.icon}</div>
          <span className={styles.category}>
            {isKo ? post.categoryKo : post.category}
          </span>
          <h1 className={styles.title}>{isKo ? post.titleKo : post.title}</h1>
          <p className={styles.excerpt}>
            {isKo ? post.excerptKo : post.excerpt}
          </p>
          <div className={styles.meta}>
            <span className={styles.date}>📅 {formatDate(post.date)}</span>
            <span className={styles.readTime}>
              ⏱ {post.readTime} {isKo ? "분 읽기" : "min read"}
            </span>
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.markdown}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>

        {/* CTA Section */}
        <section className={styles.cta}>
          <h3 className={styles.ctaTitle}>
            {isKo ? "직접 체험해보세요" : "Try It Yourself"}
          </h3>
          <p className={styles.ctaText}>
            {isKo
              ? `AI 기반 ${post.categoryKo} 리딩으로 맞춤형 인사이트를 받아보세요.`
              : `Get personalized insights with our AI-powered ${post.category} reading.`}
          </p>
          <Link href={getCategoryLink(post.category)} className={styles.ctaButton}>
            {isKo ? `${post.categoryKo} 시작하기` : `Try ${post.category}`}
          </Link>
        </section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className={styles.related}>
            <h3 className={styles.relatedTitle}>
              {isKo ? "관련 글" : "Related Articles"}
            </h3>
            <div className={styles.relatedGrid}>
              {relatedPosts.map((rPost) => (
                <Link
                  key={rPost.slug}
                  href={`/blog/${rPost.slug}`}
                  className={styles.relatedCard}
                >
                  <span className={styles.relatedIcon}>{rPost.icon}</span>
                  <h4 className={styles.relatedCardTitle}>
                    {isKo ? rPost.titleKo : rPost.title}
                  </h4>
                  <span className={styles.relatedMeta}>
                    {rPost.readTime} {isKo ? "분" : "min"}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <ScrollToTop label={isKo ? "맨 위로" : "Top"} />
    </main>
  );
}

function getCategoryLink(category: string): string {
  const links: Record<string, string> = {
    Saju: "/saju",
    Astrology: "/astrology",
    Tarot: "/tarot",
    Numerology: "/numerology",
    "I Ching": "/iching",
    Dream: "/dream",
    Compatibility: "/destiny-match",
    Personality: "/personality",
    "Destiny Map": "/destiny-map",
  };
  return links[category] || "/destiny-map";
}
