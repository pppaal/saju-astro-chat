"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import styles from "./profile.module.css";

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

  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [tonePreference, setTonePreference] = useState("casual");
  const [readingLength, setReadingLength] = useState("medium");

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "U">("U");
  const [city, setCity] = useState("");
  const [tzId, setTzId] = useState<string>(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [profileMsg, setProfileMsg] = useState("");

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
      if (user.name) setName(user.name);
      if (user.image) setPhoto(user.image);
      if (typeof user.emailNotifications === "boolean") setEmailNotifications(user.emailNotifications);
      if (user.preferences?.preferredLanguage) setPreferredLanguage(user.preferences.preferredLanguage);
      if (user.preferences?.tonePreference) setTonePreference(user.preferences.tonePreference);
      if (user.preferences?.readingLength) setReadingLength(user.preferences.readingLength);
      if (user.birthDate) setBirthDate(user.birthDate);
      if (user.birthTime) setBirthTime(user.birthTime);
      if (user.gender) setGender(user.gender);
      if (user.birthCity) setCity(user.birthCity);
      if (user.tzId) setTzId(user.tzId);
    };
    load();
  }, [status]);

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
          gender: gender === "U" ? null : gender,
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

  const saveProfileBasics = async () => {
    setProfileMsg("");
    setBusy(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name?.trim() || undefined,
          image: photo?.trim() || null,
          emailNotifications,
          preferredLanguage,
          tonePreference,
          readingLength,
          notificationSettings: {
            email: emailNotifications,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save profile");
      setProfileMsg("Profile updated!");
    } catch (e: any) {
      setProfileMsg("Error: " + (e?.message || "Something went wrong"));
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
      <div className={styles.header}>
        <BackButton onClick={() => router.back()} />
        <h1 className={styles.title}>My Profile</h1>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Account & Preferences</h2>
        <p className={styles.cardDesc}>
          Manage how your profile appears and how we tailor readings to you.
        </p>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              placeholder="Your name or nickname"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Profile photo URL</label>
            <input
              type="url"
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              className={styles.input}
              placeholder="https://..."
            />
          </div>

          <div className={styles.formGroup}>
            <label>Language</label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className={styles.input}
            >
              <option value="en">English</option>
              <option value="ko">한국어</option>
              <option value="es">Español</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Tone</label>
            <select
              value={tonePreference}
              onChange={(e) => setTonePreference(e.target.value)}
              className={styles.input}
            >
              <option value="casual">Casual & friendly</option>
              <option value="balanced">Balanced</option>
              <option value="insightful">Insightful & deep</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Reading length</label>
            <select
              value={readingLength}
              onChange={(e) => setReadingLength(e.target.value)}
              className={styles.input}
            >
              <option value="short">Concise</option>
              <option value="medium">Balanced</option>
              <option value="long">Detailed</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Email updates</label>
            <div className={styles.toggleRow}>
              <input
                type="checkbox"
                id="emailNotifications"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <label htmlFor="emailNotifications">
                Receive summaries, updates, and offers
              </label>
            </div>
          </div>
        </div>

        {profileMsg && (
          <p className={`${styles.message} ${profileMsg.includes("Error") ? styles.error : styles.success}`}>
            {profileMsg}
          </p>
        )}

        <button
          className={styles.saveButton}
          onClick={saveProfileBasics}
          disabled={busy}
        >
          {busy ? "Saving..." : "Save Account Settings"}
        </button>
      </section>

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
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "M" | "F" | "U")}
              className={styles.input}
            >
              <option value="U">Prefer not to say</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Birth City</label>
            <input
              type="text"
              placeholder="Seoul, KR"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Timezone</label>
            <input
              type="text"
              placeholder="Asia/Seoul"
              value={tzId}
              onChange={(e) => setTzId(e.target.value)}
              className={styles.input}
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
    </main>
  );
}
