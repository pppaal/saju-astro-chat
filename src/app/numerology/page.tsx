"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Numerology.module.css";
import { Numerology, CoreNumerologyProfile } from "@/lib/numerology/numerology";
import { getSupportedTimezones, getUserTimezone } from "@/lib/Saju/timezone";
import { searchCities } from "@/lib/cities";
import tzLookup from "tz-lookup";
import { describe, luckyTag } from "@/lib/numerology/descriptions";

// 타입
type CityItem = { name: string; country: string; lat: number; lon: number };

// 유틸
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
  if (!allowDuplicates && count > range) throw new Error("중복을 허용하지 않으면, 선택 개수가 범위보다 클 수 없습니다.");
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

// 컴포넌트
function ResultCard({ title, value, description }: { title: string; value: React.ReactNode; description: string }) {
  return (
    <div className={styles.resultCard}>
      <span className={styles.resultValue}>{value}</span>
      <h3 className={styles.resultTitle}>{title}</h3>
      <p className={styles.resultDescription}>{description}</p>
    </div>
  );
}

export default function Page() {
  // 기본 입력
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState(""); // YYYY-MM-DD
  const [birthtime, setBirthtime] = useState("06:40"); // HH:mm

  // 타임존
  const timezones = useMemo(() => getSupportedTimezones(), []);
  const [timeZone, setTimeZone] = useState<string>(getUserTimezone() || "Asia/Seoul");

  // 도시 자동완성
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

  // 숫자 옵션
  const [countPreset, setCountPreset] = useState<"3" | "5" | "custom">("3");
  const [customCount, setCustomCount] = useState<number>(6);
  const [min, setMin] = useState<number>(1);
  const [max, setMax] = useState<number>(45);
  const [allowDuplicates, setAllowDuplicates] = useState<boolean>(false);
  const [seedMode, setSeedMode] = useState<"random" | "name-birth" | "name-birth-city-time">("name-birth-city-time");

  // 결과
  const [profile, setProfile] = useState<CoreNumerologyProfile | null>(null);
  const [luckyNumbers, setLuckyNumbers] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveCount = useMemo(
    () => (countPreset === "custom" ? Math.max(1, Math.floor(customCount || 1)) : parseInt(countPreset, 10)),
    [countPreset, customCount]
  );

  // 자동완성: 출생 도시
  useEffect(() => {
    const q = birthCity.trim();
    if (q.length < 2) {
      setSuggestionsBirth([]);
      return;
    }
    const myId = ++reqIdBirth.current;
    setFetchingBirth(true);
    const t = setTimeout(async () => {
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
    return () => clearTimeout(t);
  }, [birthCity]);

  // 자동완성: 현재 도시
  useEffect(() => {
    const q = currCity.trim();
    if (q.length < 2) {
      setSuggestionsCurr([]);
      return;
    }
    const myId = ++reqIdCurr.current;
    setFetchingCurr(true);
    const t = setTimeout(async () => {
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
    return () => clearTimeout(t);
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

    if (!birthdate) return setError("생년월일을 입력해주세요.");
    if (!birthtime) return setError("몇시인지(출생 시간)를 입력해주세요.");
    if (!name) return setError("정확한 리딩을 위해 성함을 입력해주세요.");
    if (min >= max) return setError("범위를 확인해주세요. 최소값은 최대값보다 작아야 합니다.");
    if (!allowDuplicates && effectiveCount > max - min + 1) {
      return setError("중복 미허용 시, 선택 개수는 범위 크기를 초과할 수 없습니다.");
    }

    const dateObj = new Date(`${birthdate}T00:00:00Z`);
    const person = new Numerology(name, dateObj);
    const coreProfile = person.getCoreProfile();
    setProfile(coreProfile);

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
    } catch (e: any) {
      setError(e.message || "숫자 생성 중 오류가 발생했습니다.");
      setLuckyNumbers(null);
    }
  };

  return (
    <main className={styles.page}>
      <button onClick={() => window.history.back()} className={styles.backButton}>← Back</button>
      <h1 className={styles.title}>Numerology Insights</h1>

      {!profile && (
        <div className={styles.formContainer}>
          <div className={`${styles.row} ${styles.two}`}>
            <div>
              <label className={styles.inputLabel} htmlFor="name">Full Name</label>
              <input id="name" type="text" placeholder="e.g., Jane Doe" value={name} onChange={(e) => setName(e.target.value)} className={styles.input} />
            </div>
            <div>
              <label className={styles.inputLabel} htmlFor="birthdate">Birthdate</label>
              <input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className={styles.input} />
            </div>
          </div>

          <div className={`${styles.row} ${styles.two}`}>
            <div>
              <label className={styles.inputLabel} htmlFor="birthtime">Time of Birth</label>
              <input id="birthtime" type="time" value={birthtime} onChange={(e) => setBirthtime(e.target.value)} className={styles.input} />
              <div className={styles.subtle}>정확한 시간이 없으면 대략으로 입력해도 OK.</div>
            </div>
            <div>
              <label className={styles.inputLabel} htmlFor="timeZone">Time Zone</label>
              <select id="timeZone" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={styles.select}>
                {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
              <div className={styles.subtle}>도시 선택 시 자동으로 추정됩니다.</div>
            </div>
          </div>

          <div className={`${styles.row} ${styles.two}`} style={{ overflow: "visible" }}>
            <div className={styles.relative} style={{ overflow: "visible" }}>
              <label className={styles.inputLabel} htmlFor="birthCity">출생 도시</label>
              <input
                id="birthCity"
                autoComplete="off"
                type="text"
                placeholder="예: Seoul, KR"
                value={birthCity}
                onChange={(e) => setBirthCity(e.target.value)}
                onFocus={() => setShowBirthDropdown(true)}
                onBlur={() => setTimeout(() => setShowBirthDropdown(false), 250)}
                className={styles.input}
              />
              {showBirthDropdown && (suggestionsBirth.length > 0 || fetchingBirth) && (
                <ul className={styles.dropdown}>
                  {fetchingBirth && suggestionsBirth.length === 0 && <li className={styles.dropdownItem} style={{ color: "#bbb" }}>검색 중…</li>}
                  {suggestionsBirth.map((s, i) => (
                    <li key={`${s.country}-${s.name}-${s.lat}-${s.lon}-${i}`} className={styles.dropdownItem}
                      onMouseDown={(e) => { e.preventDefault(); onPickBirthCity(s); }}>
                      {s.name}, {s.country}
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.subtle}>선택 시 타임존이 자동 설정됩니다.</div>
            </div>

            <div className={styles.relative} style={{ overflow: "visible" }}>
              <label className={styles.inputLabel} htmlFor="currCity">현재 거주 도시</label>
              <input
                id="currCity"
                autoComplete="off"
                type="text"
                placeholder="예: Tokyo, JP"
                value={currCity}
                onChange={(e) => setCurrCity(e.target.value)}
                onFocus={() => setShowCurrDropdown(true)}
                onBlur={() => setTimeout(() => setShowCurrDropdown(false), 250)}
                className={styles.input}
              />
              {showCurrDropdown && (suggestionsCurr.length > 0 || fetchingCurr) && (
                <ul className={styles.dropdown}>
                  {fetchingCurr && suggestionsCurr.length === 0 && <li className={styles.dropdownItem} style={{ color: "#bbb" }}>검색 중…</li>}
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
                <label htmlFor="useCurrentInfluence">현재 도시 영향 Lucky Numbers에 반영</label>
              </div>
            </div>
          </div>

          <div className={`${styles.row} ${styles.two}`}>
            <div>
              <label className={styles.inputLabel} htmlFor="countPreset">몇 개 번호 뽑을까요?</label>
              <select id="countPreset" value={countPreset} onChange={(e) => setCountPreset(e.target.value as any)} className={styles.select}>
                <option value="3">3개</option>
                <option value="5">5개</option>
                <option value="custom">커스텀</option>
              </select>
              {countPreset === "custom" && (
                <input type="number" min={1} value={customCount} onChange={(e) => setCustomCount(parseInt(e.target.value || "1", 10))} className={styles.input} placeholder="원하는 개수" />
              )}
            </div>
            <div>
              <label className={styles.inputLabel}>번호 범위</label>
              <div className={`${styles.row} ${styles.two}`}>
                <input type="number" min={1} value={min} onChange={(e) => setMin(parseInt(e.target.value || "1", 10))} className={styles.input} placeholder="최소값" />
                <input type="number" min={1} value={max} onChange={(e) => setMax(parseInt(e.target.value || "1", 10))} className={styles.input} placeholder="최대값" />
              </div>
            </div>
          </div>

          <div className={`${styles.row} ${styles.two}`}>
            <div className={styles.toggle}>
              <input id="allowDup" type="checkbox" checked={allowDuplicates} onChange={(e) => setAllowDuplicates(e.target.checked)} />
              <label htmlFor="allowDup">중복 허용</label>
            </div>
            <div>
              <label className={styles.inputLabel} htmlFor="seedMode">시드(재현성)</label>
              <select id="seedMode" value={seedMode} onChange={(e) => setSeedMode(e.target.value as any)} className={styles.select}>
                <option value="name-birth">이름+생일</option>
                <option value="name-birth-city-time">이름+생일+도시+시간(+TZ)</option>
                <option value="random">순수 랜덤</option>
              </select>
            </div>
          </div>

          <button className={styles.calcButton} onClick={handleCalculate}>Reveal My Numbers</button>
          {error && <div className={styles.error}>{error}</div>}
        </div>
      )}

      {profile && (
        <>
          <div className={styles.resultsGrid}>
            <ResultCard title="Life Path Number" value={profile.lifePathNumber} description={describe("lifePath", profile.lifePathNumber)} />
            <ResultCard title="Expression Number" value={profile.expressionNumber} description={describe("expression", profile.expressionNumber)} />
            <ResultCard title="Soul Urge Number" value={profile.soulUrgeNumber} description={describe("soulUrge", profile.soulUrgeNumber)} />
            <ResultCard title="Personality Number" value={profile.personalityNumber} description={describe("personality", profile.personalityNumber)} />
          </div>

          <div className={styles.luckyWrap}>
            <div className={styles.luckyTitle}>행운 숫자 추천</div>
            {luckyNumbers?.length ? (
              <div className={styles.chips}>
                {luckyNumbers.map((n, i) => {
                  const r = reduceToCore(n);
                  return (
                    <span className={styles.chip} key={`${n}-${i}`}>
                      {n}
                      <span className={styles.chipTag}>#{r} {luckyTag[r] || "에너지"}</span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className={styles.resultDescription}>옵션을 조정해 다시 시도해보세요.</div>
            )}
          </div>

          {(birthCity || currCity) && (
            <div className={styles.luckyWrap} style={{ marginTop: "1rem" }}>
              <div className={styles.luckyTitle}>입력 요약</div>
              <div className={styles.resultDescription}>
                {birthCity && <>출생 도시: {birthCity}{timeZone ? ` (TZ: ${timeZone})` : ""} · 출생 시간: {birthtime}<br /></>}
                {currCity && <>현재 도시: {currCity}</>}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}