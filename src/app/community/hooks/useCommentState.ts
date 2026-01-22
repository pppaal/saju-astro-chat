import { useState } from 'react';

/**
 * Custom hook for managing comment and reply interaction state
 *
 * @returns Object containing comment/reply state and interaction functions
 */
export function useCommentState(): {
  commentTexts: Record<string, string>;
  setCommentTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  showComments: Record<string, boolean>;
  setShowComments: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  replyTexts: Record<string, string>;
  setReplyTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  showReplies: Record<string, boolean>;
  setShowReplies: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  toggleShowComments: (postId: string) => void;
  toggleShowReplies: (commentId: string) => void;
} {
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});

  const toggleShowComments = (postId: string) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const toggleShowReplies = (commentId: string) => {
    setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  return {
    commentTexts,
    setCommentTexts,
    showComments,
    setShowComments,
    replyTexts,
    setReplyTexts,
    showReplies,
    setShowReplies,
    toggleShowComments,
    toggleShowReplies,
  };
}
