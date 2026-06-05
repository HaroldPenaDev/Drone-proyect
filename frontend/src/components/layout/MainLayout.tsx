import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useDroneStore } from "@/stores/droneStore";

export function MainLayout() {
  const loadDrones = useDroneStore((s) => s.loadDrones);

  // Carga los drones en cualquier página (no solo el Dashboard) y auto-
  // selecciona el primero, para que crear misiones funcione de inmediato.
  useEffect(() => {
    loadDrones();
  }, [loadDrones]);

  return (
    <div className="h-screen flex bg-ink">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1600px] mx-auto px-8 py-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
