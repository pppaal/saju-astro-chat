"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import ScrollToTop from "@/components/ui/ScrollToTop";
import type { BlogPost } from "@/data/blog-posts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCategoryRoute } from "@/lib/constants/routes";
import styles from "./post.module.css";

interface BlogPostClientProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export default function BlogPostClient({ post, relatedPosts }: BlogPostClientProps) {
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

  const isSafeUri = (uri: string) => {
    const trimmed = uri.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith("#") || trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
      return true;
    }
    try {
      const parsed = new URL(trimmed, "https://example.com");
      return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  const urlTransform = (uri: string) => {
    if (!uri) {
      return "";
    }
    if (!isSafeUri(uri)) {
      return "";
    }
    try {
      const parsed = new URL(uri, "https://example.com");
      return ["http:", "https:", "data:", "mailto:", "tel:"].includes(parsed.protocol) ? uri : "";
    } catch {
      return "";
    }
  };

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
          <div className={styles.headerIcon} role="img" aria-label={isKo ? post.categoryKo : post.category}>{post.icon}</div>
          <span className={styles.category}>
            {isKo ? post.categoryKo : post.category}
          </span>
          <h1 className={styles.title}>{isKo ? post.titleKo : post.title}</h1>
          <p className={styles.excerpt}>
            {isKo ? post.excerptKo : post.excerpt}
          </p>
          <div className={styles.meta}>
            <span className={styles.date}><span role="img" aria-hidden="true">📅</span> {formatDate(post.date)}</span>
            <span className={styles.readTime}>
              <span role="img" aria-hidden="true">⏱</span> {post.readTime} {isKo ? "분 읽기" : "min read"}
            </span>
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.markdown}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={urlTransform}
              components={{
                a: ({ node: _node, ...props }) => (
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
          <Link href={getCategoryRoute(post.category)} className={styles.ctaButton}>
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
                  <span className={styles.relatedIcon} role="img" aria-label={isKo ? rPost.categoryKo : rPost.category}>{rPost.icon}</span>
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
