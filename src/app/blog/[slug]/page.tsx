"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { blogPosts } from "@/data/blog-posts";
import styles from "./post.module.css";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <main className={styles.page}>
        <div className={styles.stars} />
        <div className={styles.main}>
          <div className={styles.notFound}>
            <h1>{isKo ? "글을 찾을 수 없습니다" : "Post Not Found"}</h1>
            <p>
              {isKo
                ? "요청하신 글이 존재하지 않습니다."
                : "The post you're looking for doesn't exist."}
            </p>
            <Link href="/blog" className={styles.backToList}>
              {isKo ? "블로그로 돌아가기" : "Back to Blog"}
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
          <div
            className={styles.markdown}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
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
    "Saju": "/saju",
    "Astrology": "/astrology",
    "Tarot": "/tarot",
    "Numerology": "/numerology",
    "I Ching": "/iching",
    "Dream": "/dream",
    "Compatibility": "/compatibility",
  };
  return links[category] || "/destiny-map";
}

function renderMarkdown(content: string): string {
  // Simple markdown to HTML conversion
  let html = content
    // Escape HTML first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    // Tables (basic support)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => /^[-\s:]+$/.test(c))) return ''; // Skip separator rows
      const cellHtml = cells.map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cellHtml}</tr>`;
    })
    // Paragraphs
    .split('\n\n')
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<tr')) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  // Wrap lists
  html = html.replace(/(<li>.+<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Wrap tables
  html = html.replace(/(<tr>.+<\/tr>\n?)+/g, (match) => `<table>${match}</table>`);

  return html;
}
