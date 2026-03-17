import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const roleToPath: Record<string, string> = {
  principal: "/dashboard/principal",
  hod: "/dashboard/hod",
  admin_staff: "/dashboard/admin",
  dept_staff: "/dashboard/staff",
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={roleToPath[role] || "/login"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

// Dashboard router - redirects to role-specific dashboard
export const DashboardRouter = () => {
  const { role, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/login" replace />;

  return <Navigate to={roleToPath[role]} replace />;
};
