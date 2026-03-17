import { Timestamp } from 'firebase/firestore';

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface Task {
  id: string;
  meetingId: string;
  title?: string;
  description: string;
  assigneeId?: string;
  assignedTo?: string;
  assignerId?: string;
  assignedBy?: string;
  status: TaskStatus | 'pending' | 'suggested';
  deadline?: Timestamp;
  dueDate?: Timestamp;
  department?: string;
  priority: TaskPriority | 'low' | 'medium' | 'high';
  notes?: string;
  suggestedAssignee?: string;
  suggestedAssigneeName?: string;
  suggestedDueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

export interface TaskStats {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export enum NotificationType {
  MEETING_INVITE = 'meeting_invite',
  TASK_ASSIGNED = 'task_assigned',
  SUMMARY_APPROVED = 'summary_approved',
  TASK_REMINDER = 'task_reminder'
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId: string;
  read: boolean;
  emailSent: boolean;
  createdAt: Timestamp;
}
