import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-primary/95 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-accent" />
            <span className="font-display font-bold text-primary-foreground text-lg">MeetSync</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
              Features
            </a>
            <a href="#dashboards" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
              Dashboards
            </a>
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                Sign In
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-primary-foreground p-1"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-primary/95 backdrop-blur-md border-t border-primary-foreground/10 py-4 space-y-3 px-2">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm text-primary-foreground/80 hover:text-primary-foreground py-2 px-3 rounded-lg hover:bg-primary-foreground/10 transition-colors">
              Features
            </a>
            <a href="#dashboards" onClick={() => setMenuOpen(false)} className="block text-sm text-primary-foreground/80 hover:text-primary-foreground py-2 px-3 rounded-lg hover:bg-primary-foreground/10 transition-colors">
              Dashboards
            </a>
            <div className="flex gap-2 pt-2">
              <Link to="/login" className="flex-1">
                <Button size="sm" variant="ghost" className="w-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  Sign In
                </Button>
              </Link>
              <Link to="/login" className="flex-1">
                <Button size="sm" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
