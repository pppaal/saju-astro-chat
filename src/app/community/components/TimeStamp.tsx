"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export interface TimeStampProps {
  epoch: number;
}

/**
 * TimeStamp component displays relative time (e.g., "2h ago")
 * Handles days/hours/minutes formatting with suppressHydrationWarning for SSR
 */
export const TimeStamp: React.FC<TimeStampProps> = React.memo(({ epoch }) => {
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
});

TimeStamp.displayName = "TimeStamp";
