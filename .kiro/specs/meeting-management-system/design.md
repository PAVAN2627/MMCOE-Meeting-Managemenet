# Design Document: Meeting Management System

## Overview

The Meeting Management System is a comprehensive web application built with React and TypeScript that provides role-based meeting management for educational institutions. The system integrates AI capabilities for speech-to-text conversion, meeting summarization, and task suggestion, while maintaining institutional record-keeping standards.

### Core Capabilities

- Role-based dashboards for four user types (Principal, HOD, Admin Staff, General Staff)
- Meeting lifecycle management from scheduling to Minutes of Meeting generation
- AI-powered audio transcription, summarization, and task extraction
- Task assignment and tracking with email notifications
- Document management for agendas and meeting materials
- Comprehensive reporting and analytics for institutional oversight

### Technology Stack

- **Frontend**: React 18+ with TypeScript, shadcn-ui components, Tailwind CSS
- **Backend Services**: Firebase (Firestore, Storage, Authentication, Functions)
- **AI Integration**: Speech-to-text API, LLM for summarization and task extraction
- **Email**: Google Apps Script for notification delivery
- **Document Generation**: docx library for DOCX file creation

### Design Principles

1. **Role-Based Access Control**: All features are permission-gated based on user roles
2. **AI-Assisted Workflow**: AI suggestions require human approval before taking effect
3. **Data Integrity**: Maintain referential integrity across meetings, tasks, and users
4. **Audit Trail**: Preserve complete meeting records for institutional compliance
5. **Responsive Design**: Support desktop and tablet form factors

## Architecture

### System Architecture

The system follows a client-server architecture with Firebase as the backend platform:

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (React)                     │
├─────────────────────────────────────────────────────────────┤
│  Principal    │    HOD      │   Admin     │    Staff        │
│  Dashboard    │  Dashboard  │  Dashboard  │   Dashboard     │
└────────┬──────┴──────┬──────┴──────┬──────┴──────┬──────────┘
         │             │             │             │
         └─────────────┴─────────────┴─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   Firebase Services       │
         ├───────────────────────────┤
         │  • Authentication         │
         │  • Firestore Database     │
         │  • Storage (Files)        │
         │  • Cloud Functions        │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   External Services       │
         ├───────────────────────────┤
         │  • Speech-to-Text API     │
         │  • LLM API (Summarization)│
         │  • Google Apps Script     │
         └───────────────────────────┘
```

### Component Architecture

```
src/
├── components/
│   ├── dashboards/
│   │   ├── PrincipalDashboard.tsx
│   │   ├── HODDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── StaffDashboard.tsx
│   ├── meetings/
│   │   ├── MeetingScheduler.tsx
│   │   ├── MeetingDetails.tsx
│   │   ├── AudioRecorder.tsx
│   │   ├── TranscriptViewer.tsx
│   │   └── SummaryEditor.tsx
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskCard.tsx
│   │   └── TaskStatusUpdater.tsx
│   ├── documents/
│   │   ├── DocumentUploader.tsx
│   │   ├── DocumentViewer.tsx
│   │   └── MoMGenerator.tsx
│   ├── notes/
│   │   ├── PersonalNoteEditor.tsx
│   │   └── PersonalNotesList.tsx
│   └── shared/
│       ├── RoleGuard.tsx
│       ├── NotificationBell.tsx
│       └── SearchBar.tsx
├── services/
│   ├── auth.service.ts
│   ├── meeting.service.ts
│   ├── task.service.ts
│   ├── ai.service.ts
│   ├── storage.service.ts
│   ├── notification.service.ts
│   ├── notes.service.ts
│   └── report.service.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useMeetings.ts
│   ├── useTasks.ts
│   └── useRealtime.ts
├── types/
│   ├── user.types.ts
│   ├── meeting.types.ts
│   ├── task.types.ts
│   └── document.types.ts
└── utils/
    ├── permissions.ts
    ├── validation.ts
    └── formatting.ts
```

### Data Flow

1. **Meeting Creation Flow**:
   - User creates meeting → Firestore stores meeting → Email notifications sent → Participants receive invites

2. **Audio Processing Flow**:
   - Audio uploaded → Storage stores file → Cloud Function triggers → Speech-to-Text API processes → Transcript stored → Summary generation triggered → Task suggestion triggered → Creator reviews and approves → MoM generated

3. **Task Assignment Flow**:
   - Task created/confirmed → Firestore stores task → Email notification sent → Assignee dashboard updates in real-time → Status updates propagate to dashboards

4. **Real-time Updates**:
   - Firestore listeners on collections → React state updates → UI re-renders with new data

## Components and Interfaces

### Core Components

#### 1. Authentication System

**Component**: `AuthProvider` and `useAuth` hook

**Responsibilities**:
- Firebase Authentication integration
- Role-based session management
- Permission checking utilities

**Interface**:
```typescript
interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
}

