import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { Shield, Eye, Clipboard, UserCheck } from "lucide-react";

const dashboards = [
  {
    icon: Shield,
    role: "Principal",
    description: "Creates meetings with HODs & Office Staff. Institution-wide oversight, user management, and reports.",
    tag: "Super Admin",
  },
  {
    icon: Eye,
    role: "HOD",
    description: "Creates meetings with their department staff only. Add & manage staff, assign tasks within department.",
    tag: "Department Head",
  },
  {
    icon: Clipboard,
    role: "Office Staff",
    description: "Cannot create meetings. Attends meetings invited by Principal, uploads records, updates tasks.",
    tag: "Administrative",
  },
  {
    icon: UserCheck,
    role: "Department Staff",
    description: "Cannot create meetings. Attends department meetings scheduled by HOD, views MoM, updates tasks.",
    tag: "Added by HOD",
  },
];

const DashboardPreview = () => {
  return (
    <section className="py-24 bg-muted/50" id="dashboards">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-teal-light text-accent font-medium text-sm mb-4">
            Dashboards
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            4 Dashboards, Every Role Covered
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Smart role-based access ensures everyone sees exactly what they need.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {dashboards.map((d) => (
            <motion.div
              key={d.role}
              className="bg-card rounded-xl p-6 shadow-card border border-border hover:border-accent/30 transition-all duration-300"
              variants={fadeInUp}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg hero-gradient flex items-center justify-center shrink-0">
                  <d.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-foreground text-lg">{d.role}</h3>
                    <span className="text-xs px-2 py-0.5 bg-teal-light text-accent rounded-full font-medium">
                      {d.tag}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{d.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardPreview;
