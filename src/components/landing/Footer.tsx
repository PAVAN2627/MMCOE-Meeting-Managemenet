import { Link } from "react-router-dom";
import { CalendarCheck } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-accent" />
            <span className="font-display font-bold text-primary-foreground text-lg">MeetSync</span>
          </div>
          <nav className="flex gap-6 text-sm text-primary-foreground/70">
            <a href="#features" className="hover:text-primary-foreground transition-colors">Features</a>
            <a href="#dashboards" className="hover:text-primary-foreground transition-colors">Dashboards</a>
            <Link to="/dashboard/principal" className="hover:text-primary-foreground transition-colors">Dashboard</Link>
          </nav>
          <p className="text-primary-foreground/50 text-sm">
            © 2026 MeetSync. Built for Institutes.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
