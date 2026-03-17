import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { User, UserRole } from '@/types/user.types';

class UserService {
  private usersCollection = collection(db, 'users');

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(this.usersCollection, {
        ...userData,
        createdAt: now,
        updatedAt: now,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      // Note: Firebase client SDK cannot delete users from Authentication
      // Only Firebase Admin SDK (backend) can do that
      // For now, we mark the user as deleted and inactive
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isActive: false,
        isDeleted: true,
        deletedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      // Optionally, you can completely remove from Firestore
      // await deleteDoc(doc(db, 'users', userId));
      
      console.warn('User marked as deleted in Firestore. To delete from Authentication, use Firebase Admin SDK or Firebase Console.');
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async getUsersByDepartment(department: string): Promise<User[]> {
    try {
      const q = query(this.usersCollection, where('department', '==', department));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (error) {
      console.error('Error fetching users by department:', error);
      return [];
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const querySnapshot = await getDocs(this.usersCollection);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      const q = query(this.usersCollection, where('role', '==', role));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }

  canManageUser(managerRole: UserRole, targetUserDepartment?: string, managerDepartment?: string): boolean {
    if (managerRole === UserRole.PRINCIPAL) {
      return true;
    }
    if (managerRole === UserRole.HOD && targetUserDepartment === managerDepartment) {
      return true;
    }
    return false;
  }
}

export const userService = new UserService();
