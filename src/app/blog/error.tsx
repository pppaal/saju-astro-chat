"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Blog error:", { message: error.message, digest: error.digest, stack: error.stack });
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "radial-gradient(1200px 800px at 25% 5%, rgba(99, 210, 255, 0.12), transparent), radial-gradient(1000px 700px at 80% 95%, rgba(124, 242, 156, 0.10), transparent)",
        backgroundColor: "#0a0e1f",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "480px" }} role="alert">
        <div
          style={{
            fontSize: "64px",
            marginBottom: "24px",
            filter: "drop-shadow(0 4px 20px rgba(136, 179, 247, 0.4))",
          }}
          role="img"
          aria-label="Error"
        >
          ⚠️
        </div>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "12px",
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: "16px",
            lineHeight: 1.6,
            marginBottom: "32px",
          }}
        >
          An error occurred while loading the blog. Please try again.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{
              padding: "12px 28px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: "999px",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "15px",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            Try Again
          </button>
          <Link
            href="/blog"
            style={{
              padding: "12px 28px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "999px",
              color: "rgba(255,255,255,0.8)",
              fontWeight: 500,
              fontSize: "15px",
              textDecoration: "none",
              transition: "all 0.3s ease",
            }}
          >
            Back to Blog
          </Link>
        </div>
        {error.digest && (
          <p style={{ marginTop: "24px", fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
