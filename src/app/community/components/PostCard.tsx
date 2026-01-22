"use client";

import React from "react";
import Image from "next/image";
import type { Post } from "../types";
import { TimeStamp } from "./TimeStamp";
import { CommentSection } from "./CommentSection";
import styles from "../community.module.css";

export interface PostCardProps {
  post: Post;
  isLoggedIn: boolean;
  userIdentifier: string;
  isSaved: boolean;
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onReport: (postId: string) => void;
  onHide: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  showComments: boolean;
  commentText: string;
  onCommentTextChange: (postId: string, text: string) => void;
  onAddComment: (postId: string) => void;
  replyTexts: Record<string, string>;
  showReplies: Record<string, boolean>;
  onReplyTextChange: (commentId: string, text: string) => void;
  onToggleReplies: (commentId: string) => void;
  onAddReply: (postId: string, commentId: string) => void;
  onToggleCommentLike: (postId: string, commentId: string) => void;
  onToggleReplyLike: (postId: string, commentId: string, replyId: string) => void;
  translate: (key: string, fallback: string) => string;
}

/**
 * PostCard component displays a complete post with media, actions, and comments
 * Renders media (image/video/none)
 * Shows like, comment, bookmark, report, hide buttons
 * Includes CommentSection component
 */
export const PostCard: React.FC<PostCardProps> = React.memo(({
  post,
  isLoggedIn,
  userIdentifier,
  isSaved,
  onToggleLike,
  onToggleBookmark,
  onReport,
  onHide,
  onToggleComments,
  showComments,
  commentText,
  onCommentTextChange,
  onAddComment,
  replyTexts,
  showReplies,
  onReplyTextChange,
  onToggleReplies,
  onAddReply,
  onToggleCommentLike,
  onToggleReplyLike,
  translate
}) => {
  const isLiked = post.likedBy.includes(userIdentifier);

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.authorRow}>
          {post.authorImage && (
            <Image
              src={post.authorImage}
              alt={post.author}
              width={32}
              height={32}
              className={styles.avatar}
            />
          )}
          <div>
            <div className={styles.author}>{post.author}</div>
            <div className={styles.meta}>
              <TimeStamp epoch={post.createdAt} />
              <span>-</span>
              <span>{post.category}</span>
            </div>
          </div>
        </div>
        <div className={styles.title}>{post.title}</div>
      </div>

      {post.url && post.mediaType === "image" && (
        <div className={styles.mediaContainer}>
          <Image
            src={post.url}
            alt={post.title}
            className={styles.mediaImage}
            width={800}
            height={450}
            style={{ objectFit: "cover" }}
          />
        </div>
      )}

      {post.url && post.mediaType === "video" && (
        <div className={styles.mediaVideo}>
          <iframe
            src={post.url}
            title={post.title}
            className={styles.iframe}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {post.body && <p className={styles.cardBody}>{post.body}</p>}

      {post.tags.length > 0 && (
        <div className={styles.tagsRow}>
          {post.tags.map(t => (
            <span key={t} className={styles.tag}>
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <button
          onClick={() => onToggleLike(post.id)}
          className={`${styles.actionBtn} ${!isLoggedIn ? styles.disabledBtn : ""} ${isLiked ? styles.liked : ""}`}
          disabled={!isLoggedIn}
          title={isLoggedIn ? (isLiked ? "Unlike" : "Like") : translate("community.loginToLike", "Log in to like")}
        >
          {isLiked ? translate("community.liked", "Liked") : translate("community.like", "Like")} {post.likes}
        </button>
        <button
          onClick={() => onToggleComments(post.id)}
          className={styles.actionBtn}
        >
          {translate("community.comments", "Comments")} {post.comments.length}
        </button>
        <button
          onClick={() => onToggleBookmark(post.id)}
          className={`${styles.actionBtn} ${!isLoggedIn ? styles.disabledBtn : ""} ${isSaved ? styles.bookmarked : ""}`}
          disabled={!isLoggedIn}
          title={isSaved ? "Remove bookmark" : "Save to bookmarks"}
        >
          {isSaved ? translate("community.saved", "Saved") : translate("community.save", "Save")}
        </button>
        <button
          onClick={() => onReport(post.id)}
          className={`${styles.actionBtn} ${!isLoggedIn ? styles.disabledBtn : ""}`}
          disabled={!isLoggedIn}
        >
          {translate("community.report", "Report")}
        </button>
        <button
          onClick={() => onHide(post.id)}
          className={`${styles.actionBtn} ${!isLoggedIn ? styles.disabledBtn : ""}`}
          disabled={!isLoggedIn}
        >
          {translate("community.hide", "Hide")}
        </button>
      </div>

      {/* Comments Section */}
      <CommentSection
        comments={post.comments}
        postId={post.id}
        isLoggedIn={isLoggedIn}
        userIdentifier={userIdentifier}
        commentText={commentText}
        onCommentTextChange={onCommentTextChange}
        onAddComment={onAddComment}
        showComments={showComments}
        replyTexts={replyTexts}
        showReplies={showReplies}
        onReplyTextChange={onReplyTextChange}
        onToggleReplies={onToggleReplies}
        onAddReply={onAddReply}
        onToggleCommentLike={onToggleCommentLike}
        onToggleReplyLike={onToggleReplyLike}
        translate={translate}
      />
    </article>
  );
});

PostCard.displayName = "PostCard";
