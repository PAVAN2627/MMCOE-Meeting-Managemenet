import { Timestamp } from 'firebase/firestore';

export enum TranscriptProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  confidence: number;
}

export interface Transcript {
  id: string;
  meetingId: string;
  text: string;
  segments: TranscriptSegment[];
  sourceLanguage: string;
  outputLanguage: 'en';
  processingStatus: TranscriptProcessingStatus;
  confidence: number;
  createdAt: Timestamp;
}

export enum SummaryStatus {
  DRAFT = 'draft',
  APPROVED = 'approved'
}

export interface Summary {
  id: string;
  meetingId: string;
  aiGeneratedText: string;
  approvedText: string;
  keyPoints: string[];
  decisions: string[];
  discussionTopics: string[];
  approvedBy?: string;
  approvedAt?: Timestamp;
  status: SummaryStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskSuggestion {
  description: string;
  suggestedAssignee?: string;
  suggestedDeadline?: Date;
  confidence: number;
}

export interface SpeakerSegment {
  speaker: string;
  startTime: number;
  endTime: number;
  text: string;
}
