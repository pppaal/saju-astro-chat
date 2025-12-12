"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Numerology.module.css";
import { Numerology, CoreNumerologyProfile } from "@/lib/numerology/numerology";
import { getUserTimezone } from "@/lib/Saju/timezone";
import { searchCities } from "@/lib/cities";
import tzLookup from "tz-lookup";
import { describe, luckyTag } from "@/lib/numerology/descriptions";
import ServicePageLayout from "@/components/ui/ServicePageLayout";
import { useI18n } from "@/i18n/I18nProvider";
import { getUserProfile, saveUserProfile } from "@/lib/userProfile";

type CityItem = { name: string; country: string; lat: number; lon: number };

// Extended profile with daily numbers
interface ExtendedProfile extends CoreNumerologyProfile {
  personalYear: number;
  personalMonth: number;
  personalDay: number;
}

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

function ResultCard({ title, value, description, index }: { title: string; value: React.ReactNode; description: string; index?: number }) {
  return (
    <div
      className={styles.resultCard}
      style={index !== undefined ? { animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both` } : undefined}
    >
      <div className={styles.cardGlow} />
      <span className={styles.resultValue}>{value}</span>
      <h3 className={styles.resultTitle}>{title}</h3>
      <p className={styles.resultDescription}>{description}</p>
    </div>
  );
}

export default function Page() {
  const { t } = useI18n();
  // basic inputs
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState(""); // YYYY-MM-DD
  const [birthtime, setBirthtime] = useState("06:40"); // HH:mm

  // time zone (auto-detected from city, not shown to user)
  const [timeZone, setTimeZone] = useState<string>(getUserTimezone() || "Asia/Seoul");

  // Today's date for daily numbers
  const today = useMemo(() => new Date(), []);

  // city autocomplete
  const [birthCity, setBirthCity] = useState("");
  const [currCity, setCurrCity] = useState("");
  const [useCurrentCityInfluence, setUseCurrentCityInfluence] = useState(true);

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

  // number options
  const [countPreset, setCountPreset] = useState<"3" | "5" | "custom">("3");
  const [customCount, setCustomCount] = useState<number>(6);
  const [min, setMin] = useState<number>(1);
  const [max, setMax] = useState<number>(45);
  const [allowDuplicates, setAllowDuplicates] = useState<boolean>(false);
  const [seedMode, setSeedMode] = useState<"random" | "name-birth" | "name-birth-city-time">("name-birth-city-time");

  // results
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [luckyNumbers, setLuckyNumbers] = useState<number[] | null>(null);
  const [dailyLuckyNumbers, setDailyLuckyNumbers] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveCount = useMemo(
    () => (countPreset === "custom" ? Math.max(1, Math.floor(customCount || 1)) : parseInt(countPreset, 10)),
    [countPreset, customCount]
  );

  // Load saved profile on mount
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

  // autocomplete: birth city
  useEffect(() => {
    const q = birthCity.trim();
    if (q.length < 2) {
      setSuggestionsBirth([]);
      return;
    }
    const myId = ++reqIdBirth.current;
    setFetchingBirth(true);
    const tHandle = setTimeout(async () => {
      try {
        const items = (await searchCities(q, { limit: 15 })) as CityItem[];
        if (reqIdBirth.current === myId) {
          setSuggestionsBirth(items);
          setShowBirthDropdown(true);
        }
      } catch {
        if (reqIdBirth.current === myId) setSuggestionsBirth([]);
      } finally {
        if (reqIdBirth.current === myId) setFetchingBirth(false);
      }
    }, 250);
    return () => clearTimeout(tHandle);
  }, [birthCity]);

  // autocomplete: current city
  useEffect(() => {
    const q = currCity.trim();
    if (q.length < 2) {
      setSuggestionsCurr([]);
      return;
    }
    const myId = ++reqIdCurr.current;
    setFetchingCurr(true);
    const tHandle = setTimeout(async () => {
      try {
        const items = (await searchCities(q, { limit: 15 })) as CityItem[];
        if (reqIdCurr.current === myId) {
          setSuggestionsCurr(items);
          setShowCurrDropdown(true);
        }
      } catch {
        if (reqIdCurr.current === myId) setSuggestionsCurr([]);
      } finally {
        if (reqIdCurr.current === myId) setFetchingCurr(false);
      }
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
    if (!allowDuplicates && effectiveCount > max - min + 1) {
      return setError(t("numerology.errors.duplicates", "Without duplicates, count cannot exceed the range size."));
    }

    const dateObj = new Date(`${birthdate}T00:00:00Z`);
    const person = new Numerology(name, dateObj);
    const coreProfile = person.getCoreProfile();

    // Extended profile with Personal Year/Month/Day
    const extendedProfile: ExtendedProfile = {
      ...coreProfile,
      personalYear: person.getPersonalYearNumber(today.getFullYear()),
      personalMonth: person.getPersonalMonthNumber(today.getFullYear(), today.getMonth() + 1),
      personalDay: person.getPersonalDayNumber(today),
    };
    setProfile(extendedProfile);

    // Base seed for permanent lucky numbers
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
      const seed = hashStringToInt(seedStr);
      rng = seededRNG(seed);
    }

    try {
      const nums = pickNumbers({ count: effectiveCount, min, max, allowDuplicates, rng });
      setLuckyNumbers(nums);

      // Daily lucky numbers - changes every day
      const todayStr = today.toISOString().slice(0, 10);
      const dailySeedStr = `${name}#${birthdate}#DATE:${todayStr}`;
      const dailySeed = hashStringToInt(dailySeedStr);
      const dailyRng = seededRNG(dailySeed);
      const dailyNums = pickNumbers({ count: 3, min, max, allowDuplicates: false, rng: dailyRng });
      setDailyLuckyNumbers(dailyNums);

      // Save profile for reuse across services
      saveUserProfile({
        name: name || undefined,
        birthDate: birthdate || undefined,
        birthTime: birthtime || undefined,
        birthCity: birthCity || undefined,
        timezone: timeZone || undefined,
        latitude: birthLat ?? undefined,
        longitude: birthLon ?? undefined,
      });
    } catch (e: any) {
      setError(e.message || t("numerology.errors.generate", "An error occurred while generating numbers."));
      setLuckyNumbers(null);
      setDailyLuckyNumbers(null);
    }
  };

  return (
    <ServicePageLayout
      icon="🔢"
      title={t("numerology.title", "Numerology Insights")}
      subtitle={t("numerology.subtitle", "Discover your life path and lucky numbers through numerology")}
    >
    <main className={styles.page}>
      {/* Background Particles - deterministic to avoid hydration mismatch */}
      <div className={styles.particles}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={styles.particle}
            style={{
              left: `${((i * 37 + 13) % 100)}%`,
              top: `${((i * 53 + 7) % 100)}%`,
              animationDelay: `${(i % 6) + (i * 0.2)}s`,
              animationDuration: `${4 + (i % 4)}s`,
            }}
          />
        ))}
      </div>

      {!profile && (
        <div className={`${styles.formContainer} ${styles.fadeIn}`}>
          <div className={styles.formHeader}>
            <div className={styles.formIcon}>🔢</div>
            <h1 className={styles.formTitle}>{t("numerology.formTitle", "Numerology Reading")}</h1>
            <p className={styles.formSubtitle}>{t("numerology.formSubtitle", "Discover your life path and lucky numbers")}</p>
          </div>
          <div className={`${styles.row} ${styles.two}`}>
            <div>
              <label className={styles.inputLabel} htmlFor="name">{t("numerology.nameLabel", "Full Name")}</label>
              <input id="name" type="text" placeholder={t("numerology.namePlaceholder", "e.g., Jane Doe")} value={name} onChange={(e) => setName(e.target.value)} className={styles.input} />
            </div>
            <div>
              <label className={styles.inputLabel} htmlFor="birthdate">{t("numerology.birthdateLabel", "Birthdate")}</label>
              <input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className={styles.input} />
            </div>
          </div>

          <div className={`${styles.row} ${styles.two}`}>
            <div>
              <label className={styles.inputLabel} htmlFor="birthtime">{t("numerology.birthtimeLabel", "Time of Birth")}</label>
              <input id="birthtime" type="time" value={birthtime} onChange={(e) => setBirthtime(e.target.value)} className={styles.input} />
              <div className={styles.subtle}>{t("numerology.birthtimeHint", "If exact time is unknown, approximate is OK.")}</div>
            </div>
            <div>
              {/* Timezone is auto-detected from birth city - show only if detected */}
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
              <input
                id="birthCity"
                autoComplete="off"
                type="text"
                placeholder={t("numerology.birthCityPlaceholder", "e.g., Seoul, KR")}
                value={birthCity}
                onChange={(e) => setBirthCity(e.target.value)}
                onFocus={() => setShowBirthDropdown(true)}
                onBlur={() => setTimeout(() => setShowBirthDropdown(false), 250)}
                className={styles.input}
              />
              {showBirthDropdown && (suggestionsBirth.length > 0 || fetchingBirth) && (
                <ul className={styles.dropdown}>
                  {fetchingBirth && suggestionsBirth.length === 0 && <li className={styles.dropdownItem} style={{ color: "#bbb" }}>{t("numerology.dropdownLoading", "Searching...")}</li>}
                  {suggestionsBirth.map((s, i) => (
                    <li key={`${s.country}-${s.name}-${s.lat}-${s.lon}-${i}`} className={styles.dropdownItem}
                      onMouseDown={(e) => { e.preventDefault(); onPickBirthCity(s); }}>
                      {s.name}, {s.country}
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.subtle}>{t("numerology.birthCityHint", "Time zone will be estimated automatically.")}</div>
            </div>

            <div className={styles.relative} style={{ overflow: "visible" }}>
              <label className={styles.inputLabel} htmlFor="currCity">{t("numerology.currentCityLabel", "Current city")}</label>
              <input
                id="currCity"
                autoComplete="off"
                type="text"
                placeholder={t("numerology.currentCityPlaceholder", "e.g., Tokyo, JP")}
                value={currCity}
                onChange={(e) => setCurrCity(e.target.value)}
                onFocus={() => setShowCurrDropdown(true)}
                onBlur={() => setTimeout(() => setShowCurrDropdown(false), 250)}
                className={styles.input}
              />
              {showCurrDropdown && (suggestionsCurr.length > 0 || fetchingCurr) && (
                <ul className={styles.dropdown}>
                  {fetchingCurr && suggestionsCurr.length === 0 && <li className={styles.dropdownItem} style={{ color: "#bbb" }}>{t("numerology.dropdownLoading", "Searching...")}</li>}
                  {suggestionsCurr.map((s, i) => (
                    <li key={`${s.country}-${s.name}-${s.lat}-${s.lon}-${i}`} className={styles.dropdownItem}
                      onMouseDown={(e) => { e.preventDefault(); onPickCurrCity(s); }}>
                      {s.name}, {s.country}
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.toggle}>
                <input id="useCurrentInfluence" type="checkbox" checked={useCurrentCityInfluence} onChange={(e) => setUseCurrentCityInfluence(e.target.checked)} />
                <label htmlFor="useCurrentInfluence">{t("numerology.includeCurrentInfluence", "Include current city influence in Lucky Numbers")}</label>
              </div>
            </div>
          </div>

          <div className={`${styles.row} ${styles.two}`}>
            <div>
              <label className={styles.inputLabel} htmlFor="countPreset">{t("numerology.countLabel", "How many numbers?")}</label>
              <select id="countPreset" value={countPreset} onChange={(e) => setCountPreset(e.target.value as any)} className={styles.select}>
                <option value="3">{t("numerology.countOption3", "3 numbers")}</option>
                <option value="5">{t("numerology.countOption5", "5 numbers")}</option>
                <option value="custom">{t("numerology.countOptionCustom", "Custom")}</option>
              </select>
              {countPreset === "custom" && (
                <input type="number" min={1} value={customCount} onChange={(e) => setCustomCount(parseInt(e.target.value || "1", 10))} className={styles.input} placeholder={t("numerology.customCountPlaceholder", "Desired count")} />
              )}
            </div>
            <div>
              <label className={styles.inputLabel}>{t("numerology.rangeLabel", "Number range")}</label>
              <div className={`${styles.row} ${styles.two}`}>
                <input type="number" min={1} value={min} onChange={(e) => setMin(parseInt(e.target.value || "1", 10))} className={styles.input} placeholder={t("numerology.minPlaceholder", "Min")} />
                <input type="number" min={1} value={max} onChange={(e) => setMax(parseInt(e.target.value || "1", 10))} className={styles.input} placeholder={t("numerology.maxPlaceholder", "Max")} />
              </div>
            </div>
          </div>

          <div className={`${styles.row} ${styles.two}`}>
            <div className={styles.toggle}>
              <input id="allowDup" type="checkbox" checked={allowDuplicates} onChange={(e) => setAllowDuplicates(e.target.checked)} />
              <label htmlFor="allowDup">{t("numerology.allowDuplicates", "Allow duplicates")}</label>
            </div>
            <div>
              <label className={styles.inputLabel} htmlFor="seedMode">{t("numerology.seedLabel", "Seed (reproducibility)")}</label>
              <select id="seedMode" value={seedMode} onChange={(e) => setSeedMode(e.target.value as any)} className={styles.select}>
                <option value="name-birth">{t("numerology.seedOptionNameBirth", "Name + Birthdate")}</option>
                <option value="name-birth-city-time">{t("numerology.seedOptionNameBirthCityTime", "Name + Birth + Cities + Time (+TZ)")}</option>
                <option value="random">{t("numerology.seedOptionRandom", "Pure random")}</option>
              </select>
            </div>
          </div>

          <button className={styles.calcButton} onClick={handleCalculate}>
            <span className={styles.buttonGlow} />
            <span className={styles.buttonText}>{t("numerology.buttonCalculate", "Reveal My Numbers")}</span>
          </button>
          {error && <div className={styles.error}>{error}</div>}
        </div>
      )}

      {profile && (
        <div className={styles.resultsContainer}>
          <button className={styles.resetButton} onClick={() => { setProfile(null); setLuckyNumbers(null); setDailyLuckyNumbers(null); }}>
            ↻ {t("numerology.reset", "New Reading")}
          </button>

          <div className={styles.resultsHeader}>
            <div className={styles.headerIcon}>🔢</div>
            <h1 className={styles.resultsTitle}>{t("numerology.resultsTitle", "Your Numerology Profile")}</h1>
            <p className={styles.resultsSubtitle}>{t("numerology.resultsSubtitle", "Discover the numbers that shape your destiny")}</p>
          </div>

          {/* Core Numbers */}
          <div className={styles.resultsGrid}>
            <ResultCard title={t("numerology.cardLifePath", "Life Path Number")} value={profile.lifePathNumber} description={describe("lifePath", profile.lifePathNumber)} index={0} />
            <ResultCard title={t("numerology.cardExpression", "Expression Number")} value={profile.expressionNumber} description={describe("expression", profile.expressionNumber)} index={1} />
            <ResultCard title={t("numerology.cardSoulUrge", "Soul Urge Number")} value={profile.soulUrgeNumber} description={describe("soulUrge", profile.soulUrgeNumber)} index={2} />
            <ResultCard title={t("numerology.cardPersonality", "Personality Number")} value={profile.personalityNumber} description={describe("personality", profile.personalityNumber)} index={3} />
          </div>

          {/* Current Cycle Numbers */}
          <div className={`${styles.luckyWrap} ${styles.cycleWrap}`}>
            <div className={styles.luckyHeader}>
              <div className={styles.luckyIcon}>📅</div>
              <div className={styles.luckyTitle}>{t("numerology.cycleTitle", "Your Current Cycle")}</div>
            </div>
            <p className={styles.cycleSubtitle}>{t("numerology.cycleSubtitle", "These numbers change based on today's date")}</p>
            <div className={styles.cycleGrid}>
              <div className={styles.cycleCard}>
                <div className={styles.cycleNumber}>{profile.personalYear}</div>
                <div className={styles.cycleLabel}>{t("numerology.personalYear", "Personal Year")}</div>
                <div className={styles.cycleDesc}>{describe("personalYear", profile.personalYear)}</div>
              </div>
              <div className={styles.cycleCard}>
                <div className={styles.cycleNumber}>{profile.personalMonth}</div>
                <div className={styles.cycleLabel}>{t("numerology.personalMonth", "Personal Month")}</div>
                <div className={styles.cycleDesc}>{describe("personalMonth", profile.personalMonth)}</div>
              </div>
              <div className={styles.cycleCard}>
                <div className={styles.cycleNumber}>{profile.personalDay}</div>
                <div className={styles.cycleLabel}>{t("numerology.personalDay", "Today's Energy")}</div>
                <div className={styles.cycleDesc}>{describe("personalDay", profile.personalDay)}</div>
              </div>
            </div>
          </div>

          {/* Daily Lucky Numbers */}
          {dailyLuckyNumbers?.length ? (
            <div className={`${styles.luckyWrap} ${styles.dailyWrap}`}>
              <div className={styles.luckyHeader}>
                <div className={styles.luckyIcon}>🌟</div>
                <div className={styles.luckyTitle}>{t("numerology.dailyLuckyTitle", "Today's Lucky Numbers")}</div>
              </div>
              <p className={styles.dailyDate}>{today.toLocaleDateString()}</p>
              <div className={styles.chips}>
                {dailyLuckyNumbers.map((n, i) => {
                  const r = reduceToCore(n);
                  return (
                    <div className={`${styles.chip} ${styles.dailyChip}`} key={`daily-${n}-${i}`}>
                      <div className={styles.chipNumber}>{n}</div>
                      <div className={styles.chipTag}>#{r} {luckyTag[r] || t("numerology.luckyTagFallback", "Energy")}</div>
                    </div>
                  );
                })}
              </div>
              <p className={styles.dailyNote}>{t("numerology.dailyNote", "These numbers are unique to you and change daily based on your birth data.")}</p>
            </div>
          ) : null}

          {/* Permanent Lucky Numbers */}
          <div className={`${styles.luckyWrap} ${styles.luckyReveal}`}>
            <div className={styles.luckyHeader}>
              <div className={styles.luckyIcon}>⭐</div>
              <div className={styles.luckyTitle}>{t("numerology.luckyTitle", "Your Permanent Lucky Numbers")}</div>
            </div>
            <p className={styles.luckyNote}>{t("numerology.luckyNote", "These numbers are calculated from your name, birthdate, and location - they never change.")}</p>
            {luckyNumbers?.length ? (
              <div className={styles.chips}>
                {luckyNumbers.map((n, i) => {
                  const r = reduceToCore(n);
                  return (
                    <div
                      className={styles.chip}
                      key={`${n}-${i}`}
                      style={{ animation: `chipPop 0.5s ease-out ${0.6 + i * 0.1}s both` }}
                    >
                      <div className={styles.chipNumber}>{n}</div>
                      <div className={styles.chipTag}>#{r} {luckyTag[r] || t("numerology.luckyTagFallback", "Energy")}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.resultDescription}>{t("numerology.luckyEmpty", "Try adjusting the options and calculate again.")}</div>
            )}
          </div>

          {/* How it works */}
          <div className={`${styles.luckyWrap} ${styles.howItWorks}`}>
            <div className={styles.luckyHeader}>
              <div className={styles.luckyIcon}>💡</div>
              <div className={styles.luckyTitle}>{t("numerology.howItWorksTitle", "How Your Numbers Are Calculated")}</div>
            </div>
            <div className={styles.howGrid}>
              <div className={styles.howItem}>
                <strong>{t("numerology.howLifePath", "Life Path")}</strong>
                <span>{t("numerology.howLifePathDesc", "Sum of all digits in your birth date, reduced to a single digit (or master number 11, 22, 33).")}</span>
              </div>
              <div className={styles.howItem}>
                <strong>{t("numerology.howExpression", "Expression")}</strong>
                <span>{t("numerology.howExpressionDesc", "Each letter in your name converted to a number (A=1, B=2...), then summed and reduced.")}</span>
              </div>
              <div className={styles.howItem}>
                <strong>{t("numerology.howSoulUrge", "Soul Urge")}</strong>
                <span>{t("numerology.howSoulUrgeDesc", "Only vowels in your name (A, E, I, O, U) are summed and reduced.")}</span>
              </div>
              <div className={styles.howItem}>
                <strong>{t("numerology.howPersonality", "Personality")}</strong>
                <span>{t("numerology.howPersonalityDesc", "Only consonants in your name are summed and reduced.")}</span>
              </div>
              <div className={styles.howItem}>
                <strong>{t("numerology.howDaily", "Daily Numbers")}</strong>
                <span>{t("numerology.howDailyDesc", "Today's date combined with your birth data creates unique daily energy patterns.")}</span>
              </div>
              <div className={styles.howItem}>
                <strong>{t("numerology.howLucky", "Lucky Numbers")}</strong>
                <span>{t("numerology.howLuckyDesc", "Generated using a seed from your name, birthdate, birth city, and current city.")}</span>
              </div>
            </div>
          </div>

          {(birthCity || currCity) && (
            <div className={`${styles.luckyWrap} ${styles.summaryWrap}`} style={{ marginTop: "1rem" }}>
              <div className={styles.luckyTitle}>{t("numerology.summaryTitle", "Input summary")}</div>
              <div className={styles.resultDescription}>
                {birthCity && <>{t("numerology.summaryBirth", "Birth city")}: {birthCity}{timeZone ? ` (TZ: ${timeZone})` : ""} · {t("numerology.summaryBirthTime", "Birth time")}: {birthtime}<br /></>}
                {currCity && <>{t("numerology.summaryCurrent", "Current city")}: {currCity}</>}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
    </ServicePageLayout>
  );
}
