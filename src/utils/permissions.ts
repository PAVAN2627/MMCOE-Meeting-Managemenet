import { UserRole, Permission } from '@/types/user.types';

const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.PRINCIPAL]: [
    // Meeting permissions
    Permission.CREATE_MEETING,
    Permission.CREATE_PRC_MEETING,
    Permission.VIEW_ALL_MEETINGS,
    Permission.DELETE_MEETING,
    Permission.OVERRIDE_AGENDA,
    Permission.APPROVE_SUMMARY,
    Permission.UPLOAD_MANUAL_MOM,
    
    // Task permissions
    Permission.ASSIGN_TASK_ANY,
    Permission.VIEW_ALL_TASKS,
    
    // User management
    Permission.MANAGE_ALL_USERS,
    
    // Document permissions
    Permission.UPLOAD_AUDIO,
    Permission.DELETE_DOCUMENT,
    
    // Report permissions
    Permission.GENERATE_REPORTS,
  ],
  
  [UserRole.HOD]: [
    // Meeting permissions
    Permission.CREATE_MEETING,
    Permission.VIEW_DEPARTMENT_MEETINGS,
    Permission.ADD_AGENDA_TO_PRC,
    Permission.APPROVE_SUMMARY,
    
    // Task permissions
    Permission.ASSIGN_TASK_DEPARTMENT,
    Permission.VIEW_DEPARTMENT_TASKS,
    
    // User management
    Permission.MANAGE_DEPARTMENT_USERS,
    
    // Document permissions
    Permission.UPLOAD_AUDIO,
    Permission.DELETE_DOCUMENT,
  ],
  
  [UserRole.ADMIN_STAFF]: [
    // Meeting permissions
    Permission.VIEW_DEPARTMENT_MEETINGS,
    
    // Document permissions
    Permission.UPLOAD_AUDIO,
  ],
  
  [UserRole.GENERAL_STAFF]: [
    // Basic viewing permissions only
  ],
};

export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  const permissions = rolePermissions[role];
  return permissions.includes(permission);
};

export const getRolePermissions = (role: UserRole): Permission[] => {
  return rolePermissions[role] || [];
};

export const canAccessDashboard = (role: UserRole): string => {
  switch (role) {
    case UserRole.PRINCIPAL:
      return '/dashboard/principal';
    case UserRole.HOD:
      return '/dashboard/hod';
    case UserRole.ADMIN_STAFF:
      return '/dashboard/admin';
    case UserRole.GENERAL_STAFF:
      return '/dashboard/staff';
    default:
      return '/login';
  }
};
