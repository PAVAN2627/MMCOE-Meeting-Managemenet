import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { fadeInUp } from "@/lib/animations";
import heroImage from "@/assets/hero-illustration.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 opacity-[0.07]">
        <div className="absolute top-20 right-20 w-96 h-96 bg-accent rounded-full blur-[120px]" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-accent rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10 py-20 pt-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-2 mb-6">
              <CalendarCheck className="w-8 h-8 text-accent" />
              <span className="font-display font-bold text-primary-foreground text-xl">MeetSync</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-primary-foreground leading-tight mb-6">
              Smart Meeting
              <br />
              <span className="text-gradient">Management</span>
              <br />
              for Institutes
            </h1>
            <p className="text-primary-foreground/80 text-lg md:text-xl mb-8 max-w-lg leading-relaxed">
              AI-powered platform to schedule, record, transcribe, and manage institutional meetings — from discussion to decision to action.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/login">
                <Button size="lg" variant="secondary" className="font-semibold gap-2">
                  Sign In <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="ghost" className="font-semibold text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  Learn More
                </Button>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block"
          >
            <img
              src={heroImage}
              alt="Meeting management dashboard illustration"
              className="w-full rounded-2xl shadow-2xl animate-float"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
