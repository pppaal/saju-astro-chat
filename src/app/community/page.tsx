"use client";

import React, { useMemo, useState, useEffect } from "react";
import styles from "./community.module.css";

type MediaType = "image" | "video";

type Post = {
  id: string;
  parentId: string | null;
  author: string;
  title: string;
  mediaType: MediaType;
  url: string;
  body?: string;
  category: string;
  tags: string[];
  createdAt: number;
  likes: number;
  status: "visible" | "hidden" | "reported";
};

type SortKey = "new" | "top";

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

const CATEGORIES = ["all", "tarot", "zodiac", "fortune", "stars"];

const seed: Post[] = [
  {
    id: uid(),
    parentId: null,
    author: "Orion",
    title: "DestinyPal daily spread",
    mediaType: "image",
    url: "",
    body: "Share a DestinyPal image URL to preview here. Only use URLs you’re allowed to share.",
    category: "tarot",
    tags: ["destinypal", "tarot"],
    createdAt: now() - 1000 * 60 * 45,
    likes: 8,
    status: "visible",
  },
  {
    id: uid(),
    parentId: null,
    author: "Lyra",
    title: "DestinyPal weekly roundup",
    mediaType: "video",
    url: "",
    body: "Paste a DestinyPal video embed URL (YouTube/Vimeo link you have rights to share).",
    category: "fortune",
    tags: ["destinypal", "video"],
    createdAt: now() - 1000 * 60 * 15,
    likes: 12,
    status: "visible",
  },
];

// Hydration-safe timestamp
function TimeStamp({ epoch }: { epoch: number }) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText(new Date(epoch).toLocaleString());
  }, [epoch]);
  return <span suppressHydrationWarning>{text}</span>;
}

// 데모용 로그인 훅 (실제 auth로 대체)
function useAuthDemo() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  return { isLoggedIn, toggle: () => setIsLoggedIn(v => !v) };
}

