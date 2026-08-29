import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { usePageTitle } from "../context/SiteContext";
import { api, errorMessage } from "../lib/api";
import { Alert, Button, Field, Input, LinkButton, Textarea } from "../components/ui";
import { BackLink } from "../components/public";

const EMPTY = { firstName: "", lastName: "", email: "", message: "", profession: "", education: "", social: "", website: "" };
type FormState = typeof EMPTY;

export default function ContactForm() {
  usePageTitle("Send an Inquiry");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const set = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.message.trim().length < 5) {
      setError("Please write a slightly longer message (at least 5 characters).");
      return;
    }
    setBusy(true);
    try {
      await api.post("/forms/contact", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        profession: form.profession.trim(),
        education: form.education.trim(),
        social: form.social.trim(),
        website: form.website,
      });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-10">
      <BackLink to="/contact" className="mb-8">
        Back to Contact Guidelines
      </BackLink>

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-8 md:p-10 text-white relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 blur-3xl rounded-full" aria-hidden="true" />
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/10 flex items-center justify-center mb-5">
              <Mail size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 block mb-2">Contact form</span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2">Send an Inquiry</h1>
            <p className="text-blue-100 font-medium leading-relaxed">Questions, feedback, partnership ideas - we read every message and reply within 1-2 business days.</p>
          </div>
        </div>

        {sent ? (
          <div className="p-8 md:p-12 text-center animate-fade-in-up">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-3">Message Sent!</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto mb-8">Thank you for reaching out. Our team has received your message and will get back to you within 1-2 business days.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <LinkButton to="/" variant="primary">
                Back to Home
              </LinkButton>
              <LinkButton to="/courses" variant="secondary">
                Keep learning
              </LinkButton>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 sm:p-8 md:p-10 space-y-6" noValidate={false}>
            {error && <Alert type="error">{error}</Alert>}

            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="First name *">
                <Input value={form.firstName} onChange={set("firstName")} required maxLength={80} autoComplete="given-name" placeholder="Ada" />
              </Field>
              <Field label="Last name *">
                <Input value={form.lastName} onChange={set("lastName")} required maxLength={80} autoComplete="family-name" placeholder="Lovelace" />
              </Field>
            </div>

            <Field label="Email *">
              <Input type="email" value={form.email} onChange={set("email")} required maxLength={160} autoComplete="email" placeholder="you@example.com" />
            </Field>

            <Field label="Query or message *" hint="Tell us as much as you can - lesson names, error messages and links all help.">
              <Textarea value={form.message} onChange={set("message")} required minLength={5} maxLength={5000} rows={6} placeholder="How can we help?" />
            </Field>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-6 mb-4">Optional - helps us tailor our reply</p>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Profession">
                  <Input value={form.profession} onChange={set("profession")} maxLength={120} placeholder="Data analyst, student, engineer..." />
                </Field>
                <Field label="Education">
                  <Input value={form.education} onChange={set("education")} maxLength={120} placeholder="BSc Computer Science" />
                </Field>
              </div>
              <Field label="Social" hint="LinkedIn, GitHub, or Website URL" className="mt-5">
                <Input type="url" value={form.social} onChange={set("social")} maxLength={300} placeholder="https://" />
              </Field>
            </div>

            {/* Honeypot: real users never see or fill this field. */}
            <div style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
              <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                By clicking send, you agree to our{" "}
                <Link to="/privacy" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
              <Button type="submit" loading={busy} size="lg" className="shrink-0">
                {!busy && <Send size={16} />} Send message
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
