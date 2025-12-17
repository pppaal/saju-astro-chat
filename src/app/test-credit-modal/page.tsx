"use client";

import { useCreditModal } from "@/contexts/CreditModalContext";

export default function TestCreditModal() {
  const { showDepleted, showLowCredits } = useCreditModal();

  return (
    <div style={{
      padding: "40px",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      maxWidth: "400px",
      margin: "100px auto"
    }}>
      <h1 style={{ color: "#fff", marginBottom: "20px" }}>Credit Modal Test</h1>

      <button
        onClick={() => showDepleted()}
        style={{
          padding: "16px 24px",
          background: "linear-gradient(135deg, #ef4444, #dc2626)",
          color: "#fff",
          border: "none",
          borderRadius: "12px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Show Depleted Modal (0 credits)
      </button>

      <button
        onClick={() => showLowCredits(2)}
        style={{
          padding: "16px 24px",
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          color: "#fff",
          border: "none",
          borderRadius: "12px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Show Low Credits Modal (2 credits)
      </button>

      <button
        onClick={() => showLowCredits(1)}
        style={{
          padding: "16px 24px",
          background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
          color: "#fff",
          border: "none",
          borderRadius: "12px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Show Low Credits Modal (1 credit)
      </button>
    </div>
  );
}
