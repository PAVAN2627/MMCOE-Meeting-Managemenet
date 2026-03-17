import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  LayoutDashboard,
  Calendar,
  FileText,
  CheckSquare,
  Users,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  role: string;
  navItems: NavItem[];
}

const DashboardLayout = ({ children, role, navItems }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar shrink-0 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-sidebar-primary" />
            <span className="font-display font-bold text-sidebar-foreground text-lg">MeetSync</span>
          </Link>
          <p className="text-xs text-sidebar-foreground/50 mt-1">{role}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;

export const principalNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard/principal" },
  { label: "Meetings", icon: Calendar, href: "/dashboard/principal/meetings" },
  { label: "Tasks", icon: CheckSquare, href: "/dashboard/principal/tasks" },
  { label: "Reports", icon: BarChart3, href: "/dashboard/principal/reports" },
  { label: "Users", icon: Users, href: "/dashboard/principal/users" },
  { label: "MoM Documents", icon: FileText, href: "/dashboard/principal/mom" },
  { label: "Settings", icon: Settings, href: "/dashboard/principal/settings" },
];

export const hodNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard/hod" },
  { label: "Meetings", icon: Calendar, href: "/dashboard/hod/meetings" },
  { label: "Tasks", icon: CheckSquare, href: "/dashboard/hod/tasks" },
  { label: "MoM Documents", icon: FileText, href: "/dashboard/hod/mom" },
  { label: "Department Users", icon: Users, href: "/dashboard/hod/users" },
  { label: "Settings", icon: Settings, href: "/dashboard/hod/settings" },
];

export const adminNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard/admin" },
  { label: "Meetings", icon: Calendar, href: "/dashboard/admin/meetings" },
  { label: "Tasks", icon: CheckSquare, href: "/dashboard/admin/tasks" },
  { label: "Documents", icon: FileText, href: "/dashboard/admin/documents" },
];

export const staffNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard/staff" },
  { label: "My Meetings", icon: Calendar, href: "/dashboard/staff/meetings" },
  { label: "My Tasks", icon: CheckSquare, href: "/dashboard/staff/tasks" },
  { label: "Documents", icon: FileText, href: "/dashboard/staff/documents" },
  { label: "Settings", icon: Settings, href: "/dashboard/staff/settings" },
];
