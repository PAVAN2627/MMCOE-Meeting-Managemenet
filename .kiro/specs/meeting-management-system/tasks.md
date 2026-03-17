# Implementation Plan: Meeting Management System

## Overview

This implementation plan breaks down the Meeting Management System into discrete coding tasks. The system is a React + TypeScript web application with Firebase backend, featuring role-based dashboards, AI-powered meeting management, and comprehensive task tracking for educational institutions.

## Tasks

- [x] 1. Set up project structure and Firebase configuration
  - Initialize React + TypeScript project with Vite
  - Install dependencies: Firebase SDK, shadcn-ui, Tailwind CSS, React Router
  - Configure Firebase (Firestore, Storage, Authentication, Functions)
  - Set up environment variables for Firebase config and API keys
  - Create folder structure: components/, services/, hooks/, types/, utils/
  - _Requirements: 17.1, 17.2_

- [x] 2. Implement core type definitions and data models
  - [x] 2.1 Create user and authentication types
    - Define User, UserRole enums in types/user.types.ts
    - Define AuthContextValue interface
    - _Requirements: 1.1_
  
  - [x] 2.2 Create meeting-related types
    - Define Meeting, AgendaItem, MeetingInput, DocumentReference interfaces in types/meeting.types.ts
    - Define meeting status and type enums
    - _Requirements: 2.1, 2.5, 2.6_
  
  - [x] 2.3 Create task and notification types
    - Define Task, TaskStatus, TaskStats, Notification interfaces in types/task.types.ts
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 2.4 Create AI service types
    - Define Transcript, Summary, TaskSuggestion interfaces in types/ai.types.ts
    - Include sourceLanguage and outputLanguage fields for multi-language support
    - _Requirements: 4.2, 4.3, 5.1, 6.1_
  
  - [x] 2.5 Create personal notes types
    - Define PersonalNote interface in types/notes.types.ts
    - _Requirements: 19.1, 19.2_

- [x] 3. Implement authentication and authorization system
  - [x] 3.1 Create AuthService with Firebase Authentication
    - Implement signIn, signOut, getCurrentUser methods in services/auth.service.ts
    - Handle authentication state persistence
    - _Requirements: 1.2_
  
  - [x] 3.2 Create AuthProvider context and useAuth hook
    - Implement AuthContext with user, role, loading state
    - Create useAuth hook for consuming auth context
    - _Requirements: 1.2_
  
  - [x] 3.3 Implement permission checking utilities
    - Create hasPermission function in utils/permissions.ts
    - Define permission mappings for each role
    - _Requirements: 1.3_
  
  - [x] 3.4 Create RoleGuard component
    - Implement component to protect routes based on user role
    - Redirect unauthorized users appropriately
    - _Requirements: 1.3_
  
  - [ ]* 3.5 Write property test for authentication
    - **Property 1: Role-Based Dashboard Assignment**
    - **Validates: Requirements 1.2**
  
  - [ ]* 3.6 Write property test for permission system
    - **Property 2: Permission-Based Feature Access**
    - **Validates: Requirements 1.3**


- [x] 4. Implement user management services
  - [x] 4.1 Create UserService for user CRUD operations
    - Implement createUser, updateUser, deleteUser, getUser methods
    - Implement getUsersByDepartment, getAllUsers methods
    - Store users in Firestore 'users' collection
    - _Requirements: 1.4, 1.5, 9.7, 10.8_
  
  - [ ]* 4.2 Write property test for user management scope
    - **Property 3: Role-Based User Management Scope**
    - **Validates: Requirements 1.4, 1.5, 9.7, 10.8**

- [x] 5. Implement meeting scheduling and management
  - [x] 5.1 Create MeetingService core methods
    - Implement createMeeting method with validation
    - Implement getMeeting, updateMeeting, deleteMeeting methods
    - Store meetings in Firestore 'meetings' collection with proper indexes
    - _Requirements: 2.1, 2.5, 17.4_
  
  - [x] 5.2 Implement meeting participant and agenda management
    - Add methods for managing participant lists
    - Implement addAgendaItem, removeAgendaItem, updateAgendaItem methods
    - _Requirements: 2.4, 2.6_
  
  - [x] 5.3 Implement PRC meeting authorization
    - Add role check for PRC meeting creation (Principal only)
    - Allow HODs to add agenda items to PRC meetings
    - _Requirements: 2.3, 2.4, 10.4_
  
  - [x] 5.4 Create MeetingScheduler component
    - Build form with title, date, time, duration, participants fields
    - Implement participant selection with role filtering
    - Add agenda item management UI
    - Handle document attachment during creation
    - _Requirements: 2.1, 2.6, 15.1_
  
  - [ ]* 5.5 Write property tests for meeting creation
    - **Property 4: Meeting Creation Accepts Required Fields**
    - **Property 6: PRC Meeting Creation Authorization**
    - **Validates: Requirements 2.1, 2.3, 2.5**
  
  - [ ]* 5.6 Write property test for HOD agenda contribution
    - **Property 7: HOD Agenda Contribution to PRC Meetings**
    - **Validates: Requirements 2.4, 10.4**

