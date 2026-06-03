import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { MissionsPage } from "@/pages/MissionsPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { AnalysisPage } from "@/pages/AnalysisPage";
import { IngestPage } from "@/pages/IngestPage";
import { PredictivePage } from "@/pages/PredictivePage";
import { ValidationPage } from "@/pages/ValidationPage";
import { PlaybackPage } from "@/pages/PlaybackPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/ingest" element={<IngestPage />} />
          <Route path="/predictive" element={<PredictivePage />} />
          <Route path="/validation" element={<ValidationPage />} />
          <Route path="/playback" element={<PlaybackPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
