"use client";

import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { searchCities } from "@/lib/cities";
import tzLookup from "tz-lookup";
import styles from "./circle.module.css";

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
  { value: "partner", label: "Partner", icon: "❤️" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { value: "friend", label: "Friend", icon: "🤝" },
  { value: "colleague", label: "Colleague", icon: "💼" },
];

export default function CirclePage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <CircleContent />
    </Suspense>
  );
}

function CircleContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [people, setPeople] = useState<Person[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("family");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
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
      if (status !== "authenticated") return;
      try {
        const res = await fetch("/api/me/circle", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setPeople(data.people || []);
        }
      } catch (e) {
        console.error("Failed to load circle:", e);
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

  const getRelationInfo = (val: string) => RELATIONS.find((r) => r.value === val) || RELATIONS[1];
  const getGenderInfo = (val: string) => {
    const genders = [
      { value: "M", label: "Male", icon: "♂" },
      { value: "F", label: "Female", icon: "♀" },
    ];
    return genders.find((g) => g.value === val) || genders[0];
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          relation,
          birthDate: birthDate || null,
          birthTime: birthTime || null,
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
      console.error("Failed to save:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this person from your circle?")) return;
    try {
      const res = await fetch(`/api/me/circle?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPeople(people.filter((p) => p.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  const _getRelationInfo = (rel: string) => {
    return RELATIONS.find((r) => r.value === rel) || { value: rel, label: rel, icon: "👤" };
  };

  if (status === "loading" || loading) {
    return <div className={styles.loading}>Loading...</div>;
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
        <h1 className={styles.title}>My Circle</h1>
        <button
          className={styles.addButton}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "×" : "+"}
        </button>
      </div>

      <p className={styles.subtitle}>
        Save birth info of people you care about for quick compatibility readings
      </p>

      {/* Add Form */}
      {showForm && (
        <section className={styles.card}>
          <h3 className={styles.formTitle}>Add Person</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                placeholder="Name"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Relationship *</label>
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
                        <span className={styles.selectOptionText}>{r.label}</span>
                        {relation === r.value && <span className={styles.selectCheck}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Birth Date</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Birth Time</label>
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Gender</label>
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
                      { value: "M", label: "Male", icon: "♂" },
                      { value: "F", label: "Female", icon: "♀" },
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
                        <span className={styles.selectOptionText}>{g.label}</span>
                        {gender === g.value && <span className={styles.selectCheck}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Birth City</label>
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
                  placeholder="Enter city name"
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
            <label>Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={styles.textarea}
              placeholder="Any notes..."
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
              Cancel
            </button>
            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </section>
      )}

      {/* People List */}
      {people.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>👥</span>
          <p>No one in your circle yet</p>
          <button
            className={styles.emptyButton}
            onClick={() => setShowForm(true)}
          >
            Add your first person
          </button>
        </div>
      ) : (
        <div className={styles.groups}>
          {grouped
            .filter((g) => g.people.length > 0)
            .map((group) => (
              <div key={group.value} className={styles.group}>
                <h3 className={styles.groupTitle}>
                  {group.icon} {group.label}
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
