import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Flame, Save, Sparkles, Star, Trophy, UserPlus } from "lucide-react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { api, errorMessage } from "../lib/api";
import { Alert, Button, Field, Input, Select, Spinner } from "../components/ui";

const FALLBACK_GOALS = ["Data Analyst", "Data Scientist", "Machine Learning Engineer", "Business Intelligence", "Academic Research"];
const LEVEL_LABELS: Record<string, string> = {
  Beginner: "Beginner (No coding)",
  Intermediate: "Intermediate (Some Python)",
  Advanced: "Advanced (Data background)",
};
const FALLBACK_LEVELS = Object.keys(LEVEL_LABELS);

const BENEFITS = [
  { icon: <Save size={18} />, title: "Save your progress", text: "Pick up exactly where you left off on any device." },
  { icon: <Star size={18} />, title: "Earn XP & badges", text: "Every lesson, quiz and playground run counts." },
  { icon: <Flame size={18} />, title: "Build a streak", text: "Learn a little every day and watch it grow." },
  { icon: <Trophy size={18} />, title: "Climb the leaderboard", text: "See how you rank against other learners." },
];

export default function Signup() {
  usePageTitle("Create Learner Profile");
  const { settings, siteName, siteSuffix } = useSite();
  const { user, loading, signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [goals, setGoals] = useState<string[]>(FALLBACK_GOALS);
  const [levels, setLevels] = useState<string[]>(FALLBACK_LEVELS);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [goal, setGoal] = useState(FALLBACK_GOALS[0]);
  const [level, setLevel] = useState(FALLBACK_LEVELS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ goals: string[]; levels: string[] }>("/auth/options")
      .then((d) => {
        if (cancelled) return;
        if (d.goals?.length) {
          setGoals(d.goals);
          setGoal((g) => (d.goals.includes(g) ? g : d.goals[0]));
        }
        if (d.levels?.length) {
          setLevels(d.levels);
          setLevel((l) => (d.levels.includes(l) ? l : d.levels[0]));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner label="Loading" />;
  if (user) return <Navigate to="/progress" replace />;

  const signupClosed = settings?.features.signup === false;
  const from = (location.state as { from?: string } | null)?.from;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Please enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setSubmitting(true);
    try {
      const created = await signup({ name: name.trim(), email: email.trim().toLowerCase(), password, goal, level });
      toast.success(`Welcome aboard, ${created.name.split(" ")[0]}!`, "Your learner profile is ready.");
      navigate(from || "/progress", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Could not create your profile. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-6 md:py-10 animate-fade-in-up">
      <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_1.35fr] gap-6 lg:gap-8 items-stretch">
        {/* Benefits panel */}
        <aside className="hidden md:flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-[2.5rem] p-8 lg:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
              <Sparkles size={14} className="text-amber-400" /> Free forever
            </div>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tighter leading-[1.05] mb-4">
              Learn faster with a <span className="text-blue-400">learner profile</span>.
            </h2>
            <p className="text-slate-300 font-medium leading-relaxed text-sm mb-10">
              {siteName} {siteSuffix} remembers what you have completed, rewards consistency and keeps you motivated.
            </p>
            <ul className="space-y-5">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex items-start gap-4">
                  <span className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-amber-300 shrink-0">{b.icon}</span>
                  <span>
                    <span className="block font-black text-sm tracking-tight">{b.title}</span>
                    <span className="block text-xs text-slate-400 font-medium mt-0.5">{b.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="relative z-10 text-[10px] font-black uppercase tracking-widest text-slate-500 mt-10">No credit card. Takes 20 seconds.</p>
          <div className="absolute right-0 top-0 w-72 h-72 bg-blue-500/20 rounded-full blur-[100px] -mr-24 -mt-24" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-[100px] -ml-24 -mb-24" />
        </aside>

        {/* Form card */}
        <div className="card max-w-2xl mx-auto w-full p-6 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/30">
              <UserPlus size={28} />
            </div>
            <span className="eyebrow mb-2 block">Get started</span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Create Learner Profile</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-3">
              Join {siteName} {siteSuffix} and start your data science journey today.
            </p>
          </div>

          {signupClosed ? (
            <Alert type="warning">
              Sign-ups are currently closed. Already have a profile?{" "}
              <Link to="/login" className="font-black underline">
                Log in instead
              </Link>
              .
            </Alert>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              {error && <Alert type="error">{error}</Alert>}
              <Field label="Full name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" autoComplete="name" required />
              </Field>
              <Field label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </Field>
              <Field label="Password" hint="At least 6 characters.">
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" autoComplete="new-password" minLength={6} required className="pr-12" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Learning goal">
                  <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
                    {goals.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Experience level">
                  <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                    {levels.map((l) => (
                      <option key={l} value={l}>
                        {LEVEL_LABELS[l] ?? l}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Button type="submit" loading={submitting} size="lg" className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800">
                Join <ArrowRight size={16} />
              </Button>
              <p className="text-[11px] text-slate-400 font-medium text-center leading-relaxed">
                By joining you agree to our{" "}
                <Link to="/terms" className="underline hover:text-blue-600">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="underline hover:text-blue-600">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            Already have a profile?{" "}
            <Link to="/login" state={from ? { from } : undefined} className="font-black text-blue-600 dark:text-blue-400 hover:underline">
              Log in instead
            </Link>
          </div>

          {/* Mobile benefits */}
          <ul className="md:hidden mt-8 grid grid-cols-2 gap-3">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex items-center gap-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
                <span className="text-blue-600 dark:text-blue-400 shrink-0">{b.icon}</span>
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 leading-tight">{b.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
