"use client";

import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import DateTimePicker from "@/components/ui/DateTimePicker";
import TimePicker from "@/components/ui/TimePicker";
import { searchCities } from "@/lib/cities";
import tzLookup from "tz-lookup";
import styles from "./profile.module.css";
import { logger } from "@/lib/logger";
import { useI18n } from "@/i18n/I18nProvider";

type CityHit = {
  name: string;
  country: string;
  lat: number;
  lon: number;
  timezone?: string;
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const { t, locale } = useI18n();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [gender, setGender] = useState<"M" | "F">("M");
  const [city, setCity] = useState("");
  const [tzId, setTzId] = useState<string>(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  // City search states
  const [suggestions, setSuggestions] = useState<CityHit[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // View/Edit mode - start in view mode if data exists
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [credits, setCredits] = useState<{ remaining: number; total: number; plan: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/myjourney");
    }
  }, [status, router]);

  useEffect(() => {
    const load = async () => {
      if (status !== "authenticated") {
        setInitialLoading(false);
        return;
      }
      try {
        // Load profile and credits in parallel
        const [profileRes, creditsRes] = await Promise.all([
          fetch("/api/me/profile", { cache: "no-store" }),
          fetch("/api/me/credits", { cache: "no-store" })
        ]);

        if (profileRes.ok) {
          const { user } = await profileRes.json();
          if (user) {
            if (user.birthDate) setBirthDate(user.birthDate);
            if (user.birthTime) {
              setBirthTime(user.birthTime);
              setTimeUnknown(false);
            } else {
              setTimeUnknown(true);
            }
            if (user.gender) setGender(user.gender);
            if (user.birthCity) setCity(user.birthCity);
            if (user.tzId) setTzId(user.tzId);

            // If user has saved birth data, show view mode
            if (user.birthDate) {
              setHasSavedData(true);
              setIsEditMode(false);
            } else {
              // No data yet, show edit mode
              setIsEditMode(true);
            }
          }
        }

        if (creditsRes.ok) {
          const data = await creditsRes.json();
          setCredits({
            remaining: data.credits?.remaining ?? 0,
            total: data.credits?.monthly ?? 0,
            plan: data.plan || 'free'
          });
        }
      } finally {
        setInitialLoading(false);
      }
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
    setTzId(tz);
    setOpenSug(false);
  };

  const saveBirthInfo = async () => {
    setMsg("");
    if (!birthDate) {
      setMsg(t("profile.error.birthDateRequired", "Please select your date of birth."));
      return;
    }
    setBusy(true);

    const payload = {
      birthDate,
      birthTime: timeUnknown ? "12:00" : (birthTime || null),
      gender,
      birthCity: city || null,
      tzId: tzId || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul",
    };
    logger.info('[Profile] Saving birth info:', payload);

    try {
      const res = await fetch("/api/user/update-birth-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t("profile.error.saveFailed", "Failed to save"));
      setMsg(t("profile.success.saved", "Saved successfully!"));
      setHasSavedData(true);
      setIsEditMode(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("profile.error.somethingWrong", "Something went wrong");
      setMsg(`${t("common.error", "Error")}: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  // Format date for display (YYYY-MM-DD -> localized date)
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    if (locale === "ko") {
      return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
    }
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  // Format time for display (HH:mm -> localized time)
  const formatTime = (timeStr: string) => {
    if (!timeStr) return t("profile.timeUnknown", "Time unknown");
    const [hour, minute] = timeStr.split(":");
    const h = parseInt(hour);
    if (locale === "ko") {
      const period = h < 12 ? "오전" : "오후";
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${period} ${displayHour}시 ${minute}분`;
    }
    const period = h < 12 ? "AM" : "PM";
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${minute} ${period}`;
  };

  if (status === "loading" || (status === "authenticated" && initialLoading)) {
    return <div className={styles.loading}>{t("common.loading", "Loading...")}</div>;
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
          <h1 className={styles.title}>{t("profile.title", "My Profile")}</h1>
          <div className={styles.titleDecoration}>
            <span className={styles.decorLine}></span>
            <span className={styles.decorStar}>&#10022;</span>
            <span className={styles.decorLine}></span>
          </div>
          <p className={styles.subtitle}>{t("profile.subtitle", "Manage your personal information")}</p>

          {/* Membership & Credits Display */}
          {credits && (
            <div className={styles.membershipCard}>
              <div className={styles.membershipHeader}>
                <div className={`${styles.planBadge} ${styles[`plan${credits.plan.charAt(0).toUpperCase() + credits.plan.slice(1)}`]}`}>
                  <span className={styles.planIcon}>
                    {credits.plan === 'free' ? '🆓' : credits.plan === 'starter' ? '⭐' : credits.plan === 'pro' ? '💎' : '👑'}
                  </span>
                  <span className={styles.planName}>{t(`myjourney.plan.${credits.plan}`, credits.plan.toUpperCase())}</span>
                </div>
              </div>
              <div className={styles.creditsDisplay}>
                <div className={styles.creditsInfo}>
                  <span className={styles.creditsCount}>{credits.remaining}</span>
                  <span className={styles.creditsLabel}>{t("myjourney.credits.short", "credits")}</span>
                </div>
                <button
                  className={styles.upgradeBtn}
                  onClick={() => router.push('/pricing')}
                >
                  {credits.plan === 'free' ? t("profile.upgrade", "Upgrade") : t("profile.manage", "Manage")}
                </button>
              </div>
            </div>
          )}
        </div>

        <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>{t("profile.birthInfo.title", "Birth Information")}</h2>
            <p className={styles.cardDesc}>
              {t("profile.birthInfo.desc", "Your birth data is used for accurate fortune readings")}
            </p>
          </div>
          {hasSavedData && !isEditMode && (
            <button
              className={styles.editButton}
              onClick={() => setIsEditMode(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t("common.edit", "Edit")}
            </button>
          )}
        </div>

        {/* View Mode - Show saved birth info */}
        {hasSavedData && !isEditMode ? (
          <div className={styles.viewMode}>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t("profile.field.birthDate", "Date of Birth")}</span>
                <span className={styles.infoValue}>{formatDate(birthDate)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t("profile.field.birthTime", "Time of Birth")}</span>
                <span className={styles.infoValue}>{formatTime(birthTime)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t("profile.field.gender", "Gender")}</span>
                <span className={styles.infoValue}>
                  <span className={styles.genderBadge}>
                    {gender === 'M' ? `♂ ${t("profile.gender.male", "Male")}` : `♀ ${t("profile.gender.female", "Female")}`}
                  </span>
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t("profile.field.birthCity", "Birth City")}</span>
                <span className={styles.infoValue}>{city || t("profile.notEntered", "Not entered")}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t("profile.field.timezone", "Timezone")}</span>
                <span className={styles.infoValue}>{tzId}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Edit Mode - Show form */
          <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <DateTimePicker
              value={birthDate}
              onChange={(date) => setBirthDate(date)}
              label={t("profile.field.birthDate", "Date of Birth") + " *"}
              required
              locale={locale}
            />
          </div>

          <div className={styles.formGroup}>
            <TimePicker
              value={birthTime}
              onChange={(time) => setBirthTime(time)}
              label={t("profile.field.birthTime", "Time of Birth")}
              disabled={timeUnknown}
              locale={locale}
            />
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => {
                  setTimeUnknown(e.target.checked);
                  if (e.target.checked) {
                    setBirthTime("");
                  }
                }}
                className={styles.checkbox}
              />
              <span>
                {t("profile.timeUnknown", "I don't know my birth time")}
              </span>
            </label>
            {timeUnknown && (
              <p className={styles.hint}>
                {t("profile.timeUnknownHint", "Noon (12:00) will be used for calculations")}
              </p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>{t("profile.field.gender", "Gender")}</label>
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
                  {gender === 'M' ? t("profile.gender.male", "Male") : t("profile.gender.female", "Female")}
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
                    <span className={styles.genderOptionText}>{t("profile.gender.male", "Male")}</span>
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
                    <span className={styles.genderOptionText}>{t("profile.gender.female", "Female")}</span>
                    {gender === 'F' && <span className={styles.genderCheck}>✓</span>}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.formGroup} style={{ position: 'relative' }}>
            <label>{t("profile.field.birthCity", "Birth City")}</label>
            <input
              className={styles.input}
              placeholder={t("profile.placeholder.birthCity", "Enter your city")}
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
            <label>{t("profile.field.timezone", "Timezone")}</label>
            <input
              className={styles.input}
              value={tzId}
              readOnly
              placeholder={t("profile.placeholder.timezone", "Auto-detected from city")}
            />
          </div>
        </div>
        )}

        {msg && (
          <p className={`${styles.message} ${msg.includes("Error") ? styles.error : styles.success}`}>
            {msg}
          </p>
        )}

        {isEditMode && (
          <div className={styles.buttonGroup}>
            {hasSavedData && (
              <button
                className={styles.cancelButton}
                onClick={() => setIsEditMode(false)}
              >
                {t("common.cancel", "Cancel")}
              </button>
            )}
            <button
              className={styles.saveButton}
              onClick={saveBirthInfo}
              disabled={busy || !birthDate}
            >
              {busy ? t("common.saving", "Saving...") : t("profile.saveProfile", "Save Profile")}
            </button>
          </div>
        )}
      </section>
      </div>
    </main>
  );
}
