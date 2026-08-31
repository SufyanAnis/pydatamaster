import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  FileText,
  Image,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Newspaper,
  Settings,
  Shield,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Layout";
import { Avatar } from "../components/ui";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import type { AdminStats } from "../lib/types";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  posts: "Posts",
  categories: "Categories",
  pages: "Pages",
  media: "Media",
  inbox: "Messages",
  users: "Users",
  settings: "Settings",
};

const SIDEBAR_KEY = "pdm_admin_sidebar";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "collapsed";
  } catch {
    return false;
  }
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const known = SEGMENT_LABELS[seg];
    const label = known ?? (/^\d+$/.test(seg) ? `#${seg}` : seg.replace(/-/g, " "));
    return { path, label, last: i === segments.length - 1 };
  });
  if (crumbs.length === 1) {
    crumbs[0].last = false;
    crumbs.push({ path: "/admin", label: "Dashboard", last: true });
  }
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 min-w-0 text-xs font-black uppercase tracking-widest">
      {crumbs.map((c, i) => (
        <span key={c.path + i} className="flex items-center gap-1 min-w-0">
          {i > 0 && <ChevronRight size={12} className="text-slate-300 shrink-0" />}
          {c.last ? (
            <span className="text-slate-900 truncate">{c.label}</span>
          ) : (
            <Link to={c.path} className={cn("text-slate-400 hover:text-amber-600 truncate", i === 0 && "hidden sm:inline")}>
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function SidebarLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate: () => void }) {
  const IconCmp = item.icon;
  const showBadge = typeof item.badge === "number" && item.badge > 0;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all",
          collapsed && "md:justify-center md:px-0",
          isActive ? "bg-amber-400 text-slate-900 shadow-lg shadow-amber-300/40" : "text-slate-600 hover:bg-amber-50 hover:text-slate-900",
        )
      }
    >
      {({ isActive }) => (
        <>
          <IconCmp size={17} className="shrink-0" />
          <span className={cn("truncate flex-1", collapsed && "md:hidden")}>{item.label}</span>
          {showBadge && (
            <span
              className={cn(
                "text-[9px] font-black tabular-nums rounded-full px-1.5 py-0.5 min-w-[18px] text-center",
                isActive ? "bg-slate-900 text-amber-400" : "bg-amber-400 text-slate-900",
                collapsed && "md:absolute md:top-1 md:right-1 md:px-1",
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function GroupLabel({ children, collapsed }: { children: ReactNode; collapsed: boolean }) {
  return <div className={cn("px-3 pt-4 pb-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400", collapsed && "md:hidden")}>{children}</div>;
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newMessages, setNewMessages] = useState(0);

  // Keep the inbox badge fresh; refetch when the route changes (cheap on SQLite).
  useEffect(() => {
    let cancelled = false;
    api
      .get<AdminStats>("/admin/stats")
      .then((s) => !cancelled && setNewMessages(s.totals.newMessages))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const groups = useMemo<NavGroup[]>(
    () => [
      { label: "Overview", items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true }] },
      {
        label: "Content",
        items: [
          { to: "/admin/posts", label: "Posts", icon: Newspaper },
          { to: "/admin/categories", label: "Categories", icon: Tags },
          { to: "/admin/pages", label: "Pages", icon: FileText },
          { to: "/admin/media", label: "Media", icon: Image },
        ],
      },
      { label: "Inbox", items: [{ to: "/admin/inbox", label: "Messages", icon: Mail, badge: newMessages }] },
      { label: "People", items: [{ to: "/admin/users", label: "Users", icon: Users }] },
      { label: "System", items: [{ to: "/admin/settings", label: "Settings", icon: Settings }] },
    ],
    [newMessages],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden animate-fade-in" onClick={closeMobile} aria-hidden="true" />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-white border-r border-slate-200 shadow-2xl md:shadow-none transition-all duration-200",
          "md:sticky md:top-0 md:h-screen md:translate-x-0 md:shrink-0",
          collapsed ? "md:w-20" : "md:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className={cn("flex items-center gap-2 px-4 h-16 border-b border-slate-100 shrink-0", collapsed ? "md:justify-center md:px-2" : "justify-between")}>
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="hidden md:block">
            <Logo compact={collapsed} />
          </div>
          <button onClick={closeMobile} className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-900" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className={cn("px-4 pt-4", collapsed && "md:px-2 md:flex md:justify-center")}>
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase tracking-widest", collapsed && "md:px-1.5")}>
            <Shield size={11} />
            <span className={cn(collapsed && "md:hidden")}>Admin</span>
          </span>
        </div>

        <nav className={cn("flex-1 overflow-y-auto custom-scrollbar px-3 pb-4", collapsed && "md:px-2")}>
          {groups.map((g) => (
            <div key={g.label}>
              <GroupLabel collapsed={collapsed}>{g.label}</GroupLabel>
              {collapsed && <div className="hidden md:block h-px bg-slate-100 my-2 mx-2" />}
              <div className="space-y-1">
                {g.items.map((item) => (
                  <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={closeMobile} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="hidden md:block border-t border-slate-100 p-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn("w-full flex items-center gap-3 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors", collapsed && "justify-center px-0")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="h-full px-4 md:px-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Open menu">
                <Menu size={20} />
              </button>
              <Breadcrumb pathname={location.pathname} />
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <a href="/" target="_blank" rel="noreferrer" className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-amber-600 bg-slate-50 border border-slate-100 transition-all">
                <ExternalLink size={14} /> View site
              </a>
              <a href="/" target="_blank" rel="noreferrer" className="sm:hidden p-2 rounded-xl text-slate-500 hover:text-amber-600 bg-slate-50 border border-slate-100" aria-label="View site">
                <ExternalLink size={15} />
              </a>
              {user && (
                <div className="flex items-center gap-2 pl-1 md:pl-2 md:ml-1 md:border-l border-slate-200">
                  <Avatar name={user.name} color={user.avatarColor} size="sm" />
                  <div className="hidden lg:flex flex-col leading-tight">
                    <span className="text-xs font-black text-slate-900 max-w-[140px] truncate">{user.name}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">{user.role}</span>
                  </div>
                  <button onClick={handleLogout} className="inline-flex items-center gap-2 p-2 md:px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors" aria-label="Log out" title="Log out">
                    <LogOut size={15} />
                    <span className="hidden md:inline">Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 min-w-0">
          <div className="max-w-[1500px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
