import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Route,
  History,
  GitCompareArrows,
  Activity,
  Microscope,
  Upload,
  PlayCircle,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/i18n";
import type { TranslationKey } from "@/i18n";

interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}

interface NavGroup {
  labelKey: TranslationKey;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "nav.group.operation",
    items: [
      { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { to: "/missions", labelKey: "nav.missions", icon: Route },
      { to: "/history", labelKey: "nav.history", icon: History },
      { to: "/playback", labelKey: "nav.playback", icon: PlayCircle },
      { to: "/pilot", labelKey: "nav.pilot", icon: Gamepad2 },
    ],
  },
  {
    labelKey: "nav.group.intelligence",
    items: [
      { to: "/analysis", labelKey: "nav.analysis", icon: GitCompareArrows },
      { to: "/predictive", labelKey: "nav.predictive", icon: Activity },
      { to: "/validation", labelKey: "nav.validation", icon: Microscope },
    ],
  },
  {
    labelKey: "nav.group.data",
    items: [{ to: "/ingest", labelKey: "nav.ingest", icon: Upload }],
  },
];

export function Sidebar() {
  const t = useT();
  return (
    <aside className="w-60 shrink-0 border-r border-white/[0.06] bg-ink-50/50 backdrop-blur-md flex flex-col py-6">
      <div className="px-5 mb-7">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-600 flex items-center justify-center shadow-glow">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold text-white text-sm tracking-tight">
              {t("nav.brand.title")}
            </div>
            <div className="text-[10px] text-ink-500 uppercase tracking-[0.18em]">
              {t("nav.brand.subtitle")}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.labelKey}>
            <div className="eyebrow px-3 mb-2">{t(group.labelKey)}</div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      [
                        "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                        isActive
                          ? "bg-accent/10 text-accent ring-1 ring-accent/20 shadow-[inset_0_1px_0_0_rgba(34,211,238,0.1)]"
                          : "text-ink-500 hover:text-white hover:bg-white/[0.03]",
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={16}
                          className={isActive ? "text-accent" : "text-ink-500 group-hover:text-white"}
                          strokeWidth={1.75}
                        />
                        <span>{t(item.labelKey)}</span>
                        {isActive && (
                          <span className="ml-auto w-1 h-1 rounded-full bg-accent shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-5 pt-4 border-t border-white/[0.04]">
        <div className="text-[10px] text-ink-500 leading-relaxed">
          v1.0 · ASTM D638 · Miner's Rule
        </div>
      </div>
    </aside>
  );
}
