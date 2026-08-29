import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { Progress, User } from "../lib/types";
import { useToast } from "../components/Toast";

interface AuthApi {
  user: User | null;
  progress: Progress | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: { name: string; email: string; password: string; goal: string; level: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  completeLesson: (lessonId: string) => Promise<void>;
  submitQuiz: (lessonId: string, score: number, total: number) => Promise<void>;
  recordPlaygroundRun: () => Promise<void>;
  updateProfile: (data: { name?: string; goal?: string; level?: string; currentPassword?: string; newPassword?: string }) => Promise<User>;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: User | null; progress: Progress | null }>("/auth/me");
      setUser(data.user);
      setProgress(data.progress);
    } catch {
      setUser(null);
      setProgress(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const applyBadges = useCallback(
    (before: Progress | null, after: Progress) => {
      if (!before) return;
      const earnedBefore = new Set(before.badges.filter((b) => b.earned).map((b) => b.id));
      for (const b of after.badges) {
        if (b.earned && !earnedBefore.has(b.id)) toast.success(`Badge unlocked: ${b.name}`, b.description);
      }
    },
    [toast],
  );

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: User; progress: Progress }>("/auth/login", { email, password });
    setUser(data.user);
    setProgress(data.progress);
    return data.user;
  }, []);

  const signup = useCallback(async (payload: { name: string; email: string; password: string; goal: string; level: string }) => {
    const data = await api.post<{ user: User; progress: Progress }>("/auth/signup", payload);
    setUser(data.user);
    setProgress(data.progress);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
    setProgress(null);
  }, []);

  const completeLesson = useCallback(
    async (lessonId: string) => {
      if (!user) return;
      const data = await api.post<{ alreadyDone: boolean; xpAwarded: number; progress: Progress }>("/progress/complete", { lessonId });
      setProgress((prev) => {
        applyBadges(prev, data.progress);
        return data.progress;
      });
      if (!data.alreadyDone && data.xpAwarded > 0) toast.xp(data.xpAwarded, "Lesson completed");
    },
    [user, toast, applyBadges],
  );

  const submitQuiz = useCallback(
    async (lessonId: string, score: number, total: number) => {
      if (!user) return;
      const data = await api.post<{ xpAwarded: number; progress: Progress }>("/progress/quiz", { lessonId, score, total });
      setProgress((prev) => {
        applyBadges(prev, data.progress);
        return data.progress;
      });
      toast.xp(data.xpAwarded, score === total ? "Perfect score!" : `Quiz: ${score}/${total}`);
    },
    [user, toast, applyBadges],
  );

  const recordPlaygroundRun = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.post<{ progress: Progress }>("/progress/playground-run");
      setProgress(data.progress);
    } catch {
      /* ignore */
    }
  }, [user]);

  const updateProfile = useCallback(async (payload: { name?: string; goal?: string; level?: string; currentPassword?: string; newPassword?: string }) => {
    const data = await api.patch<{ user: User }>("/auth/me", payload);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo<AuthApi>(
    () => ({
      user,
      progress,
      loading,
      isAdmin: user?.role === "admin",
      login,
      signup,
      logout,
      refresh,
      completeLesson,
      submitQuiz,
      recordPlaygroundRun,
      updateProfile,
    }),
    [user, progress, loading, login, signup, logout, refresh, completeLesson, submitQuiz, recordPlaygroundRun, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