enum UserRole {
  PRINCIPAL = 'principal',
  HOD = 'hod',
  ADMIN_STAFF = 'admin_staff',
  GENERAL_STAFF = 'general_staff'
}
```

#### 2. Dashboard Components

**PrincipalDashboard**:
- Institution-wide statistics
- All meetings and tasks visibility
- User management interface
- Report generation tools

**HODDashboard**:
- Department-specific statistics
- Department meetings and PRC participation
- Department task management
- Department user management

**AdminDashboard**:
- Assigned meetings list
- Audio/document upload interface
- Task list for admin user
- Read-only summary viewer

**StaffDashboard**:
- Personal meeting invitations
- Personal task list
- Meeting history
- Profile management

#### 3. Meeting Management Components

**MeetingScheduler**:
```typescript
interface MeetingSchedulerProps {
  onSchedule: (meeting: MeetingInput) => Promise<void>;
  userRole: UserRole;
  department?: string;
}

interface MeetingInput {
  title: string;
  date: Date;
  time: string;
  duration: number;
  participants: string[]; // user IDs
  agendaItems: AgendaItem[];
  attachments?: File[];
  meetingType: 'department' | 'prc' | 'general';
}
```

**AudioRecorder**:
```typescript
interface AudioRecorderProps {
  meetingId: string;
  onRecordingComplete: (audioBlob: Blob) => Promise<void>;
  maxDuration: number; // minutes
}
```

**SummaryEditor**:
```typescript
interface SummaryEditorProps {
  meetingId: string;
  aiGeneratedSummary: string;
  transcript: string;
  onApprove: (editedSummary: string) => Promise<void>;
  canEdit: boolean;
}
```

#### 4. Task Management Components

**TaskList**:
```typescript
interface TaskListProps {
  tasks: Task[];
  onStatusUpdate: (taskId: string, status: TaskStatus) => Promise<void>;
  viewMode: 'assigned' | 'created' | 'department' | 'institution';
}

enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}
```

**TaskCard**:
```typescript
interface TaskCardProps {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  showAssignee: boolean;
}
```

#### 5. Document Management Components

**DocumentUploader**:
```typescript
interface DocumentUploaderProps {
  meetingId: string;
  allowedTypes: string[];
  maxSize: number; // MB
  onUpload: (files: File[]) => Promise<void>;
}
```

**MoMGenerator**:
```typescript
interface MoMGeneratorProps {
  meeting: Meeting;
  summary: string;
  decisions: string[];
  actionItems: Task[];
  onGenerate: () => Promise<Blob>;
}
```

#### 6. Personal Notes Components

**PersonalNoteEditor**:
```typescript
interface PersonalNoteEditorProps {
  meetingId: string;
  userId: string;
  existingNote?: PersonalNote;
  onSave: (content: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}
```

**PersonalNotesList**:
```typescript
interface PersonalNotesListProps {
  userId: string;
  notes: PersonalNote[];
  onNoteClick: (meetingId: string) => void;
}
```

### Service Layer

#### MeetingService

```typescript
class MeetingService {
  async createMeeting(meeting: MeetingInput, creatorId: string): Promise<string>;
  async getMeeting(meetingId: string): Promise<Meeting>;
  async updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<void>;
  async deleteMeeting(meetingId: string): Promise<void>;
  async getMeetingsForUser(userId: string, role: UserRole): Promise<Meeting[]>;
  async searchMeetings(query: SearchQuery): Promise<Meeting[]>;
  async addAgendaItem(meetingId: string, item: AgendaItem): Promise<void>;
  async uploadAudio(meetingId: string, audioFile: File): Promise<string>;
}
```

#### AIService

```typescript
class AIService {
  async transcribeAudio(audioUrl: string, sourceLanguage: string): Promise<Transcript>;
  async generateSummary(transcript: string): Promise<Summary>;
  async suggestTasks(transcript: string, summary: string): Promise<TaskSuggestion[]>;
  async identifySpeakers(transcript: string): Promise<SpeakerSegment[]>;
}

interface Transcript {
  text: string; // Always in English
  segments: TranscriptSegment[];
  sourceLanguage: string; // Original audio language
  outputLanguage: 'en'; // Always English
  confidence: number;
}

interface Summary {
  keyPoints: string[];
  decisions: string[];
  discussionTopics: string[];
  fullSummary: string;
}

interface TaskSuggestion {
  description: string;
  suggestedAssignee?: string;
  suggestedDeadline?: Date;
  confidence: number;
}
```

#### TaskService

```typescript
class TaskService {
  async createTask(task: TaskInput): Promise<string>;
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  async getTasksForUser(userId: string): Promise<Task[]>;
  async getTasksByDepartment(department: string): Promise<Task[]>;
  async getAllTasks(): Promise<Task[]>;
  async getTaskStatistics(scope: 'user' | 'department' | 'institution', id?: string): Promise<TaskStats>;
}

interface TaskStats {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
}
```

#### NotificationService

```typescript
class NotificationService {
  async sendMeetingInvite(meeting: Meeting, participants: User[]): Promise<void>;
  async sendTaskAssignment(task: Task, assignee: User): Promise<void>;
  async sendSummaryApproved(meeting: Meeting, participants: User[]): Promise<void>;
  async sendTaskReminder(task: Task, assignee: User): Promise<void>;
}
```

#### ReportService

```typescript
class ReportService {
  async generateMeetingReport(filters: ReportFilters): Promise<ReportData>;
  async generateTaskReport(filters: ReportFilters): Promise<ReportData>;
  async generateAttendanceReport(filters: ReportFilters): Promise<ReportData>;
  async exportReport(report: ReportData, format: 'pdf' | 'xlsx'): Promise<Blob>;
}

interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  department?: string;
  meetingType?: string;
  userId?: string;
}
```

#### NotesService

```typescript
class NotesService {
  async createNote(meetingId: string, userId: string, content: string): Promise<string>;
  async updateNote(noteId: string, content: string): Promise<void>;
  async deleteNote(noteId: string): Promise<void>;
  async getNoteForMeeting(meetingId: string, userId: string): Promise<PersonalNote | null>;
  async getNotesForUser(userId: string): Promise<PersonalNote[]>;
}
```

## Data Models

### User Model

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string; // Required for HOD, Admin, Staff
  phoneNumber?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

// Firestore Collection: users
// Document ID: Firebase Auth UID
```

### Meeting Model

```typescript
interface Meeting {
  id: string;
  title: string;
  meetingType: 'department' | 'prc' | 'general';
  date: Timestamp;
  time: string;
  duration: number; // minutes
  creatorId: string;
  department?: string;
  participants: string[]; // user IDs
  agendaItems: AgendaItem[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  audioUrl?: string;
  transcript?: Transcript;
  summary?: Summary;
  momUrl?: string; // DOCX file URL
  attachments: DocumentReference[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface AgendaItem {
  id: string;
  title: string;
  description: string;
  addedBy: string; // user ID
  order: number;
}

interface DocumentReference {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

// Firestore Collection: meetings
// Indexes: 
// - creatorId, date (desc)
// - participants (array-contains), date (desc)
// - department, date (desc)
// - meetingType, date (desc)
```

### Task Model

```typescript
interface Task {
  id: string;
  meetingId: string;
  description: string;
  assigneeId: string;
  assignerId: string;
  status: TaskStatus;
  deadline?: Timestamp;
  department?: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

// Firestore Collection: tasks
// Indexes:
// - assigneeId, status, deadline
// - meetingId, createdAt (desc)
// - department, status, deadline
// - status, deadline
```

### Transcript Model

```typescript
interface Transcript {
  id: string;
  meetingId: string;
  text: string; // Always in English
  segments: TranscriptSegment[];
  sourceLanguage: string; // Original audio language (e.g., 'hi', 'es', 'fr')
  outputLanguage: 'en'; // Always English
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  confidence: number;
  createdAt: Timestamp;
}

interface TranscriptSegment {
  startTime: number; // seconds
  endTime: number;
  text: string; // In English
  speaker?: string;
  confidence: number;
}

// Firestore Collection: transcripts
// Document ID: meetingId (1-to-1 relationship)
```

### Summary Model

```typescript
interface Summary {
  id: string;
  meetingId: string;
  aiGeneratedText: string;
  approvedText: string;
  keyPoints: string[];
  decisions: string[];
  discussionTopics: string[];
  approvedBy?: string;
  approvedAt?: Timestamp;
  status: 'draft' | 'approved';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore Collection: summaries
// Document ID: meetingId (1-to-1 relationship)
```

### Notification Model

