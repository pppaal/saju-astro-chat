"use client";

import React, { useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { PostSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { buildSignInUrl } from "@/lib/auth/signInUrl";
import styles from "./community.module.css";

// Types
import type { Post, Comment, Reply } from "./types";

// Constants
import { uid, now, CATEGORIES } from "./constants";

// Hooks
import {
  useParticleAnimation,
  useCommunityData,
  usePostsState,
  useFilterState,
  usePostFormState,
  useCommentState,
  useSavedPosts,
} from "./hooks";

// Components
import {
  ExternalCommunityCard,
  CategoryFilter,
  PostComposerForm,
  MatchingTeaserCard,
  PostCard,
} from "./components";

// Prevent static export errors; this page depends on client/session data.
export const dynamic = "force-dynamic";

export default function CommunityPage() {
  // Session and auth
  const { data: session } = useSession();
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const signInUrl = buildSignInUrl(pathname || "/community");
  const toast = useToast();
  const isLoggedIn = !!session?.user;
  const userIdentifier = session?.user?.email || session?.user?.name || "";

  // Canvas ref for particle animation
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  // Custom hooks
  useParticleAnimation(canvasRef);
  const { seedPosts, externalCommunities } = useCommunityData(locale);
  const { posts, setPosts, getFilteredPosts } = usePostsState(seedPosts);
  const { tab, setTab, category, setCategory, searchQuery, setSearchQuery } = useFilterState();
  const { title, setTitle, mediaType, setMediaType, url, setUrl, body, setBody, tags, setTags, resetForm } = usePostFormState();
  const { commentTexts, setCommentTexts, showComments, setShowComments, replyTexts, setReplyTexts, showReplies, setShowReplies, toggleShowComments, toggleShowReplies } = useCommentState();
  const { savedPosts, setSavedPosts } = useSavedPosts();

  // Sync posts with seed posts when locale changes
  useEffect(() => {
    setPosts(seedPosts);
  }, [seedPosts, setPosts]);

  // Get filtered posts
  const filtered = useMemo(() => getFilteredPosts(category, searchQuery, tab), [getFilteredPosts, category, searchQuery, tab]);

  // Auth guard wrapper
  const guard = (fn: () => void) => {
    if (!isLoggedIn) {
      toast.warning(t("community.loginRequired", "Please log in to perform this action"));
      return;
    }
    fn();
  };

  // Post action handlers
  const handleCreate = () => {
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
    resetForm();
    toast.success(t("community.success.postCreated", "Post created successfully!"));
  };

  const toggleLike = (id: string) => {
    guard(() => {
      setPosts(ps =>
        ps.map(p => {
          if (p.id === id) {
            const isLiked = p.likedBy.includes(userIdentifier);
            return {
              ...p,
              likes: isLiked ? p.likes - 1 : p.likes + 1,
              likedBy: isLiked
                ? p.likedBy.filter(u => u !== userIdentifier)
                : [...p.likedBy, userIdentifier],
            };
          }
          return p;
        })
      );
      const post = posts.find(p => p.id === id);
      if (post?.likedBy.includes(userIdentifier)) {
        toast.info(t("community.success.likeRemoved", "Like removed"));
      } else {
        toast.success(t("community.success.postLiked", "Post liked!"));
      }
    });
  };

  const addComment = (postId: string) => {
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
  };

  const toggleCommentLike = (postId: string, commentId: string) => {
    guard(() => {
      setPosts(ps =>
        ps.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: p.comments.map(c => {
                if (c.id === commentId) {
                  const isLiked = c.likedBy.includes(userIdentifier);
                  return {
                    ...c,
                    likes: isLiked ? c.likes - 1 : c.likes + 1,
                    likedBy: isLiked
                      ? c.likedBy.filter(u => u !== userIdentifier)
                      : [...c.likedBy, userIdentifier],
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
  };

  const addReply = (postId: string, commentId: string) => {
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
  };

  const toggleReplyLike = (postId: string, commentId: string, replyId: string) => {
    guard(() => {
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
                        const isLiked = r.likedBy.includes(userIdentifier);
                        return {
                          ...r,
                          likes: isLiked ? r.likes - 1 : r.likes + 1,
                          likedBy: isLiked
                            ? r.likedBy.filter(u => u !== userIdentifier)
                            : [...r.likedBy, userIdentifier],
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
  };

  const report = (id: string) => {
    guard(() => {
      setPosts(ps => ps.map(p => (p.id === id ? { ...p, status: "reported" as const } : p)));
      toast.info(t("community.success.reported", "Post reported. Thank you for keeping our community safe."));
    });
  };

  const toggleBookmark = (id: string) => {
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
  };

  const hide = (id: string) => {
    guard(() => {
      setPosts(ps => ps.map(p => (p.id === id ? { ...p, status: "hidden" as const } : p)));
      toast.info("Post hidden from your feed");
    });
  };

  return (
    <div className={styles.page}>
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      <div className={styles.container}>
        {/* Back Button */}
        <div className={styles.backButtonContainer}>
          <Link href="/" className={styles.backButton}>
            {"< "}{t("app.back", "Back")}
          </Link>
        </div>

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.logoSection}>
              <span className={styles.logoIcon}>*</span>
              <div>
                <h1 className={styles.h1}>
                  {t("community.headerTitle", "Global Cosmic Hub")}
                </h1>
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
              <Link href={signInUrl} className={styles.loginBtn}>
                {t("community.login", "Log in")}
              </Link>
            )}
          </div>
        </header>

        {/* External Communities Hub */}
        <section className={styles.externalHub}>
          <div className={styles.hubHeader}>
            <h2 className={styles.hubTitle}>
              {t("community.hubTitle", "Connect to Global Communities")}
            </h2>
            <p className={styles.hubSubtitle}>
              {t("community.hubSubtitle", "Join millions of cosmic seekers across platforms")}
            </p>
          </div>
          <div className={styles.communityGrid}>
            {externalCommunities.map((community, index) => (
              <ExternalCommunityCard
                key={community.name}
                community={community}
                index={index}
                translate={t}
              />
            ))}
          </div>
        </section>

        {/* Matching Feature Teaser */}
        <MatchingTeaserCard translate={t} />

        {/* Search Bar */}
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

        {/* Category Filter */}
        <div className={styles.controlsRow}>
          <div className={styles.categories}>
            <span className={styles.catLabel}>{t("community.categories", "Categories")}:</span>
            <CategoryFilter
              categories={[...CATEGORIES]}
              selected={category}
              onSelect={setCategory}
              translate={t}
            />
          </div>
        </div>

        {/* Post Composer */}
        {isLoggedIn && (
          <section className={styles.composeSection}>
            <h2 className={styles.h2}>{t("community.createPost", "Create a Post")}</h2>
            <p className={styles.guide}>
              {t("community.postGuide", "Share your insights, readings, or questions with the community")}
            </p>
            <PostComposerForm
              title={title}
              setTitle={setTitle}
              mediaType={mediaType}
              setMediaType={setMediaType}
              url={url}
              setUrl={setUrl}
              body={body}
              setBody={setBody}
              tags={tags}
              setTags={setTags}
              onSubmit={handleCreate}
              translate={t}
            />
          </section>
        )}

        {/* Login Prompt */}
        {!isLoggedIn && (
          <div className={styles.loginPrompt}>
            <p>{t("community.loginToPost", "Log in to create posts and join the discussion")}</p>
            <Link href={signInUrl} className={styles.loginPromptBtn}>
              {t("community.login", "Log in")}
            </Link>
          </div>
        )}

        {/* Posts Feed */}
        <main className={styles.feed} role="main" aria-label="Community feed">
          {filtered.length === 0 ? (
            <EmptyState
              icon="💬"
              title={t("community.noPosts", "No posts yet")}
              description="Be the first to share your thoughts and insights with the community"
              suggestions={[
                "Share your recent tarot reading",
                "Ask about your birth chart",
                "Discuss astrology insights"
              ]}
            />
          ) : (
            <div className={styles.grid}>
              {filtered.map(p => (
                <PostCard
                  key={p.id}
                  post={p}
                  isLoggedIn={isLoggedIn}
                  userIdentifier={userIdentifier}
                  isSaved={savedPosts.has(p.id)}
                  onToggleLike={toggleLike}
                  onToggleBookmark={toggleBookmark}
                  onReport={report}
                  onHide={hide}
                  onToggleComments={toggleShowComments}
                  showComments={!!showComments[p.id]}
                  commentText={commentTexts[p.id] || ""}
                  onCommentTextChange={(postId, text) => setCommentTexts(prev => ({ ...prev, [postId]: text }))}
                  onAddComment={addComment}
                  replyTexts={replyTexts}
                  showReplies={showReplies}
                  onReplyTextChange={(commentId, text) => setReplyTexts(prev => ({ ...prev, [commentId]: text }))}
                  onToggleReplies={toggleShowReplies}
                  onAddReply={addReply}
                  onToggleCommentLike={toggleCommentLike}
                  onToggleReplyLike={toggleReplyLike}
                  translate={t}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}





















