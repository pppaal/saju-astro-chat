import Link from "next/link";
import styles from "./faq.module.css";

const faqs = [
  { q: "How accurate is DestinyPal?", a: "We combine Saju, Astrology, Tarot, and AI. This is guidance—not a substitute for professional advice." },
  { q: "Can I access my previous readings?", a: "Yes, log in and go to My Journey to see your saved readings and insights." },
  { q: "Is my data secure?", a: "We store only what's needed, encrypt sensitive data, and never share without consent." },
  { q: "How often should I get a reading?", a: "Use daily or weekly for guidance; deeper questions can be revisited when life changes." },
];

export default function FaqPage() {
  return (
    <main className={styles.container}>
      <div className={styles.backButtonContainer}>
        <Link href="/" className={styles.backButton}>{"< Back"}</Link>
      </div>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>DestinyPal FAQ</p>
        <h1 className={styles.title}>Questions people ask often</h1>
        <p className={styles.subtitle}>If you need more help, reach us via Contact.</p>
      </section>
      <section className={styles.faqGrid}>
        {faqs.map((item, idx) => (
          <div key={idx} className={styles.card}>
            <h3 className={styles.question}>{item.q}</h3>
            <p className={styles.answer}>{item.a}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
