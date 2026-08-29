import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Award, BookOpenCheck, CheckCircle2, Clock, Flame, KeyRound, Lock, Mail, Save, Sparkles, Target, Trash2, Zap } from "lucide-react";
import { api, ApiError, errorMessage } from "../../lib/api";
import type { Progress, Role, User, UserStatus } from "../../lib/types";
import { cn, formatDate, formatDateTime, pct, timeAgo } from "../../lib/utils";
import { Icon } from "../../lib/icons";
import { useAuth } from "../../context/AuthContext";
import { useSite, usePageTitle } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Alert, Avatar, Button, ConfirmDialog, EmptyState, Field, Input, ProgressBar, Select, Spinner, StatTile } from "../../components/ui";
import { CorePageHeader, CoreSection } from "../components/CorePageHeader";
import { CoreKeyValue } from "../components/CoreControls";
import { RolePill, UserStatusPill } from "../components/CoreStatus";

const GOALS = ["Data Analyst", "Data Scientist", "Machine Learning Engineer", "Business Intelligence", "Academic Research"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const ACTIVITY_LABELS: Record<string, string> = {
  lesson: "Completed a lesson",
  quiz: "Took a quiz",
  quiz_perfect: "Perfect quiz score",
  playground: "Ran code in the playground",
};

interface FormState {
  name: string;
  role: Role;
  level: string;
  goal: string;
  status: UserStatus;
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user: me } = useAuth();
  const { modules } = useSite();

  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  usePageTitle(user ? `Admin - ${user.name}` : "Admin user");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await api.get<{ user: User; progress: Progress }>(`/admin/users/${id}`);
      setUser(data.user);
      setProgress(data.progress);
      setForm({ name: data.user.name, role: data.user.role, level: data.user.level, goal: data.user.goal, status: data.user.status });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setError(errorMessage(err, "Could not load user"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const lessonIndex = useMemo(() => {
    const map = new Map<string, { title: string; moduleId: string; moduleTitle: string }>();
    for (const m of modules) for (const l of m.lessons) map.set(l.id, { title: l.title, moduleId: m.id, moduleTitle: m.title });
    return map;
  }, [modules]);

  const isMe = !!user && me?.id === user.id;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !form) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: form.name.trim(), goal: form.goal, level: form.level };
      if (!isMe) {
        body.role = form.role;
        body.status = form.status;
      }
      const res = await api.patch<{ user: User }>(`/admin/users/${user.id}`, body);
      setUser(res.user);
      setForm({ name: res.user.name, role: res.user.role, level: res.user.level, goal: res.user.goal, status: res.user.status });
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Could not save", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword.length < 6) {
      toast.error("Password too short", "Use at least 6 characters.");
      return;
    }
    setResetting(true);
    try {
      await api.patch(`/admin/users/${user.id}`, { newPassword });
      setNewPassword("");
      toast.success("Password updated", `${user.name} can sign in with the new password.`);
    } catch (err) {
      toast.error("Could not reset password", errorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  const remove = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await api.del(`/admin/users/${user.id}`);
      toast.success("User deleted", `${user.name} was removed.`);
      navigate("/admin/users");
    } catch (err) {
      toast.error("Could not delete user", errorMessage(err));
      setDeleting(false);
    }
  };

  const backLink = (
    <Link to="/admin/users" className="btn-secondary px-4 py-2 text-[10px]">
      <ArrowLeft size={14} /> All users
    </Link>
  );

  if (loading) return <Spinner label="Loading user" />;

  if (notFound || !user || !progress || !form) {
    return (
      <div>
        <CorePageHeader eyebrow="People" title="User" actions={backLink} />
        {error ? (
          <Alert type="error">{error}</Alert>
        ) : (
          <div className="card">
            <EmptyState title="User not found" description="This account may have been deleted." action={backLink} />
          </div>
        )}
      </div>
    );
  }

  const quizAccuracy = pct(progress.quizStats.correct, progress.quizStats.total);
  const lessonsPct = pct(progress.completedLessons.length, progress.totalLessons);
  const earnedBadges = progress.badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-6 md:space-y-8">
      <CorePageHeader eyebrow="People" title={user.name} subtitle={`Joined ${formatDate(user.createdAt)}`} actions={backLink} />

      {/* Profile header */}
      <div className="card p-6 md:p-8">
        <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
          <Avatar name={user.name} color={user.avatarColor} size="xl" className="mx-auto sm:mx-0" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 dark:text-white truncate">{user.name}</h2>
              <RolePill role={user.role} />
              <UserStatusPill status={user.status} />
              {isMe && <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">This is you</span>}
            </div>
            <a href={`mailto:${user.email}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">
              <Mail size={14} /> {user.email}
            </a>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
              <CoreKeyValue label="Joined">{formatDate(user.createdAt)}</CoreKeyValue>
              <CoreKeyValue label="Last login">{user.lastLoginAt ? <span title={formatDateTime(user.lastLoginAt)}>{timeAgo(user.lastLoginAt)}</span> : "Never"}</CoreKeyValue>
              <CoreKeyValue label="Goal">{user.goal || "-"}</CoreKeyValue>
              <CoreKeyValue label="Level">{user.level || "-"}</CoreKeyValue>
            </div>
          </div>
        </div>
      </div>

      {/* Progress tiles */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <StatTile label="Total XP" value={progress.xp.toLocaleString()} icon={<Zap size={20} />} color="amber" sub={`${earnedBadges} of ${progress.badges.length} badges`} />
        <StatTile label="Streak" value={`${progress.streak}d`} icon={<Flame size={20} />} color="orange" sub={`Longest ${progress.longestStreak} days`} />
        <StatTile label="Lessons done" value={`${progress.completedLessons.length} / ${progress.totalLessons}`} icon={<BookOpenCheck size={20} />} color="blue" sub={`${lessonsPct}% of the curriculum`} />
        <StatTile label="Quiz accuracy" value={`${quizAccuracy}%`} icon={<Target size={20} />} color="emerald" sub={`${progress.quizStats.attempts} attempt${progress.quizStats.attempts === 1 ? "" : "s"}, ${progress.quizStats.correct}/${progress.quizStats.total} correct`} />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Edit form */}
        <div className="lg:col-span-2 space-y-6">
          <CoreSection title="Edit profile" subtitle="Changes apply immediately.">
            <form onSubmit={save} className="space-y-4">
              <Field label="Name">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={80} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Role" hint={isMe ? "You cannot change your own role." : undefined}>
                  <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} disabled={isMe}>
                    <option value="learner">Learner</option>
                    <option value="admin">Admin</option>
                  </Select>
                </Field>
                <Field label="Status" hint={isMe ? "You cannot suspend yourself." : undefined}>
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })} disabled={isMe}>
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                  </Select>
                </Field>
                <Field label="Level">
                  <Select value={LEVELS.includes(form.level) ? form.level : ""} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    {!LEVELS.includes(form.level) && <option value="">{form.level || "Unset"}</option>}
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Goal">
                  <Select value={GOALS.includes(form.goal) ? form.goal : ""} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
                    {!GOALS.includes(form.goal) && <option value="">{form.goal || "Unset"}</option>}
                    {GOALS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" loading={saving}>
                  <Save size={14} /> Save changes
                </Button>
              </div>
            </form>
          </CoreSection>

          <CoreSection title="Reset password" subtitle="Set a new password on the user's behalf.">
            <form onSubmit={resetPassword} className="flex flex-col sm:flex-row gap-3">
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (6+ characters)" autoComplete="new-password" minLength={6} className="flex-1" />
              <Button type="submit" variant="dark" loading={resetting} disabled={newPassword.length < 6}>
                <KeyRound size={14} /> Update
              </Button>
            </form>
          </CoreSection>

          <CoreSection title="Danger zone" subtitle="Irreversible actions." className="border-red-100 dark:border-red-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Deleting removes the account, XP, badges and all lesson progress.</p>
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} disabled={isMe} title={isMe ? "You cannot delete your own account" : undefined}>
                <Trash2 size={14} /> Delete user
              </Button>
            </div>
          </CoreSection>
        </div>

        {/* Progress details */}
        <div className="lg:col-span-3 space-y-6">
          <CoreSection title="Badges" subtitle={`${earnedBadges} earned, ${progress.badges.length - earnedBadges} locked`}>
            {progress.badges.length === 0 ? (
              <EmptyState icon={<Award size={26} />} title="No badges defined" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {progress.badges.map((b) => (
                  <div key={b.id} className={cn("rounded-2xl border p-4 flex items-start gap-3 transition-all", b.earned ? "border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10" : "border-slate-100 dark:border-slate-800 opacity-60")}>
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", b.earned ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400")}>
                      {b.earned ? <Icon name={b.icon} size={18} /> : <Lock size={15} />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 dark:text-white truncate">{b.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug">{b.description}</div>
                      {b.earned && b.earnedAt && <div className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mt-1.5">Earned {timeAgo(b.earnedAt)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CoreSection>

          <CoreSection title="Completed lessons" subtitle={`${progress.completedLessons.length} of ${progress.totalLessons}`}>
            <ProgressBar value={lessonsPct} className="mb-4" />
            {progress.completedLessons.length === 0 ? (
              <EmptyState icon={<CheckCircle2 size={26} />} title="No lessons completed yet" />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {progress.completedLessons.map((lessonId) => {
                  const info = lessonIndex.get(lessonId);
                  const chip = (
                    <span className="inline-flex items-center gap-2 max-w-full px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span className="truncate">{info?.title ?? lessonId}</span>
                      {info && <span className="font-mono text-[10px] text-emerald-500/80 hidden sm:inline">{lessonId}</span>}
                    </span>
                  );
                  return (
                    <li key={lessonId} className="max-w-full">
                      {info ? (
                        <Link to={`/lesson/${info.moduleId}/${lessonId}`} title={`${info.moduleTitle}: ${info.title}`} className="block hover:opacity-80">
                          {chip}
                        </Link>
                      ) : (
                        chip
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CoreSection>

          <CoreSection title="Recent activity" subtitle="Latest XP-earning events">
            {progress.recentActivity.length === 0 ? (
              <EmptyState icon={<Clock size={26} />} title="No activity yet" />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {progress.recentActivity.map((a) => {
                  const ref = a.refId ? lessonIndex.get(a.refId)?.title ?? a.refId : null;
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", a.type === "quiz_perfect" ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600" : a.type === "playground" ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600")}>
                        {a.type === "quiz_perfect" ? <Sparkles size={16} /> : a.type === "playground" ? <Zap size={16} /> : <CheckCircle2 size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900 dark:text-white truncate">{ACTIVITY_LABELS[a.type] ?? a.type}</div>
                        {ref && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{ref}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        {a.xp > 0 && <div className="text-xs font-black text-blue-600 dark:text-blue-400">+{a.xp} XP</div>}
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400" title={formatDateTime(a.createdAt)}>
                          {timeAgo(a.createdAt)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CoreSection>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => !deleting && setConfirmDelete(false)}
        onConfirm={remove}
        title={`Delete ${user.name}?`}
        message="This permanently removes the account, XP, badges and lesson progress. This cannot be undone."
        confirmLabel="Delete user"
        loading={deleting}
      />
    </div>
  );
}
