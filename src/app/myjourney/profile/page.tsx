"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { searchCities } from "@/lib/cities";
import tzLookup from "tz-lookup";
import styles from "./profile.module.css";

type CityHit = {
  name: string;
  country: string;
  lat: number;
  lon: number;
  timezone?: string;
};

export default function ProfilePage() {
  return (
    <SessionProvider>
      <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
        <ProfileContent />
      </Suspense>
    </SessionProvider>
  );
}

function ProfileContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"M" | "F">("M");
  const [city, setCity] = useState("");
  const [tzId, setTzId] = useState<string>(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  // City search states
  const [suggestions, setSuggestions] = useState<CityHit[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityHit | null>(null);
  const [openSug, setOpenSug] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/myjourney");
    }
  }, [status, router]);

  useEffect(() => {
    const load = async () => {
      if (status !== "authenticated") return;
      const res = await fetch("/api/me/profile", { cache: "no-store" });
      if (!res.ok) return;
      const { user } = await res.json();
      if (!user) return;
      if (user.birthDate) setBirthDate(user.birthDate);
      if (user.birthTime) setBirthTime(user.birthTime);
      if (user.gender) setGender(user.gender);
      if (user.birthCity) setCity(user.birthCity);
      if (user.tzId) setTzId(user.tzId);
    };
    load();
  }, [status]);

  // City search effect
  useEffect(() => {
    const q = city.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const hits = (await searchCities(q, { limit: 8 })) as CityHit[];
        setSuggestions(hits);
        if (isUserTyping) {
          setOpenSug(hits.length > 0);
        }
      } catch {
        setSuggestions([]);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [city, isUserTyping]);

  const onPickCity = (hit: CityHit) => {
    setIsUserTyping(false);
    setCity(`${hit.name}, ${hit.country}`);
    const tz = hit.timezone ?? tzLookup(hit.lat, hit.lon);
    setSelectedCity({ ...hit, timezone: tz });
    setTzId(tz);
    setOpenSug(false);
  };

  const saveBirthInfo = async () => {
    setMsg("");
    if (!birthDate) {
      setMsg("Please select your date of birth.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/user/update-birth-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate,
          birthTime: birthTime || null,
          gender,
          birthCity: city || null,
          tzId: tzId || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      setMsg("Saved successfully!");
    } catch (e: any) {
      setMsg("Error: " + (e?.message || "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <main className={styles.container}>
      <div className={styles.backButtonWrapper}>
        <BackButton onClick={() => router.back()} />
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <svg className={styles.profileIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className={styles.title}>My Profile</h1>
          <div className={styles.titleDecoration}>
            <span className={styles.decorLine}></span>
            <span className={styles.decorStar}>&#10022;</span>
            <span className={styles.decorLine}></span>
          </div>
          <p className={styles.subtitle}>Manage your personal information</p>
        </div>

        <section className={styles.card}>
        <h2 className={styles.cardTitle}>Birth Information</h2>
        <p className={styles.cardDesc}>
          Your birth data is used for accurate Saju & Astrology readings
        </p>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Date of Birth *</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Time of Birth</label>
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className={styles.input}
              placeholder="Optional but recommended"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Gender</label>
            <div className={styles.genderSelectWrapper}>
              <button
                type="button"
                className={`${styles.genderSelect} ${genderOpen ? styles.genderSelectOpen : ''}`}
                onClick={() => setGenderOpen(!genderOpen)}
                onBlur={() => setTimeout(() => setGenderOpen(false), 150)}
              >
                <span className={styles.genderIcon}>
                  {gender === 'M' ? '♂' : '♀'}
                </span>
                <span className={styles.genderText}>
                  {gender === 'M' ? 'Male' : 'Female'}
                </span>
                <span className={`${styles.genderArrow} ${genderOpen ? styles.genderArrowOpen : ''}`}>
                  ▾
                </span>
              </button>
              {genderOpen && (
                <div className={styles.genderDropdown}>
                  <button
                    type="button"
                    className={`${styles.genderOption} ${gender === 'M' ? styles.genderOptionActive : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setGender('M');
                      setGenderOpen(false);
                    }}
                  >
                    <span className={styles.genderOptionIcon}>♂</span>
                    <span className={styles.genderOptionText}>Male</span>
                    {gender === 'M' && <span className={styles.genderCheck}>✓</span>}
                  </button>
                  <button
                    type="button"
                    className={`${styles.genderOption} ${gender === 'F' ? styles.genderOptionActive : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setGender('F');
                      setGenderOpen(false);
                    }}
                  >
                    <span className={styles.genderOptionIcon}>♀</span>
                    <span className={styles.genderOptionText}>Female</span>
                    {gender === 'F' && <span className={styles.genderCheck}>✓</span>}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.formGroup} style={{ position: 'relative' }}>
            <label>Birth City</label>
            <input
              className={styles.input}
              placeholder="Enter your city"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setIsUserTyping(true);
                setOpenSug(true);
              }}
              onBlur={() => {
                setTimeout(() => setOpenSug(false), 150);
                setIsUserTyping(false);
              }}
              autoComplete="off"
            />
            {openSug && suggestions.length > 0 && (
              <ul className={styles.dropdown}>
                {suggestions.map((s, idx) => (
                  <li
                    key={`${s.name}-${s.country}-${idx}`}
                    className={styles.dropdownItem}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onPickCity(s);
                    }}
                  >
                    <span className={styles.cityName}>{s.name}</span>
                    <span className={styles.country}>{s.country}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Timezone</label>
            <input
              className={styles.input}
              value={tzId}
              readOnly
              placeholder="Auto-detected from city"
            />
          </div>
        </div>

        {msg && (
          <p className={`${styles.message} ${msg.includes("Error") ? styles.error : styles.success}`}>
            {msg}
          </p>
        )}

        <button
          className={styles.saveButton}
          onClick={saveBirthInfo}
          disabled={busy || !birthDate}
        >
          {busy ? "Saving..." : "Save Profile"}
        </button>
      </section>
      </div>
    </main>
  );
}
