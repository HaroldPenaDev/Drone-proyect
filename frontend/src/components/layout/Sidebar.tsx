import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Panel Principal" },
  { to: "/missions", label: "Misiones" },
  { to: "/history", label: "Historial" },
] as const;

export function Sidebar() {
  return (
    <aside className="w-56 bg-drone-panel border-r border-drone-border flex flex-col py-4">
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-4 py-2 rounded text-sm font-medium transition-colors ${
                isActive
                  ? "bg-drone-primary text-white"
                  : "text-gray-400 hover:text-white hover:bg-drone-dark"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