```typescript
interface Notification {
  id: string;
  userId: string;
  type: 'meeting_invite' | 'task_assigned' | 'summary_approved' | 'task_reminder';
  title: string;
  message: string;
  relatedId: string; // meeting or task ID
  read: boolean;
  emailSent: boolean;
  createdAt: Timestamp;
}

// Firestore Collection: notifications
// Indexes:
// - userId, read, createdAt (desc)
```

### Department Model

```typescript
interface Department {
  id: string;
  name: string;
  hodId?: string;
  createdAt: Timestamp;
  isActive: boolean;
}

// Firestore Collection: departments
```

### Personal Notes Model

```typescript
interface PersonalNote {
  id: string;
  meetingId: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore Collection: personal_notes
// Indexes:
// - userId, meetingId (unique composite)
// - userId, createdAt (desc)
```

### Database Schema Relationships

```
User (1) ──creates──> (N) Meeting
User (1) ──participates──> (N) Meeting
User (N) <──assigned to── (1) Task
User (1) ──writes──> (N) PersonalNote
Meeting (1) ──has──> (1) Transcript
Meeting (1) ──has──> (1) Summary
Meeting (1) ──generates──> (N) Task
Meeting (1) ──has──> (N) DocumentReference
Meeting (1) ──has──> (N) PersonalNote
Department (1) ──has──> (N) User
Department (1) ──has──> (N) Meeting
```

### Firebase Storage Structure