- [x] 6. Implement notification system
  - [x] 6.1 Create NotificationService with email integration
    - Implement sendMeetingInvite method using Google Apps Script
    - Implement sendTaskAssignment method
    - Implement sendSummaryApproved method
    - Implement sendTaskReminder method
    - Store notifications in Firestore 'notifications' collection
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [x] 6.2 Integrate notifications with meeting creation
    - Trigger email notifications when meeting is created
    - Send to all invited participants
    - _Requirements: 2.2, 14.1_
  
  - [x] 6.3 Create NotificationBell component
    - Display unread notification count
    - Show notification list dropdown
    - Mark notifications as read on click
    - _Requirements: 14.1, 14.2, 14.3_
  
  - [ ]* 6.4 Write property test for meeting notifications
    - **Property 5: Meeting Notification Delivery**
    - **Validates: Requirements 2.2, 14.1**

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 8. Implement document management
  - [x] 8.1 Create StorageService for file operations
    - Implement uploadFile method for Firebase Storage
    - Implement downloadFile, deleteFile methods
    - Organize files by meeting ID in storage structure
    - _Requirements: 3.3, 15.2, 17.2_
  
  - [x] 8.2 Create DocumentUploader component
    - Support PDF, DOCX, XLSX, PNG, JPG formats
    - Implement file size validation (max size check)
    - Show upload progress indicator
    - _Requirements: 15.1, 15.4_
  
  - [x] 8.3 Create DocumentViewer component
    - Display list of meeting documents
    - Implement download functionality
    - Add delete option for authorized users (Principal, HOD)
    - _Requirements: 15.3, 15.5_
  
  - [x] 8.4 Implement document attachment during meeting creation
    - Integrate DocumentUploader into MeetingScheduler
    - Store document references in meeting record
    - _Requirements: 2.6, 8.4_
  
  - [ ]* 8.5 Write property tests for document management
    - **Property 8: Document Attachment During Meeting Creation**
    - **Property 38: Document Format Support**
    - **Property 39: Role-Based Document Deletion**
    - **Validates: Requirements 2.6, 15.1, 15.4, 15.5**

- [ ] 9. Implement audio recording and upload
  - [ ] 9.1 Create AudioRecorder component
    - Implement browser-based audio recording using MediaRecorder API
    - Support at least 60 minutes duration
    - Convert to MP3 format
    - Show recording timer and controls
    - _Requirements: 3.1, 3.2_
  
  - [ ] 9.2 Implement audio upload functionality
    - Add uploadAudio method to MeetingService
    - Store audio files in Firebase Storage under /meetings/{meetingId}/audio/
    - Associate audio URL with meeting record
    - Support manual audio file upload for authorized users
    - _Requirements: 3.3, 3.4, 3.5, 11.3_
  
  - [ ]* 9.3 Write property tests for audio recording
    - **Property 9: Audio Recording Format Compliance**
    - **Property 11: Permission-Based File Upload**
    - **Validates: Requirements 3.1, 3.5, 11.3**

- [x] 10. Implement AI transcription service
  - [x] 10.1 Create AIService with transcription methods
    - Implement transcribeAudio method calling Speech-to-Text API
    - Support multi-language input detection
    - Generate English-only output regardless of input language
    - Store transcript in Firestore 'transcripts' collection
    - Include sourceLanguage and outputLanguage fields
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 10.2 Implement transcription error handling
    - Add retry logic with exponential backoff
    - Log transcription errors with context
    - Send notification to meeting creator on failure
    - _Requirements: 4.5_
  
  - [x] 10.3 Create Cloud Function trigger for audio upload
    - Trigger transcription when audio file is uploaded
    - Update meeting record with transcript reference
    - _Requirements: 4.1, 4.4_
  
  - [x] 10.4 Create TranscriptViewer component
    - Display transcript text with timestamps
    - Show speaker identification if available
    - Display source and output language information
    - _Requirements: 4.6_
  
  - [ ]* 10.5 Write property tests for transcription
    - **Property 12: Audio Transcription Pipeline**
    - **Property 13: Multi-Language Transcription Support**
    - **Property 14: Transcription Error Handling**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**

