import { Link } from "react-router-dom";
import { ArrowRight, Clock, Handshake, Heart, Info, LifeBuoy, Lightbulb, Lock, Mail, MessageSquare, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { cn } from "../lib/utils";
import { LinkButton, PageHero } from "../components/ui";
import { GlowPanel } from "../components/public";

function Section({ icon: IconCmp, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="card p-6 md:p-8">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <IconCmp size={20} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{title}</h2>
      </div>
      <div className="space-y-4 text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{children}</div>
    </section>
  );
}

function InfoTile({ icon: IconCmp, title, children, tone = "slate" }: { icon: LucideIcon; title: string; children: ReactNode; tone?: "slate" | "emerald" | "amber" }) {
  const tones = {
    slate: "bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40 text-amber-600 dark:text-amber-400",
  };
  return (
    <div className={cn("rounded-2xl border p-5", tones[tone])}>
      <div className="flex items-center gap-2 mb-2">
        <IconCmp size={16} />
        <h3 className="text-[10px] font-black uppercase tracking-widest">{title}</h3>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{children}</p>
    </div>
  );
}

export default function Contact() {
  usePageTitle("Contact");
  const { settings } = useSite();
  const email = settings?.contactEmail;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-10">
      <PageHero eyebrow="Get in touch" title="Contact Us" subtitle="PyDataMaster.io believes in respectful, thoughtful, and transparent communication. We value every message we receive and make a sincere effort to listen, understand, and respond in a helpful manner." />

      <GlowPanel tone="blue" className="p-7 md:p-10 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/10 flex items-center justify-center shrink-0">
              <MessageSquare size={22} />
            </div>
            <p className="text-lg font-bold leading-snug">Whether you are a learner, reader, or potential collaborator, your communication is always welcome.</p>
          </div>
          <Link to="/contact/form" className="btn bg-white text-blue-700 px-6 py-3 hover:bg-amber-400 hover:text-slate-900 shrink-0">
            Send an inquiry <ArrowRight size={16} />
          </Link>
        </div>
      </GlowPanel>

      <div className="space-y-6">
        <Section icon={Mail} title="How to Get in Touch">
          <p>You can contact us easily by using the contact form available on this page. By sharing your name, email address, and message, you allow us to understand your request and respond appropriately.</p>
          <p>Our team carefully reviews all submissions and replies as soon as possible.</p>
          {email && (
            <p className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prefer email?</span>
              <a href={`mailto:${email}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-sm font-bold text-blue-600 dark:text-blue-400 hover:border-blue-400 transition-colors">
                <Mail size={14} /> {email}
              </a>
            </p>
          )}
        </Section>

        <Section icon={Lightbulb} title="Reasons to Contact Us">
          <p>Have a question about a tutorial, a suggestion for a topic you would like us to cover, or have you spotted an inaccuracy in one of our articles? We would love to hear from you - reader input directly shapes what we write next.</p>
          <p>We also welcome messages about collaboration and partnership opportunities, guest contributions, and general feedback on how we can make the platform more useful for the community.</p>
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <InfoTile icon={Heart} title="Feedback" tone="emerald">
              Maintaining accuracy and quality is very important to us. If you believe any information on the website can be improved, let us know.
            </InfoTile>
            <InfoTile icon={LifeBuoy} title="Support" tone="amber">
              If you experience any technical issues while using the website, such as loading problems or unexpected behavior, please let us know.
            </InfoTile>
          </div>
        </Section>

        <Section icon={Handshake} title="Partnerships & Data Protection">
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoTile icon={Lock} title="Privacy Matters">
              Information shared through the contact form is used only for communication purposes and is handled responsibly.
            </InfoTile>
            <InfoTile icon={Handshake} title="Partnerships">
              We are open to meaningful partnerships and collaborations that align with our educational mission and ethical standards.
            </InfoTile>
          </div>
        </Section>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-blue-600 text-white p-7 md:p-8 shadow-xl shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 blur-3xl rounded-full" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <Clock size={20} className="text-blue-200" />
                <h3 className="text-xl font-black tracking-tight">Response Time</h3>
              </div>
              <p className="text-blue-100 font-medium leading-relaxed">We aim to respond to most inquiries within one to two business days. Please be patient during weekends or holidays.</p>
            </div>
          </div>
          <div className="card p-7 md:p-8">
            <div className="flex items-center gap-3 mb-3">
              <Info size={20} className="text-slate-400" />
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Disclaimer</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">All content and communication on this website are intended for educational purposes only. We do not provide professional advisory services.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 pt-4">
          <LinkButton to="/contact/form" variant="primary" size="lg">
            Send an inquiry <ArrowRight size={16} />
          </LinkButton>
          <LinkButton to="/privacy" variant="secondary" size="lg">
            Privacy Policy
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
