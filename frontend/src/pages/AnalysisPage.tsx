import { useMemo, useRef, useState } from "react";
import { useDroneStore } from "@/stores/droneStore";
import { useMissions } from "@/hooks/useMissions";
import { useMissionAnalytics } from "@/hooks/useMissionAnalytics";
import {
  MetricsTable,
  MissionPicker,
  PerArmHeatmap,
  RadarProfile,
  RankingCards,
  TimelineChart,
} from "@/components/analysis";
import { generateAnalysisReport } from "@/utils/pdfReport";
import { Button, PageHeader } from "@/components/ui";
import { RotateCw, FileDown } from "lucide-react";
import { useT } from "@/i18n";

const PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
];

const MAX_SELECTION = 6;

export function AnalysisPage() {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const { missions, loading: missionsLoading } = useMissions(
    selectedDrone?.id ?? null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { analytics, loading, error, refresh } = useMissionAnalytics(selectedIds);
  const [exporting, setExporting] = useState(false);
  const chartsRef = useRef<HTMLDivElement>(null);
  const t = useT();

  const colorMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    selectedIds.forEach((id, idx) => {
      map[id] = PALETTE[idx % PALETTE.length];
    });
    return map;
  }, [selectedIds]);

  const toggle = (missionId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(missionId)) {
        return prev.filter((id) => id !== missionId);
      }
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, missionId];
    });
  };

  const clear = () => setSelectedIds([]);

  const exportPdf = async () => {
    if (analytics.length === 0) return;
    setExporting(true);
    try {
      await generateAnalysisReport(
        analytics,
        {
          droneName: selectedDrone?.name ?? "—",
          generatedAt: new Date(),
        },
        chartsRef.current,
      );
    } finally {
      setExporting(false);
    }
  };

  const showRunningHint = analytics.some((a) => a.status === "running");

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow={t("analysis.eyebrow")}
        title={t("analysis.title")}
        description={t("analysis.description")}
        actions={
          selectedIds.length > 0 ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                icon={<RotateCw size={13} strokeWidth={2} />}
              >
                {t("common.refresh")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={exportPdf}
                disabled={analytics.length === 0 || exporting}
                icon={<FileDown size={13} strokeWidth={2} />}
              >
                {exporting ? t("common.generating") : t("common.exportPdf")}
              </Button>
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          {missionsLoading ? (
            <div className="surface p-6 text-center text-ink-500 text-sm">
              {t("common.loading")}
            </div>
          ) : (
            <MissionPicker
              missions={missions}
              selectedIds={selectedIds}
              onToggle={toggle}
              onClear={clear}
            />
          )}
        </div>

        <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-4">
          {selectedIds.length === 0 && (
            <div className="surface p-12 text-center border-dashed">
              <div className="text-ink-500 text-sm font-display">
                {t("analysis.empty.title")}
              </div>
              <div className="text-ink-500/70 text-xs mt-2">
                {t("analysis.empty.hint")}
              </div>
            </div>
          )}

          {error && (
            <div className="surface surface-crit p-3 text-sm text-crit">
              {error}
            </div>
          )}

          {loading && (
            <div className="surface p-6 text-center text-ink-500 text-sm">
              {t("common.calculating")}
            </div>
          )}

          {!loading && analytics.length > 0 && (
            <div ref={chartsRef} className="space-y-4">
              {showRunningHint && (
                <div className="surface surface-accent px-3 py-2 text-xs text-accent">
                  {t("analysis.runningHint")}
                </div>
              )}

              <RankingCards missions={analytics} colorMap={colorMap} />

              <MetricsTable missions={analytics} colorMap={colorMap} />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <TimelineChart
                  missions={analytics}
                  metric="avg_thrust"
                  title={t("analysis.charts.thrust")}
                  yLabel="N"
                  colorMap={colorMap}
                  formatY={(v) => v.toFixed(2)}
                />
                <TimelineChart
                  missions={analytics}
                  metric="min_safety_factor"
                  title={t("analysis.charts.minSf")}
                  yLabel={t("sf.short")}
                  colorMap={colorMap}
                  formatY={(v) => v.toFixed(2)}
                />
                <TimelineChart
                  missions={analytics}
                  metric="max_degradation"
                  title={t("analysis.charts.degradation")}
                  yLabel="%"
                  colorMap={colorMap}
                  formatY={(v) => `${(v * 100).toFixed(2)}%`}
                />
                <RadarProfile missions={analytics} colorMap={colorMap} />
              </div>

              <PerArmHeatmap missions={analytics} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
