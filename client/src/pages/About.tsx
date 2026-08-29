import { Link } from "react-router-dom";
import { ArrowRight, Award, Brain, CheckCircle2, Clock, Eye, FileText, Github, GraduationCap, Layers, LineChart, Linkedin, Mail, Package, RefreshCw, ShieldCheck, Target, Twitter, Youtube } from "lucide-react";
import type { ReactNode } from "react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { cn, colorClasses } from "../lib/utils";
import { PageHero } from "../components/ui";
import { GlowPanel } from "../components/public";

const OFFERS = [
  { icon: <FileText size={22} />, color: "blue", text: "In-depth educational articles and tutorials" },
  { icon: <Package size={22} />, color: "indigo", text: "Insights into Python-based frameworks, libraries, and tools" },
  { icon: <LineChart size={22} />, color: "emerald", text: "Practical explanations of data science, analytics, and engineering concepts" },
  { icon: <GraduationCap size={22} />, color: "amber", text: "Content designed to support continuous learning, skill growth, and professional development" },
];

const VALUES = [
  { icon: <Eye size={22} />, color: "blue", title: "Transparency", text: "We communicate openly and honestly about what we share" },
  { icon: <ShieldCheck size={22} />, color: "emerald", title: "Ethical Knowledge Sharing", text: "We prioritize integrity and responsible content creation" },
  { icon: <Award size={22} />, color: "amber", title: "Quality Over Quantity", text: "Every article is thoughtfully developed to deliver lasting value" },
  { icon: <RefreshCw size={22} />, color: "indigo", title: "Continuous Learning", text: "We grow alongside our community, always staying curious and current" },
];

const MISSION_POINTS = [
  "Share expert-level insights through well-researched, informative articles and tutorials",
  "Educate our audience on emerging technologies and trends powered by Python",
  "Help individuals and teams apply modern tools and techniques to solve real-world challenges",
];

interface SocialLink {
  href: string;
  icon: ReactNode;
  label: string;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function About() {
  usePageTitle("About");
  const { settings, modules, siteName } = useSite();
  const lessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  const questions = modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + l.quiz.length, 0), 0);
  const minutes = modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + (l.durationMin || 0), 0), 0);

  const socials: SocialLink[] = [];
  if (settings?.social.linkedin) socials.push({ href: settings.social.linkedin, icon: <Linkedin size={18} />, label: "LinkedIn" });
  if (settings?.social.github) socials.push({ href: settings.social.github, icon: <Github size={18} />, label: "GitHub" });
  if (settings?.social.twitter) socials.push({ href: settings.social.twitter, icon: <Twitter size={18} />, label: "Twitter" });
  if (settings?.social.youtube) socials.push({ href: settings.social.youtube, icon: <Youtube size={18} />, label: "YouTube" });

  const numbers = [
    { icon: <Layers size={20} />, color: "blue", value: modules.length, label: "Modules" },
    { icon: <FileText size={20} />, color: "indigo", value: lessons, label: "Lessons" },
    { icon: <Brain size={20} />, color: "emerald", value: questions, label: "Quiz questions" },
    { icon: <Clock size={20} />, color: "amber", value: formatMinutes(minutes), label: "Of guided content" },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-10 space-y-16">
      <PageHero
        eyebrow="Who we are"
        title={
          <>
            About <span className="text-blue-600 dark:text-blue-400">{siteName}</span>
          </>
        }
        subtitle="PyDataMaster is an educational platform dedicated to sharing expert knowledge, practical insights, and up-to-date resources on Python-driven technologies and the modern data ecosystem. Founded on the belief that technology should be accessible, clear, and actionable, we strive to bridge the gap between theoretical learning and real-world application."
        className="max-w-4xl"
      />

      {/* By the numbers */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {numbers.map((n) => {
            const c = colorClasses(n.color);
            return (
              <div key={n.label} className="card p-6 flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", c.bg, c.text)}>{n.icon}</div>
                <div className="min-w-0">
                  <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{n.value}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 truncate">{n.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mission */}
      <section className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-2">
          <span className="eyebrow mb-3 block">Our Mission</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight mb-5">Turning knowledge into value</h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-5">Our mission is to empower learners, developers, and data enthusiasts with high-quality, structured educational content. We aim to:</p>
          <p className="text-slate-900 dark:text-white font-bold leading-relaxed border-l-4 border-blue-600 pl-4">We believe in making complex topics understandable and practical - turning knowledge into value.</p>
        </div>
        <div className="lg:col-span-3 card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Target size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">What we set out to do</span>
          </div>
          <ul className="space-y-4">
            {MISSION_POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What we offer */}
      <section>
        <div className="text-center mb-10">
          <span className="eyebrow mb-2 block">What We Offer</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Built for tangible takeaways</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {OFFERS.map((o, i) => {
            const c = colorClasses(o.color);
            return (
              <div key={o.text} className="card p-6 hover:shadow-xl transition-all animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-5", c.bg, c.text)}>{o.icon}</div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{o.text}</p>
              </div>
            );
          })}
        </div>
        <p className="text-center text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-3xl mx-auto mt-8">Every piece of content is crafted with accuracy, clarity, and usefulness in mind - ensuring our readers gain tangible takeaways.</p>
      </section>

      {/* Values */}
      <section>
        <div className="text-center mb-10">
          <span className="eyebrow mb-2 block">Our Values</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">What guides every article</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5 mb-6">
          {VALUES.map((v) => {
            const c = colorClasses(v.color);
            return (
              <div key={v.title} className="card p-6 md:p-7 flex items-start gap-5 hover:shadow-xl transition-all">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", c.bg, c.text)}>{v.icon}</div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight mb-1">{v.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{v.text}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-start gap-5">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shrink-0 shadow-lg shadow-blue-500/30">
            <ShieldCheck size={22} />
          </div>
          <p className="text-blue-900 dark:text-blue-100 font-bold leading-relaxed">We are committed to providing reliable, original, and meaningful content - never misleading claims, false promises, or low-effort information.</p>
        </div>
      </section>

      {/* Stay connected */}
      <GlowPanel className="p-8 md:p-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300 block mb-3">Stay Connected</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-3">Learn with us, wherever you are</h2>
            <p className="text-slate-300 font-medium max-w-xl leading-relaxed">Follow along for new modules, tutorials and library updates - or drop us a line directly.</p>
            {socials.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-6">
                {socials.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all">
                    {s.icon} {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto">
            <Link to="/contact" className="btn bg-white text-slate-900 px-8 py-4 hover:bg-amber-400">
              <Mail size={16} /> Contact us
            </Link>
            <Link to="/courses" className="btn bg-blue-500/30 text-white border border-white/20 px-8 py-4 hover:bg-blue-500/50">
              Explore courses <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </GlowPanel>
    </div>
  );
}
