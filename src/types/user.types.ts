import { Timestamp } from 'firebase/firestore';

export enum UserRole {
  PRINCIPAL = 'principal',
  HOD = 'hod',
  ADMIN_STAFF = 'admin_staff',
  GENERAL_STAFF = 'general_staff'
}

export enum StaffDesignation {
  ASSISTANT_PROFESSOR = 'Assistant Professor',
  LAB_ASSISTANT = 'Lab Assistant',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  designation?: StaffDesignation;
  department?: string;
  phoneNumber?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

export interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
}

export enum Permission {
  // Meeting permissions
  CREATE_MEETING = 'create_meeting',
  CREATE_PRC_MEETING = 'create_prc_meeting',
  VIEW_ALL_MEETINGS = 'view_all_meetings',
  VIEW_DEPARTMENT_MEETINGS = 'view_department_meetings',
  DELETE_MEETING = 'delete_meeting',
  OVERRIDE_AGENDA = 'override_agenda',
  ADD_AGENDA_TO_PRC = 'add_agenda_to_prc',
  APPROVE_SUMMARY = 'approve_summary',
  UPLOAD_MANUAL_MOM = 'upload_manual_mom',
  
  // Task permissions
  ASSIGN_TASK_ANY = 'assign_task_any',
  ASSIGN_TASK_DEPARTMENT = 'assign_task_department',
  VIEW_ALL_TASKS = 'view_all_tasks',
  VIEW_DEPARTMENT_TASKS = 'view_department_tasks',
  
  // User management permissions
  MANAGE_ALL_USERS = 'manage_all_users',
  MANAGE_DEPARTMENT_USERS = 'manage_department_users',
  
  // Document permissions
  UPLOAD_AUDIO = 'upload_audio',
  DELETE_DOCUMENT = 'delete_document',
  
  // Report permissions
  GENERATE_REPORTS = 'generate_reports',
}
