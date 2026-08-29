import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ChevronDown, Github, Linkedin, LogOut, Menu, Moon, Search, Settings, Shield, Sun, Trophy, User as UserIcon, X, Youtube, Twitter, Send, Megaphone } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSite } from "../context/SiteContext";
import { useToast } from "./Toast";
import { api, errorMessage } from "../lib/api";
import { cn } from "../lib/utils";
import { Avatar } from "./ui";
import { AiTutor } from "./AiTutor";
import { SearchModal } from "./SearchModal";

export function Logo({ compact = false }: { compact?: boolean }) {
  const { siteName, siteSuffix } = useSite();
  return (
    <Link to="/" className="flex items-center gap-2 md:gap-3 font-black text-slate-900 dark:text-white shrink-0 whitespace-nowrap">
      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-md text-xs md:text-base">Py</div>
      {!compact && (
        <span className="tracking-tighter text-base md:text-2xl">
          {siteName}
          <span className="text-amber-500 italic font-medium ml-1">{siteSuffix}</span>
        </span>
      )}
    </Link>
  );
}

function AnnouncementBar() {
  const { settings } = useSite();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("pdm_announcement_dismissed") === settings?.announcement.text;
    } catch {
      return false;
    }
  });
  if (!settings?.announcement.enabled || !settings.announcement.text || dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("pdm_announcement_dismissed", settings.announcement.text);
    } catch {
      /* ignore */
    }
  };
  const content = (
    <span className="flex items-center gap-2 text-xs font-bold">
      <Megaphone size={14} className="shrink-0" /> {settings.announcement.text}
    </span>
  );
  return (
    <div className="bg-slate-900 dark:bg-blue-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        {settings.announcement.link ? (
          <Link to={settings.announcement.link} className="hover:underline min-w-0 truncate">
            {content}
          </Link>
        ) : (
          content
        )}
        <button onClick={dismiss} className="p-1 text-slate-300 hover:text-white shrink-0" aria-label="Dismiss announcement">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function UserMenu() {
  const { user, logout, isAdmin, progress } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  if (!user) return null;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 transition-colors">
        <Avatar name={user.name} color={user.avatarColor} size="sm" />
        <span className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-xs font-black text-slate-900 dark:text-white max-w-[90px] truncate">{user.name.split(" ")[0]}</span>
          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{progress?.xp ?? 0} XP</span>
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 card p-2 shadow-2xl animate-fade-in-up z-50">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          {[
            { to: "/progress", icon: <Trophy size={16} />, label: "My progress" },
            { to: "/profile", icon: <Settings size={16} />, label: "Profile settings" },
            ...(isAdmin ? [{ to: "/admin", icon: <Shield size={16} />, label: "Admin panel" }] : []),
          ].map((item) => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
              {item.icon} {item.label}
            </Link>
          ))}
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate("/");
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

function Header() {
  const { settings, theme, toggleTheme, setSearchOpen } = useSite();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = [
    { name: "Home", path: "/" },
    { name: "Courses", path: "/courses" },
    ...(settings?.features.playground !== false ? [{ name: "Playground", path: "/playground" }] : []),
    ...(settings?.features.blog !== false ? [{ name: "Blog", path: "/blog" }] : []),
    { name: "Resources", path: "/resources" },
    ...(settings?.features.pricing !== false ? [{ name: "Pricing", path: "/pricing" }] : []),
    ...(user ? [{ name: "Progress", path: "/progress" }] : []),
  ];
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn("px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400");

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => setMobileOpen((o) => !o)} className="lg:hidden p-2 -ml-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300" aria-label="Menu">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Logo />
          </div>
          <nav className="hidden lg:flex items-center gap-1 ml-6">
            {nav.map((n) => (
              <NavLink key={n.path} to={n.path} end={n.path === "/"} className={linkCls}>
                {n.name}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 p-2 md:px-3 rounded-xl text-slate-500 hover:text-blue-600 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 transition-all" aria-label="Search">
              <Search size={15} />
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Search</span>
              <kbd className="hidden xl:inline text-[9px] font-mono text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1">Ctrl K</kbd>
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-xl text-slate-500 hover:text-blue-600 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 transition-all" aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {user ? (
              <UserMenu />
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline-flex px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:text-blue-600">
                  Log in
                </Link>
                <Link to="/signup" className="px-4 py-2 text-xs bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-black uppercase tracking-widest shadow-md hover:scale-105 transition-transform whitespace-nowrap">
                  Join
                </Link>
              </>
            )}
          </div>
        </div>
        {mobileOpen && (
          <nav className="lg:hidden border-t border-slate-100 dark:border-slate-800 mt-3 pt-3 flex flex-col gap-1 animate-fade-in">
            {nav.map((n) => (
              <NavLink
                key={n.path}
                to={n.path}
                end={n.path === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn("px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest", isActive ? "bg-blue-600 text-white" : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300")
                }
              >
                {n.name}
              </NavLink>
            ))}
            {!user && (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300">
                Log in
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

function Newsletter() {
  const { settings } = useSite();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  if (!settings?.features.newsletter) return null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/forms/subscribe", { email });
      toast.success("Subscribed!", "We'll send you quality updates only.");
      setEmail("");
    } catch (err) {
      toast.error("Could not subscribe", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="flex gap-2 w-full max-w-xs">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input py-2.5 text-sm" />
      <button className="btn-primary px-3 py-2.5 shrink-0" disabled={busy} aria-label="Subscribe">
        <Send size={14} />
      </button>
    </form>
  );
}

function Footer() {
  const { settings, siteName, siteSuffix } = useSite();
  const social = settings?.social;
  const socials = [
    { href: social?.linkedin, icon: <Linkedin size={18} />, label: "LinkedIn" },
    { href: social?.github, icon: <Github size={18} />, label: "GitHub" },
    { href: social?.twitter, icon: <Twitter size={18} />, label: "Twitter" },
    { href: social?.youtube, icon: <Youtube size={18} />, label: "YouTube" },
  ].filter((s) => s.href);
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-auto py-14">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="mb-4">
              <Logo />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">{settings?.tagline}</p>
          </div>
          <div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-[10px] mb-5">Learning</h4>
            <ul className="space-y-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              {[
                ["/courses", "Courses"],
                ["/playground", "Playground"],
                ["/resources", "Resources"],
                ["/blog", "Blog"],
                ["/progress", "My progress"],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-[10px] mb-5">Company</h4>
            <ul className="space-y-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              {[
                ["/about", "About us"],
                ["/pricing", "Pricing"],
                ["/contact", "Contact us"],
                ["/privacy", "Privacy policy"],
                ["/terms", "Terms of service"],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-[10px] mb-5">Stay in the loop</h4>
            <Newsletter />
            {socials.length > 0 && (
              <div className="flex gap-2 mt-5">
                {socials.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-blue-600 hover:text-white transition-all">
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} {siteName} {siteSuffix} · All rights reserved
          </p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{settings?.footerCredit}</p>
        </div>
      </div>
    </footer>
  );
}

export function Layout() {
  const { settings } = useSite();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200 overflow-x-hidden">
      <AnnouncementBar />
      <Header />
      <div className="flex-1 w-full max-w-7xl mx-auto pt-6 px-4 mb-20">
        <main className="w-full">
          <Outlet />
        </main>
      </div>
      <Footer />
      {settings?.tutor.enabled && <AiTutor />}
      <SearchModal />
    </div>
  );
}
