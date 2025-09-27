import React from "react";
import styles from "./result.module.css";
import { analyzeDestiny } from "@/components/destiny-map/Analyzer";
import Display from "@/components/destiny-map/Display";

type SP = Record<string, string | undefined>;

export default async function DestinyResultPage({
  searchParams,
}: {
  searchParams: Promise<SP>; // Next 15: 비동기
}) {
  const sp = await searchParams;

  const name = sp.name ?? "";
  const birthDate = sp.birthDate ?? "";
  const birthTime = sp.birthTime ?? "";
  const city = sp.city ?? "";
  const gender = sp.gender ?? "";

  const result = await analyzeDestiny({ name, birthDate, birthTime, city, gender });

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Destiny Map -- Results</h1>
          <p className={styles.subtitle}>
            Holistic reading using your Saju pillars and luck cycles with Astrology.
          </p>
          <div className={styles.profile}>
            <span className={styles.kv}><b>Name:</b> {name || "--"}</span>
            <span className={styles.kv}><b>Birth Date:</b> {birthDate || "--"}</span>
            <span className={styles.kv}><b>Birth Time:</b> {birthTime || "--"}</span>
            <span className={styles.kv}><b>City:</b> {city || "--"}</span>
            <span className={styles.kv}><b>Gender:</b> {gender || "--"}</span>
          </div>
        </header>

        <Display result={result} />

        <footer className={styles.footer}>
          <a className={styles.back} href="/destiny-map">← Back to form</a>
        </footer>
      </section>
    </main>
  );
}