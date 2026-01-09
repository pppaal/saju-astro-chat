"use client";

import { useEffect } from "react";
import { logger } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Global error:", { message: error.message, digest: error.digest, stack: error.stack });
  }, [error]);

  return (
    <html>
      <body style={{ background: "#1a1a2e", color: "#e0e0e0", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#ff6b6b" }}>오류가 발생했습니다</h1>
          <p style={{ color: "#a0a0a0", marginBottom: "1.5rem" }}>문제가 발생했습니다. 다시 시도해 주세요.</p>
          <button
            onClick={reset}
            style={{ padding: "0.75rem 1.5rem", background: "#3a6df0", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "1rem" }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}