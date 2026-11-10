import { NavLink } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { canAdminister } from "../lib/permissions";
import {
  IconCalendar,
  IconFlame,
  IconHome,
  IconLink,
  IconLogout,
  IconMusic,
  IconShield,
  IconUser,
  IconUsers,
} from "./icons";

const NAV_ITEMS = [
  { to: "/", label: "Início", icon: IconHome, end: true },
  { to: "/songs", label: "Músicas", icon: IconMusic, end: false },
  { to: "/events", label: "Eventos", icon: IconCalendar, end: false },
  { to: "/profile", label: "Perfil", icon: IconUser, end: false },
];

const ADMIN_NAV_ITEMS = [
  { to: "/admin/users", label: "Pessoas", icon: IconUsers, end: false },
  { to: "/admin/ministries", label: "Ministérios", icon: IconShield, end: false },
  { to: "/admin/invites", label: "Convites", icon: IconLink, end: false },
];

function NavItem({
  to,
  label,
  icon: ItemIcon,
  end,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: typeof IconHome;
  end: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex h-11 items-center gap-3 rounded-field px-3 text-sm font-medium transition-colors ${
          isActive ? "bg-north-tint text-north" : "text-ink hover:bg-ivory"
        }`
      }
    >
      <ItemIcon width={18} height={18} />
      {label}
    </NavLink>
  );
}

interface SidebarProps {
  /** Abaixo de 1024px o menu vira gaveta: aberto ou fechado. Acima disso fica sempre fixo. */
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <aside
      id="menu-principal"
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[264px] shrink-0 flex-col border-r border-line bg-surface
        transition-transform duration-200 lg:static lg:translate-x-0 ${open ? "translate-x-0 shadow-xl" : "-translate-x-full"}`}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-north text-white">
          <IconFlame width={22} height={22} />
        </div>
        <span className="font-display text-lg font-semibold text-ink">Centric</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} onNavigate={onClose} />
        ))}

        {canAdminister(user) && (
          <>
            <p className="mt-4 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Administração
            </p>
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavItem key={item.to} {...item} onNavigate={onClose} />
            ))}
          </>
        )}
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
