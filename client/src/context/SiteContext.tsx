import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import type { Module, PublicSettings } from "../lib/types";

export interface TutorContext {
  lessonTitle?: string;
  moduleTitle?: string;
  code?: string;
  page?: string;
}

interface SiteApi {
  settings: PublicSettings | null;
  modules: Module[];
  loading: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
  refreshSettings: () => Promise<void>;
  refreshModules: () => Promise<void>;
  tutorContext: TutorContext;
  setTutorContext: (ctx: TutorContext) => void;
  tutorOpen: boolean;
  setTutorOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  siteName: string;
  siteSuffix: string;
}

const SiteContext = createContext<SiteApi | null>(null);

function readTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(readTheme);
  const [tutorContext, setTutorContextState] = useState<TutorContext>({});
  const [tutorOpen, setTutorOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  const refreshSettings = useCallback(async () => {
    try {
      setSettings(await api.get<PublicSettings>("/settings/public"));
    } catch {
      /* keep previous */
    }
  }, []);

  const refreshModules = useCallback(async () => {
    try {
      const data = await api.get<{ modules: Module[] }>("/content/modules");
      setModules(data.modules);
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
    Promise.all([refreshSettings(), refreshModules()]).finally(() => setLoading(false));
  }, [refreshSettings, refreshModules]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // Lightweight page-view analytics + scroll reset.
  const lastPath = useRef<string>("");
  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    window.scrollTo({ top: 0 });
    api.post("/analytics/pageview", { path: location.pathname }).catch(() => {});
    setTutorContextState((c) => ({ ...c, page: location.pathname }));
  }, [location.pathname]);

  const setTutorContext = useCallback((ctx: TutorContext) => setTutorContextState((c) => ({ ...c, ...ctx })), []);

  const value = useMemo<SiteApi>(
    () => ({
      settings,
      modules,
      loading,
      theme,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      refreshSettings,
      refreshModules,
      tutorContext,
      setTutorContext,
      tutorOpen,
      setTutorOpen,
      searchOpen,
      setSearchOpen,
      siteName: settings?.siteName ?? "PyDataMaster",
      siteSuffix: settings?.siteSuffix ?? "i.o.",
    }),
    [settings, modules, loading, theme, refreshSettings, refreshModules, tutorContext, setTutorContext, tutorOpen, searchOpen],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteApi {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
}

/** Sets document.title; restores the default on unmount. */
export function usePageTitle(title: string | null | undefined) {
  const { siteName, siteSuffix } = useSite();
  useEffect(() => {
    const base = `${siteName} ${siteSuffix}`.trim();
    document.title = title ? `${title} - ${base}` : `${base} - Master Python Data Science`;
    return () => {
      document.title = `${base} - Master Python Data Science`;
    };
  }, [title, siteName, siteSuffix]);
}
