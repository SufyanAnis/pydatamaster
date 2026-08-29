import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, KeyRound, LogIn, ShieldCheck } from "lucide-react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { errorMessage } from "../lib/api";
import { Alert, Button, Field, Input, Spinner } from "../components/ui";

function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

export default function Login() {
  usePageTitle("Log In");
  const { settings } = useSite();
  const { user, loading, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from;

  if (loading) return <Spinner label="Loading" />;
  if (user) return <Navigate to={from || (user.role === "admin" ? "/admin" : "/progress")} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError("Please enter your email and password.");
    setSubmitting(true);
    try {
      const u = await login(email.trim().toLowerCase(), password);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}!`);
      navigate(from || (u.role === "admin" ? "/admin" : "/progress"), { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Login failed. Please check your details and try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-6 md:py-12 animate-fade-in-up">
      <div className="card max-w-md mx-auto w-full p-6 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-900 dark:from-blue-600 dark:to-indigo-700 text-white flex items-center justify-center mx-auto mb-5 shadow-lg">
            <LogIn size={28} />
          </div>
          <span className="eyebrow mb-2 block">Learner login</span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Welcome Back</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-3">Log in to track your data science progress.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {error && <Alert type="error">{error}</Alert>}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus required />
          </Field>
          <Field label="Password">
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" required className="pr-12" />
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
          <Button type="submit" loading={submitting} size="lg" className="w-full">
            Log in <ArrowRight size={16} />
          </Button>
        </form>

        {isLocalHost() && (
          <div className="mt-6 rounded-2xl border border-dashed border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-900/10 px-4 py-3 flex items-start gap-3">
            <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-amber-800 dark:text-amber-200 leading-relaxed">
              <span className="font-black uppercase tracking-widest text-[9px] block mb-0.5">Local dev hint</span>
              Default admin: <code className="font-mono font-bold">admin@pydatamaster.io</code> / <code className="font-mono font-bold">Admin@12345</code> (change it in Admin -&gt; Users)
            </p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-sm font-medium text-slate-500 dark:text-slate-400 space-y-2">
          {settings?.features.signup !== false ? (
            <p>
              New here?{" "}
              <Link to="/signup" state={from ? { from } : undefined} className="font-black text-blue-600 dark:text-blue-400 hover:underline">
                Create a free learner profile
              </Link>
            </p>
          ) : (
            <p>Sign-ups are currently closed.</p>
          )}
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <KeyRound size={12} /> Forgot your password? Contact us via the{" "}
            <Link to="/contact" className="underline hover:text-blue-600">
              contact page
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
