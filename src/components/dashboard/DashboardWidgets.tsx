import { Calendar, CheckSquare, Users, FileText } from "lucide-react";
import { ReactNode } from "react";

interface StatCardProps {
  icon: typeof Calendar;
  label: string;
  value: string;
  subtitle?: string;
}

export const StatCard = ({ icon: Icon, label, value, subtitle }: StatCardProps) => (
  <div className="bg-card rounded-xl p-6 shadow-card border border-border">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="text-3xl font-display font-bold text-foreground mt-1">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="w-10 h-10 rounded-lg bg-teal-light flex items-center justify-center">
        <Icon className="w-5 h-5 text-accent" />
      </div>
    </div>
  </div>
);

export const SectionHeader = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
    {children}
  </div>
);

interface MeetingItemProps {
  title: string;
  time: string;
  department: string;
  status: "upcoming" | "completed" | "in-progress";
}

export const MeetingItem = ({ title, time, department, status }: MeetingItemProps) => {
  const statusColors = {
    upcoming: "bg-teal-light text-accent",
    completed: "bg-secondary text-muted-foreground",
    "in-progress": "bg-accent text-accent-foreground",
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="font-medium text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{department} • {time}</p>
      </div>
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[status]}`}>
        {status === "in-progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
};
