"use client";

import React from "react";
import type { ExternalCommunity } from "../types";
import styles from "../community.module.css";

export interface ExternalCommunityCardProps {
  community: ExternalCommunity;
  index: number;
  translate: (key: string, fallback: string) => string;
}

/**
 * ExternalCommunityCard component displays an external community platform
 * Shows name, platform, members, icon with gradient background
 * Animation delay based on index
 */
export const ExternalCommunityCard: React.FC<ExternalCommunityCardProps> = React.memo(({
  community,
  index,
  translate
}) => {
  return (
    <a
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
        <div className={styles.communityMembers}>
          {community.members} {translate("community.members", "members")}
        </div>
      </div>
      <div className={styles.communityArrow}>{"->"}</div>
    </a>
  );
});

ExternalCommunityCard.displayName = "ExternalCommunityCard";
