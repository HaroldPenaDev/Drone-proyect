import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { MissionAnalytics } from "@/types";

interface ReportMeta {
  droneName: string;
  generatedAt: Date;
}

const PAGE_WIDTH = 210; // mm A4
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
};

const shortId = (id: string): string => id.slice(0, 8);

export async function generateAnalysisReport(
  missions: MissionAnalytics[],
  meta: ReportMeta,
  chartContainer: HTMLElement | null,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 30);
  doc.text("Drone Digital Twin", MARGIN, MARGIN + 5);
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 110);
  doc.text("Reporte de Análisis de Misiones", MARGIN, MARGIN + 11);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  const dateStr = meta.generatedAt.toLocaleString();
  doc.text(`Dron: ${meta.droneName}`, MARGIN, MARGIN + 18);
  doc.text(`Generado: ${dateStr}`, MARGIN, MARGIN + 22);
  doc.setDrawColor(220, 220, 225);
  doc.line(MARGIN, MARGIN + 25, PAGE_WIDTH - MARGIN, MARGIN + 25);

  // Summary table
  let y = MARGIN + 32;
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 30);
  doc.text("Misiones comparadas", MARGIN, y);
  y += 6;

  doc.setFontSize(8);
  doc.setTextColor(50, 50, 60);

  const cols = ["ID", "Duración", "Empuje prom.", "SF mín.", "Δ Degr.", "Estado"];
  const colWidths = [25, 25, 30, 22, 35, 25];
  const startX = MARGIN;
  let x = startX;
  doc.setFillColor(240, 240, 245);
  doc.rect(MARGIN, y - 4, CONTENT_WIDTH, 6, "F");
  cols.forEach((c, i) => {
    doc.text(c, x + 1, y);
    x += colWidths[i];
  });
  y += 4;

  doc.setTextColor(30, 30, 40);
  for (const m of missions) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }
    x = startX;
    const row = [
      shortId(m.mission_id),
      formatDuration(m.duration_seconds),
      `${m.overall_avg_thrust.toFixed(2)} N`,
      m.worst_safety_factor.toFixed(2),
      `${(m.total_degradation_delta * 100).toFixed(4)}%`,
      m.status,
    ];
    row.forEach((cell, i) => {
      doc.text(cell, x + 1, y + 3);
      x += colWidths[i];
    });
    y += 5;
  }

  // Per-arm details
  y += 6;
  if (y > PAGE_HEIGHT - 60) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 30);
  doc.text("Métricas por brazo", MARGIN, y);
  y += 6;

  for (const m of missions) {
    if (y > PAGE_HEIGHT - 50) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 70);
    doc.text(`Misión ${shortId(m.mission_id)}`, MARGIN, y);
    y += 5;

    const armCols = ["Brazo", "Empuje prom.", "Empuje pico", "SF mín.", "Δ Degradación"];
    const armWidths = [30, 35, 35, 30, 40];
    doc.setFontSize(8);
    doc.setFillColor(245, 245, 250);
    doc.rect(MARGIN, y - 3, CONTENT_WIDTH, 5, "F");
    let ax = MARGIN;
    armCols.forEach((c, i) => {
      doc.text(c, ax + 1, y);
      ax += armWidths[i];
    });
    y += 3;
    for (const arm of m.arms) {
      ax = MARGIN;
      const row = [
        `Arm ${arm.arm_index}`,
        `${arm.avg_thrust.toFixed(2)} N`,
        `${arm.max_thrust.toFixed(2)} N`,
        arm.min_safety_factor.toFixed(2),
        `${(arm.degradation_delta * 100).toFixed(5)}%`,
      ];
      row.forEach((cell, i) => {
        doc.text(cell, ax + 1, y + 3);
        ax += armWidths[i];
      });
      y += 4;
    }
    y += 4;
  }

  // Charts capture (if available)
  if (chartContainer) {
    try {
      const canvas = await html2canvas(chartContainer, {
        backgroundColor: "#0f172a",
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const aspect = canvas.height / canvas.width;
      const imgWidth = CONTENT_WIDTH;
      const imgHeight = imgWidth * aspect;

      doc.addPage();
      doc.setFontSize(12);
      doc.setTextColor(20, 20, 30);
      doc.text("Visualizaciones comparativas", MARGIN, MARGIN);

      let drawY = MARGIN + 5;
      let remaining = imgHeight;
      let sourceY = 0;
      const pageImgHeight = PAGE_HEIGHT - MARGIN * 2 - 5;

      while (remaining > 0) {
        const sliceHeight = Math.min(remaining, pageImgHeight);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = (sliceHeight / imgHeight) * canvas.height;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            sliceCanvas.height,
            0,
            0,
            canvas.width,
            sliceCanvas.height,
          );
          const sliceData = sliceCanvas.toDataURL("image/png");
          doc.addImage(sliceData, "PNG", MARGIN, drawY, imgWidth, sliceHeight);
        }
        sourceY += sliceCanvas.height;
        remaining -= sliceHeight;
        if (remaining > 0) {
          doc.addPage();
          drawY = MARGIN;
        }
      }
    } catch {
      // Chart capture failed silently — text report still useful.
    }
  }

  // Footer on last page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 160);
    doc.text(
      `Página ${i} de ${totalPages} · Drone Digital Twin`,
      MARGIN,
      PAGE_HEIGHT - 8,
    );
  }

  const filename = `analysis_report_${meta.generatedAt.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
