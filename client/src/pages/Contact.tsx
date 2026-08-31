import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import type { Page } from "../lib/types";
import { usePageTitle, useSite } from "../context/SiteContext";
import { Markdown } from "../lib/markdown";
import { Alert, Button, Card, Field, Input, LinkButton, Skeleton, Textarea } from "../components/ui";

const FALLBACK_INTRO = "Have a question, a correction, or a partnership idea? Send us a message using the form below and we will get back to you.";

export default function Contact() {
  usePageTitle("Contact");
  const { settings } = useSite();

  const [intro, setIntro] = useState<Page | null>(null);
  const [introLoading, setIntroLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot - real visitors never fill this
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ page: Page }>("/content/pages/contact")
      .then((d) => {
        if (!cancelled) setIntro(d.page);
      })
      .catch(() => {
        /* fall back to the hardcoded intro */
      })
      .finally(() => {
        if (!cancelled) setIntroLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in your first name, email and message.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/forms/contact", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        message: message.trim(),
        website,
      });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, "Could not send your message. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {introLoading ? (
        <div className="space-y-3 mb-10">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : intro ? (
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[1.05]">{intro.title}</h1>
          <div className="h-px bg-amber-400 mt-6 mb-6" />
          <Markdown content={intro.content} />
        </div>
      ) : (
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[1.05]">Contact us</h1>
          <div className="h-px bg-amber-400 mt-6 mb-6" />
          <p className="text-slate-500 font-medium leading-relaxed">{FALLBACK_INTRO}</p>
        </div>
      )}

      {sent ? (
        <Card className="p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Message sent!</h2>
          <p className="text-sm text-slate-500 font-medium mt-3 max-w-md mx-auto">We aim to reply within 1-2 business days.</p>
          <div className="mt-8">
            <LinkButton to="/" variant="dark">
              Back home
            </LinkButton>
          </div>
        </Card>
      ) : (
        <Card className="p-6 md:p-10">
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {error && <Alert type="error">{error}</Alert>}
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="First name *">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" autoComplete="given-name" required />
              </Field>
              <Field label="Last name">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" autoComplete="family-name" />
              </Field>
            </div>
            <Field label="Email *">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </Field>
            <Field label="Message *">
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" rows={6} required />
            </Field>
            {/* Honeypot field - hidden from real visitors, catches naive bots */}
            <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <Button type="submit" variant="dark" size="lg" loading={submitting} className="w-full sm:w-auto">
              <Send size={15} /> Send message
            </Button>
          </form>
        </Card>
      )}

      {settings?.contactEmail && (
        <p className="mt-8 text-sm font-medium text-slate-500 flex items-center gap-2">
          <Mail size={15} className="text-amber-500 shrink-0" />
          Prefer email? Reach us at{" "}
          <a href={`mailto:${settings.contactEmail}`} className="font-black text-amber-600 hover:underline">
            {settings.contactEmail}
          </a>
        </p>
      )}
    </div>
  );
}
