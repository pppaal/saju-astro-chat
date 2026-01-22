"use client";

import React from "react";
import type { MediaType } from "../types";
import styles from "../community.module.css";

export interface PostComposerFormProps {
  title: string;
  setTitle: (value: string) => void;
  mediaType: MediaType;
  setMediaType: (value: MediaType) => void;
  url: string;
  setUrl: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  tags: string;
  setTags: (value: string) => void;
  onSubmit: () => void;
  translate: (key: string, fallback: string) => string;
}

/**
 * PostComposerForm component for creating new posts
 * Includes media type selector, URL input, body textarea, tags input
 */
export const PostComposerForm: React.FC<PostComposerFormProps> = React.memo(({
  title,
  setTitle,
  mediaType,
  setMediaType,
  url,
  setUrl,
  body,
  setBody,
  tags,
  setTags,
  onSubmit,
  translate
}) => {
  return (
    <div className={styles.formGrid}>
      <div className={styles.formCol}>
        <label className={styles.label}>{translate("community.titleLabel", "Title")}</label>
        <input
          className={styles.input}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={translate("community.titlePlaceholder", "Write a clear title")}
        />

        <label className={styles.label}>{translate("community.mediaType", "Media type")}</label>
        <div className={styles.toggleRow}>
          <button
            onClick={() => setMediaType("image")}
            className={`${styles.toggle} ${mediaType === "image" ? styles.toggleActive : ""}`}
          >
            {translate("community.image", "Image")}
          </button>
          <button
            onClick={() => setMediaType("video")}
            className={`${styles.toggle} ${mediaType === "video" ? styles.toggleActive : ""}`}
          >
            {translate("community.video", "Video")}
          </button>
        </div>

        <label className={styles.label}>
          {mediaType === "image"
            ? translate("community.imageUrl", "Image URL (optional)")
            : translate("community.videoUrl", "Video URL (YouTube/Vimeo)")}
        </label>
        <input
          className={styles.input}
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder={mediaType === "image" ? "https://..." : "https://www.youtube.com/embed/..."}
        />
      </div>

      <div className={styles.formCol}>
        <label className={styles.label}>{translate("community.body", "Description")}</label>
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={translate("community.bodyPlaceholder", "Share your thoughts and insights")}
        />
        <label className={styles.label}>{translate("community.tags", "Tags")}</label>
        <input
          className={styles.input}
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="tarot, astrology, reading"
        />
        <div className={styles.right}>
          <button onClick={onSubmit} className={styles.primaryBtn}>
            {translate("community.post", "Post")}
          </button>
        </div>
      </div>
    </div>
  );
});

PostComposerForm.displayName = "PostComposerForm";
