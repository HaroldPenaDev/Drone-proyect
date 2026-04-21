import { useAlertStore } from "@/stores/alertStore";

export function AlertBanner() {
  const alerts = useAlertStore((s) => s.alerts);
  const unreadCount = useAlertStore((s) => s.unreadCount);
  const markAllRead = useAlertStore((s) => s.markAllRead);

  if (unreadCount === 0) return null;

  const latestAlert = alerts[0];

  return (
    <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-3">
        <span className="text-red-400 text-lg">&#9888;</span>
        <div>
          <span className="text-sm text-red-300 font-medium">
            {unreadCount} alerta{unreadCount > 1 ? "s" : ""} activa{unreadCount > 1 ? "s" : ""}
          </span>
          {latestAlert && (
            <p className="text-xs text-red-400/70">
              Brazo {latestAlert.arm_index}: Factor de seguridad {latestAlert.safety_factor_value.toFixed(2)} por debajo de {latestAlert.threshold}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={markAllRead}
        className="px-3 py-1 text-xs bg-red-800 text-red-200 rounded hover:bg-red-700"
      >
        Descartar
      </button>
    </div>
  );
}
