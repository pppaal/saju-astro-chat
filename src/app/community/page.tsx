"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";
import BackButton from "@/components/ui/BackButton";
import { useI18n } from "@/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { PostSkeleton } from "@/components/ui/Skeleton";
import styles from "./community.module.css";

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

const seed: Post[] = [
  {
    id: uid(),
    parentId: null,
    author: "Orion",
    title: "Today's Tarot Spread - Major Insights",
    mediaType: "image",
    url: "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=800&h=600",
    body: "Just finished my morning tarot reading and got some powerful cards! The Tower, The Star, and The World. What an interesting combination for starting the day.",
    category: "tarot",
    tags: ["destinypal", "tarot", "daily"],
    createdAt: now() - 1000 * 60 * 45,
    likes: 8,
    likedBy: [],
    status: "visible",
    comments: [],
  },
  {
    id: uid(),
    parentId: null,
    author: "Lyra",
    title: "Understanding Your Natal Chart - Beginner's Guide",
    mediaType: "image",
    url: "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=800&h=600",
    body: "For everyone asking about how to read their birth chart! Here's a quick visual guide to the houses and what they represent.",
    category: "zodiac",
    tags: ["astrology", "guide", "natal chart"],
    createdAt: now() - 1000 * 60 * 15,
    likes: 12,
    likedBy: [],
    status: "visible",
    comments: [],
  },
];

// Hydration-safe timestamp
function TimeStamp({ epoch }: { epoch: number }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const diff = Date.now() - epoch;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) setText(`${days}d ago`);
    else if (hours > 0) setText(`${hours}h ago`);
    else if (mins > 0) setText(`${mins}m ago`);
    else setText("just now");
  }, [epoch]);
  return <span suppressHydrationWarning>{text}</span>;
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const toast = useToast();
  const isLoggedIn = !!session?.user;

  const [posts, setPosts] = useState<Post[]>(seed);
  const [tab, setTab] = useState<SortKey>("new");
  const [category, setCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
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
      toast.error("Title is required");
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
    toast.success("Post created successfully!");
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
        toast.info("Like removed");
      } else {
        toast.success("Post liked!");
      }
    });
  }

  function addComment(postId: string) {
    guard(() => {
      const text = commentTexts[postId]?.trim();
      if (!text) return;

      // Extract mentions (@username)
      const mentionRegex = /@(\w+)/g;
      const mentions = [...text.matchAll(mentionRegex)].map(m => m[1]);

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
      toast.success("Comment added!");

      if (mentions.length > 0) {
        toast.info(`Mentioned: ${mentions.join(", ")}`);
      }
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

      // Extract mention from reply
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
      toast.success("Reply added!");
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
      toast.info("Post reported. Thank you for keeping our community safe.");
    });
  }

  function toggleBookmark(id: string) {
    guard(() => {
      setSavedPosts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
          toast.info("Post removed from bookmarks");
        } else {
          newSet.add(id);
          toast.success("Post saved to bookmarks!");
        }
        // Save to localStorage
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
      <div className={styles.backButtonContainer}>
        <BackButton />
      </div>

      <header className={styles.header}>
        <div>
          <h1 className={styles.h1}>{t("community.title", "Community")}</h1>
          <p className={styles.headerDesc}>
            {t("community.subtitle", "Share your readings, insights, and connect with fellow seekers")}
          </p>
        </div>
        <div className={styles.headerRight}>
          <Link href="/community/recommendations" className={styles.recommendationsLink}>
            ✨ AI 추천
          </Link>
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
              aria-label="Clear search"
            >
              ✕
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
                {c}
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
                        <span>•</span>
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
                    {p.likedBy.includes(session?.user?.email || session?.user?.name || "") ? "❤️" : "🤍"} {p.likes}
                  </button>
                  <button
                    onClick={() => setShowComments(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                    className={styles.actionBtn}
                  >
                    💬 {p.comments.length}
                  </button>
                  <button
                    onClick={() => toggleBookmark(p.id)}
                    className={`${styles.actionBtn} ${!isLoggedIn ? styles.disabledBtn : ""} ${savedPosts.has(p.id) ? styles.bookmarked : ""}`}
                    disabled={!isLoggedIn}
                    title={savedPosts.has(p.id) ? "Remove bookmark" : "Save to bookmarks"}
                  >
                    {savedPosts.has(p.id) ? "🔖" : "📑"} {t("community.save", "Save")}
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
                                {comment.likedBy.includes(session?.user?.email || session?.user?.name || "") ? "❤️" : "🤍"} {comment.likes}
                              </button>
                              <button
                                onClick={() => setShowReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                                className={styles.commentActionBtn}
                              >
                                💬 Reply ({comment.replies.length})
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
                                              → @{reply.mentionedUser}
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
                                          {reply.likedBy.includes(session?.user?.email || session?.user?.name || "") ? "❤️" : "🤍"} {reply.likes}
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
                                      placeholder={`Reply to ${comment.author}... (use @username to mention)`}
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
                                      Send
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
  );
}
