import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function MainLayout() {
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