- [ ] 11. Implement AI summary generation
  - [x] 11.1 Add summary generation to AIService
    - Implement generateSummary method calling LLM API
    - Extract key points, decisions, and discussion topics
    - Store summary in Firestore 'summaries' collection
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 11.2 Create Cloud Function trigger for transcript completion
    - Trigger summary generation when transcript is completed
    - Update meeting record with summary reference
    - _Requirements: 5.1_
  
  - [x] 11.3 Create SummaryEditor component
    - Display AI-generated summary
    - Allow editing for Principal and HOD users
    - Implement approve/reject workflow
    - Show key points, decisions, and discussion topics separately
    - _Requirements: 5.4, 5.5_
  
  - [ ]* 11.4 Write property tests for summary generation
    - **Property 15: Summary Generation from Transcript**
    - **Property 16: Summary Approval Workflow**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement AI task suggestion
  - [x] 13.1 Add task suggestion to AIService
    - Implement suggestTasks method analyzing transcript and summary
    - Extract task descriptions, suggested assignees, and deadlines
    - Return TaskSuggestion array with confidence scores
    - _Requirements: 6.1, 6.2_
  
  - [x] 13.2 Create Cloud Function trigger for summary approval
    - Trigger task suggestion when summary is approved
    - Store suggestions for creator review
    - _Requirements: 6.1_
  
  - [x] 13.3 Create TaskSuggestionReviewer component
    - Display suggested tasks with details
    - Allow confirm, modify, or reject for each suggestion
    - Show suggested assignee and deadline
    - _Requirements: 6.3, 6.4_
  
  - [ ]* 13.4 Write property tests for task suggestion
    - **Property 17: Task Suggestion Generation**
    - **Property 18: Task Suggestion Approval Control**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 14. Implement task management system
  - [x] 14.1 Create TaskService core methods
    - Implement createTask method with validation
    - Implement updateTaskStatus method
    - Implement getTasksForUser, getTasksByDepartment, getAllTasks methods
    - Store tasks in Firestore 'tasks' collection with proper indexes
    - _Requirements: 7.1, 7.2, 7.4, 7.5_
  
  - [x] 14.2 Implement task assignment with notifications
    - Integrate NotificationService for task assignment emails
    - Validate role-based assignment scope (Principal: all, HOD: department)
    - _Requirements: 6.5, 7.1, 7.4, 7.5_
  
  - [x] 14.3 Implement task statistics calculation
    - Create getTaskStatistics method in TaskService
    - Calculate total, notStarted, inProgress, completed, overdue counts
    - Support institution-wide and department-level scopes
    - _Requirements: 7.6, 7.7, 9.2, 10.5_
  
  - [x] 14.4 Create TaskList component
    - Display tasks with status, deadline, description
    - Support different view modes: assigned, created, department, institution
    - Implement filtering and sorting
    - _Requirements: 7.2_
  
  - [x] 14.5 Create TaskCard component
    - Display individual task details
    - Implement status update dropdown
    - Show assignee information conditionally
    - _Requirements: 7.3_
  
  - [x] 14.6 Create TaskStatusUpdater component
    - Allow assignees to update task status
    - Validate user is the assignee before allowing update
    - Update completedAt timestamp when status changes to Completed
    - _Requirements: 7.3, 11.6, 12.5_
  
  - [ ]* 14.7 Write property tests for task management
    - **Property 19: Task Assignment Notification**
    - **Property 21: Task Status Update by Assignee**
    - **Property 22: Role-Based Task Assignment Scope**
    - **Property 23: Dashboard Task Statistics Accuracy**
    - **Validates: Requirements 7.1, 7.3, 7.4, 7.5, 7.6, 7.7**

