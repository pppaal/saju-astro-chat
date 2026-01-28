// src/components/destiny-map/display/sections/StarRating.tsx

"use client";

import React from "react";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 tracking-wider" aria-label={`${rating}점 (5점 만점)`}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export default StarRating;
