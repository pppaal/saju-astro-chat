"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";
import { useI18n, DICTS } from "@/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { PostSkeleton } from "@/components/ui/Skeleton";
import styles from "./community.module.css";

// Prevent static export errors; this page depends on client/session data.
export const dynamic = "force-dynamic";

type Particle = {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  update: () => void;
  draw: () => void;
};

type MediaType = "image" | "video";

type Comment = {
  id: string;
  postId: string;
  author: string;
  authorImage?: string;
  body: string;
  createdAt: number;
  likes: number;
  likedBy: string[];
  replies: Reply[];
};

type Reply = {
  id: string;
  commentId: string;
  author: string;
  authorImage?: string;
  body: string;
  createdAt: number;
  likes: number;
  likedBy: string[];
  mentionedUser?: string;
};

type Post = {
  id: string;
  parentId: string | null;
  author: string;
  authorImage?: string;
  title: string;
  mediaType: MediaType;
  url: string;
  body?: string;
  category: string;
  tags: string[];
  createdAt: number;
  likes: number;
  likedBy: string[];
  status: "visible" | "hidden" | "reported";
  comments: Comment[];
};

type SortKey = "new" | "top";

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

const CATEGORIES = ["all", "tarot", "zodiac", "fortune", "stars", "saju"];
type CommunityEntry = { name?: string; platform?: string; members?: string; icon?: string };
type ExternalCommunity = { name: string; platform: string; members: string; icon: string; url: string; gradient: string };
type SeedPostEntry = { author?: string; title?: string; body?: string; category?: string; tags?: string[] };

const FALLBACK_COMMUNITIES: ExternalCommunity[] = [
  { name: "r/astrology", platform: "Reddit", members: "1.2M", icon: "*", url: "https://www.reddit.com/r/astrology", gradient: "linear-gradient(135deg, #2b2b52, #4a3f77)" },
  { name: "r/tarot", platform: "Reddit", members: "580K", icon: "*", url: "https://www.reddit.com/r/tarot", gradient: "linear-gradient(135deg, #1f2937, #3b82f6)" },
  { name: "#astrology", platform: "Instagram", members: "12M+", icon: "*", url: "https://www.instagram.com/explore/tags/astrology/", gradient: "linear-gradient(135deg, #111827, #6b21a8)" },
  { name: "Astrology Twitter", platform: "Twitter/X", members: "Active", icon: "*", url: "https://twitter.com/search?q=astrology", gradient: "linear-gradient(135deg, #0f172a, #1d4ed8)" },
];

const FALLBACK_SEED_POSTS: SeedPostEntry[] = [
  {
    author: "Orion",
    title: "Today's Tarot Spread - Major Insights",
    body: "Just finished my morning tarot reading and got some powerful cards! The Tower, The Star, and The World. What an interesting combination for starting the day.",
    category: "tarot",
    tags: ["destinypal", "tarot", "daily"],
  },
  {
    author: "Lyra",
    title: "Understanding Your Natal Chart - Beginner's Guide",
    body: "For everyone asking about how to read their birth chart! Here's a quick visual guide to the houses and what they represent.",
    category: "zodiac",
    tags: ["astrology", "guide", "natal chart"],
  },
];

const sanitizeIcon = (icon?: string) => {
  if (!icon) return "*";
  const ascii = icon.replace(/[^\x00-\x7F]/g, "*").trim();
  return ascii || "*";
};

const getCommunityDict = (locale: string) => {
  const dict = (DICTS as any)?.[locale]?.community;
  return dict || (DICTS as any)?.en?.community || {};
};

const buildExternalCommunities = (locale: string): ExternalCommunity[] => {
  const dict = getCommunityDict(locale);
  const fromDict = Array.isArray(dict?.externalCommunities) && dict.externalCommunities.length > 0
    ? dict.externalCommunities
    : FALLBACK_COMMUNITIES;

  return fromDict.map((entry: CommunityEntry, index: number) => {
    const fallback = FALLBACK_COMMUNITIES[index % FALLBACK_COMMUNITIES.length];
    return {
      name: entry.name || fallback.name,
      platform: entry.platform || fallback.platform,
      members: entry.members || fallback.members,
      icon: sanitizeIcon(entry.icon || fallback.icon),
      url: fallback.url,
      gradient: fallback.gradient,
    };
  });
};

