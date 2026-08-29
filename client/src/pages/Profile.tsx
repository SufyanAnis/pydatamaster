import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Eye, EyeOff, KeyRound, LogOut, Mail, Save, Shield, UserCog } from "lucide-react";
import { usePageTitle } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { api, errorMessage } from "../lib/api";
import { formatDate } from "../lib/utils";
import { Alert, Avatar, Button, Field, Input, Pill, Select, Spinner } from "../components/ui";

const FALLBACK_GOALS = ["Data Analyst", "Data Scientist", "Machine Learning Engineer", "Business Intelligence", "Academic Research"];
const LEVEL_LABELS: Record<string, string> = {
  Beginner: "Beginner (No coding)",
  Intermediate: "Intermediate (Some Python)",
  Advanced: "Advanced (Data background)",
};
const FALLBACK_LEVELS = Object.keys(LEVEL_LABELS);

function PasswordInput({ value, onChange, placeholder, autoComplete }: { value: string; onChange: (v: string) => void; placeholder: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="pr-12" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export default function Profile() {
  usePageTitle("Edit Profile");
  const { user, updateProfile, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [goals, setGoals] = useState<string[]>(FALLBACK_GOALS);
  const [levels, setLevels] = useState<string[]>(FALLBACK_LEVELS);

  const [name, setName] = useState(user?.name ?? "");
  const [goal, setGoal] = useState(user?.goal ?? FALLBACK_GOALS[0]);
  const [level, setLevel] = useState(user?.level ?? FALLBACK_LEVELS[0]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ goals: string[]; levels: string[] }>("/auth/options")
      .then((d) => {
        if (cancelled) return;
        if (d.goals?.length) setGoals(d.goals);
        if (d.levels?.length) setLevels(d.levels);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the form in sync if the user object changes elsewhere (e.g. after save).
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setGoal(user.goal);
    setLevel(user.level);
  }, [user]);

  if (!user) return <Spinner label="Loading profile" />;

  const profileDirty = name.trim() !== user.name || goal !== user.goal || level !== user.level;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    if (name.trim().length < 2) return setProfileError("Please enter your full name.");
    setSavingProfile(true);
    try {
      await updateProfile({ name: name.trim(), goal, level });
      toast.success("Profile updated", "Your details have been saved.");
    } catch (err) {
      setProfileError(errorMessage(err, "Could not save your profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!currentPassword) return setPasswordError("Enter your current password.");
    if (newPassword.length < 6) return setPasswordError("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setPasswordError("New passwords do not match.");
    if (newPassword === currentPassword) return setPasswordError("New password must be different from the current one.");
    setSavingPassword(true);
    try {
      await updateProfile({ currentPassword, newPassword });
      toast.success("Password changed", "Use your new password next time you log in.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(errorMessage(err, "Could not change your password."));
    } finally {
      setSavingPassword(false);
    }
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.info("Logged out", "See you next time.");
      navigate("/");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-10 animate-fade-in-up">
      <Link to="/progress" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-6">
        <ArrowLeft size={12} /> Back to progress
      </Link>

      <header className="flex items-center gap-5 mb-10">
        <Avatar name={user.name} color={user.avatarColor} size="lg" />
        <div className="min-w-0">
          <span className="eyebrow mb-1 block">Account</span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight truncate">Edit Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Update how you appear on the leaderboard and what you are learning towards.</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-8 min-w-0">
          {/* Profile details */}
          <form onSubmit={saveProfile} className="card p-6 md:p-8 space-y-5" noValidate>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                <UserCog size={20} />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Profile details</h2>
                <p className="text-xs text-slate-400 font-medium">Your name, goal and experience level.</p>
              </div>
            </div>
            {profileError && <Alert type="error">{profileError}</Alert>}
            <Field label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your name" required />
            </Field>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Learning goal">
                <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
                  {(goals.includes(goal) ? goals : [goal, ...goals]).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Experience level">
                <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                  {(levels.includes(level) ? levels : [level, ...levels]).map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_LABELS[l] ?? l}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="submit" loading={savingProfile} disabled={!profileDirty}>
                <Save size={16} /> Save changes
              </Button>
            </div>
          </form>

          {/* Password */}
          <form onSubmit={savePassword} className="card p-6 md:p-8 space-y-5" noValidate>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center">
                <KeyRound size={20} />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Change password</h2>
                <p className="text-xs text-slate-400 font-medium">Choose a password of at least 6 characters.</p>
              </div>
            </div>
            {passwordError && <Alert type="error">{passwordError}</Alert>}
            <Field label="Current password">
              <PasswordInput value={currentPassword} onChange={setCurrentPassword} placeholder="Your current password" autoComplete="current-password" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="New password">
                <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="At least 6 characters" autoComplete="new-password" />
              </Field>
              <Field label="Confirm new password">
                <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat new password" autoComplete="new-password" />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="submit" variant="dark" loading={savingPassword} disabled={!currentPassword || !newPassword || !confirmPassword}>
                <KeyRound size={16} /> Update password
              </Button>
            </div>
          </form>
        </div>

        <aside className="space-y-6">
          {/* Account info */}
          <div className="card p-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-5">Account info</h3>
            <dl className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</dt>
                  <dd className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role</dt>
                  <dd className="mt-1">
                    <Pill color={user.role === "admin" ? "amber" : "blue"}>{user.role}</Pill>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Member since</dt>
                  <dd className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatDate(user.createdAt)}</dd>
                </div>
              </div>
              {user.lastLoginAt && (
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last login</dt>
                    <dd className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatDate(user.lastLoginAt, { year: "numeric", month: "short", day: "numeric" })}</dd>
                  </div>
                </div>
              )}
            </dl>
            <p className="text-[11px] text-slate-400 font-medium mt-5 leading-relaxed">Your email address cannot be changed here. Contact us if you need to move your progress to a new address.</p>
          </div>

          {/* Danger zone */}
          <div className="rounded-3xl border border-red-100 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10 p-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 dark:text-red-400 mb-2">Danger zone</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-4">Logging out ends your session on this device only. Your progress stays safely stored.</p>
            <Button variant="danger" size="sm" onClick={onLogout} loading={loggingOut} className="w-full">
              <LogOut size={14} /> Log out of this device
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
