import { apiClient } from "@/api/client";
import type { IngestSummary } from "@/types";

export async function uploadFlightCsv(
  droneId: string,
  file: File,
  label: string | null,
): Promise<IngestSummary> {
  const form = new FormData();
  form.append("drone_id", droneId);
  form.append("file", file);
  if (label) form.append("label", label);
  const response = await apiClient.post<IngestSummary>(
    "/ingest/flight",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    },
  );
  return response.data;
}

export function templateUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? "";
  return `${base}/ingest/template`;
}
