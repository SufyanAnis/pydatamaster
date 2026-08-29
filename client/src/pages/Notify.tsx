import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Link2, Mail, Phone, Rocket, Send, ShieldCheck } from "lucide-react";
import { usePageTitle } from "../context/SiteContext";
import { api, errorMessage } from "../lib/api";
import { Alert, Button, Field, Input, LinkButton } from "../components/ui";
import { GlowPanel } from "../components/public";

export default function Notify() {
  usePageTitle("Get Notified");
  const [params] = useSearchParams();
  const source = (params.get("source") || "notify").trim().slice(0, 40) || "notify";
  const [email, setEmail] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const clean = email.trim();
      await api.post("/forms/waitlist", { email: clean, socialLink: socialLink.trim(), phone: phone.trim(), source });
      setSent(clean);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10 animate-fade-in">
      <GlowPanel className="p-8 md:p-12 lg:p-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
              <Rocket size={14} className="text-amber-400" /> Launching soon
            </div>
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-black tracking-tighter leading-[1.05] mb-6">
              Get Notified <span className="text-blue-400">On Launch</span>
            </h1>
            <p className="text-slate-300 text-lg font-medium leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">Be the first to access our world-class IDE. We'll send you an exclusive invite, early-access credentials, and a launch-day toolkit.</p>
            <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-bold text-emerald-300 mb-10">
              <ShieldCheck size={20} /> No spam, only quality updates
            </div>
            <div>
              <Link to="/playground" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={14} /> Back to playground
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 text-slate-900 dark:text-white">
            {sent ? (
              <div className="text-center py-6 animate-fade-in-up">
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="text-3xl font-black tracking-tighter mb-3">You're on the list!</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-2">We will send your invite to</p>
                <p className="font-black text-blue-600 dark:text-blue-400 break-all mb-8">{sent}</p>
                <LinkButton to="/courses" variant="primary">
                  Back to learning
                </LinkButton>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <span className="eyebrow mb-1 block">Early access</span>
                  <h2 className="text-2xl font-black tracking-tighter">Reserve your invite</h2>
                </div>
                {error && <Alert type="error">{error}</Alert>}
                <Field label="Email *">
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={160} autoComplete="email" className="pl-11" />
                  </div>
                </Field>
                <Field label="Social Media / Portfolio Link" hint="Optional - LinkedIn, GitHub or a personal site">
                  <div className="relative">
                    <Link2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input type="url" value={socialLink} onChange={(e) => setSocialLink(e.target.value)} placeholder="https://" maxLength={300} className="pl-11" />
                  </div>
                </Field>
                <Field label="Phone" hint="Optional">
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" maxLength={40} autoComplete="tel" className="pl-11" />
                  </div>
                </Field>
                <Button type="submit" loading={busy} size="lg" className="w-full">
                  {!busy && <Send size={16} />} Notify me
                </Button>
                <p className="text-[11px] text-slate-400 font-medium text-center leading-relaxed">
                  We only use your details to send launch updates. Read our{" "}
                  <Link to="/privacy" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </form>
            )}
          </div>
        </div>
      </GlowPanel>
    </div>
  );
}
