// Firebase Firestore types for your application

export type AppRole = "principal" | "hod" | "admin_staff" | "dept_staff";

export interface UserRole {
  role: AppRole;
  userId: string;
  createdAt: Date;
  createdBy?: string;
}

export interface Department {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Profile {
  id: string;
  fullName: string;
  departmentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