```
/meetings/{meetingId}/
  ├── audio/
  │   └── recording.mp3
  ├── documents/
  │   ├── agenda.pdf
  │   └── supporting-doc.docx
  └── mom/
      └── minutes.docx

/users/{userId}/
  └── profile/
      └── avatar.jpg
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Role-Based Dashboard Assignment

*For any* authenticated user with a valid role (Principal, HOD, Admin Staff, or General Staff), logging in should result in assignment to the dashboard corresponding to their role.

**Validates: Requirements 1.2**

### Property 2: Permission-Based Feature Access

*For any* user and any system feature, access should be granted if and only if the user's role has the required permission for that feature.

**Validates: Requirements 1.3**

### Property 3: Role-Based User Management Scope

*For any* user with management permissions:
- Principal users can manage all users in the institution
- HOD users can manage only users within their department
- Other roles cannot manage users

**Validates: Requirements 1.4, 1.5, 9.7, 10.8**

### Property 4: Meeting Creation Accepts Required Fields

*For any* Principal or HOD user creating a meeting with valid title, date, time, duration, and participant list, the system should successfully create the meeting and return a unique meeting identifier.

**Validates: Requirements 2.1, 2.5**

### Property 5: Meeting Notification Delivery

*For any* meeting created, all invited participants should receive email notifications containing meeting details.

**Validates: Requirements 2.2, 14.1**

### Property 6: PRC Meeting Creation Authorization

*For any* PRC meeting creation attempt, the operation should succeed if and only if the creator has Principal role.

**Validates: Requirements 2.3**

### Property 7: HOD Agenda Contribution to PRC Meetings

*For any* HOD user and any PRC meeting, the HOD should be able to add agenda items to that meeting.

**Validates: Requirements 2.4, 10.4**

### Property 8: Document Attachment During Meeting Creation

*For any* meeting creator and any valid document file, the system should allow attachment of the document to the meeting during creation.

**Validates: Requirements 2.6, 15.1**

### Property 9: Audio Recording Format Compliance

*For any* audio recording captured by the system, the output file should be in MP3 format.

**Validates: Requirements 3.1**

### Property 10: File Storage and Association Integrity

*For any* file (audio, document, or MoM) uploaded to the system, the file should be:
1. Successfully stored in Firebase Storage
2. Associated with the correct meeting record
3. Retrievable using the stored reference

**Validates: Requirements 3.3, 3.4, 4.3, 8.4, 15.2**

### Property 11: Permission-Based File Upload

*For any* user with upload permissions and any valid file, the upload operation should succeed; for users without permissions, it should fail with appropriate error.

**Validates: Requirements 3.5, 11.3**

### Property 12: Audio Transcription Pipeline

*For any* audio file uploaded to a meeting, the transcription process should be triggered and produce a text transcript that is stored with the meeting record.

**Validates: Requirements 4.1, 4.3**

### Property 13: Multi-Language Transcription Support

*For any* audio file in a supported language, the transcription should successfully process the audio and return text in English language only, regardless of the source language.

**Validates: Requirements 4.2, 4.3**

### Property 14: Transcription Error Handling

*For any* transcription failure, the system should log the error and send a notification to the meeting creator.

**Validates: Requirements 4.5**

### Property 15: Summary Generation from Transcript

*For any* completed transcript, the summary generator should produce a summary containing key points, decisions, and discussion topics.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 16: Summary Approval Workflow

*For any* AI-generated summary, it should be presented to the meeting creator in a pending approval state, and if the creator is Principal or HOD, they should be able to edit it before approval.

**Validates: Requirements 5.4, 5.5**

### Property 17: Task Suggestion Generation

*For any* meeting with an approved summary, the task suggester should analyze the transcript and generate task suggestions with descriptions and optional assignee/deadline information.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 18: Task Suggestion Approval Control

*For any* suggested task, the meeting creator should be able to confirm (creating the task), modify (editing before creation), or reject (discarding) the suggestion.

**Validates: Requirements 6.4, 6.5**

### Property 19: Task Assignment Notification

*For any* task assigned to a user, the assignee should receive an email notification containing task details.

**Validates: Requirements 7.1, 14.2**

### Property 20: Role-Based Dashboard Data Visibility

*For any* user viewing their dashboard:
- The dashboard should display only meetings and tasks relevant to their role and permissions
- Principal sees institution-wide data
- HOD sees department data and PRC meetings
- Admin/Staff see only their assigned meetings and tasks

**Validates: Requirements 7.2, 9.1, 9.3, 10.1, 10.3, 11.1, 11.5, 12.1, 12.4**

### Property 21: Task Status Update by Assignee

*For any* task assignee, they should be able to update their assigned task's status to any valid value (Not Started, In Progress, Completed).

**Validates: Requirements 7.3, 11.6, 12.5**

### Property 22: Role-Based Task Assignment Scope

*For any* task assignment operation:
- Principal users can assign tasks to any user in the institution
- HOD users can assign tasks only to users within their department
- Other roles cannot assign tasks

**Validates: Requirements 7.4, 7.5, 10.6**

### Property 23: Dashboard Task Statistics Accuracy

*For any* dashboard displaying task statistics, the counts (total, not started, in progress, completed, overdue) should match the actual task data for the appropriate scope (institution-wide for Principal, department for HOD).

**Validates: Requirements 7.6, 7.7, 9.2, 10.5**

### Property 24: Minutes of Meeting Generation

*For any* approved meeting summary, the MoM generator should produce a DOCX document containing meeting metadata, attendees, agenda items, discussion summary, decisions, and action items in college-standard format.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 25: Principal MoM Override Authority

*For any* Principal user and any meeting, the Principal should be able to upload a manually created MoM document to replace the AI-generated version.

**Validates: Requirements 8.5**

### Property 26: Authorized Document Download

*For any* authorized user (meeting participants, creators, or role-based access) and any meeting document (agenda, attachments, MoM), the user should be able to download the document in its original format.

**Validates: Requirements 8.6, 11.2, 11.7, 12.3, 15.3**

### Property 27: Principal Agenda Override Authority

*For any* Principal user and any agenda item in any meeting, the Principal should be able to delete or override that agenda item.

**Validates: Requirements 9.5**

### Property 28: Principal Report Generation Access

*For any* Principal user, report generation functionality should be available and accessible from their dashboard.

**Validates: Requirements 9.6, 18.1**

### Property 29: Summary Approval Permission for HOD

*For any* HOD user and any meeting in their department, the HOD should be able to approve the meeting summary.

**Validates: Requirements 10.7**

### Property 30: Admin Dashboard Read-Only Summary Access

*For any* administrative staff user and any meeting assigned to them, they should be able to view the AI-generated summary but not edit it.

**Validates: Requirements 11.4**

### Property 31: Staff Personal Notes on Meetings

*For any* staff member and any meeting they attended, they should be able to add and edit personal notes associated with that meeting.

**Validates: Requirements 12.6**

### Property 32: Personal Notes Privacy

*For any* user and any personal note they create, the note should be visible only to that user and not accessible to any other user, including Principal and HOD roles.

**Validates: Requirements 19.2, 19.5**

### Property 33: Personal Notes CRUD Operations

*For any* user and any meeting they are invited to or have attended:
- The user should be able to create a personal note for that meeting
- The user should be able to edit their own personal note at any time
- The user should be able to delete their own personal note at any time
- Personal notes should be preserved even if the meeting is deleted

**Validates: Requirements 19.1, 19.3, 19.6, 19.7**

### Property 34: User Profile Self-Management

*For any* staff member, they should be able to view and update their own profile information.

**Validates: Requirements 12.7**

### Property 33: Complete Meeting Record Preservation

*For any* completed meeting, the system should maintain a complete record including audio file, transcript, summary, decisions, and MoM document, all retrievable through the meeting identifier.

**Validates: Requirements 13.1**

### Property 34: Meeting Search Functionality

*For any* authorized user and any search query with valid criteria (date, title, department, or participants), the system should return all meetings matching the criteria that the user has permission to access.

**Validates: Requirements 13.2, 13.3**

### Property 35: Role-Based Meeting Record Access

*For any* user and any meeting record:
- Principal users can access all meeting records
- HOD users can access their department meetings and PRC meetings
- Participants can access meetings they attended
- Other users cannot access the meeting

**Validates: Requirements 13.4, 13.5, 13.6**

### Property 36: Summary Approval Notification

*For any* meeting with an approved summary, all participants should receive an email notification with a link to view the summary.

**Validates: Requirements 14.3**

### Property 37: Task Deadline Reminder

*For any* task with a deadline approaching within 24 hours and status not completed, the assignee should receive a reminder email.

**Validates: Requirements 14.4**

### Property 38: Document Format Support

*For any* document in a supported format (PDF, DOCX, XLSX, PNG, JPG), upload and storage operations should succeed and the file should be retrievable in its original format.

**Validates: Requirements 15.4**

### Property 39: Role-Based Document Deletion

*For any* Principal or HOD user and any document attached to a meeting they manage, they should be able to delete that document.

**Validates: Requirements 15.5**

### Property 40: Role-Based Navigation Menu Display

*For any* authenticated user, the navigation menu should display only menu items corresponding to features their role has permission to access.

**Validates: Requirements 16.3**

### Property 41: Referential Integrity Maintenance

*For any* related entities in the system (meetings referencing users, tasks referencing meetings, documents referencing meetings), all references should remain valid and consistent. Deleting a referenced entity should either cascade appropriately or be prevented.

**Validates: Requirements 17.4**

### Property 42: Report Data Accuracy

*For any* report generated (meeting frequency, task completion rates, attendance statistics), the data should accurately reflect the underlying database records for the specified filters (date range, department, meeting type).

**Validates: Requirements 18.2, 18.3, 18.4, 18.6**

### Property 43: Report Export Format Support

*For any* generated report and any supported export format (PDF, Excel), the export operation should produce a valid file in the requested format containing the report data.

**Validates: Requirements 18.5**

### Property 44: Personal Notes Display on Meeting Details

*For any* user viewing a meeting details page for a meeting they are invited to or have attended, if they have created a personal note for that meeting, the note should be displayed on the page.

**Validates: Requirements 19.4**


## Error Handling

### Error Categories

#### 1. Authentication and Authorization Errors

**Scenarios**:
- Invalid credentials during login
- Expired session tokens
- Insufficient permissions for requested operation
- Role mismatch for feature access

**Handling Strategy**:
- Return 401 Unauthorized for authentication failures
- Return 403 Forbidden for authorization failures
- Clear error messages indicating required permission level
- Automatic redirect to login page on session expiration
- Log all authorization failures for security audit

**User Experience**:
- Display user-friendly error messages
- Provide guidance on required permissions
- Offer "Request Access" option where appropriate

#### 2. Data Validation Errors

**Scenarios**:
- Missing required fields in meeting creation
- Invalid date/time formats
- Empty participant lists
- Invalid file formats for uploads
- File size exceeding limits

**Handling Strategy**:
- Client-side validation before submission
- Server-side validation as final check
- Return 400 Bad Request with detailed field errors
- Preserve user input on validation failure

**User Experience**:
- Inline validation feedback as user types
- Clear indication of which fields have errors
- Helpful error messages with correction guidance

#### 3. AI Processing Errors

**Scenarios**:
- Speech-to-text API failures
- Transcription timeout for long audio
- Summary generation failures
- Task suggestion extraction errors
- Unsupported audio language

**Handling Strategy**:
- Implement retry logic with exponential backoff
- Set reasonable timeouts (5 minutes for transcription)
- Store partial results when possible
- Notify meeting creator of failures
- Provide manual fallback options
- Log all AI processing errors with context

**User Experience**:
- Show processing status with progress indicators
- Clear notification when AI processing fails
- Option to retry failed operations
- Allow manual transcript/summary entry as fallback

#### 4. Storage and Database Errors

**Scenarios**:
- Firebase Storage upload failures
- Firestore write failures
- Network connectivity issues
- Storage quota exceeded
- Concurrent modification conflicts

**Handling Strategy**:
- Implement retry logic for transient failures
- Use Firestore transactions for critical operations
- Handle optimistic locking conflicts
- Monitor storage quota and alert administrators
- Implement graceful degradation for read operations

**User Experience**:
- Show upload progress for large files
- Retry failed uploads automatically
- Clear error messages for storage issues
- Offline capability with sync when reconnected

#### 5. Email Notification Errors

**Scenarios**:
- Google Apps Script API failures
- Invalid email addresses
- Email delivery failures
- Rate limiting

**Handling Strategy**:
- Queue notifications for retry
- Log all notification attempts and results
- Implement exponential backoff for retries
- Provide in-app notifications as backup
- Alert administrators of persistent failures

**User Experience**:
- In-app notification bell as primary notification method
- Email as secondary notification channel
- Notification history in user dashboard

#### 6. Document Generation Errors

**Scenarios**:
- DOCX generation failures
- Template rendering errors
- Missing required data for MoM
- File system write errors

**Handling Strategy**:
- Validate all required data before generation
- Implement fallback templates
- Log generation errors with full context
- Provide manual document creation option

**User Experience**:
- Clear error message if generation fails
- Option to retry generation
- Allow manual MoM upload as alternative

### Error Logging and Monitoring

**Logging Strategy**:
- Use structured logging with consistent format
- Include user ID, timestamp, operation, and error details
- Log levels: ERROR (failures), WARN (retryable issues), INFO (operations)
- Separate logs for security events (auth failures, permission denials)

**Monitoring**:
- Track error rates by category
- Alert on error rate spikes
- Monitor AI processing success rates
- Track email delivery success rates
- Dashboard for administrators showing system health

### Error Recovery Patterns

**Idempotent Operations**:
- Meeting creation with unique IDs
- Task status updates with version checking
- Document uploads with deduplication

**Compensating Transactions**:
- Rollback meeting creation if notification fails
- Clean up orphaned files if database write fails
- Revert task assignments if notification fails

**Circuit Breaker Pattern**:
- Temporarily disable AI features if API consistently fails
- Fall back to manual workflows during outages
- Automatic recovery when service restored

## Testing Strategy

### Overview

The Meeting Management System requires comprehensive testing across multiple layers to ensure correctness, reliability, and security. We employ a dual testing approach combining traditional unit/integration tests with property-based testing to achieve thorough coverage.

### Testing Approach

#### Unit Testing

**Purpose**: Verify specific examples, edge cases, and error conditions for individual components and functions.

**Scope**:
- Component rendering and user interactions
- Service layer functions
- Utility functions (validation, formatting, permissions)
- Error handling paths
- Edge cases (empty lists, null values, boundary conditions)

**Tools**:
- **Test Framework**: Vitest
- **React Testing**: React Testing Library
- **Mocking**: Vitest mocks for Firebase services
- **Coverage Target**: 80% code coverage

**Example Test Cases**:
- Meeting creation with minimum required fields
- Task status update from "Not Started" to "In Progress"
- Permission check for Principal accessing all meetings
- Error handling when audio upload fails
- Empty participant list validation
- Date validation for past dates

#### Property-Based Testing

**Purpose**: Verify universal properties across all possible inputs through randomized testing.

**Scope**:
- All 43 correctness properties defined in this document
- Role-based access control across all features
- Data integrity and referential consistency
- Workflow state transitions
- Statistical calculations and aggregations

**Tools**:
- **Library**: fast-check (JavaScript/TypeScript property-based testing)
- **Configuration**: Minimum 100 iterations per property test
- **Integration**: Run as part of standard test suite

**Property Test Structure**:
```typescript
import fc from 'fast-check';

