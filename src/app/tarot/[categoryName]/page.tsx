"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// This page is now deprecated - redirect to main tarot page
// The main page handles both theme selection and spread selection

export default function SpreadSelectionPage() {
  const router = useRouter();
  const params = useParams();
  const categoryName = params?.categoryName as string | undefined;

  useEffect(() => {
    // Redirect to main tarot page
    // The theme selection is now handled there
    router.replace("/tarot");
  }, [router, categoryName]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0a0a1a 0%, #1a0b2e 50%, #16213e 100%)",
      color: "#fff"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔮</div>
        <p>Redirecting to Tarot...</p>
      </div>
    </div>
  );
}
