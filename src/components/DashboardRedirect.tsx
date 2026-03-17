import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user.types';

export const DashboardRedirect = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !role) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  switch (role) {
    case UserRole.PRINCIPAL:
      return <Navigate to="/dashboard/principal" replace />;
    case UserRole.HOD:
      return <Navigate to="/dashboard/hod" replace />;
    case UserRole.ADMIN_STAFF:
      return <Navigate to="/dashboard/admin" replace />;
    case UserRole.GENERAL_STAFF:
      return <Navigate to="/dashboard/staff" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};
