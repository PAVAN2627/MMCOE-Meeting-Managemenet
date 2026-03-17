# MeetSync — AI-Powered Meeting Management System

A full-stack institutional meeting management platform built with React, Firebase, and Google AI. Designed for colleges and institutes to manage meetings, minutes, tasks, and team communication end-to-end.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| Backend / DB | Firebase Firestore |
| Auth | Firebase Authentication |
| AI — Summaries & Tasks | Google Gemini 2.5 Flash |
| AI — OCR / Handwriting | Google Cloud Vision API |
| Speech-to-Text | Deepgram |
| Email Notifications | Google Apps Script |
| PDF Export | jsPDF |
| Word Export | docx |

---

## Features

### Meetings
- Schedule meetings with date, time, venue, duration, agenda items, and file attachments
- Role-based meeting creation: Principal creates institution-wide meetings; HOD creates department meetings
- Live audio recording + Deepgram speech-to-text transcription
- Upload audio files for transcription
- Meeting status flow: Scheduled → In Progress → Completed
- On completion: AI auto-generates tasks from transcript and creates a full MoM report

### AI Capabilities
- **Task Extraction** — Gemini extracts only explicitly stated tasks from the transcript (no inference)
- **MoM Generation** — Full Minutes of Meeting report with attendees, agenda, summary, and action items table
- **Handwritten Notes OCR** — Google Cloud Vision API extracts text from scanned note images; Gemini corrects spelling

### Tasks
- Tasks auto-suggested from meeting transcript, assigned by creator before/during completion
- Manual task creation by Principal and HOD
- Status tracking: Pending → In Progress → Completed
- Task completion requires proof upload (image/PDF stored as base64 in Firestore, max 900 KB)
- Email notification sent to assignee on task assignment
- HOD and Principal can edit (due date, priority) and delete tasks they assigned

### Notes
- Personal meeting notes for all users (manual text or scanned handwritten image)
- Note history with edit and delete
- Scanned notes show original image thumbnail alongside extracted text

### Documents / MoM
- MoM reports auto-generated on meeting completion
- Downloadable as PDF or Word (.docx)
- Staff and HOD can view MoM for meetings they participated in
- Principal sees all MoM documents

### Reports (Principal)
- Live stats: total meetings, tasks, users, completion rates
- Downloadable reports: Meeting Summary, Task Completion, User Activity, Monthly Activity

### User Management
- Principal manages HODs and Admin Staff
- HOD manages their department staff
- User deletion removes from both Firestore and Firebase Authentication (via Admin REST API)
- Deleted/inactive users are blocked from logging in

### Role-Based Dashboards

| Role | Can Create Meetings | Sees Transcript | Manages Users | Reports |
|---|---|---|---|---|
| Principal | Yes (all types) | Own meetings only | HOD + Admin Staff | Full |
| HOD | Yes (dept only) | Own meetings only | Dept Staff | No |
| Admin Staff | No | No | No | No |
| General Staff | No | No | No | No |

---

## Project Structure

```
src/
├── components/
│   ├── dashboard/       # DashboardLayout, StatCard, widgets
│   ├── forms/           # AddMeeting, AddTask, AddUser, EditUser, TaskCompletion dialogs
│   ├── landing/         # HeroSection, FeaturesSection, DashboardPreview, CTA, Footer
│   ├── shared/          # MeetingCalendar, RoleGuard, TaskCompletionPreview
│   └── ui/              # shadcn/ui components
├── contexts/
│   └── AuthContext.tsx  # Firebase auth + user profile
├── integrations/
│   └── firebase/        # config.ts, types.ts
├── lib/
│   ├── firebaseAdmin.ts # Admin REST API (delete auth users via service account)
│   ├── reportExport.ts  # PDF + Word generation
│   ├── saveAs.ts        # File download helper
│   └── utils.ts
├── pages/
│   ├── dashboard/
│   │   ├── principal/   # Dashboard, Meetings, Tasks, Users, MoM, Reports, Settings
│   │   ├── hod/         # Dashboard, Meetings, Tasks, Users, MoM, Settings
│   │   └── staff/       # Dashboard, Meetings, Tasks, Documents, Settings
│   ├── Index.tsx        # Landing page
│   ├── Login.tsx
│   └── NotFound.tsx
└── services/
    ├── ai.service.ts
    ├── auth.service.ts
    ├── meeting.service.ts
    └── notification.service.ts
```

---

## Environment Variables

Create a `.env` file in the root:

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Google Gemini AI
VITE_GEMINI_API_KEY=

# Google Cloud Vision (OCR)
VITE_VISION_API_KEY=

# Deepgram (Speech-to-Text)
VITE_DEEPGRAM_API_KEY=

# Google Apps Script (Email)
VITE_EMAIL_SERVICE_URL=
```

---

## Getting Started

```bash
# Install dependencies
bun install   # or npm install

# Start dev server
bun run dev   # or npm run dev

# Build for production
bun run build
```

---

## Email Notifications

Email is sent via Google Apps Script. Deploy the script in `apps-script/Code.gs` as a Web App and paste the URL into `VITE_EMAIL_SERVICE_URL`.

Emails are sent for:
- New meeting invitation
- Meeting schedule update
- Task assignment

---

## Firebase Setup

1. Create a Firebase project
2. Enable **Authentication** (Email/Password)
3. Enable **Firestore Database**
4. Add the service account JSON to the root (for Admin user deletion)
5. Create the first Principal user manually in Firebase Console → Authentication, then add their Firestore document in the `users` collection with `role: "principal"`

### Firestore Collections

| Collection | Purpose |
|---|---|
| `users` | User profiles with role, department, designation |
| `meetings` | Meeting records with agenda, transcript, report |
| `tasks` | Tasks linked to meetings or standalone |
| `note_history` | Personal meeting notes per user |
| `mom_documents` | Saved MoM documents |

---

## License

Built for institutional use. All rights reserved.
