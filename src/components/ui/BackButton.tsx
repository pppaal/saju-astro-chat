"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      style={{
        position: "fixed",
        top: "1rem",
        left: "1rem",
        padding: "0.5rem 1rem",
        background: "transparent",
        border: "1px solid #fff",
        borderRadius: "4px",
        color: "#fff",
        cursor: "pointer",
        fontSize: "0.9rem",
        zIndex: 1000,
      }}
    >
      ← Back
    </button>
  );
}