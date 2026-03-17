import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { Task, TaskStatus, TaskStats, TaskPriority } from '@/types/task.types';
import { UserRole } from '@/types/user.types';

interface TaskInput {
  meetingId: string;
  description: string;
  assigneeId: string;
  assignerId: string;
  deadline?: Date;
  department?: string;
  priority: TaskPriority;
}

class TaskService {
  private tasksCollection = collection(db, 'tasks');

  async createTask(taskInput: TaskInput): Promise<string> {
    try {
      const now = Timestamp.now();
      const taskData: Omit<Task, 'id'> = {
        ...taskInput,
        deadline: taskInput.deadline ? Timestamp.fromDate(taskInput.deadline) : undefined,
        status: TaskStatus.NOT_STARTED,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(this.tasksCollection, taskData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const updates: any = {
        status,
        updatedAt: Timestamp.now(),
      };

      if (status === TaskStatus.COMPLETED) {
        updates.completedAt = Timestamp.now();
      }

      await updateDoc(taskRef, updates);
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  async getTask(taskId: string): Promise<Task | null> {
    try {
      const taskDoc = await getDoc(doc(db, 'tasks', taskId));
      if (taskDoc.exists()) {
        return { id: taskDoc.id, ...taskDoc.data() } as Task;
      }
      return null;
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  }

  async getTasksForUser(userId: string): Promise<Task[]> {
    try {
      const q = query(
        this.tasksCollection,
        where('assigneeId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    } catch (error) {
      console.error('Error fetching tasks for user:', error);
      return [];
    }
  }

  async getTasksByDepartment(department: string): Promise<Task[]> {
    try {
      const q = query(
        this.tasksCollection,
        where('department', '==', department),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    } catch (error) {
      console.error('Error fetching tasks by department:', error);
      return [];
    }
  }

  async getAllTasks(): Promise<Task[]> {
    try {
      const q = query(this.tasksCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      return [];
    }
  }

  async getTaskStatistics(scope: 'user' | 'department' | 'institution', id?: string): Promise<TaskStats> {
    try {
      let tasks: Task[] = [];

      if (scope === 'user' && id) {
        tasks = await this.getTasksForUser(id);
      } else if (scope === 'department' && id) {
        tasks = await this.getTasksByDepartment(id);
      } else if (scope === 'institution') {
        tasks = await this.getAllTasks();
      }

      const now = new Date();
      const stats: TaskStats = {
        total: tasks.length,
        notStarted: tasks.filter(t => t.status === TaskStatus.NOT_STARTED).length,
        inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
        completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
        overdue: tasks.filter(t => 
          t.deadline && 
          t.deadline.toDate() < now && 
          t.status !== TaskStatus.COMPLETED
        ).length,
      };

      return stats;
    } catch (error) {
      console.error('Error calculating task statistics:', error);
      return {
        total: 0,
        notStarted: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
      };
    }
  }

  canAssignTask(assignerRole: UserRole, assigneeDepartment?: string, assignerDepartment?: string): boolean {
    if (assignerRole === UserRole.PRINCIPAL) {
      return true;
    }
    if (assignerRole === UserRole.HOD && assigneeDepartment === assignerDepartment) {
      return true;
    }
    return false;
  }

  async getTasksByMeeting(meetingId: string): Promise<Task[]> {
    try {
      const q = query(
        this.tasksCollection,
        where('meetingId', '==', meetingId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    } catch (error) {
      console.error('Error fetching tasks by meeting:', error);
      return [];
    }
  }
}

export const taskService = new TaskService();
export type { TaskInput };
