"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import styles from "./circle.module.css";

type Person = {
  id: string;
  name: string;
  relation: string;
  birthDate?: string | null;
  birthTime?: string | null;
  gender?: string | null;
  birthCity?: string | null;
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
    <SessionProvider>
      <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
        <CircleContent />
      </Suspense>
    </SessionProvider>
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
  const [gender, setGender] = useState("U");
  const [birthCity, setBirthCity] = useState("");
  const [note, setNote] = useState("");

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

  const resetForm = () => {
    setName("");
    setRelation("family");
    setBirthDate("");
    setBirthTime("");
    setGender("U");
    setBirthCity("");
    setNote("");
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
          gender: gender === "U" ? null : gender,
          birthCity: birthCity || null,
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
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className={styles.input}
              >
                {RELATIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.icon} {r.label}
                  </option>
                ))}
              </select>
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
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={styles.input}
              >
                <option value="U">Unknown</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Birth City</label>
              <input
                type="text"
                value={birthCity}
                onChange={(e) => setBirthCity(e.target.value)}
                className={styles.input}
                placeholder="Seoul, KR"
              />
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
                        <Link
                          href={`/destiny-match?person=${person.id}`}
                          className={styles.matchButton}
                        >
                          Check compatibility
                        </Link>
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