const buildSeedPosts = (locale: string): Post[] => {
  const dict = getCommunityDict(locale);
  const fromDict = Array.isArray(dict?.seedPosts) && dict.seedPosts.length > 0
    ? dict.seedPosts
    : FALLBACK_SEED_POSTS;
  const baseTime = now();

  return fromDict.map((entry: SeedPostEntry, index: number) => {
    const fallback = FALLBACK_SEED_POSTS[index % FALLBACK_SEED_POSTS.length];
    return {
      id: uid(),
      parentId: null,
      author: entry.author || fallback.author || "User",
      authorImage: undefined,
      title: entry.title || fallback.title || "Untitled",
      mediaType: "image",
      url: "",
      body: entry.body || fallback.body || "",
      category: entry.category || fallback.category || "tarot",
      tags: Array.isArray(entry.tags) ? entry.tags.filter(Boolean) : (fallback.tags || []),
      createdAt: baseTime - (index + 1) * 60 * 60 * 1000,
      likes: 0,
      likedBy: [],
      status: "visible",
      comments: [],
    };
  });
};

// Hydration-safe timestamp
function TimeStamp({ epoch }: { epoch: number }) {
  const [text, setText] = useState("");
  const { t } = useI18n();
  useEffect(() => {
    const diff = Date.now() - epoch;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) setText(t("community.time.daysAgo", "{{d}}d ago").replace("{{d}}", String(days)));
    else if (hours > 0) setText(t("community.time.hoursAgo", "{{h}}h ago").replace("{{h}}", String(hours)));
    else if (mins > 0) setText(t("community.time.minutesAgo", "{{m}}m ago").replace("{{m}}", String(mins)));
    else setText(t("community.time.justNow", "just now"));
  }, [epoch, t]);
  return <span suppressHydrationWarning>{text}</span>;
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const { t, locale } = useI18n();
  const toast = useToast();
  const isLoggedIn = !!session?.user;
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  const seedPosts = useMemo(() => buildSeedPosts(locale), [locale]);
  const externalCommunities = useMemo(() => buildExternalCommunities(locale), [locale]);
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [tab, setTab] = useState<SortKey>("new");
  const [category, setCategory] = useState<string>("all");
  const [isLoading, _setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");

  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPosts(seedPosts);
  }, [seedPosts]);

  // Particle Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const PARTICLE_COUNT = 60;
    const MAX_LINK_DISTANCE = 100;
    const MOUSE_INTERACTION_RADIUS = 180;
    const PARTICLE_BASE_SPEED = 0.25;

    let particlesArray: Particle[] = [];
    let raf = 0;

    const mouse = {
      x: undefined as number | undefined,
      y: undefined as number | undefined,
      radius: MOUSE_INTERACTION_RADIUS,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.x;
      mouse.y = e.y;
    };
    const handleMouseOut = () => {
      mouse.x = undefined;
      mouse.y = undefined;
    };
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('resize', handleResize);

    class ParticleImpl implements Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED;
        this.speedY = (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED;
        const colors = ['#7c5cff', '#a78bfa', '#ff6b9d', '#ffa36c', '#43e97b'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;

        this.x += this.speedX;
        this.y += this.speedY;

        if (mouse.x !== undefined && mouse.y !== undefined) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            const directionX = forceDirectionX * force * 2;
            const directionY = forceDirectionY * force * 2;
            this.x -= directionX;
            this.y -= directionY;
          }
        }
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function init() {
      particlesArray = [];
      let numberOfParticles = (canvas.height * canvas.width) / 12000;
      numberOfParticles = Math.min(numberOfParticles, PARTICLE_COUNT);
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new ParticleImpl());
      }
    }

    function connectParticles() {
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < MAX_LINK_DISTANCE) {
            const opacity = (1 - distance / MAX_LINK_DISTANCE) * 0.4;
            ctx.strokeStyle = `rgba(124, 92, 255, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach((p) => {
        p.update();
        p.draw();
      });
      connectParticles();
      raf = requestAnimationFrame(animate);
    }

    init();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const filtered = useMemo(() => {
    let list = posts.filter(p => p.parentId === null && p.status !== "hidden");

    // Category filter
    if (category !== "all") list = list.filter(p => p.category === category);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.body?.toLowerCase().includes(query) ||
        p.author.toLowerCase().includes(query) ||
        p.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    list = [...list];

    // Sort
    if (tab === "new") list.sort((a, b) => b.createdAt - a.createdAt);
    else list.sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt);

    return list;
  }, [posts, category, tab, searchQuery]);

  function handleCreate() {
    if (!isLoggedIn) {
      toast.warning(t("community.loginRequired", "Please log in to create a post"));
      return;
    }

    const titleText = title.trim();
    const urlText = url.trim();
    if (!titleText) {
      toast.error(t("community.errors.titleRequired", "Title is required"));
      return;
    }

    const newPost: Post = {
      id: uid(),
      parentId: null,
      author: session?.user?.name || "User",
      authorImage: session?.user?.image || undefined,
      title: titleText,
      mediaType,
      url: urlText,
      body: body.trim(),
      category: category === "all" ? "tarot" : category,
      tags: tags.split(/[,\s]+/).map(s => s.trim()).filter(Boolean),
      createdAt: now(),
      likes: 0,
      likedBy: [],
      status: "visible",
      comments: [],
    };
    setPosts(p => [newPost, ...p]);
    setTitle("");
    setUrl("");
    setBody("");
    setTags("");
    toast.success(t("community.success.postCreated", "Post created successfully!"));
  }

  function guard(fn: () => void) {
    if (!isLoggedIn) {
      toast.warning(t("community.loginRequired", "Please log in to perform this action"));
      return;
    }
    fn();
  }

  function toggleLike(id: string) {
    guard(() => {
      const userId = session?.user?.email || session?.user?.name || "anonymous";
      setPosts(ps =>
        ps.map(p => {
          if (p.id === id) {
            const isLiked = p.likedBy.includes(userId);
            return {
              ...p,
              likes: isLiked ? p.likes - 1 : p.likes + 1,
              likedBy: isLiked
                ? p.likedBy.filter(u => u !== userId)
                : [...p.likedBy, userId],
            };
          }
          return p;
        })
      );
      const post = posts.find(p => p.id === id);
      if (post?.likedBy.includes(userId)) {
        toast.info(t("community.success.likeRemoved", "Like removed"));
      } else {
        toast.success(t("community.success.postLiked", "Post liked!"));
      }
    });
  }

  function addComment(postId: string) {
    guard(() => {
      const text = commentTexts[postId]?.trim();
      if (!text) return;

      const newComment: Comment = {
        id: uid(),
        postId,
        author: session?.user?.name || "User",
        authorImage: session?.user?.image || undefined,
        body: text,
        createdAt: now(),
        likes: 0,
        likedBy: [],
        replies: [],
      };

      setPosts(ps =>
        ps.map(p =>
          p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
        )
      );
      setCommentTexts(prev => ({ ...prev, [postId]: "" }));
      toast.success(t("community.success.commentAdded", "Comment added!"));
    });
  }

  function toggleCommentLike(postId: string, commentId: string) {
    guard(() => {
      const userId = session?.user?.email || session?.user?.name || "anonymous";
      setPosts(ps =>
        ps.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: p.comments.map(c => {
                if (c.id === commentId) {
                  const isLiked = c.likedBy.includes(userId);
                  return {
                    ...c,
                    likes: isLiked ? c.likes - 1 : c.likes + 1,
                    likedBy: isLiked
                      ? c.likedBy.filter(u => u !== userId)
                      : [...c.likedBy, userId],
                  };
                }
                return c;
              }),
            };
          }
          return p;
        })
      );
    });
  }

  function addReply(postId: string, commentId: string) {
    guard(() => {
      const text = replyTexts[commentId]?.trim();
      if (!text) return;

      const mentionMatch = text.match(/@(\w+)/);
      const mentionedUser = mentionMatch ? mentionMatch[1] : undefined;

      const newReply: Reply = {
        id: uid(),
        commentId,
        author: session?.user?.name || "User",
        authorImage: session?.user?.image || undefined,
        body: text,
        createdAt: now(),
        likes: 0,
        likedBy: [],
        mentionedUser,
      };

      setPosts(ps =>
        ps.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: p.comments.map(c =>
                c.id === commentId ? { ...c, replies: [...c.replies, newReply] } : c
              ),
            };
          }
          return p;
        })
      );
      setReplyTexts(prev => ({ ...prev, [commentId]: "" }));
      toast.success(t("community.success.replyAdded", "Reply added!"));
    });
  }

  function toggleReplyLike(postId: string, commentId: string, replyId: string) {
    guard(() => {
      const userId = session?.user?.email || session?.user?.name || "anonymous";
      setPosts(ps =>
        ps.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: p.comments.map(c => {
                if (c.id === commentId) {
                  return {
                    ...c,
                    replies: c.replies.map(r => {
                      if (r.id === replyId) {
                        const isLiked = r.likedBy.includes(userId);
                        return {
                          ...r,
                          likes: isLiked ? r.likes - 1 : r.likes + 1,
                          likedBy: isLiked
                            ? r.likedBy.filter(u => u !== userId)
                            : [...r.likedBy, userId],
                        };
                      }
                      return r;
                    }),
                  };
                }
                return c;
              }),
            };
          }
          return p;
        })
      );
    });
  }

  function report(id: string) {
    guard(() => {
      setPosts(ps => ps.map(p => (p.id === id ? { ...p, status: "reported" } : p)));
      toast.info(t("community.success.reported", "Post reported. Thank you for keeping our community safe."));
    });
  }

  function toggleBookmark(id: string) {
    guard(() => {
      setSavedPosts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
          toast.info(t("community.success.unsaved", "Post removed from bookmarks"));
        } else {
          newSet.add(id);
          toast.success(t("community.success.saved", "Post saved to bookmarks!"));
        }
        localStorage.setItem("savedPosts", JSON.stringify(Array.from(newSet)));
        return newSet;
      });
    });
  }

  // Load saved posts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("savedPosts");
    if (saved) {
      try {
        const savedArray = JSON.parse(saved);
        setSavedPosts(new Set(savedArray));
      } catch (e) {
        console.error("Failed to load saved posts", e);
      }
    }
  }, []);

  function hide(id: string) {
    guard(() => {
      setPosts(ps => ps.map(p => (p.id === id ? { ...p, status: "hidden" } : p)));
      toast.info("Post hidden from your feed");
    });
  }

  return (
    <div className={styles.page}>
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      <div className={styles.container}>
        {/* Back Button */}
        <div className={styles.backButtonContainer}>
          <Link href="/" className={styles.backButton}>{"< "}{t("app.back", "Back")}</Link>
        </div>

        {/* Header */}
        <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoSection}>
            <span className={styles.logoIcon}>*</span>
            <div>
              <h1 className={styles.h1}>{t("community.headerTitle", "Global Cosmic Hub")}</h1>
              <p className={styles.headerDesc}>
                {t("community.headerDesc", "Connect with seekers worldwide - Share insights - Find your cosmic match")}
              </p>
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.tabs}>
            <button
              aria-pressed={tab === "new"}
              onClick={() => setTab("new")}
              className={`${styles.tab} ${tab === "new" ? styles.tabActive : ""}`}
            >
              {t("community.new", "New")}
            </button>
            <button
              aria-pressed={tab === "top"}
              onClick={() => setTab("top")}
              className={`${styles.tab} ${tab === "top" ? styles.tabActive : ""}`}
            >
              {t("community.top", "Top")}
            </button>
          </div>
          {isLoggedIn ? (
            <button onClick={() => signOut()} className={styles.loginBtn}>
              {t("community.logout", "Log out")}
            </button>
          ) : (
            <button onClick={() => signIn()} className={styles.loginBtn}>
              {t("community.login", "Log in")}
            </button>
          )}
        </div>
        </header>

        {/* External Communities Hub */}
        <section className={styles.externalHub}>
        <div className={styles.hubHeader}>
          <h2 className={styles.hubTitle}>{t("community.hubTitle", "Connect to Global Communities")}</h2>
          <p className={styles.hubSubtitle}>{t("community.hubSubtitle", "Join millions of cosmic seekers across platforms")}</p>
        </div>
        <div className={styles.communityGrid}>
          {externalCommunities.map((community, index) => (
            <a
              key={community.name}
              href={community.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.communityCard}
              style={{
                background: community.gradient,
                animationDelay: `${index * 0.1}s`
              }}
            >
              <div className={styles.communityIcon}>{community.icon}</div>
              <div className={styles.communityInfo}>
                <div className={styles.communityName}>{community.name}</div>
                <div className={styles.communityPlatform}>{community.platform}</div>
                <div className={styles.communityMembers}>{community.members} {t("community.members", "members")}</div>
              </div>
              <div className={styles.communityArrow}>{"->"}</div>
            </a>
          ))}
        </div>
        </section>

        {/* Matching Feature Teaser */}
        <section className={styles.matchingSection}>
        <div className={styles.matchingCard}>
          <div className={styles.matchingIcon}>*</div>
          <div className={styles.matchingContent}>
            <h3 className={styles.matchingTitle}>{t("community.matchingTitle", "Cosmic Compatibility Matching")}</h3>
            <p className={styles.matchingDesc}>
              {t("community.matchingDesc", "Find your perfect cosmic match based on birth charts, zodiac signs, and shared interests")}
            </p>
            <Link href="/community/matching" className={styles.matchingButton}>
              <span>{t("community.comingSoon", "Coming Soon")}</span>
              <span className={styles.matchingButtonIcon}>{"->"}</span>
            </Link>
          </div>
        </div>
        </section>

        <div className={styles.controlsRow}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder={t("community.searchPlaceholder", "Search posts, tags, or authors...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Search community posts"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className={styles.clearSearch}
              aria-label={t("community.clearSearch", "Clear search")}
            >
              x
            </button>
          )}
        </div>
        </div>

        <div className={styles.controlsRow}>
        <div className={styles.categories}>
          <span className={styles.catLabel}>{t("community.categories", "Categories")}:</span>
          <div className={styles.catChips}>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`${styles.chip} ${category === c ? styles.chipActive : ""}`}
              >
                {t(`community.categoryLabels.${c}`, c)}
              </button>
            ))}
          </div>
        </div>
        </div>

        {isLoggedIn && (
          <section className={styles.composeSection}>
          <h2 className={styles.h2}>{t("community.createPost", "Create a Post")}</h2>
          <p className={styles.guide}>
            {t("community.postGuide", "Share your insights, readings, or questions with the community")}
          </p>
          <div className={styles.formGrid}>
            <div className={styles.formCol}>
              <label className={styles.label}>{t("community.titleLabel", "Title")}</label>
              <input
                className={styles.input}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t("community.titlePlaceholder", "Write a clear title")}
              />

              <label className={styles.label}>{t("community.mediaType", "Media type")}</label>
              <div className={styles.toggleRow}>
                <button
                  onClick={() => setMediaType("image")}
                  className={`${styles.toggle} ${mediaType === "image" ? styles.toggleActive : ""}`}
                >
                  {t("community.image", "Image")}
                </button>
                <button
                  onClick={() => setMediaType("video")}
                  className={`${styles.toggle} ${mediaType === "video" ? styles.toggleActive : ""}`}
                >
                  {t("community.video", "Video")}
                </button>
              </div>

              <label className={styles.label}>
                {mediaType === "image"
                  ? t("community.imageUrl", "Image URL (optional)")
                  : t("community.videoUrl", "Video URL (YouTube/Vimeo)")}
              </label>
              <input
                className={styles.input}
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder={mediaType === "image" ? "https://..." : "https://www.youtube.com/embed/..."}
              />
            </div>

            <div className={styles.formCol}>
              <label className={styles.label}>{t("community.body", "Description")}</label>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={t("community.bodyPlaceholder", "Share your thoughts and insights")}
              />
              <label className={styles.label}>{t("community.tags", "Tags")}</label>
              <input
                className={styles.input}
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="tarot, astrology, reading"
              />
              <div className={styles.right}>
                <button onClick={handleCreate} className={styles.primaryBtn}>
                  {t("community.post", "Post")}
                </button>
              </div>
            </div>
          </div>
          </section>
        )}

        {!isLoggedIn && (
          <div className={styles.loginPrompt}>
          <p>{t("community.loginToPost", "Log in to create posts and join the discussion")}</p>
          <button onClick={() => signIn()} className={styles.loginPromptBtn}>
            {t("community.login", "Log in")}
          </button>
          </div>
        )}

        <main className={styles.feed} role="main" aria-label="Community feed">
        {isLoading ? (
          <div className={styles.grid}>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            {t("community.noPosts", "No posts yet. Be the first to share!")}
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(p => (
              <article key={p.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.authorRow}>
                    {p.authorImage && (
                      <Image
                        src={p.authorImage}
                        alt={p.author}
                        width={32}
                        height={32}
                        className={styles.avatar}
                      />
                    )}
                    <div>
                      <div className={styles.author}>{p.author}</div>
                      <div className={styles.meta}>
                        <TimeStamp epoch={p.createdAt} />
                        <span>-</span>
                        <span>{p.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.title}>{p.title}</div>
                </div>

                {p.url && p.mediaType === "image" && (
                  <div className={styles.mediaContainer}>
                    <Image
                      src={p.url}
                      alt={p.title}
                      className={styles.mediaImage}
                      width={800}
                      height={450}
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                )}

                {p.url && p.mediaType === "video" && (
                  <div className={styles.mediaVideo}>
                    <iframe
                      src={p.url}
                      title={p.title}
                      className={styles.iframe}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {p.body && <p className={styles.cardBody}>{p.body}</p>}

                {p.tags.length > 0 && (
                  <div className={styles.tagsRow}>
                    {p.tags.map(t => (
                      <span key={t} className={styles.tag}>
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                <div className={styles.actions}>
                  <button
                    onClick={() => toggleLike(p.id)}
                    className={`${styles.actionBtn} ${!isLoggedIn ? styles.disabledBtn : ""} ${p.likedBy.includes(session?.user?.email || session?.user?.name || "") ? styles.liked : ""}`}
                    disabled={!isLoggedIn}
                    title={isLoggedIn ? (p.likedBy.includes(session?.user?.email || session?.user?.name || "") ? "Unlike" : "Like") : t("community.loginToLike", "Log in to like")}
                  >
                    {p.likedBy.includes(session?.user?.email || session?.user?.name || "") ? t("community.liked", "Liked") : t("community.like", "Like")} {p.likes}
                  </button>
                  <button
                    onClick={() => setShowComments(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                    className={styles.actionBtn}
                  >
                    {t("community.comments", "Comments")} {p.comments.length}
                  </button>
                  <button
                    onClick={() => toggleBookmark(p.id)}
                    className={`${styles.actionBtn} ${!isLoggedIn ? styles.disabledBtn : ""} ${savedPosts.has(p.id) ? styles.bookmarked : ""}`}
                    disabled={!isLoggedIn}
                    title={savedPosts.has(p.id) ? "Remove bookmark" : "Save to bookmarks"}
                  >
                    {savedPosts.has(p.id) ? t("community.saved", "Saved") : t("community.save", "Save")}
                  </button>
                  <button
                    onClick={() => report(p.id)}
                    className={`${styles.actionBtn} ${!isLoggedIn ? styles.disabledBtn : ""}`}
                    disabled={!isLoggedIn}
                  >
                    {t("community.report", "Report")}
                  </button>
                  <button
                    onClick={() => hide(p.id)}
                    className={`${styles.actionBtn} ${!isLoggedIn ? styles.disabledBtn : ""}`}
                    disabled={!isLoggedIn}
                  >
                    {t("community.hide", "Hide")}
                  </button>
                </div>

                {/* Comments Section */}
                {showComments[p.id] && (
                  <div className={styles.commentsSection}>
                    {p.comments.length > 0 && (
                      <div className={styles.commentsList}>
                        {p.comments.map(comment => (
                          <div key={comment.id} className={styles.comment}>
                            <div className={styles.commentHeader}>
                              {comment.authorImage && (
                                <Image
                                  src={comment.authorImage}
                                  alt={comment.author}
                                  width={24}
                                  height={24}
                                  className={styles.commentAvatar}
                                />
                              )}
                              <span className={styles.commentAuthor}>{comment.author}</span>
                              <span className={styles.commentTime}>
                                <TimeStamp epoch={comment.createdAt} />
                              </span>
                            </div>
                            <p className={styles.commentBody}>{comment.body}</p>

                                                        <div className={styles.commentActions}>
                              <button
                                onClick={() => toggleCommentLike(p.id, comment.id)}
                                className={`${styles.commentActionBtn} ${!isLoggedIn ? styles.disabledBtn : ""} ${comment.likedBy.includes(session?.user?.email || session?.user?.name || "") ? styles.liked : ""}`}
                                disabled={!isLoggedIn}
                              >
                                {comment.likedBy.includes(session?.user?.email || session?.user?.name || "") ? t("community.liked", "Liked") : t("community.like", "Like")} {comment.likes}
                              </button>
                              <button
                                onClick={() => setShowReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                                className={styles.commentActionBtn}
                              >
                                {t("community.reply", "Reply")} ({comment.replies.length})
                              </button>
                            </div>
{/* Replies */}
                            {showReplies[comment.id] && (
                              <div className={styles.repliesSection}>
                                {comment.replies.length > 0 && (
                                  <div className={styles.repliesList}>
                                    {comment.replies.map(reply => (
                                      <div key={reply.id} className={styles.reply}>
                                        <div className={styles.replyHeader}>
                                          {reply.authorImage && (
                                            <Image
                                              src={reply.authorImage}
                                              alt={reply.author}
                                              width={20}
                                              height={20}
                                              className={styles.replyAvatar}
                                            />
                                          )}
                                          <span className={styles.replyAuthor}>{reply.author}</span>
                                          {reply.mentionedUser && (
                                            <span className={styles.mention}>
                                              @{reply.mentionedUser}
                                            </span>
                                          )}
                                          <span className={styles.replyTime}>
                                            <TimeStamp epoch={reply.createdAt} />
                                          </span>
                                        </div>
                                        <p className={styles.replyBody}>{reply.body}</p>
                                        <button
                                          onClick={() => toggleReplyLike(p.id, comment.id, reply.id)}
                                          className={`${styles.commentActionBtn} ${!isLoggedIn ? styles.disabledBtn : ""} ${reply.likedBy.includes(session?.user?.email || session?.user?.name || "") ? styles.liked : ""}`}
                                          disabled={!isLoggedIn}
                                        >
                                          {reply.likedBy.includes(session?.user?.email || session?.user?.name || "") ? t("community.liked", "Liked") : t("community.like", "Like")} {reply.likes}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {isLoggedIn && (
                                  <div className={styles.replyForm}>
                                    <input
                                      className={styles.replyInput}
                                      value={replyTexts[comment.id] || ""}
                                      onChange={e => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                      placeholder={t("community.replyPlaceholder", "Reply to {{author}}... (use @username to mention)").replace("{{author}}", comment.author)}
                                      onKeyPress={e => {
                                        if (e.key === "Enter") {
                                          addReply(p.id, comment.id);
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => addReply(p.id, comment.id)}
                                      className={styles.replyBtn}
                                    >
                                      {t("community.send", "Send")}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {isLoggedIn ? (
                      <div className={styles.commentForm}>
                        <input
                          className={styles.commentInput}
                          value={commentTexts[p.id] || ""}
                          onChange={e => setCommentTexts(prev => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder={t("community.addComment", "Add a comment...")}
                          onKeyPress={e => {
                            if (e.key === "Enter") {
                              addComment(p.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => addComment(p.id)}
                          className={styles.commentBtn}
                        >
                          {t("community.send", "Send")}
                        </button>
                      </div>
                    ) : (
                      <div className={styles.commentLoginPrompt}>
                        {t("community.loginToComment", "Log in to comment")}
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}





















