import { useState, useCallback, useEffect } from "react";

interface PersonaMemory {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  dominantThemes: string[] | null;
  keyInsights: string[] | null;
  emotionalTone: string | null;
  growthAreas: string[] | null;
  lastTopics: string[] | null;
  recurringIssues: string[] | null;
  sessionCount: number;
  birthChart: any | null;
  sajuProfile: any | null;
}

interface UsePersonaMemoryReturn {
  memory: PersonaMemory | null;
  isNewUser: boolean;
  loading: boolean;
  error: string | null;
  fetchMemory: () => Promise<void>;
  updateMemory: (data: Partial<PersonaMemory>) => Promise<boolean>;
  addInsight: (insight: string) => Promise<boolean>;
  addGrowthArea: (area: string) => Promise<boolean>;
  updateEmotionalTone: (tone: string) => Promise<boolean>;
}

export function usePersonaMemory(autoFetch = false): UsePersonaMemoryReturn {
  const [memory, setMemory] = useState<PersonaMemory | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/persona-memory");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch memory");
      }

      setMemory(data.data);
      setIsNewUser(data.isNewUser);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMemory = useCallback(async (updateData: Partial<PersonaMemory>): Promise<boolean> => {
    try {
      const res = await fetch("/api/persona-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update memory");
      }

      setMemory(data.data);
      setIsNewUser(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const patchMemory = useCallback(async (action: string, data: any): Promise<boolean> => {
    try {
      const res = await fetch("/api/persona-memory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to patch memory");
      }

      setMemory(result.data);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const addInsight = useCallback(
    (insight: string) => patchMemory("add_insight", { insight }),
    [patchMemory]
  );

  const addGrowthArea = useCallback(
    (area: string) => patchMemory("add_growth_area", { area }),
    [patchMemory]
  );

  const updateEmotionalTone = useCallback(
    (tone: string) => patchMemory("update_emotional_tone", { tone }),
    [patchMemory]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchMemory();
    }
  }, [autoFetch, fetchMemory]);

  return {
    memory,
    isNewUser,
    loading,
    error,
    fetchMemory,
    updateMemory,
    addInsight,
    addGrowthArea,
    updateEmotionalTone,
  };
}
