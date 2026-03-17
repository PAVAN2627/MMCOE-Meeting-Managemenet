import { Timestamp } from 'firebase/firestore';

export enum MeetingType {
  DEPARTMENT = 'department',
  PRC = 'prc',
  GENERAL = 'general'
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface AgendaItem {
  id: string;
  title: string;
  description: string;
  addedBy: string;
  order: number;
}

export interface DocumentReference {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

export interface Meeting {
  id: string;
  title: string;
  meetingType?: MeetingType;
  date?: Timestamp;
  scheduledAt?: Timestamp;
  time?: string;
  duration: number;
  creatorId?: string;
  createdBy?: string;
  createdByName?: string;
  department?: string;
  venue?: string;
  participants: string[];
  agendaItems?: AgendaItem[];
  status: MeetingStatus | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'processing';
  audioUrl?: string;
  audioRecorded?: boolean;
  transcript?: string;
  detectedLanguage?: string;
  summary?: string;
  momUrl?: string;
  attachments?: DocumentReference[];
  documents?: any[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MeetingInput {
  title: string;
  date: Date;
  time: string;
  duration: number;
  participants: string[];
  agendaItems: AgendaItem[];
  attachments?: File[];
  meetingType: MeetingType;
  department?: string;
}