- [x] 15. Implement Minutes of Meeting generation
  - [x] 15.1 Create MoMGenerator service
    - Implement generateMoM method using docx library
    - Follow college-standard formatting template
    - Include metadata, attendees, agenda, summary, decisions, action items
    - Store generated DOCX in Firebase Storage
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 15.2 Create Cloud Function trigger for summary approval
    - Trigger MoM generation when summary is approved
    - Update meeting record with MoM URL
    - _Requirements: 8.1_
  
  - [x] 15.3 Implement Principal MoM override
    - Add uploadManualMoM method for Principal users
    - Replace AI-generated MoM with uploaded version
    - _Requirements: 8.5_
  
  - [x] 15.4 Add MoM download functionality
    - Implement download button in meeting details
    - Restrict access to authorized users
    - _Requirements: 8.6, 11.7, 12.3_
  
  - [ ]* 15.5 Write property tests for MoM generation
    - **Property 24: Minutes of Meeting Generation**
    - **Property 25: Principal MoM Override Authority**
    - **Property 26: Authorized Document Download**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.5, 8.6**

- [x] 16. Implement personal notes feature
  - [x] 16.1 Create NotesService
    - Implement createNote, updateNote, deleteNote methods
    - Implement getNoteForMeeting, getNotesForUser methods
    - Store notes in Firestore 'personal_notes' collection
    - Ensure privacy: only note creator can access their notes
    - _Requirements: 19.1, 19.2, 19.3_
  
  - [x] 16.2 Create PersonalNoteEditor component
    - Display text editor for note content
    - Implement save and delete functionality
    - Show note creation/update timestamps
    - _Requirements: 19.1, 19.3, 19.6_
  
  - [x] 16.3 Create PersonalNotesList component
    - Display user's personal notes across all meetings
    - Implement click to navigate to meeting details
    - _Requirements: 19.1_
  
  - [x] 16.4 Integrate notes into MeetingDetails component
    - Display personal note editor on meeting details page
    - Show only to users who are participants
    - Allow adding notes before, during, or after meeting
    - _Requirements: 19.4, 19.6_
  
  - [ ]* 16.5 Write property tests for personal notes
    - **Property 32: Personal Notes Privacy**
    - **Property 33: Personal Notes CRUD Operations**
    - **Property 44: Personal Notes Display on Meeting Details**
    - **Validates: Requirements 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7**

- [ ] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Implement Principal Dashboard
  - [ ] 18.1 Create PrincipalDashboard component
    - Display institution-wide meeting count
    - Display institution-wide task statistics
    - Show recent meetings across all departments
    - Add navigation to user management
    - Add navigation to report generation
    - _Requirements: 9.1, 9.2, 9.3, 9.6, 9.7_
  
  - [ ] 18.2 Implement Principal-specific features
    - Add PRC meeting creation button
    - Implement agenda item override functionality
    - Show all department meetings with filtering
    - _Requirements: 9.4, 9.5_
  
  - [ ]* 18.3 Write property tests for Principal dashboard
    - **Property 20: Role-Based Dashboard Data Visibility (Principal)**
    - **Property 27: Principal Agenda Override Authority**
    - **Property 28: Principal Report Generation Access**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.5, 9.6**

- [ ] 19. Implement HOD Dashboard
  - [ ] 19.1 Create HODDashboard component
    - Display department-specific meeting count
    - Display department task statistics
    - Show department meeting history
    - Add navigation to department user management
    - _Requirements: 10.1, 10.5, 10.8_
  
  - [ ] 19.2 Implement HOD-specific features
    - Add department meeting scheduling button
    - Show PRC meetings with ability to add agenda items
    - Implement summary approval for department meetings
    - Add task assignment interface for department users
    - _Requirements: 10.2, 10.3, 10.4, 10.6, 10.7_
  
  - [ ]* 19.3 Write property tests for HOD dashboard
    - **Property 20: Role-Based Dashboard Data Visibility (HOD)**
    - **Property 29: Summary Approval Permission for HOD**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.5, 10.7**

- [ ] 20. Implement Admin Staff Dashboard
  - [ ] 20.1 Create AdminDashboard component
    - Display meetings assigned to admin user
    - Show meeting agenda and attached documents
    - Display assigned tasks with status
    - _Requirements: 11.1, 11.2, 11.5_
  
  - [ ] 20.2 Implement Admin-specific features
    - Add audio/document upload interface for assigned meetings
    - Display AI-generated summaries in read-only mode
    - Add MoM download functionality
    - _Requirements: 11.3, 11.4, 11.7_
  
  - [ ]* 20.3 Write property tests for Admin dashboard
    - **Property 20: Role-Based Dashboard Data Visibility (Admin)**
    - **Property 30: Admin Dashboard Read-Only Summary Access**
    - **Validates: Requirements 11.1, 11.2, 11.4, 11.5**

