"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./destiny-map.module.css";

export default function DestinyMapPage() {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [city, setCity] = useState("Seoul");
  const [gender, setGender] = useState("Male");
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      name,
      birthDate,
      birthTime,
      city,
      gender,
    });
    router.push(`/destiny-map/result?${params.toString()}`);
  };

  return (
    <div className={styles.wrapper}>
      <main className={styles.page}>
        <section className={styles.card}>
          <h1 className={styles.title}>Destiny Map</h1>
          <p className={styles.subtitle}>Provide your birth details to begin.</p>

          <form onSubmit={onSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input className={styles.input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label}>Birth Date</label>
                <input className={styles.input} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Birth Time</label>
                <input className={styles.input} type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label}>Birth City (English)</label>
                <input className={styles.input} placeholder="Seoul" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Gender</label>
                <select className={styles.input} value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
            </div>

            <button className={styles.primary} type="submit">Analyze</button>
          </form>
        </section>
      </main>
    </div>
  );
}