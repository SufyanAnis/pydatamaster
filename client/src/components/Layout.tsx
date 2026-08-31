import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Github, Linkedin, LogOut, Megaphone, Menu, Search, Shield, Twitter, X, Youtube } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSite } from "../context/SiteContext";
import { cn } from "../lib/utils";
import { AdSlot } from "./AdSlot";
import { SearchModal } from "./SearchModal";

export function Logo({ compact = false }: { compact?: boolean }) {
  const { siteName, siteSuffix } = useSite();
  return (
    <Link to="/" className="flex items-center gap-2.5 font-black text-slate-900 shrink-0 whitespace-nowrap">
      <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-900 rounded-xl flex items-center justify-center text-amber-400 shadow-md text-sm md:text-base">Py</div>
      {!compact && (
        <span className="tracking-tighter text-lg md:text-2xl">
          {siteName}
          <span className="text-amber-500 italic font-semibold ml-1 text-sm md:text-base">{siteSuffix}</span>
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
    <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
      <Megaphone size={14} className="shrink-0" /> {settings.announcement.text}
    </span>
  );
  return (
    <div className="bg-amber-400">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        {settings.announcement.link ? (
          <Link to={settings.announcement.link} className="hover:underline min-w-0 truncate">
            {content}
          </Link>
        ) : (
          content
        )}
        <button onClick={dismiss} className="p-1 text-slate-700 hover:text-slate-900 shrink-0" aria-label="Dismiss announcement">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function Header() {
  const { settings, setSearchOpen } = useSite();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const tabs = [{ slug: "", name: "Home" }, ...(settings?.nav ?? [])];
  const tabTo = (slug: string) => (slug ? `/category/${slug}` : "/");

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="h-1 bg-amber-400" />
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen((o) => !o)} className="lg:hidden p-2 -ml-2 hover:bg-amber-50 rounded-lg text-slate-600" aria-label="Menu">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Logo />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-900 bg-slate-50 border border-slate-200 hover:border-amber-400 transition-all"
              aria-label="Search"
            >
              <Search size={15} />
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Search</span>
              <kbd className="hidden xl:inline text-[9px] font-mono text-slate-400 border border-slate-200 rounded px-1">Ctrl K</kbd>
            </button>
            {isAdmin && (
              <>
                <Link to="/admin" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-amber-400 hover:bg-slate-800 transition-colors">
                  <Shield size={13} /> Admin
                </Link>
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="hidden sm:inline-flex p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <nav className="hidden lg:flex items-center gap-1 -mb-px overflow-x-auto custom-scrollbar">
          {tabs.map((t) => (
            <NavLink
              key={t.slug || "home"}
              to={tabTo(t.slug)}
              end={!t.slug}
              className={({ isActive }) =>
                cn(
                  "px-4 py-3 text-[11px] font-black uppercase tracking-widest whitespace-nowrap border-b-[3px] transition-colors",
                  isActive ? "border-amber-400 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-900 hover:border-amber-200",
                )
              }
            >
              {t.name}
            </NavLink>
          ))}
        </nav>

        {mobileOpen && (
          <nav className="lg:hidden border-t border-slate-100 py-3 flex flex-col gap-1 animate-fade-in">
            {tabs.map((t) => (
              <NavLink
                key={t.slug || "home"}
                to={tabTo(t.slug)}
                end={!t.slug}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn("px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest", isActive ? "bg-amber-400 text-slate-900" : "bg-slate-50 text-slate-600")
                }
              >
                {t.name}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-900 text-amber-400">
                Admin panel
              </NavLink>
            )}
            {!user && (
              <span className="px-4 pt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <Link to="/login">Admin login</Link>
              </span>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

function Footer() {
  const { settings, siteName, siteSuffix } = useSite();
  const social = settings?.social;
  const socials = [
    { href: social?.linkedin, icon: <Linkedin size={16} />, label: "LinkedIn" },
    { href: social?.github, icon: <Github size={16} />, label: "GitHub" },
    { href: social?.twitter, icon: <Twitter size={16} />, label: "Twitter" },
    { href: social?.youtube, icon: <Youtube size={16} />, label: "YouTube" },
  ].filter((s) => s.href);
  const links = [
    { to: "/p/privacy", label: "Privacy" },
    { to: "/p/about", label: "About" },
    { to: "/contact", label: "Contact Us" },
    { to: "/p/dmca", label: "DMCA" },
    { to: "/p/terms", label: "Terms" },
  ];
  return (
    <footer className="bg-slate-900 text-white mt-auto">
      <div className="h-1 bg-amber-400" />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-10">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5 font-black text-white mb-4">
              <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center text-slate-900 text-sm">Py</div>
              <span className="tracking-tighter text-xl">
                {siteName}
                <span className="text-amber-400 italic font-semibold ml-1 text-sm">{siteSuffix}</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed font-medium">{settings?.tagline}</p>
            {socials.length > 0 && (
              <div className="flex gap-2 mt-5">
                {socials.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="p-2.5 bg-white/10 rounded-xl text-slate-300 hover:bg-amber-400 hover:text-slate-900 transition-all">
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="text-xs font-black uppercase tracking-widest text-slate-300 hover:text-amber-400 transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} {siteName} {siteSuffix} · All rights reserved
          </p>
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
            {settings?.footerCredit} · <Link to="/login" className="hover:text-amber-400">Admin</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
      <AnnouncementBar />
      <Header />
      <div className="w-full max-w-6xl mx-auto px-4 pt-6 no-print">
        <AdSlot slot="top" />
      </div>
      <div className="flex-1 w-full max-w-6xl mx-auto pt-6 px-4 mb-16">
        <main className="w-full">
          <Outlet />
        </main>
      </div>
      <div className="w-full max-w-6xl mx-auto px-4 pb-10 no-print">
        <AdSlot slot="bottom" />
      </div>
      <Footer />
      <SearchModal />
    </div>
  );
}
