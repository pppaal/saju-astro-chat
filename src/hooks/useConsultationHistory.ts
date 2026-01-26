import { useState, useCallback } from "react";

interface Consultation {
  id: string;
  theme: string;
  summary: string;
  createdAt: string;
  locale: string;
  userQuestion?: string;
}

interface ConsultationDetail extends Consultation {
  fullReport: string;
  jungQuotes?: unknown;
  signals?: unknown;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface UseConsultationHistoryReturn {
  consultations: Consultation[];
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
  isPremiumRequired: boolean;
  fetchHistory: (theme?: string, offset?: number) => Promise<void>;
  fetchDetail: (id: string) => Promise<ConsultationDetail | null>;
  deleteConsultation: (id: string) => Promise<boolean>;
}

export function useConsultationHistory(): UseConsultationHistoryReturn {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPremiumRequired, setIsPremiumRequired] = useState(false);

  const fetchHistory = useCallback(async (theme?: string, offset = 0) => {
    setLoading(true);
    setError(null);
    setIsPremiumRequired(false);

    try {
      const params = new URLSearchParams();
      if (theme) {params.set("theme", theme);}
      params.set("offset", String(offset));
      params.set("limit", "20");

      const res = await fetch(`/api/consultation?${params.toString()}`);
      const data = await res.json();

      if (res.status === 402) {
        setIsPremiumRequired(true);
        setConsultations([]);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch history");
      }

      if (offset === 0) {
        setConsultations(data.data);
      } else {
        setConsultations((prev) => [...prev, ...data.data]);
      }
      setPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (id: string): Promise<ConsultationDetail | null> => {
    try {
      const res = await fetch(`/api/consultation/${id}`);
      const data = await res.json();

      if (res.status === 402) {
        setIsPremiumRequired(true);
        return null;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch detail");
      }

      return data.data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  }, []);

  const deleteConsultation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/consultation/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete");
      }

      setConsultations((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    }
  }, []);

  return {
    consultations,
    pagination,
    loading,
    error,
    isPremiumRequired,
    fetchHistory,
    fetchDetail,
    deleteConsultation,
  };
}