// Feature: meeting-management-system, Property 1: Role-Based Dashboard Assignment
test('Property 1: Role-Based Dashboard Assignment', () => {
  fc.assert(
    fc.property(
      fc.record({
        userId: fc.uuid(),
        role: fc.constantFrom('principal', 'hod', 'admin_staff', 'general_staff'),
        email: fc.emailAddress(),
        name: fc.string({ minLength: 1 })
      }),
      (user) => {
        const dashboard = assignDashboard(user);
        const expectedDashboard = getDashboardForRole(user.role);
        expect(dashboard).toBe(expectedDashboard);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Tagging Convention**:
Each property test must include a comment tag:
```typescript
// Feature: meeting-management-system, Property {number}: {property_text}
```

#### Integration Testing

**Purpose**: Verify interactions between components and services.

**Scope**:
- Complete user workflows (meeting creation to MoM generation)
- Firebase integration (Firestore, Storage, Auth)
- AI service integration
- Email notification delivery
- Real-time data synchronization

**Approach**:
- Use Firebase Emulator Suite for local testing
- Mock external AI APIs with realistic responses
- Test complete workflows end-to-end
- Verify data consistency across services

**Example Integration Tests**:
- Complete meeting workflow: create → upload audio → transcribe → summarize → generate MoM
- Task assignment workflow: suggest → approve → assign → notify → update status
- Role-based access: Principal creates PRC meeting → HOD adds agenda → Staff views meeting

#### End-to-End Testing

**Purpose**: Verify complete user journeys through the application UI.

**Scope**:
- Critical user paths for each role
- Cross-browser compatibility
- Responsive design on different screen sizes
- Real-time updates across multiple sessions

**Tools**:
- **Framework**: Playwright
- **Browsers**: Chrome, Firefox, Safari
- **Devices**: Desktop (1920x1080), Tablet (768x1024)

**Example E2E Tests**:
- Principal logs in → views dashboard → creates PRC meeting → invites HODs
- HOD logs in → views PRC meeting → adds agenda item → views department tasks
- Staff logs in → views assigned tasks → updates task status → views meeting history

#### Security Testing

**Purpose**: Verify authentication, authorization, and data protection.

**Scope**:
- Role-based access control enforcement
- Permission boundary testing
- Data isolation between departments
- Session management and token expiration
- Input sanitization and XSS prevention

**Approach**:
- Attempt unauthorized access to protected resources
- Test permission boundaries (HOD accessing other departments)
- Verify data filtering by role
- Test session timeout and renewal
- SQL injection and XSS attack vectors

#### Performance Testing

**Purpose**: Ensure system performs adequately under load.

**Scope**:
- Dashboard load times with large datasets
- Meeting list pagination and filtering
- Real-time update latency
- File upload/download speeds
- Report generation time

**Targets**:
- Dashboard initial load: < 2 seconds
- Meeting list filtering: < 500ms
- Real-time update propagation: < 1 second
- Audio file upload (10MB): < 30 seconds
- Report generation: < 5 seconds

#### Accessibility Testing

**Purpose**: Ensure application is usable by people with disabilities.

**Scope**:
- Keyboard navigation
- Screen reader compatibility
- Color contrast ratios
- Focus management
- ARIA labels and roles

**Tools**:
- axe-core for automated accessibility testing
- Manual testing with screen readers (NVDA, JAWS)
- Keyboard-only navigation testing

### Test Data Management

**Approach**:
- Use factories for generating test data
- Maintain seed data for consistent integration tests
- Use Firebase Emulator with pre-populated data
- Generate realistic random data for property tests

**Test Data Factories**:
```typescript
// User factory
const createTestUser = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'general_staff',
  department: 'Computer Science',
  isActive: true,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  ...overrides
});

// Meeting factory
const createTestMeeting = (overrides?: Partial<Meeting>): Meeting => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  meetingType: 'department',
  date: Timestamp.fromDate(faker.date.future()),
  time: '10:00',
  duration: 60,
  creatorId: faker.string.uuid(),
  participants: [],
  agendaItems: [],
  status: 'scheduled',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  ...overrides
});
```

### Continuous Integration

**CI Pipeline**:
1. Lint and type checking (TypeScript)
2. Unit tests with coverage report
3. Property-based tests (100 iterations)
4. Integration tests with Firebase Emulator
5. E2E tests on Chrome
6. Accessibility tests
7. Build verification

**Quality Gates**:
- All tests must pass
- Code coverage ≥ 80%
- No TypeScript errors
- No high-severity accessibility issues
- Build succeeds without warnings

### Test Maintenance

**Practices**:
- Update tests when requirements change
- Refactor tests to reduce duplication
- Keep test data factories up to date
- Review and update property tests for new features
- Maintain test documentation

**Test Review**:
- Include tests in code review process
- Verify property tests cover stated properties
- Ensure test names clearly describe what is tested
- Check that error cases are tested

### Testing Schedule

**Development Phase**:
- Unit tests: Written alongside feature code (TDD where appropriate)
- Property tests: Written after feature completion based on design properties
- Integration tests: Written after related features are complete

**Pre-Release**:
- Full regression test suite
- E2E tests on all supported browsers
- Performance testing with production-like data
- Security audit and penetration testing

**Post-Release**:
- Monitor error rates and user reports
- Add regression tests for discovered bugs
- Update property tests based on production issues

