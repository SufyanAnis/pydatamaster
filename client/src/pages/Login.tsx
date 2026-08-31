import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { usePageTitle } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import { Alert, Button, Field, Input, Spinner } from "../components/ui";

function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

export default function Login() {
  usePageTitle("Admin login");
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from;

  if (loading) return <Spinner label="Loading" />;
  if (user) return <Navigate to={user.role === "admin" ? from || "/admin" : "/"} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const u = await login(email.trim().toLowerCase(), password);
      navigate(u.role === "admin" ? from || "/admin" : "/", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Login failed. Please check your details and try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-8 md:py-16 animate-fade-in-up">
      <div className="card max-w-md mx-auto w-full p-6 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-400 font-black text-lg mx-auto mb-5 shadow-md">Py</div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Admin login</h1>
          <p className="text-sm text-slate-500 font-medium mt-3">Sign in to manage articles, pages and settings.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {error && <Alert type="error">{error}</Alert>}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus required />
          </Field>
          <Field label="Password">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          <Button type="submit" variant="dark" size="lg" loading={submitting} className="w-full">
            Sign in <ArrowRight size={15} />
          </Button>
        </form>

        {isLocalHost() && (
          <div className="mt-6 rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
              <span className="font-black uppercase tracking-widest text-[9px] block mb-0.5">Local dev hint</span>
              Default admin: <code className="font-mono font-bold">admin@pydatamaster.io</code> / <code className="font-mono font-bold">Admin@12345</code>
            </p>
          </div>
        )}

        <p className="mt-8 pt-6 border-t border-slate-100 text-center text-[11px] font-black uppercase tracking-widest text-slate-400">
          <Link to="/" className="hover:text-amber-600 transition-colors">
            Back to the site
          </Link>
        </p>
      </div>
    </div>
  );
}
