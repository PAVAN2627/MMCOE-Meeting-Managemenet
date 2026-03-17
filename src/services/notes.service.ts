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
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { PersonalNote } from '@/types/notes.types';

class NotesService {
  private notesCollection = collection(db, 'personal_notes');

  async createNote(meetingId: string, userId: string, content: string): Promise<string> {
    try {
      const now = Timestamp.now();
      const noteData: Omit<PersonalNote, 'id'> = {
        meetingId,
        userId,
        content,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(this.notesCollection, noteData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  async updateNote(noteId: string, content: string): Promise<void> {
    try {
      const noteRef = doc(db, 'personal_notes', noteId);
      await updateDoc(noteRef, {
        content,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'personal_notes', noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  async getNoteForMeeting(meetingId: string, userId: string): Promise<PersonalNote | null> {
    try {
      const q = query(
        this.notesCollection,
        where('meetingId', '==', meetingId),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as PersonalNote;
    } catch (error) {
      console.error('Error fetching note for meeting:', error);
      return null;
    }
  }

  async getNotesForUser(userId: string): Promise<PersonalNote[]> {
    try {
      const q = query(
        this.notesCollection,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonalNote));
    } catch (error) {
      console.error('Error fetching notes for user:', error);
      return [];
    }
  }

  // Ensure privacy: only the note creator can access their notes
  async canAccessNote(noteId: string, userId: string): Promise<boolean> {
    try {
      const noteDoc = await getDoc(doc(db, 'personal_notes', noteId));
      if (!noteDoc.exists()) {
        return false;
      }
      const note = noteDoc.data() as PersonalNote;
      return note.userId === userId;
    } catch (error) {
      console.error('Error checking note access:', error);
      return false;
    }
  }
}

export const notesService = new NotesService();
