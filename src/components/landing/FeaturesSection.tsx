import { motion } from "framer-motion";
import { Calendar, Mic, FileText, CheckSquare, Users, BarChart3 } from "lucide-react";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations";

const features = [
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "AI-powered meeting scheduling across departments with conflict detection.",
  },
  {
    icon: Mic,
    title: "Audio Recording & Transcription",
    description: "Record meetings and convert discussions to text with multi-language support.",
  },
  {
    icon: FileText,
    title: "Auto-Generated MoM",
    description: "College-format Minutes of Meeting generated instantly in DOCX format.",
  },
  {
    icon: CheckSquare,
    title: "Task Management",
    description: "AI-suggested tasks from meetings, confirmed by the creator and tracked institution-wide.",
  },
  {
    icon: Users,
    title: "Role-Based Dashboards",
    description: "Principal, HOD, Admin Staff, and Staff dashboards with tailored access control.",
  },
  {
    icon: BarChart3,
    title: "Institutional Reports",
    description: "Comprehensive analytics on meetings, decisions, and task completion across the institute.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-background" id="features">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-foreground text-background font-medium text-sm mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Everything Your Institute Needs
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From scheduling to task execution — a complete decision-to-action management system.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              className="group bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border hover:border-accent/30"
              variants={scaleIn}
            >
              <div className="w-12 h-12 rounded-lg bg-foreground flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-background" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