export default function CommunityPage() {
  const auth = useAuthDemo();
  const { isLoggedIn } = auth;

  const [posts, setPosts] = useState<Post[]>(seed);
  const [tab, setTab] = useState<SortKey>("new");
  const [category, setCategory] = useState<string>("all");

  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");

  const filtered = useMemo(() => {
    let list = posts.filter(p => p.parentId === null && p.status !== "hidden");
    if (category !== "all") list = list.filter(p => p.category === category);
    list = [...list];
    if (tab === "new") list.sort((a, b) => b.createdAt - a.createdAt);
    else list.sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt);
    return list;
  }, [posts, category, tab]);

  function handleCreate() {
    const t = title.trim();
    const u = url.trim();
    if (!t || !u) return;

    const newPost: Post = {
      id: uid(),
      parentId: null,
      author: isLoggedIn ? "You" : "Guest",
      title: t,
      mediaType,
      url: u,
      body: body.trim(),
      category: category === "all" ? "tarot" : category,
      tags: tags.split(/[,\s]+/).map(s => s.trim()).filter(Boolean),
      createdAt: now(),
      likes: 0,
      status: "visible",
    };
    setPosts(p => [newPost, ...p]);
    setTitle("");
    setUrl("");
    setBody("");
    setTags("");
  }

  function guard(fn: () => void) {
    if (!isLoggedIn) return;
    fn();
  }

  function like(id: string) {
    guard(() =>
      setPosts(ps => ps.map(p => (p.id === id ? { ...p, likes: p.likes + 1 } : p))),
    );
  }

  function report(id: string) {
    guard(() => setPosts(ps => ps.map(p => (p.id === id ? { ...p, status: "reported" } : p))));
  }

  function hide(id: string) {
    guard(() => setPosts(ps => ps.map(p => (p.id === id ? { ...p, status: "hidden" } : p))));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.h1}>Community</h1>
        <div className={styles.headerRight}>
          <div className={styles.tabs}>
            <button
              aria-pressed={tab === "new"}
              onClick={() => setTab("new")}
              className={`${styles.tab} ${tab === "new" ? styles.tabActive : ""}`}
            >
              New
            </button>
            <button
              aria-pressed={tab === "top"}
              onClick={() => setTab("top")}
              className={`${styles.tab} ${tab === "top" ? styles.tabActive : ""}`}
            >
              Top
            </button>
          </div>
          {/* 데모 로그인 토글. 실제 로그인 UI로 바꿔도 됨 */}
          <button onClick={auth.toggle} className={styles.loginBtn}>
            {isLoggedIn ? "Log out" : "Log in"}
          </button>
        </div>
      </header>

      <div className={styles.controlsRow}>
        <div className={styles.categories}>
          <span className={styles.catLabel}>Categories:</span>
          <div className={styles.catChips}>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`${styles.chip} ${category === c ? styles.chipActive : ""}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className={styles.composeSection}>
        <h2 className={styles.h2}>Create a Post</h2>
        <p className={styles.guide}>
          Only share DestinyPal images or videos using URLs you have permission to share. No HOT tab, no theme adding.
        </p>
        <div className={styles.formGrid}>
          <div className={styles.formCol}>
            <label className={styles.label}>Title</label>
            <input
              className={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Write a clear title"
            />

            <label className={styles.label}>Media type</label>
            <div className={styles.toggleRow}>
              <button
                onClick={() => setMediaType("image")}
                className={`${styles.toggle} ${mediaType === "image" ? styles.toggleActive : ""}`}
              >
                Image
              </button>
              <button
                onClick={() => setMediaType("video")}
                className={`${styles.toggle} ${mediaType === "video" ? styles.toggleActive : ""}`}
              >
                Video
              </button>
            </div>

            <label className={styles.label}>
              {mediaType === "image" ? "Image URL (DestinyPal)" : "Video URL (DestinyPal/YouTube embed)"}
            </label>
            <input
              className={styles.input}
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder={mediaType === "image" ? "https://... destinypal image URL" : "https://www.youtube.com/embed/..."}
            />
          </div>

          <div className={styles.formCol}>
            <label className={styles.label}>Body (optional)</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Add context if needed"
            />
            <label className={styles.label}>Tags</label>
            <input
              className={styles.input}
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="destinypal, tarot"
            />
            <div className={styles.right}>
              <button onClick={handleCreate} className={styles.primaryBtn}>
                Post
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className={styles.feed}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No posts yet. Be the first to post!</div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(p => (
              <article key={p.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.title}>{p.title}</div>
                  <div className={styles.meta}>
                    <TimeStamp epoch={p.createdAt} />
                    <span>•</span>
                    <span>{p.category}</span>
                  </div>
                </div>

                {p.mediaType === "image" && p.url ? (
                  <img src={p.url} alt={p.title} className={styles.mediaImage} />
                ) : p.mediaType === "video" && p.url ? (
                  <div className={styles.mediaVideo}>
                    <iframe
                      src={p.url}
                      title={p.title}
                      className={styles.iframe}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : null}

                {p.body && <p className={styles.cardBody}>{p.body}</p>}

                <div className={styles.tagsRow}>
                  {p.tags.map(t => (
                    <span key={t} className={styles.tag}>
                      #{t}
                    </span>
                  ))}
                </div>

                <div className={styles.actions}>
                  <button
                    onClick={() => guard(() => like(p.id))}
                    className={`${styles.actionBtn} ${!isLoggedIn ? styles.disabledBtn : ""}`}
                    disabled={!isLoggedIn}
                    title={isLoggedIn ? "Like" : "Log in to like"}
                  >
                    👍 {p.likes}
                  </button>
                  <button
                    onClick={() => guard(() => report(p.id))}
                    className={`${styles.actionBtn} ${!isLoggedIn ? styles.disabledBtn : ""}`}
                    disabled={!isLoggedIn}
                    title={isLoggedIn ? "Report" : "Log in to report"}
                  >
                    Report
                  </button>
                  <button
                    onClick={() => guard(() => hide(p.id))}
                    className={`${styles.actionBtn} ${!isLoggedIn ? styles.disabledBtn : ""}`}
                    disabled={!isLoggedIn}
                    title={isLoggedIn ? "Hide" : "Log in to hide"}
                  >
                    Hide
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}