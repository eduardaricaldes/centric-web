import { NavLink } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { IconCalendar, IconFlame, IconHome, IconLogout, IconMusic, IconUser } from "./icons";

const NAV_ITEMS = [
  { to: "/", label: "Início", icon: IconHome, end: true },
  { to: "/songs", label: "Músicas", icon: IconMusic, end: false },
  { to: "/events", label: "Eventos", icon: IconCalendar, end: false },
  { to: "/profile", label: "Perfil", icon: IconUser, end: false },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-[264px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-north text-white">
          <IconFlame width={22} height={22} />
        </div>
        <span className="font-display text-lg font-semibold text-ink">Centric</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: ItemIcon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex h-11 items-center gap-3 rounded-field px-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-north-tint text-north"
                  : "text-ink hover:bg-ivory"
              }`
            }
          >
            <ItemIcon width={18} height={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-line px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-north-tint text-sm font-semibold text-north">
          {user?.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          aria-label="Sair"
          className="flex h-9 w-9 items-center justify-center rounded-field text-muted hover:bg-ivory hover:text-ink"
        >
          <IconLogout width={18} height={18} />
        </button>
      </div>
    </aside>
  );
}
