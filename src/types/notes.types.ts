import { Timestamp } from 'firebase/firestore';

export interface PersonalNote {
  id: string;
  meetingId: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
