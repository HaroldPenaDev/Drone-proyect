import { useCallback, useEffect, useState } from "react";
import { compareMissions } from "@/api/analytics";
import type { MissionAnalytics } from "@/types";

interface UseMissionAnalyticsResult {
  analytics: MissionAnalytics[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMissionAnalytics(
  missionIds: string[],
): UseMissionAnalyticsResult {
  const [analytics, setAnalytics] = useState<MissionAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = missionIds.slice().sort().join(",");

  const refresh = useCallback(async () => {
    if (missionIds.length === 0) {
      setAnalytics([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await compareMissions(missionIds);
      const orderMap = new Map(missionIds.map((id, i) => [id, i]));
      const sorted = [...result.missions].sort(
        (a, b) =>
          (orderMap.get(a.mission_id) ?? 0) -
          (orderMap.get(b.mission_id) ?? 0),
      );
      setAnalytics(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar análisis");
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { analytics, loading, error, refresh };
}
