import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, Crown, Mail, Sparkles } from "lucide-react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../lib/api";
import type { PricingPlan } from "../lib/types";
import { cn } from "../lib/utils";
import { useToast } from "../components/Toast";
import { AdSlot } from "../components/AdSlot";
import { Alert, Button, EmptyState, Field, Input, LinkButton, Modal, PageHero, Spinner } from "../components/ui";

const FAQ = [
  {
    q: "Is the core curriculum really free?",
    a: "Yes. Every NumPy, Pandas and Matplotlib lesson, the quizzes, the in-browser playground and the cheat sheets are free - no card required. Paid tiers add certificates, advanced modules and career tooling on top; they never take away what is free today.",
  },
  {
    q: "Do I need to install Python?",
    a: "No. The playground runs real Python with NumPy, Pandas, Matplotlib and Scikit-Learn directly in your browser. When you are ready to work locally, the Resources page links to the official installers and editors.",
  },
  {
    q: "What is the AI tutor?",
    a: "A context-aware assistant available on every lesson. It knows which lesson you are reading and what code you are running, so you can ask it to explain a line, debug an error or generate a practice exercise. Free accounts get fair-use access; Pro will include unlimited usage.",
  },
  {
    q: "Can I cancel?",
    a: "Absolutely. Paid plans will be month-to-month with no lock-in - cancel any time from your profile and you keep access until the end of the billing period. Your progress, XP and badges stay on your free account.",
  },
];

const isTeamPlan = (plan: PricingPlan) => /team|enterprise|business/i.test(`${plan.id} ${plan.name}`);

function PlanCard({ plan, loggedIn, onWaitlist }: { plan: PricingPlan; loggedIn: boolean; onWaitlist: (plan: PricingPlan) => void }) {
  const hl = plan.highlighted;
  const ctaCls = cn("btn w-full py-4 mt-auto", hl ? "bg-white text-slate-900 hover:bg-amber-400" : "btn-primary");

  let cta: ReactNode;
  if (plan.available) {
    cta = (
      <Link to={loggedIn ? "/courses" : "/signup"} className={ctaCls}>
        {plan.cta} <ArrowRight size={16} />
      </Link>
    );
  } else if (isTeamPlan(plan)) {
    cta = (
      <Link to="/contact/form" className={ctaCls}>
        <Mail size={16} /> {plan.cta}
      </Link>
    );
  } else {
    cta = (
      <button type="button" onClick={() => onWaitlist(plan)} className={ctaCls}>
        {plan.cta} <ArrowRight size={16} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col p-8 rounded-[2rem] transition-all animate-fade-in-up",
        hl ? "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-2xl border border-slate-800 lg:-my-3 overflow-hidden" : "card hover:shadow-xl",
      )}
    >
      {hl && <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-[90px] pointer-events-none" aria-hidden="true" />}
      <div className="relative flex flex-col flex-1">
        <div className="flex items-center justify-between gap-3 mb-5">
          <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", hl ? "text-blue-300" : "text-slate-400")}>{plan.name}</span>
          {hl && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-lg">
              <Crown size={12} /> Most popular
            </span>
          )}
          {!hl && !plan.available && <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Coming soon</span>}
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className={cn("text-5xl font-black tracking-tighter leading-none", hl ? "text-white" : "text-slate-900 dark:text-white")}>{plan.price}</span>
          {plan.period && <span className={cn("text-xs font-bold uppercase tracking-widest pb-1", hl ? "text-slate-400" : "text-slate-400")}>{plan.period}</span>}
        </div>
        <p className={cn("text-sm font-medium leading-relaxed mb-7", hl ? "text-slate-300" : "text-slate-500 dark:text-slate-400")}>{plan.description}</p>
        <ul className="space-y-3 mb-8">
          {plan.features.map((f) => (
            <li key={f} className={cn("flex items-start gap-3 text-sm font-medium", hl ? "text-slate-200" : "text-slate-700 dark:text-slate-300")}>
              <span className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5", hl ? "bg-blue-500/30 text-blue-300" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400")}>
                <Check size={12} strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
        {cta}
      </div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="card divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="w-full flex items-center justify-between gap-4 px-6 md:px-8 py-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <span className="font-black text-slate-900 dark:text-white tracking-tight">{item.q}</span>
              <ChevronDown size={18} className={cn("text-slate-400 shrink-0 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && <p className="px-6 md:px-8 pb-6 text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed animate-fade-in">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default function Pricing() {
  usePageTitle("Pricing");
  const { settings } = useSite();
  const { user } = useAuth();
  const toast = useToast();
  const [waitPlan, setWaitPlan] = useState<PricingPlan | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openWaitlist = (plan: PricingPlan) => {
    setError(null);
    setEmail(user?.email ?? "");
    setWaitPlan(plan);
  };
  const closeWaitlist = useCallback(() => setWaitPlan(null), []);

  const joinWaitlist = async (e: FormEvent) => {
    e.preventDefault();
    if (!waitPlan) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/forms/waitlist", { email: email.trim(), source: `pricing-${waitPlan.id}`.slice(0, 40) });
      toast.success("You're on the list!", `We'll email you the moment ${waitPlan.name} launches.`);
      setWaitPlan(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!settings) return <Spinner label="Loading plans" />;

  if (settings.features.pricing === false || !settings.pricing.enabled) {
    return (
      <EmptyState
        title="Pricing is not available right now"
        description="The full curriculum remains free while we finalize paid tiers. Check back soon."
        action={
          <LinkButton to="/courses" variant="dark">
            Browse courses
          </LinkButton>
        }
      />
    );
  }

  const plans = settings.pricing.plans;

  return (
    <div className="pb-10">
      <PageHero eyebrow="Simple pricing" title="Plans for every learner" subtitle="Start free today. Upgrade later for certificates, advanced modules and career tooling - or bring your whole team." />

      {settings.pricing.note && (
        <Alert type="info" className="max-w-3xl mx-auto mb-12 flex items-start gap-3">
          <Sparkles size={18} className="shrink-0 mt-0.5 text-amber-500" />
          <span>{settings.pricing.note}</span>
        </Alert>
      )}

      {plans.length === 0 ? (
        <div className="card">
          <EmptyState title="No plans published yet" description="Plans will appear here as soon as they are configured." />
        </div>
      ) : (
        <div className={cn("grid gap-6 items-stretch lg:py-3", plans.length === 1 ? "max-w-md mx-auto" : plans.length === 2 ? "md:grid-cols-2 max-w-4xl mx-auto" : "md:grid-cols-2 lg:grid-cols-3")}>
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} loggedIn={!!user} onWaitlist={openWaitlist} />
          ))}
        </div>
      )}

      <section className="max-w-3xl mx-auto mt-20">
        <div className="text-center mb-8">
          <span className="eyebrow mb-2 block">Good to know</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Frequently asked questions</h2>
        </div>
        <Faq />
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 font-medium mt-6">
          Still have a question?{" "}
          <Link to="/contact/form" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Send us a message
          </Link>
          .
        </p>
      </section>

      <AdSlot slot="content" className="h-48 mt-16" />

      <Modal open={waitPlan !== null} onClose={closeWaitlist} title={waitPlan ? `Join the ${waitPlan.name} waitlist` : "Join the waitlist"} size="sm">
        <form onSubmit={joinWaitlist} className="space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
            {waitPlan?.name} is not available yet. Leave your email and we will notify you on launch day - early members get founder pricing.
          </p>
          {error && <Alert type="error">{error}</Alert>}
          <Field label="Email address">
            <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={160} />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeWaitlist}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Notify me
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
