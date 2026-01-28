import Link from "next/link";

type CSSModule = Record<string, string>;

interface CTASectionProps {
  translate: (key: string, fallback: string) => string;
  styles: CSSModule;
}

export default function CTASection({ translate, styles }: CTASectionProps) {
  return (
    <section className={styles.ctaSection}>
      <div className={styles.ctaContent}>
        <h2 className={styles.ctaTitle}>
          {translate("landing.ctaTitle", "더 나은 결정을 만드세요")}
        </h2>
        <p className={styles.ctaSubtitle}>
          {translate("landing.ctaSubtitle", "AI가 당신의 운명을 읽고, 최선의 선택을 안내합니다")}
        </p>
        <Link href="/destiny-map" className={styles.ctaButton}>
          {translate("landing.ctaButton", "지금 시작하기 →")}
        </Link>
      </div>
    </section>
  );
}
