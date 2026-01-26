"use client";

import { useState } from "react";
import styles from "./refunds.module.css";

type RefundResult = {
  subscriptionId: string;
  customerId?: string | null;
  customerEmail?: string | null;
  amountPaid: number;
  currency: string;
  usedCredits: number;
  creditDeduction: number;
  stripeFee: number;
  refundAmount: number;
  refunded: boolean;
  refundId?: string | null;
  canceled: boolean;
};

const formatAmount = (amount: number, currency: string) => {
  const normalized = currency.toLowerCase();
  if (normalized === "krw" || normalized === "jpy") {
    return `${amount.toLocaleString()} ${normalized.toUpperCase()}`;
  }
  return `${(amount / 100).toFixed(2)} ${normalized.toUpperCase()}`;
};

export default function RefundClient({ adminEmail }: { adminEmail: string }) {
  const [subscriptionId, setSubscriptionId] = useState("");
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RefundResult | null>(null);

  const canSubmit = (subscriptionId.trim() || email.trim()) && confirm && !loading;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {return;}
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/refund-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: subscriptionId.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || "Refund request failed.");
        setLoading(false);
        return;
      }

      setResult(data as RefundResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Refunds</h1>
          <p className={styles.subtitle}>Signed in as {adminEmail}</p>
        </div>
      </header>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Subscription Refund</h2>
        <p className={styles.notice}>
          This tool refunds subscriptions only. Credit packs are not refundable.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Subscription ID
            <input
              className={styles.input}
              value={subscriptionId}
              onChange={(e) => setSubscriptionId(e.target.value)}
              placeholder="sub_..."
            />
          </label>

          <div className={styles.orRow}>or</div>

          <label className={styles.label}>
            Customer Email
            <input
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
            />
            <span>
              I understand this will calculate the refund, issue it, and cancel the subscription.
            </span>
          </label>

          <button className={styles.submit} type="submit" disabled={!canSubmit}>
            {loading ? "Processing..." : "Refund & Cancel"}
          </button>
        </form>
      </section>

      {error && (
        <section className={styles.cardError}>
          <p>{error}</p>
        </section>
      )}

      {result && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Result</h2>
          <div className={styles.resultGrid}>
            <div>
              <span>Subscription</span>
              <strong>{result.subscriptionId}</strong>
            </div>
            <div>
              <span>Customer</span>
              <strong>{result.customerEmail || result.customerId || "-"}</strong>
            </div>
            <div>
              <span>Amount Paid</span>
              <strong>{formatAmount(result.amountPaid, result.currency)}</strong>
            </div>
            <div>
              <span>Credits Used</span>
              <strong>{result.usedCredits}</strong>
            </div>
            <div>
              <span>Credit Deduction</span>
              <strong>{formatAmount(result.creditDeduction, result.currency)}</strong>
            </div>
            <div>
              <span>Stripe Fee</span>
              <strong>{formatAmount(result.stripeFee, result.currency)}</strong>
            </div>
            <div>
              <span>Refund Amount</span>
              <strong>{formatAmount(result.refundAmount, result.currency)}</strong>
            </div>
            <div>
              <span>Refunded</span>
              <strong>{result.refunded ? "Yes" : "No"}</strong>
            </div>
            <div>
              <span>Cancel Status</span>
              <strong>{result.canceled ? "Canceled" : "Pending"}</strong>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
