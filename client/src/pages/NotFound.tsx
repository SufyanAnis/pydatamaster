import { Home, Layers, Mail, Search } from "lucide-react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { Button, LinkButton } from "../components/ui";

export default function NotFound() {
  usePageTitle("Page not found");
  const { setSearchOpen } = useSite();

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16 animate-fade-in">
      <div className="text-center max-w-xl">
        <span className="eyebrow mb-4 block">Error 404</span>
        <div className="text-[7rem] md:text-[10rem] font-black tracking-tighter leading-none bg-gradient-to-br from-blue-600 to-indigo-700 bg-clip-text text-transparent select-none mb-2" aria-hidden="true">
          404
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">This page wandered off the DataFrame</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">The page you are looking for does not exist, was moved, or is still being written. Try one of the links below or search the site.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton to="/" variant="primary">
            <Home size={16} /> Home
          </LinkButton>
          <LinkButton to="/courses" variant="secondary">
            <Layers size={16} /> Courses
          </LinkButton>
          <LinkButton to="/contact" variant="secondary">
            <Mail size={16} /> Contact
          </LinkButton>
          <Button variant="dark" onClick={() => setSearchOpen(true)}>
            <Search size={16} /> Search
          </Button>
        </div>
      </div>
    </div>
  );
}
