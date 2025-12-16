"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Numerology.module.css";
import { Numerology, ExtendedNumerologyProfile } from "@/lib/numerology/numerology";
import { getUserTimezone } from "@/lib/Saju/timezone";
import { searchCities } from "@/lib/cities";
import tzLookup from "tz-lookup";
import { describeLocale, getLuckyTag, getNumberTitle } from "@/lib/numerology/descriptions";
import ServicePageLayout from "@/components/ui/ServicePageLayout";
import { useI18n } from "@/i18n/I18nProvider";
import { getUserProfile, saveUserProfile } from "@/lib/userProfile";
import ShareButton from "@/components/share/ShareButton";
import { generateNumerologyCard } from "@/components/share/cards/NumerologyCard";

type CityItem = { name: string; country: string; lat: number; lon: number };

function hashStringToInt(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function seededRNG(seed: number) {
  let s = seed || 123456789;
  return function next() {
    s = (1664525 * s + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
function pickNumbers({
  count, min, max, allowDuplicates, rng,
}: { count: number; min: number; max: number; allowDuplicates: boolean; rng: () => number }) {
  const range = max - min + 1;
  if (!allowDuplicates && count > range) throw new Error("count_exceeds_range");
  const chosen = new Set<number>();
  const result: number[] = [];
  while (result.length < count) {
    const n = min + Math.floor(rng() * range);
    if (allowDuplicates || !chosen.has(n)) {
      if (!allowDuplicates) chosen.add(n);
      result.push(n);
    }
  }
  return result.sort((a, b) => a - b);
}
function reduceToCore(num: number) {
  const keep = new Set([11, 22, 33]);
  while (num > 9 && !keep.has(num)) {
    num = num.toString().split("").reduce((acc, d) => acc + Number(d), 0);
  }
  return num;
}

function ResultCard({ title, value, description, index, subtitle }: { title: string; value: React.ReactNode; description: string; index?: number; subtitle?: string }) {
  return (
    <div className={styles.resultCard} style={index !== undefined ? { animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both` } : undefined}>
      <div className={styles.cardGlow} />
      <span className={styles.resultValue}>{value}</span>
      <h3 className={styles.resultTitle}>{title}</h3>
      {subtitle && <div className={styles.resultSubtitle}>{subtitle}</div>}
      <p className={styles.resultDescription}>{description}</p>
    </div>
  );
}

function MiniCard({ label, value, char, description }: { label: string; value: number; char?: string; description?: string }) {
  return (
    <div className={styles.miniCard}>
      <div className={styles.miniValue}>{value}{char && <span className={styles.miniChar}>({char})</span>}</div>
      <div className={styles.miniLabel}>{label}</div>
      {description && <div className={styles.miniDesc}>{description}</div>}
    </div>
  );
}

export default function Page() {
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [birthtime, setBirthtime] = useState("06:40");
  const [timeZone, setTimeZone] = useState<string>(getUserTimezone() || "Asia/Seoul");
  const today = useMemo(() => new Date(), []);

  const [birthCity, setBirthCity] = useState("");
  const [currCity, setCurrCity] = useState("");
  // Current city always influences lucky numbers when entered
  const useCurrentCityInfluence = true;

  const [suggestionsBirth, setSuggestionsBirth] = useState<CityItem[]>([]);
  const [suggestionsCurr, setSuggestionsCurr] = useState<CityItem[]>([]);
  const [showBirthDropdown, setShowBirthDropdown] = useState(false);
  const [showCurrDropdown, setShowCurrDropdown] = useState(false);
  const [fetchingBirth, setFetchingBirth] = useState(false);
  const [fetchingCurr, setFetchingCurr] = useState(false);
  const reqIdBirth = useRef(0);
  const reqIdCurr = useRef(0);

  const [birthLat, setBirthLat] = useState<number | null>(null);
  const [birthLon, setBirthLon] = useState<number | null>(null);

  const [luckyCount, setLuckyCount] = useState<number>(6);
  const [min, setMin] = useState<number>(1);
  const [max, setMax] = useState<number>(45);
  const [seedMode, setSeedMode] = useState<"random" | "name-birth" | "name-birth-city-time">("name-birth-city-time");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const [showMoreTabs, setShowMoreTabs] = useState<boolean>(false);

  const [profile, setProfile] = useState<ExtendedNumerologyProfile | null>(null);
  const [luckyNumbers, setLuckyNumbers] = useState<number[] | null>(null);
  const [dailyLuckyNumbers, setDailyLuckyNumbers] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("core");

  // Validation states
  const [touched, setTouched] = useState<{ name: boolean; birthdate: boolean }>({ name: false, birthdate: false });

  const effectiveCount = useMemo(
    () => Math.max(1, Math.floor(luckyCount || 1)),
    [luckyCount]
  );

  useEffect(() => {
    const storedProfile = getUserProfile();
    if (storedProfile.name) setName(storedProfile.name);
    if (storedProfile.birthDate) setBirthdate(storedProfile.birthDate);
    if (storedProfile.birthTime) setBirthtime(storedProfile.birthTime);
    if (storedProfile.birthCity) setBirthCity(storedProfile.birthCity);
    if (storedProfile.timezone) setTimeZone(storedProfile.timezone);
    if (storedProfile.latitude) setBirthLat(storedProfile.latitude);
    if (storedProfile.longitude) setBirthLon(storedProfile.longitude);
  }, []);

  useEffect(() => {
    const q = birthCity.trim();
    if (q.length < 2) { setSuggestionsBirth([]); return; }
    const myId = ++reqIdBirth.current;
    setFetchingBirth(true);
    const tHandle = setTimeout(async () => {
      try {
        const items = (await searchCities(q, { limit: 15 })) as CityItem[];
        if (reqIdBirth.current === myId) { setSuggestionsBirth(items); setShowBirthDropdown(true); }
      } catch { if (reqIdBirth.current === myId) setSuggestionsBirth([]); }
      finally { if (reqIdBirth.current === myId) setFetchingBirth(false); }
    }, 250);
    return () => clearTimeout(tHandle);
  }, [birthCity]);

  useEffect(() => {
    const q = currCity.trim();
    if (q.length < 2) { setSuggestionsCurr([]); return; }
    const myId = ++reqIdCurr.current;
    setFetchingCurr(true);
    const tHandle = setTimeout(async () => {
      try {
        const items = (await searchCities(q, { limit: 15 })) as CityItem[];
        if (reqIdCurr.current === myId) { setSuggestionsCurr(items); setShowCurrDropdown(true); }
      } catch { if (reqIdCurr.current === myId) setSuggestionsCurr([]); }
      finally { if (reqIdCurr.current === myId) setFetchingCurr(false); }
    }, 250);
    return () => clearTimeout(tHandle);
  }, [currCity]);

  const onPickBirthCity = (item: CityItem) => {
    setBirthCity(`${item.name}, ${item.country}`);
    setBirthLat(item.lat);
    setBirthLon(item.lon);
    setShowBirthDropdown(false);
    try {
      const guessed = tzLookup(item.lat, item.lon);
      if (guessed && typeof guessed === "string") setTimeZone(guessed);
    } catch {}
  };
  const onPickCurrCity = (item: CityItem) => {
    setCurrCity(`${item.name}, ${item.country}`);
    setShowCurrDropdown(false);
  };

  const handleCalculate = () => {
    setError(null);
    if (!birthdate) return setError(t("numerology.errors.birthdate", "Please enter your birth date."));
    if (!name) return setError(t("numerology.errors.name", "Please enter your name for an accurate reading."));
    if (min >= max) return setError(t("numerology.errors.range", "Check the range: minimum must be less than maximum."));
    if (effectiveCount > max - min + 1) {
      return setError(t("numerology.errors.countExceedsRange", "Count cannot exceed the number range size."));
    }

    const dateObj = new Date(`${birthdate}T00:00:00Z`);
    const person = new Numerology(name, dateObj);
    const extendedProfile = person.getExtendedProfile(today);
    setProfile(extendedProfile);

    let rng: () => number;
    if (seedMode === "random") {
      rng = Math.random;
    } else {
      let seedStr = `${name}#${birthdate}`;
      if (seedMode === "name-birth-city-time") {
        if (birthCity.trim()) seedStr += `#BC:${birthCity.trim()}`;
        if (useCurrentCityInfluence && currCity.trim()) seedStr += `#CC:${currCity.trim()}`;
        if (birthtime.trim()) seedStr += `#BT:${birthtime.trim()}`;
        if (timeZone) seedStr += `#TZ:${timeZone}`;
        if (birthLat != null && birthLon != null) seedStr += `#BLOC:${birthLat.toFixed(2)},${birthLon.toFixed(2)}`;
      }
      rng = seededRNG(hashStringToInt(seedStr));
    }

    try {
      setLuckyNumbers(pickNumbers({ count: effectiveCount, min, max, allowDuplicates: false, rng }));
      const todayStr = today.toISOString().slice(0, 10);
      const dailyRng = seededRNG(hashStringToInt(`${name}#${birthdate}#DATE:${todayStr}`));
      setDailyLuckyNumbers(pickNumbers({ count: effectiveCount, min, max, allowDuplicates: false, rng: dailyRng }));

      saveUserProfile({
        name: name || undefined,
        birthDate: birthdate || undefined,
        birthTime: birthtime || undefined,
        birthCity: birthCity || undefined,
        timezone: timeZone || undefined,
        latitude: birthLat ?? undefined,
        longitude: birthLon ?? undefined,
      });
    } catch (e: unknown) {
      setError((e as Error).message || t("numerology.errors.generate", "An error occurred while generating numbers."));
      setLuckyNumbers(null);
      setDailyLuckyNumbers(null);
    }
  };

  // Main tabs shown directly
  const mainSections = [
    { id: "core", label: t("numerology.sections.core"), icon: "🎯" },
    { id: "lucky", label: t("numerology.sections.lucky"), icon: "🍀" },
  ];

  // Additional tabs shown in "More" dropdown
  const moreSections = [
    { id: "advanced", label: t("numerology.sections.advanced"), icon: "🔮" },
    { id: "name", label: t("numerology.sections.name"), icon: "✍️" },
    { id: "karmic", label: t("numerology.sections.karmic"), icon: "⚖️" },
    { id: "cycles", label: t("numerology.sections.cycles"), icon: "🔄" },
    { id: "timing", label: t("numerology.sections.timing"), icon: "📅" },
  ];

  return (
    <ServicePageLayout
      icon="🔢"
      title={t("numerology.title", "Complete Numerology Reading")}
      subtitle={t("numerology.subtitle", "Professional-grade numerology analysis with 20+ calculations")}
    >
    <main className={styles.page}>
      <div className={styles.particles}>
        {[...Array(20)].map((_, i) => (
          <div key={i} className={styles.particle} style={{
            left: `${((i * 37 + 13) % 100)}%`,
            top: `${((i * 53 + 7) % 100)}%`,
            animationDelay: `${(i % 6) + (i * 0.2)}s`,
            animationDuration: `${4 + (i % 4)}s`,
          }} />
        ))}
      </div>

      {!profile && (
        <div className={`${styles.formContainer} ${styles.fadeIn}`}>
          <div className={styles.formHeader}>
            <div className={styles.formIcon}>🔢</div>
            <h1 className={styles.formTitle}>{t("numerology.formTitle", "Complete Numerology Reading")}</h1>
            <p className={styles.formSubtitle}>{t("numerology.formSubtitle", "Enter your details for a comprehensive analysis")}</p>
          </div>

          <div className={`${styles.row} ${styles.two}`}>
            <div>
              <label className={styles.inputLabel} htmlFor="name">{t("numerology.nameLabel", "Full Name")}</label>
              <input id="name" type="text" placeholder={t("numerology.namePlaceholder", "English or Korean name")} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(p => ({ ...p, name: true }))} className={`${styles.input} ${touched.name && !name ? styles.inputError : ""}`} />
              {touched.name && !name ? (
                <div className={styles.fieldError}>{t("numerology.errors.name", "Please enter your name")}</div>
              ) : (
                <div className={styles.subtle}>{t("numerology.nameHint", "Korean names are fully supported")}</div>
              )}
            </div>
            <div>
              <label className={styles.inputLabel} htmlFor="birthdate">{t("numerology.birthdateLabel", "Birthdate")}</label>
              <input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} onBlur={() => setTouched(p => ({ ...p, birthdate: true }))} className={`${styles.input} ${touched.birthdate && !birthdate ? styles.inputError : ""}`} />
              {touched.birthdate && !birthdate && (
                <div className={styles.fieldError}>{t("numerology.errors.birthdate", "Please enter your birth date")}</div>
              )}
            </div>
          </div>

          {/* Collapsible More Options Section */}
          <div className={styles.moreOptionsSection}>
            <button
              type="button"
              className={styles.moreOptionsToggle}
              onClick={() => setShowMoreOptions(!showMoreOptions)}
            >
              <span className={styles.moreOptionsIcon}>{showMoreOptions ? "▼" : "▶"}</span>
              <span>{t("numerology.moreOptions", "More Options")}</span>
              <span className={styles.moreOptionsHint}>{t("numerology.moreOptionsHint", "Time, location for more accuracy")}</span>
            </button>
            {showMoreOptions && (
              <div className={styles.moreOptionsContent}>
                <div className={`${styles.row} ${styles.two}`}>
                  <div>
                    <label className={styles.inputLabel} htmlFor="birthtime">{t("numerology.birthtimeLabel", "Time of Birth")}</label>
                    <input id="birthtime" type="time" value={birthtime} onChange={(e) => setBirthtime(e.target.value)} className={styles.input} />
                    <div className={styles.subtle}>{t("numerology.birthtimeHint", "If exact time is unknown, approximate is OK.")}</div>
                  </div>
                  <div>
                    {timeZone && birthCity && (
                      <div className={styles.autoDetected}>
                        <span className={styles.autoIcon}>🌍</span>
                        <span>{t("numerology.autoTimezone", "Timezone")}: {timeZone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`${styles.row} ${styles.two}`} style={{ overflow: "visible" }}>
                  <div className={styles.relative} style={{ overflow: "visible" }}>
                    <label className={styles.inputLabel} htmlFor="birthCity">{t("numerology.birthCityLabel", "Birth city")}</label>
                    <input id="birthCity" autoComplete="off" type="text" placeholder={t("numerology.birthCityPlaceholder", "e.g., Seoul, KR")} value={birthCity} onChange={(e) => setBirthCity(e.target.value)} onFocus={() => setShowBirthDropdown(true)} onBlur={() => setTimeout(() => setShowBirthDropdown(false), 250)} className={styles.input} />
                    {showBirthDropdown && (suggestionsBirth.length > 0 || fetchingBirth) && (
                      <ul className={styles.dropdown}>
                        {fetchingBirth && suggestionsBirth.length === 0 && <li className={styles.dropdownItem} style={{ color: "#bbb" }}><span className={styles.loadingSpinner} /> {t("numerology.dropdownLoading", "Searching...")}</li>}
                        {suggestionsBirth.map((s, i) => (
                          <li key={`${s.country}-${s.name}-${s.lat}-${s.lon}-${i}`} className={styles.dropdownItem} onMouseDown={(e) => { e.preventDefault(); onPickBirthCity(s); }}>{s.name}, {s.country}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className={styles.relative} style={{ overflow: "visible" }}>
                    <label className={styles.inputLabel} htmlFor="currCity">{t("numerology.currentCityLabel", "Current city")}</label>
                    <input id="currCity" autoComplete="off" type="text" placeholder={t("numerology.currentCityPlaceholder", "e.g., Tokyo, JP")} value={currCity} onChange={(e) => setCurrCity(e.target.value)} onFocus={() => setShowCurrDropdown(true)} onBlur={() => setTimeout(() => setShowCurrDropdown(false), 250)} className={styles.input} />
                    {showCurrDropdown && (suggestionsCurr.length > 0 || fetchingCurr) && (
                      <ul className={styles.dropdown}>
                        {fetchingCurr && suggestionsCurr.length === 0 && <li className={styles.dropdownItem} style={{ color: "#bbb" }}><span className={styles.loadingSpinner} /> {t("numerology.dropdownLoading", "Searching...")}</li>}
                        {suggestionsCurr.map((s, i) => (
                          <li key={`${s.country}-${s.name}-${s.lat}-${s.lon}-${i}`} className={styles.dropdownItem} onMouseDown={(e) => { e.preventDefault(); onPickCurrCity(s); }}>{s.name}, {s.country}</li>
                        ))}
                      </ul>
                    )}
                    <div className={styles.subtle}>{t("numerology.currentCityHint", "Used for personalized lucky numbers")}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.luckyDrawSection}>
            <label className={styles.inputLabel}>🍀 {t("numerology.luckyDrawLabel", "Lucky Number Draw")}</label>
            <div className={`${styles.row} ${styles.three}`}>
              <div>
                <label className={styles.subLabel} htmlFor="luckyCount">{t("numerology.countLabel", "Count")}</label>
                <input id="luckyCount" type="number" min={1} max={20} value={luckyCount} onChange={(e) => setLuckyCount(parseInt(e.target.value || "1", 10))} className={styles.input} />
              </div>
              <div>
                <label className={styles.subLabel}>{t("numerology.minPlaceholder", "Min")}</label>
                <input type="number" min={1} value={min} onChange={(e) => setMin(parseInt(e.target.value || "1", 10))} className={styles.input} />
              </div>
              <div>
                <label className={styles.subLabel}>{t("numerology.maxPlaceholder", "Max")}</label>
                <input type="number" min={1} value={max} onChange={(e) => setMax(parseInt(e.target.value || "1", 10))} className={styles.input} />
              </div>
            </div>
          </div>

          <div className={styles.advancedSection}>
            <button
              type="button"
              className={styles.advancedToggle}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className={styles.advancedIcon}>{showAdvanced ? "▼" : "▶"}</span>
              <span>{t("numerology.advancedOptions", "Advanced Options")}</span>
            </button>
            {showAdvanced && (
              <div className={styles.advancedContent}>
                <div>
                  <label className={styles.subLabel} htmlFor="seedMode">{t("numerology.seedLabel", "Seed (reproducibility)")}</label>
                  <select id="seedMode" value={seedMode} onChange={(e) => setSeedMode(e.target.value as typeof seedMode)} className={styles.select}>
                    <option value="name-birth-city-time">{t("numerology.seedOptionNameBirthCityTime", "Name + Birth + Cities + Time")}</option>
                    <option value="name-birth">{t("numerology.seedOptionNameBirth", "Name + Birthdate")}</option>
                    <option value="random">{t("numerology.seedOptionRandom", "Pure random")}</option>
                  </select>
                  <div className={styles.subtle}>{t("numerology.seedHint", "Determines how your lucky numbers are generated")}</div>
                </div>
              </div>
            )}
          </div>

          <button className={styles.calcButton} onClick={handleCalculate}>
            <span className={styles.buttonGlow} />
            <span className={styles.buttonText}>{t("numerology.buttonCalculate", "Generate Complete Reading")}</span>
          </button>
          {error && <div className={styles.error}>{error}</div>}
        </div>
      )}

      {profile && (
        <div className={styles.resultsContainer}>
          <div className={styles.actionButtons}>
            <button className={styles.resetButton} onClick={() => { setProfile(null); setLuckyNumbers(null); setDailyLuckyNumbers(null); setActiveSection("core"); }}>
              ↻ {t("numerology.reset", "New Reading")}
            </button>
            <ShareButton
              generateCard={() => generateNumerologyCard({
                name: profile.nameUsed,
                isKorean: profile.isKoreanName,
                lifePathNumber: profile.lifePathNumber,
                expressionNumber: profile.expressionNumber,
                soulUrgeNumber: profile.soulUrgeNumber,
                personalityNumber: profile.personalityNumber,
                birthdayNumber: profile.birthdayNumber,
                luckyNumbers: luckyNumbers || undefined,
                locale,
              }, 'og')}
              filename="numerology-profile.png"
              shareTitle={t("numerology.shareTitle", "My Numerology Profile")}
              shareText={t("numerology.shareText", "Check out my numerology reading on DestinyPal!")}
              label={t("numerology.shareLabel", "Share")}
              className={styles.shareBtn}
            />
          </div>

          <div className={styles.resultsHeader}>
            <div className={styles.headerIcon}>🔢</div>
            <h1 className={styles.resultsTitle}>{t("numerology.resultsTitle", "Complete Numerology Profile")}</h1>
            <p className={styles.resultsSubtitle}>
              {profile.isKoreanName ? `🇰🇷 ${profile.nameUsed}` : profile.nameUsed}
            </p>
          </div>

          {/* Summary Card - Quick Overview */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryMain}>
              <div className={styles.summaryLifePath}>
                <span className={styles.summaryLabel}>{t("numerology.coreNumbers.lifePath")}</span>
                <span className={styles.summaryNumber}>{profile.lifePathNumber}</span>
                <span className={styles.summaryTitle}>{getNumberTitle(reduceToCore(Number(profile.lifePathNumber)), locale)}</span>
              </div>
              {dailyLuckyNumbers && dailyLuckyNumbers.length > 0 && (
                <div className={styles.summaryLucky}>
                  <span className={styles.summaryLabel}>🍀 {t("numerology.luckySection.todayTitle")}</span>
                  <div className={styles.summaryLuckyNumbers}>
                    {dailyLuckyNumbers.slice(0, 3).map((n, i) => (
                      <span key={i} className={styles.summaryLuckyNum}>{n}</span>
                    ))}
                    {dailyLuckyNumbers.length > 3 && <span className={styles.summaryMore}>+{dailyLuckyNumbers.length - 3}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={styles.tabNav}>
            {mainSections.map((s) => (
              <button
                key={s.id}
                className={`${styles.tabButton} ${activeSection === s.id ? styles.tabActive : ""}`}
                onClick={() => { setActiveSection(s.id); setShowMoreTabs(false); }}
              >
                <span className={styles.tabIcon}>{s.icon}</span>
                <span className={styles.tabLabel}>{s.label}</span>
              </button>
            ))}
            {/* More dropdown */}
            <div className={styles.moreTabsWrapper}>
              <button
                className={`${styles.tabButton} ${styles.moreTabsButton} ${moreSections.some(s => s.id === activeSection) ? styles.tabActive : ""}`}
                onClick={() => setShowMoreTabs(!showMoreTabs)}
              >
                <span className={styles.tabIcon}>📊</span>
                <span className={styles.tabLabel}>{t("numerology.sections.more", "More")}</span>
                <span className={styles.moreTabsArrow}>{showMoreTabs ? "▲" : "▼"}</span>
              </button>
              {showMoreTabs && (
                <div className={styles.moreTabsDropdown}>
                  {moreSections.map((s) => (
                    <button
                      key={s.id}
                      className={`${styles.moreTabItem} ${activeSection === s.id ? styles.moreTabActive : ""}`}
                      onClick={() => { setActiveSection(s.id); setShowMoreTabs(false); }}
                    >
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Core Numbers Section */}
          {activeSection === "core" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>🎯 {t("numerology.sections.core")}</h2>
              <p className={styles.sectionDesc}>{t("numerology.sectionDesc.core")}</p>
              <div className={styles.resultsGrid}>
                <ResultCard title={t("numerology.coreNumbers.lifePath")} value={profile.lifePathNumber} subtitle={getNumberTitle(reduceToCore(Number(profile.lifePathNumber)), locale)} description={describeLocale("lifePath", Number(profile.lifePathNumber), locale)} index={0} />
                <ResultCard title={t("numerology.coreNumbers.expression")} value={profile.expressionNumber} subtitle={getNumberTitle(reduceToCore(Number(profile.expressionNumber)), locale)} description={describeLocale("expression", Number(profile.expressionNumber), locale)} index={1} />
                <ResultCard title={t("numerology.coreNumbers.soulUrge")} value={profile.soulUrgeNumber} subtitle={getNumberTitle(reduceToCore(Number(profile.soulUrgeNumber)), locale)} description={describeLocale("soulUrge", Number(profile.soulUrgeNumber), locale)} index={2} />
                <ResultCard title={t("numerology.coreNumbers.personality")} value={profile.personalityNumber} subtitle={getNumberTitle(reduceToCore(Number(profile.personalityNumber)), locale)} description={describeLocale("personality", Number(profile.personalityNumber), locale)} index={3} />
                <ResultCard title={t("numerology.coreNumbers.birthday")} value={profile.birthdayNumber} subtitle={getNumberTitle(reduceToCore(profile.birthdayNumber), locale)} description={describeLocale("birthday", profile.birthdayNumber, locale)} index={4} />
              </div>
            </div>
          )}

          {/* Advanced Numbers Section */}
          {activeSection === "advanced" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>🔮 {t("numerology.sections.advanced")}</h2>
              <p className={styles.sectionDesc}>{t("numerology.sectionDesc.advanced")}</p>
              <div className={styles.resultsGrid}>
                <ResultCard title={t("numerology.advancedNumbers.maturity")} value={profile.maturityNumber} subtitle={t("numerology.advancedNumbers.maturitySubtitle")} description={describeLocale("maturity", Number(profile.maturityNumber), locale)} index={0} />
                <ResultCard title={t("numerology.advancedNumbers.balance")} value={profile.balanceNumber} subtitle={t("numerology.advancedNumbers.balanceSubtitle")} description={describeLocale("balance", Number(profile.balanceNumber), locale)} index={1} />
                <ResultCard title={t("numerology.advancedNumbers.rationalThought")} value={profile.rationalThoughtNumber} subtitle={t("numerology.advancedNumbers.rationalThoughtSubtitle")} description={describeLocale("rationalThought", Number(profile.rationalThoughtNumber), locale)} index={2} />
              </div>
            </div>
          )}

          {/* Name Analysis Section */}
          {activeSection === "name" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>✍️ {t("numerology.sections.name")}</h2>
              <p className={styles.sectionDesc}>{t("numerology.sectionDesc.name")}</p>
              <div className={styles.miniGrid}>
                <MiniCard label={t("numerology.nameAnalysis.cornerstone")} value={profile.cornerstoneNumber} char={profile.cornerstone} description={t("numerology.nameAnalysis.cornerstoneDesc")} />
                <MiniCard label={t("numerology.nameAnalysis.capstone")} value={profile.capstoneNumber} char={profile.capstone} description={t("numerology.nameAnalysis.capstoneDesc")} />
                <MiniCard label={t("numerology.nameAnalysis.firstVowel")} value={profile.firstVowelNumber} char={profile.firstVowel} description={t("numerology.nameAnalysis.firstVowelDesc")} />
                {profile.hiddenPassionNumber && (
                  <MiniCard label={t("numerology.nameAnalysis.hiddenPassion")} value={profile.hiddenPassionNumber} description={t("numerology.nameAnalysis.hiddenPassionDesc")} />
                )}
                <MiniCard label={t("numerology.nameAnalysis.subconscious")} value={profile.subconscious} description={`${profile.subconscious}/9`} />
              </div>
              <div className={styles.analysisBox}>
                <h4>{t("numerology.nameAnalysis.nameEnergyBreakdown")}</h4>
                <p>{describeLocale("cornerstone", profile.cornerstoneNumber, locale)}</p>
                <p>{describeLocale("capstone", profile.capstoneNumber, locale)}</p>
                <p>{describeLocale("firstVowel", profile.firstVowelNumber, locale)}</p>
                <p>{describeLocale("subconscious", profile.subconscious, locale)}</p>
              </div>
            </div>
          )}

          {/* Karmic Section */}
          {activeSection === "karmic" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>⚖️ {t("numerology.sections.karmic")}</h2>
              <p className={styles.sectionDesc}>{t("numerology.sectionDesc.karmic")}</p>

              {profile.karmicDebtNumbers.length > 0 ? (
                <div className={styles.karmicBox}>
                  <h4>⚠️ {t("numerology.karmicSection.debtTitle")}</h4>
                  <div className={styles.karmicNumbers}>
                    {profile.karmicDebtNumbers.map((n) => (
                      <div key={n} className={styles.karmicDebt}>
                        <span className={styles.karmicValue}>{n}</span>
                        <span className={styles.karmicDesc}>{describeLocale("karmicDebt", n, locale)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.karmicBox}>
                  <h4>✨ {t("numerology.karmicSection.noDebt")}</h4>
                  <p>{t("numerology.karmicSection.noDebtDesc")}</p>
                </div>
              )}

              {profile.karmicLessons.length > 0 && (
                <div className={styles.karmicBox}>
                  <h4>📚 {t("numerology.karmicSection.lessonsTitle")}</h4>
                  <p className={styles.karmicIntro}>{t("numerology.karmicSection.lessonsIntro")}</p>
                  <div className={styles.lessonList}>
                    {profile.karmicLessons.map((n) => (
                      <div key={n} className={styles.lessonItem}>
                        <span className={styles.lessonNumber}>{n}</span>
                        <span className={styles.lessonText}>{describeLocale("karmicLesson", n, locale)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Life Cycles Section */}
          {activeSection === "cycles" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>🔄 {t("numerology.sections.cycles")}</h2>
              <p className={styles.sectionDesc}>{t("numerology.sectionDesc.cycles")}</p>

              <div className={styles.cycleSection}>
                <h4>🏔️ {t("numerology.cyclesSection.pinnaclesTitle")}</h4>
                <div className={styles.pinnacleGrid}>
                  {profile.pinnacles.map((p, i) => (
                    <div key={i} className={styles.pinnacleCard}>
                      <div className={styles.pinnacleAge}>{profile.pinnacleAges[i]}</div>
                      <div className={styles.pinnacleNumber}>{p}</div>
                      <div className={styles.pinnacleTitle}>{getNumberTitle(reduceToCore(Number(p)), locale)}</div>
                      <div className={styles.pinnacleDesc}>{describeLocale("pinnacle", Number(p), locale)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.cycleSection}>
                <h4>⚡ {t("numerology.cyclesSection.challengesTitle")}</h4>
                <div className={styles.challengeGrid}>
                  {profile.challenges.map((c, i) => (
                    <div key={i} className={styles.challengeCard}>
                      <div className={styles.challengeLabel}>{t("numerology.cyclesSection.challenge")} {i + 1}</div>
                      <div className={styles.challengeNumber}>{c}</div>
                      <div className={styles.challengeDesc}>{describeLocale("challenge", Number(c), locale)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Timing Section */}
          {activeSection === "timing" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>📅 {t("numerology.sections.timing")}</h2>
              <p className={styles.sectionDesc}>{t("numerology.sectionDesc.timing")}</p>

              <div className={styles.timingSection}>
                <h4>👤 {t("numerology.timingSection.personalCycles")}</h4>
                <div className={styles.cycleGrid}>
                  <div className={styles.cycleCard}>
                    <div className={styles.cycleNumber}>{profile.personalYear}</div>
                    <div className={styles.cycleLabel}>{t("numerology.timingSection.personalYear")}</div>
                    <div className={styles.cycleDesc}>{describeLocale("personalYear", Number(profile.personalYear), locale)}</div>
                  </div>
                  <div className={styles.cycleCard}>
                    <div className={styles.cycleNumber}>{profile.personalMonth}</div>
                    <div className={styles.cycleLabel}>{t("numerology.timingSection.personalMonth")}</div>
                    <div className={styles.cycleDesc}>{describeLocale("personalMonth", Number(profile.personalMonth), locale)}</div>
                  </div>
                  <div className={styles.cycleCard}>
                    <div className={styles.cycleNumber}>{profile.personalDay}</div>
                    <div className={styles.cycleLabel}>{t("numerology.timingSection.personalDay")}</div>
                    <div className={styles.cycleDesc}>{describeLocale("personalDay", Number(profile.personalDay), locale)}</div>
                  </div>
                </div>
              </div>

              <div className={styles.timingSection}>
                <h4>🌍 {t("numerology.timingSection.universalCycles")}</h4>
                <div className={styles.cycleGrid}>
                  <div className={`${styles.cycleCard} ${styles.universal}`}>
                    <div className={styles.cycleNumber}>{profile.universalYear}</div>
                    <div className={styles.cycleLabel}>{t("numerology.timingSection.universalYear")}</div>
                    <div className={styles.cycleDesc}>{describeLocale("universalYear", Number(profile.universalYear), locale)}</div>
                  </div>
                  <div className={`${styles.cycleCard} ${styles.universal}`}>
                    <div className={styles.cycleNumber}>{profile.universalMonth}</div>
                    <div className={styles.cycleLabel}>{t("numerology.timingSection.universalMonth")}</div>
                    <div className={styles.cycleDesc}>{describeLocale("universalMonth", Number(profile.universalMonth), locale)}</div>
                  </div>
                  <div className={`${styles.cycleCard} ${styles.universal}`}>
                    <div className={styles.cycleNumber}>{profile.universalDay}</div>
                    <div className={styles.cycleLabel}>{t("numerology.timingSection.universalDay")}</div>
                    <div className={styles.cycleDesc}>{describeLocale("universalDay", Number(profile.universalDay), locale)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lucky Numbers Section */}
          {activeSection === "lucky" && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>🍀 {t("numerology.sections.lucky")}</h2>
              <p className={styles.sectionDesc}>{t("numerology.sectionDesc.lucky")}</p>

              {dailyLuckyNumbers?.length ? (
                <div className={`${styles.luckyWrap} ${styles.dailyWrap}`}>
                  <div className={styles.luckyHeader}>
                    <div className={styles.luckyIcon}>🌟</div>
                    <div className={styles.luckyTitle}>{t("numerology.luckySection.todayTitle")}</div>
                  </div>
                  <p className={styles.dailyDate}>{today.toLocaleDateString(locale)}</p>
                  <div className={styles.chips}>
                    {dailyLuckyNumbers.map((n, i) => {
                      const r = reduceToCore(n);
                      return (
                        <div className={`${styles.chip} ${styles.dailyChip}`} key={`daily-${n}-${i}`}>
                          <div className={styles.chipNumber}>{n}</div>
                          <div className={styles.chipTag}>#{r} {getLuckyTag(r, locale)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <p className={styles.dailyNote}>{t("numerology.luckySection.todayNote")}</p>
                </div>
              ) : null}

              <div className={`${styles.luckyWrap} ${styles.luckyReveal}`}>
                <div className={styles.luckyHeader}>
                  <div className={styles.luckyIcon}>⭐</div>
                  <div className={styles.luckyTitle}>{t("numerology.luckySection.permanentTitle")}</div>
                </div>
                <p className={styles.luckyNote}>{t("numerology.luckySection.permanentNote")}</p>
                {luckyNumbers?.length ? (
                  <div className={styles.chips}>
                    {luckyNumbers.map((n, i) => {
                      const r = reduceToCore(n);
                      return (
                        <div className={styles.chip} key={`${n}-${i}`} style={{ animation: `chipPop 0.5s ease-out ${0.6 + i * 0.1}s both` }}>
                          <div className={styles.chipNumber}>{n}</div>
                          <div className={styles.chipTag}>#{r} {getLuckyTag(r, locale)}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.resultDescription}>{t("numerology.luckySection.adjustHint")}</div>
                )}
              </div>
            </div>
          )}

          {/* Summary Footer */}
          {(birthCity || currCity) && (
            <div className={`${styles.luckyWrap} ${styles.summaryWrap}`} style={{ marginTop: "1rem" }}>
              <div className={styles.luckyTitle}>{t("numerology.inputSummary.title")}</div>
              <div className={styles.resultDescription}>
                <strong>{t("numerology.inputSummary.name")}:</strong> {profile.nameUsed} {profile.isKoreanName && t("numerology.inputSummary.korean")}<br />
                {birthCity && <><strong>{t("numerology.inputSummary.birth")}:</strong> {birthCity}{timeZone ? ` (${timeZone})` : ""} · {birthtime}<br /></>}
                {currCity && <><strong>{t("numerology.inputSummary.current")}:</strong> {currCity}</>}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
    </ServicePageLayout>
  );
}
