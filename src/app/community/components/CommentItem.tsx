"use client";

import React from "react";
import Image from "next/image";
import type { Comment } from "../types";
import { TimeStamp } from "./TimeStamp";
import styles from "../community.module.css";

export interface CommentItemProps {
  comment: Comment;
  postId: string;
  isLoggedIn: boolean;
  userIdentifier: string;
  onToggleLike: (postId: string, commentId: string) => void;
  onToggleReplies: (commentId: string) => void;
  showReplies: boolean;
  replyText: string;
  onReplyTextChange: (commentId: string, text: string) => void;
  onAddReply: (postId: string, commentId: string) => void;
  onToggleReplyLike: (postId: string, commentId: string, replyId: string) => void;
  translate: (key: string, fallback: string) => string;
}

/**
 * CommentItem component displays a single comment with replies
 * Shows author, timestamp, body, likes
 * Includes reply section with nested replies
 */
export const CommentItem: React.FC<CommentItemProps> = React.memo(({
  comment,
  postId,
  isLoggedIn,
  userIdentifier,
  onToggleLike,
  onToggleReplies,
  showReplies,
  replyText,
  onReplyTextChange,
  onAddReply,
  onToggleReplyLike,
  translate
}) => {
  const isCommentLiked = comment.likedBy.includes(userIdentifier);

  return (
    <div className={styles.comment}>
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
          onClick={() => onToggleLike(postId, comment.id)}
          className={`${styles.commentActionBtn} ${!isLoggedIn ? styles.disabledBtn : ""} ${isCommentLiked ? styles.liked : ""}`}
          disabled={!isLoggedIn}
        >
          {isCommentLiked ? translate("community.liked", "Liked") : translate("community.like", "Like")} {comment.likes}
        </button>
        <button
          onClick={() => onToggleReplies(comment.id)}
          className={styles.commentActionBtn}
        >
          {translate("community.reply", "Reply")} ({comment.replies.length})
        </button>
      </div>

      {/* Replies */}
      {showReplies && (
        <div className={styles.repliesSection}>
          {comment.replies.length > 0 && (
            <div className={styles.repliesList}>
              {comment.replies.map(reply => {
                const isReplyLiked = reply.likedBy.includes(userIdentifier);
                return (
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
                      onClick={() => onToggleReplyLike(postId, comment.id, reply.id)}
                      className={`${styles.commentActionBtn} ${!isLoggedIn ? styles.disabledBtn : ""} ${isReplyLiked ? styles.liked : ""}`}
                      disabled={!isLoggedIn}
                    >
                      {isReplyLiked ? translate("community.liked", "Liked") : translate("community.like", "Like")} {reply.likes}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {isLoggedIn && (
            <div className={styles.replyForm}>
              <input
                className={styles.replyInput}
                value={replyText}
                onChange={e => onReplyTextChange(comment.id, e.target.value)}
                placeholder={translate("community.replyPlaceholder", "Reply to {{author}}... (use @username to mention)").replace("{{author}}", comment.author)}
                onKeyPress={e => {
                  if (e.key === "Enter") {
                    onAddReply(postId, comment.id);
                  }
                }}
              />
              <button
                onClick={() => onAddReply(postId, comment.id)}
                className={styles.replyBtn}
              >
                {translate("community.send", "Send")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CommentItem.displayName = "CommentItem";
