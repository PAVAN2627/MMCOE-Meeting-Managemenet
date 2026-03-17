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
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { Meeting, MeetingInput, MeetingStatus, AgendaItem } from '@/types/meeting.types';
import { UserRole } from '@/types/user.types';

class MeetingService {
  private meetingsCollection = collection(db, 'meetings');

  async createMeeting(meetingInput: MeetingInput, creatorId: string, creatorRole: UserRole): Promise<string> {
    try {
      // Validate PRC meeting creation
      if (meetingInput.meetingType === 'prc' && creatorRole !== UserRole.PRINCIPAL) {
        throw new Error('Only Principal can create PRC meetings');
      }

      const now = Timestamp.now();
      const meetingData: Omit<Meeting, 'id'> = {
        title: meetingInput.title,
        meetingType: meetingInput.meetingType,
        date: Timestamp.fromDate(meetingInput.date),
        time: meetingInput.time,
        duration: meetingInput.duration,
        creatorId,
        department: meetingInput.department,
        participants: meetingInput.participants,
        agendaItems: meetingInput.agendaItems,
        status: MeetingStatus.SCHEDULED,
        attachments: [],
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(this.meetingsCollection, meetingData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  async getMeeting(meetingId: string): Promise<Meeting | null> {
    try {
      const meetingDoc = await getDoc(doc(db, 'meetings', meetingId));
      if (meetingDoc.exists()) {
        return { id: meetingDoc.id, ...meetingDoc.data() } as Meeting;
      }
      return null;
    } catch (error) {
      console.error('Error fetching meeting:', error);
      return null;
    }
  }

  async updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<void> {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw error;
    }
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'meetings', meetingId));
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  }

  async getMeetingsForUser(userId: string, role: UserRole, department?: string): Promise<Meeting[]> {
    try {
      let q;
      
      if (role === UserRole.PRINCIPAL) {
        // Principal sees all meetings
        q = query(this.meetingsCollection, orderBy('date', 'desc'));
      } else if (role === UserRole.HOD && department) {
        // HOD sees department meetings and PRC meetings
        q = query(
          this.meetingsCollection,
          where('department', '==', department),
          orderBy('date', 'desc')
        );
      } else {
        // Others see only meetings they're invited to
        q = query(
          this.meetingsCollection,
          where('participants', 'array-contains', userId),
          orderBy('date', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting));
    } catch (error) {
      console.error('Error fetching meetings for user:', error);
      return [];
    }
  }

  async addAgendaItem(meetingId: string, item: AgendaItem, userRole: UserRole): Promise<void> {
    try {
      const meeting = await this.getMeeting(meetingId);
      
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // HODs can add agenda items to PRC meetings
      if (meeting.meetingType === 'prc' && userRole !== UserRole.HOD && userRole !== UserRole.PRINCIPAL) {
        throw new Error('Only HOD and Principal can add agenda items to PRC meetings');
      }

      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        agendaItems: arrayUnion(item),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error adding agenda item:', error);
      throw error;
    }
  }

  async removeAgendaItem(meetingId: string, itemId: string): Promise<void> {
    try {
      const meeting = await this.getMeeting(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const updatedAgendaItems = meeting.agendaItems.filter(item => item.id !== itemId);
      await this.updateMeeting(meetingId, { agendaItems: updatedAgendaItems });
    } catch (error) {
      console.error('Error removing agenda item:', error);
      throw error;
    }
  }

  async uploadAudio(meetingId: string, audioUrl: string): Promise<void> {
    try {
      await this.updateMeeting(meetingId, { audioUrl });
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw error;
    }
  }

  async searchMeetings(searchQuery: {
    startDate?: Date;
    endDate?: Date;
    title?: string;
    department?: string;
    participantId?: string;
  }): Promise<Meeting[]> {
    try {
      let q = query(this.meetingsCollection);

      if (searchQuery.department) {
        q = query(q, where('department', '==', searchQuery.department));
      }

      if (searchQuery.participantId) {
        q = query(q, where('participants', 'array-contains', searchQuery.participantId));
      }

      q = query(q, orderBy('date', 'desc'));

      const querySnapshot = await getDocs(q);
      let meetings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting));

      // Client-side filtering for date range and title
      if (searchQuery.startDate) {
        meetings = meetings.filter(m => m.date.toDate() >= searchQuery.startDate!);
      }

      if (searchQuery.endDate) {
        meetings = meetings.filter(m => m.date.toDate() <= searchQuery.endDate!);
      }

      if (searchQuery.title) {
        meetings = meetings.filter(m => 
          m.title.toLowerCase().includes(searchQuery.title!.toLowerCase())
        );
      }

      return meetings;
    } catch (error) {
      console.error('Error searching meetings:', error);
      return [];
    }
  }
}

export const meetingService = new MeetingService();
