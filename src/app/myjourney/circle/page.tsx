"use client";

import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import DateTimePicker from "@/components/ui/DateTimePicker";
import TimePicker from "@/components/ui/TimePicker";
import { searchCities } from "@/lib/cities";
import tzLookup from "tz-lookup";
import styles from "./circle.module.css";
import { logger } from "@/lib/logger";
import { useI18n } from "@/i18n/I18nProvider";

type CityHit = { name: string; country: string; lat: number; lon: number; timezone?: string };

type Person = {
  id: string;
  name: string;
  relation: string;
  birthDate?: string | null;
  birthTime?: string | null;
  gender?: string | null;
  birthCity?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tzId?: string | null;
  note?: string | null;
};

const RELATIONS = [
  { value: "partner", labelKey: "myjourney.circle.partner", icon: "❤️" },
  { value: "family", labelKey: "myjourney.circle.family", icon: "👨‍👩‍👧‍👦" },
  { value: "friend", labelKey: "myjourney.circle.friend", icon: "🤝" },
  { value: "colleague", labelKey: "myjourney.circle.colleague", icon: "💼" },
];

export default function CirclePage() {
  return (
    <Suspense fallback={<div className={styles.loading}>...</div>}>
      <CircleContent />
    </Suspense>
  );
}

function CircleContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, locale } = useI18n();

  const [people, setPeople] = useState<Person[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("family");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [gender, setGender] = useState("M");
  const [birthCity, setBirthCity] = useState("");
  const [note, setNote] = useState("");

  // City autocomplete state
  const [citySuggestions, setCitySuggestions] = useState<CityHit[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityHit | null>(null);
  const [openCityDropdown, setOpenCityDropdown] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);

  // Custom dropdown states
  const [relationOpen, setRelationOpen] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/myjourney");
    }
  }, [status, router]);

  useEffect(() => {
    const loadPeople = async () => {
      if (status !== "authenticated") {return;}
      try {
        const res = await fetch("/api/me/circle", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setPeople(data.people || []);
        }
      } catch (e) {
        logger.error("Failed to load circle:", e);
      } finally {
        setLoading(false);
      }
    };
    loadPeople();
  }, [status]);

  // City search effect
  useEffect(() => {
    const raw = birthCity.trim();
    const q = raw.split(",")[0]?.trim() || "";
    if (q.length < 1) {
      setCitySuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const hits = (await searchCities(q, { limit: 8 })) as CityHit[];
        setCitySuggestions(hits);
        if (isUserTyping) {
          setOpenCityDropdown(hits.length > 0);
        }
      } catch {
        setCitySuggestions([]);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [birthCity, isUserTyping]);

  const onPickCity = (hit: CityHit) => {
    setIsUserTyping(false);
    setBirthCity(`${hit.name}, ${hit.country}`);
    setSelectedCity({
      ...hit,
      timezone: hit.timezone ?? tzLookup(hit.lat, hit.lon),
    });
    setOpenCityDropdown(false);
  };

  const resetForm = () => {
    setName("");
    setRelation("family");
    setBirthDate("");
    setBirthTime("");
    setTimeUnknown(false);
    setGender("M");
    setBirthCity("");
    setNote("");
    setCitySuggestions([]);
    setSelectedCity(null);
    setOpenCityDropdown(false);
    setIsUserTyping(false);
    setRelationOpen(false);
    setGenderOpen(false);
  };

  const getRelationInfo = (val: string) => {
    const found = RELATIONS.find((r) => r.value === val) || RELATIONS[1];
    return { ...found, label: t(found.labelKey) };
  };
  const getGenderInfo = (val: string) => {
    const genders = [
      { value: "M", labelKey: "myjourney.circle.male", icon: "♂" },
      { value: "F", labelKey: "myjourney.circle.female", icon: "♀" },
    ];
    const found = genders.find((g) => g.value === val) || genders[0];
    return { ...found, label: t(found.labelKey) };
  };

  const handleSave = async () => {
    if (!name.trim()) {return;}
    setSaving(true);
    try {
      const res = await fetch("/api/me/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          relation,
          birthDate: birthDate || null,
          birthTime: timeUnknown ? "12:00" : (birthTime || null),
          gender,
          birthCity: birthCity || null,
          latitude: selectedCity?.lat || null,
          longitude: selectedCity?.lon || null,
          tzId: selectedCity?.timezone || null,
          note: note || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPeople([...people, data.person]);
        resetForm();
        setShowForm(false);
      }
    } catch (e) {
      logger.error("Failed to save:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("myjourney.circle.confirmDelete"))) {return;}
    try {
      const res = await fetch(`/api/me/circle?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPeople(people.filter((p) => p.id !== id));
      }
    } catch (e) {
      logger.error("Failed to delete:", e);
    }
  };

  const _getRelationInfo = (rel: string) => {
    const found = RELATIONS.find((r) => r.value === rel);
    return found ? { ...found, label: t(found.labelKey) } : { value: rel, labelKey: rel, label: rel, icon: "👤" };
  };

  if (status === "loading" || loading) {
    return <div className={styles.loading}>{t("myjourney.circle.loading")}</div>;
  }

  if (!session) {
    return null;
  }

  const grouped = RELATIONS.map((r) => ({
    ...r,
    people: people.filter((p) => p.relation === r.value),
  }));

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <BackButton onClick={() => router.back()} />
        <h1 className={styles.title}>{t("myjourney.circle.title")}</h1>
        <button
          className={styles.addButton}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "×" : "+"}
        </button>
      </div>

      <p className={styles.subtitle}>
        {t("myjourney.circle.subtitle")}
      </p>

      {/* Add Form */}
      {showForm && (
        <section className={styles.card}>
          <h3 className={styles.formTitle}>{t("myjourney.circle.addPerson")}</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>{t("myjourney.circle.nameRequired")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                placeholder={t("myjourney.circle.name")}
              />
            </div>

            <div className={styles.formGroup}>
              <label>{t("myjourney.circle.relationship")}</label>
              <div className={styles.selectWrapper}>
                <button
                  type="button"
                  className={`${styles.selectButton} ${relationOpen ? styles.selectButtonOpen : ''}`}
                  onClick={() => setRelationOpen(!relationOpen)}
                  onBlur={() => setTimeout(() => setRelationOpen(false), 150)}
                >
                  <span className={styles.selectIcon}>{getRelationInfo(relation).icon}</span>
                  <span className={styles.selectText}>{getRelationInfo(relation).label}</span>
                  <span className={`${styles.selectArrow} ${relationOpen ? styles.selectArrowOpen : ''}`}>▾</span>
                </button>
                {relationOpen && (
                  <div className={styles.selectDropdown}>
                    {RELATIONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        className={`${styles.selectOption} ${relation === r.value ? styles.selectOptionActive : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setRelation(r.value);
                          setRelationOpen(false);
                        }}
                      >
                        <span className={styles.selectOptionIcon}>{r.icon}</span>
                        <span className={styles.selectOptionText}>{t(r.labelKey)}</span>
                        {relation === r.value && <span className={styles.selectCheck}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <DateTimePicker
                value={birthDate}
                onChange={(date) => setBirthDate(date)}
                label={t("myjourney.circle.birthDate")}
                locale={locale}
              />
            </div>

            <div className={styles.formGroup}>
              <TimePicker
                value={birthTime}
                onChange={(time) => setBirthTime(time)}
                label={t("myjourney.circle.birthTime")}
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
                <span>{t("myjourney.circle.timeUnknown")}</span>
              </label>
              {timeUnknown && (
                <p className={styles.hint}>
                  {t("myjourney.circle.timeUnknownHint")}
                </p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>{t("myjourney.circle.gender")}</label>
              <div className={styles.selectWrapper}>
                <button
                  type="button"
                  className={`${styles.selectButton} ${genderOpen ? styles.selectButtonOpen : ''}`}
                  onClick={() => setGenderOpen(!genderOpen)}
                  onBlur={() => setTimeout(() => setGenderOpen(false), 150)}
                >
                  <span className={styles.selectIcon}>{getGenderInfo(gender).icon}</span>
                  <span className={styles.selectText}>{getGenderInfo(gender).label}</span>
                  <span className={`${styles.selectArrow} ${genderOpen ? styles.selectArrowOpen : ''}`}>▾</span>
                </button>
                {genderOpen && (
                  <div className={styles.selectDropdown}>
                    {[
                      { value: "M", labelKey: "myjourney.circle.male", icon: "♂" },
                      { value: "F", labelKey: "myjourney.circle.female", icon: "♀" },
                    ].map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        className={`${styles.selectOption} ${gender === g.value ? styles.selectOptionActive : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setGender(g.value);
                          setGenderOpen(false);
                        }}
                      >
                        <span className={styles.selectOptionIcon}>{g.icon}</span>
                        <span className={styles.selectOptionText}>{t(g.labelKey)}</span>
                        {gender === g.value && <span className={styles.selectCheck}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>{t("myjourney.circle.birthCity")}</label>
              <div className={styles.cityInputWrapper}>
                <input
                  type="text"
                  value={birthCity}
                  onChange={(e) => {
                    setBirthCity(e.target.value);
                    setIsUserTyping(true);
                    setSelectedCity(null);
                    setOpenCityDropdown(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setOpenCityDropdown(false), 150);
                    setIsUserTyping(false);
                  }}
                  autoComplete="off"
                  className={styles.input}
                  placeholder={t("myjourney.circle.cityPlaceholder")}
                />
                {openCityDropdown && citySuggestions.length > 0 && (
                  <ul className={styles.dropdown}>
                    {citySuggestions.map((s, idx) => (
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
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>{t("myjourney.circle.note")}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={styles.textarea}
              placeholder={t("myjourney.circle.notePlaceholder")}
              rows={2}
            />
          </div>

          <div className={styles.formActions}>
            <button
              className={styles.cancelButton}
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              {t("myjourney.circle.cancel")}
            </button>
            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving ? t("myjourney.circle.saving") : t("myjourney.circle.save")}
            </button>
          </div>
        </section>
      )}

      {/* People List */}
      {people.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>👥</span>
          <p>{t("myjourney.circle.emptyTitle")}</p>
          <button
            className={styles.emptyButton}
            onClick={() => setShowForm(true)}
          >
            {t("myjourney.circle.emptyButton")}
          </button>
        </div>
      ) : (
        <div className={styles.groups}>
          {grouped
            .filter((g) => g.people.length > 0)
            .map((group) => (
              <div key={group.value} className={styles.group}>
                <h3 className={styles.groupTitle}>
                  {group.icon} {t(group.labelKey)}
                </h3>
                <div className={styles.peopleList}>
                  {group.people.map((person) => (
                    <div key={person.id} className={styles.personCard}>
                      <div className={styles.personInfo}>
                        <span className={styles.personName}>{person.name}</span>
                        {person.birthDate && (
                          <span className={styles.personBirth}>
                            {person.birthDate}
                            {person.birthTime && ` ${person.birthTime}`}
                          </span>
                        )}
                      </div>
                      <div className={styles.personActions}>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDelete(person.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </main>
  );
}
