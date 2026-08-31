import { Home, Search } from "lucide-react";
import { usePageTitle, useSite } from "../context/SiteContext";
import { Button, LinkButton } from "../components/ui";

export default function NotFound() {
  usePageTitle("Page not found");
  const { setSearchOpen } = useSite();

  return (
    <div className="py-16 md:py-24 text-center max-w-xl mx-auto animate-fade-in">
      <p className="text-8xl md:text-9xl font-black text-amber-400 tracking-tighter leading-none select-none">404</p>
      <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter mt-6">Page not found</h1>
      <p className="text-slate-500 font-medium leading-relaxed mt-4">The page you are looking for does not exist, was moved, or the link is out of date.</p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
        <LinkButton to="/" variant="dark">
          <Home size={15} /> Home
        </LinkButton>
        <Button variant="secondary" onClick={() => setSearchOpen(true)}>
          <Search size={15} /> Search the site
        </Button>
      </div>
    </div>
  );
}