- [ ] 21. Implement General Staff Dashboard
  - [ ] 21.1 Create StaffDashboard component
    - Display meetings user is invited to
    - Show meeting history for attended meetings
    - Display assigned tasks
    - Add profile management section
    - _Requirements: 12.1, 12.2, 12.4, 12.6_
  
  - [ ] 21.2 Implement Staff-specific features
    - Add meeting summary and MoM viewer
    - Implement task status update functionality
    - Add personal notes access for attended meetings
    - _Requirements: 12.3, 12.5, 12.6_
  
  - [ ]* 21.3 Write property tests for Staff dashboard
    - **Property 20: Role-Based Dashboard Data Visibility (Staff)**
    - **Property 31: Staff Personal Notes on Meetings**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

- [ ] 22. Implement meeting history and search
  - [ ] 22.1 Add meeting search to MeetingService
    - Implement searchMeetings method with filters
    - Support search by date, title, department, participants
    - Apply role-based access control to search results
    - _Requirements: 13.2, 13.3_
  
  - [ ] 22.2 Create MeetingHistory component
    - Display meeting list with filtering options
    - Implement date range picker
    - Add department and participant filters
    - Show meeting status indicators
    - _Requirements: 13.2, 13.3_
  
  - [ ] 22.3 Create MeetingDetails component
    - Display complete meeting information
    - Show audio player if audio available
    - Display transcript, summary, and MoM
    - Show agenda items and attached documents
    - Integrate PersonalNoteEditor
    - _Requirements: 13.1, 13.6_
  
  - [ ]* 22.4 Write property tests for meeting history
    - **Property 33: Complete Meeting Record Preservation**
    - **Property 34: Meeting Search Functionality**
    - **Property 35: Role-Based Meeting Record Access**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.6**

- [ ] 23. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 24. Implement report generation system
  - [ ] 24.1 Create ReportService
    - Implement generateMeetingReport method
    - Implement generateTaskReport method
    - Implement generateAttendanceReport method
    - Support filtering by date range, department, meeting type
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.6_
  
  - [ ] 24.2 Implement report export functionality
    - Add exportReport method supporting PDF and Excel formats
    - Use appropriate libraries for file generation
    - _Requirements: 18.5_
  
  - [ ] 24.3 Create ReportGenerator component
    - Add report type selection
    - Implement filter controls (date range, department, etc.)
    - Display report preview
    - Add export buttons for PDF and Excel
    - Restrict access to Principal role only
    - _Requirements: 18.1, 18.5, 18.6_
  
  - [ ]* 24.4 Write property tests for reports
    - **Property 42: Report Data Accuracy**
    - **Property 43: Report Export Format Support**
    - **Validates: Requirements 18.2, 18.3, 18.4, 18.5, 18.6**

- [ ] 25. Implement task deadline reminders
  - [ ] 25.1 Create Cloud Function for scheduled reminders
    - Implement scheduled function running daily
    - Query tasks with deadlines within 24 hours
    - Filter out completed tasks
    - Send reminder emails to assignees
    - _Requirements: 14.4_
  
  - [ ]* 25.2 Write property test for task reminders
    - **Property 37: Task Deadline Reminder**
    - **Validates: Requirements 14.4**

- [x] 26. Implement UI design system and styling
  - [x] 26.1 Configure Tailwind CSS theme
    - Set up color scheme: Deep Blue (primary), White (background), Soft Gray (secondary), Accent Teal (AI features)
    - Configure typography and spacing
    - _Requirements: 16.1, 16.5_
  
  - [x] 26.2 Implement responsive layout
    - Create responsive navigation component
    - Ensure all dashboards work on desktop and tablet
    - Test breakpoints and adjust as needed
    - _Requirements: 16.2_
  
  - [x] 26.3 Implement role-based navigation
    - Create navigation menu component
    - Show/hide menu items based on user role and permissions
    - Add notification bell to navigation
    - _Requirements: 16.3_
  
  - [x] 26.4 Add status indicators and visual feedback
    - Create status badge components for meetings and tasks
    - Add loading spinners and progress indicators
    - Implement notification count badges
    - _Requirements: 16.4_
  
  - [ ]* 26.5 Write property test for navigation
    - **Property 40: Role-Based Navigation Menu Display**
    - **Validates: Requirements 16.3**

