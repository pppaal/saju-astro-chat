"use client";

import React from "react";
import type { Comment } from "../types";
import { CommentItem } from "./CommentItem";
import styles from "../community.module.css";

export interface CommentSectionProps {
  comments: Comment[];
  postId: string;
  isLoggedIn: boolean;
  userIdentifier: string;
  commentText: string;
  onCommentTextChange: (postId: string, text: string) => void;
  onAddComment: (postId: string) => void;
  showComments: boolean;
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
 * CommentSection component displays comments list with replies
 * Shows comment input if logged in
 * Toggleable comments view
 */
export const CommentSection: React.FC<CommentSectionProps> = React.memo(({
  comments,
  postId,
  isLoggedIn,
  userIdentifier,
  commentText,
  onCommentTextChange,
  onAddComment,
  showComments,
  replyTexts,
  showReplies,
  onReplyTextChange,
  onToggleReplies,
  onAddReply,
  onToggleCommentLike,
  onToggleReplyLike,
  translate
}) => {
  if (!showComments) return null;

  return (
    <div className={styles.commentsSection}>
      {comments.length > 0 && (
        <div className={styles.commentsList}>
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              isLoggedIn={isLoggedIn}
              userIdentifier={userIdentifier}
              onToggleLike={onToggleCommentLike}
              onToggleReplies={onToggleReplies}
              showReplies={!!showReplies[comment.id]}
              replyText={replyTexts[comment.id] || ""}
              onReplyTextChange={onReplyTextChange}
              onAddReply={onAddReply}
              onToggleReplyLike={onToggleReplyLike}
              translate={translate}
            />
          ))}
        </div>
      )}

      {isLoggedIn ? (
        <div className={styles.commentForm}>
          <input
            className={styles.commentInput}
            value={commentText}
            onChange={e => onCommentTextChange(postId, e.target.value)}
            placeholder={translate("community.addComment", "Add a comment...")}
            onKeyPress={e => {
              if (e.key === "Enter") {
                onAddComment(postId);
              }
            }}
          />
          <button
            onClick={() => onAddComment(postId)}
            className={styles.commentBtn}
          >
            {translate("community.send", "Send")}
          </button>
        </div>
      ) : (
        <div className={styles.commentLoginPrompt}>
          {translate("community.loginToComment", "Log in to comment")}
        </div>
      )}
    </div>
  );
});

CommentSection.displayName = "CommentSection";