- [x] 27. Implement routing and navigation
  - [x] 27.1 Set up React Router
    - Configure routes for all dashboards
    - Add routes for meeting details, task management, reports
    - Implement protected routes with RoleGuard
    - _Requirements: 1.3_
  
  - [x] 27.2 Create navigation utilities
    - Implement navigation helpers for role-based redirects
    - Add breadcrumb navigation component
    - _Requirements: 16.3_

- [ ] 28. Implement real-time data synchronization
  - [ ] 28.1 Create custom hooks for real-time updates
    - Implement useMeetings hook with Firestore listeners
    - Implement useTasks hook with Firestore listeners
    - Implement useNotifications hook with Firestore listeners
    - _Requirements: 7.2, 9.1, 10.1, 11.1, 12.1_
  
  - [ ] 28.2 Integrate real-time updates into dashboards
    - Connect dashboard components to real-time hooks
    - Ensure UI updates automatically when data changes
    - _Requirements: 7.2, 9.1, 10.1_

- [ ] 29. Implement error handling and validation
  - [x] 29.1 Create validation utilities
    - Implement form validation functions in utils/validation.ts
    - Add date/time validation
    - Add email and phone validation
    - _Requirements: 2.1, 4.5_
  
  - [x] 29.2 Implement error handling in services
    - Add try-catch blocks with proper error logging
    - Implement retry logic for transient failures
    - Add user-friendly error messages
    - _Requirements: 4.5_
  
  - [x] 29.3 Create error boundary components
    - Implement React error boundaries for graceful failure handling
    - Add fallback UI for component errors
    - _Requirements: 4.5_

- [ ] 30. Implement data integrity and referential consistency
  - [x] 30.1 Add database triggers for referential integrity
    - Create Cloud Functions to maintain references
    - Handle cascading deletes appropriately
    - Prevent deletion of referenced entities
    - _Requirements: 17.4_
  
  - [ ]* 30.2 Write property test for referential integrity
    - **Property 41: Referential Integrity Maintenance**
    - **Validates: Requirements 17.4**

- [ ] 31. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 32. Implement file storage organization
  - [x] 32.1 Set up Firebase Storage structure
    - Create folder structure: /meetings/{meetingId}/audio/, /meetings/{meetingId}/documents/, /meetings/{meetingId}/mom/
    - Implement storage rules for access control
    - _Requirements: 17.2_
  
  - [ ]* 32.2 Write property test for file storage
    - **Property 10: File Storage and Association Integrity**
    - **Validates: Requirements 3.3, 3.4, 4.3, 8.4, 15.2**

- [ ] 33. Implement summary approval notifications
  - [x] 33.1 Integrate notification on summary approval
    - Trigger sendSummaryApproved when summary is approved
    - Send to all meeting participants
    - Include link to view summary
    - _Requirements: 14.3_
  
  - [ ]* 33.2 Write property test for summary notifications
    - **Property 36: Summary Approval Notification**
    - **Validates: Requirements 14.3**

- [ ] 34. Implement profile management
  - [x] 34.1 Create ProfileManager component
    - Display user profile information
    - Allow editing of name, phone number
    - Implement password change functionality
    - _Requirements: 12.6_
  
  - [ ]* 34.2 Write property test for profile management
    - **Property 34: User Profile Self-Management**
    - **Validates: Requirements 12.6**

- [ ] 35. Integration and final wiring
  - [ ] 35.1 Wire all components together
    - Connect all dashboard components to services
    - Ensure all navigation flows work correctly
    - Verify all role-based access controls are enforced
    - _Requirements: All_
  
  - [ ] 35.2 Test complete workflows end-to-end
    - Test meeting creation → audio upload → transcription → summary → task suggestion → MoM generation
    - Test task assignment → notification → status update
    - Test personal notes creation and privacy
    - Verify all role-specific features work correctly
    - _Requirements: All_
  
  - [ ] 35.3 Implement database indexes
    - Create Firestore indexes for efficient queries
    - Add composite indexes for common query patterns
    - _Requirements: 17.5_

- [ ] 36. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- The implementation uses TypeScript with React for frontend and Firebase for backend
- AI features (transcription, summarization, task suggestion) require external API integration
- All role-based access control must be enforced at both client and server levels
- Personal notes feature ensures complete privacy - notes are never shared with other users
