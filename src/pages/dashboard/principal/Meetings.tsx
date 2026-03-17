import { useState, useEffect } from "react";
import DashboardLayout, { principalNav } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar, Clock, Users, ChevronDown, ChevronUp, Pencil, Trash2, MapPin, FileText, Eye, Download, Upload, X, Mic, MicOff, StickyNote, CheckSquare, Loader2, CalendarIcon, Camera, Save } from "lucide-react";
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, Timestamp, addDoc, where, setDoc } from "firebase/firestore";
import { downloadAsPDF, downloadAsWord } from "@/lib/reportExport";
import { db } from "@/integrations/firebase/config";
import { Meeting } from "@/types/meeting.types";
import { User } from "@/types/user.types";
import { AddMeetingDialog } from "@/components/forms/AddMeetingDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const PrincipalMeetings = () => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [deletingMeeting, setDeletingMeeting] = useState<any | null>(null);
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [recording, setRecording] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [liveTranscript, setLiveTranscript] = useState<Record<string, string>>({});
  const [personalNotes, setPersonalNotes] = useState<Record<string, string>>({});
  const [suggestedTasks, setSuggestedTasks] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTaskData, setEditTaskData] = useState<any>({});
  const [selectedTime, setSelectedTime] = useState<Record<string, string>>({});
  const [pendingAssignments, setPendingAssignments] = useState<Record<string, { assigneeId: string; dueDate: string; dueTime: string; priority?: string }>>({});
  const [scanningNote, setScanningNote] = useState<string | null>(null);
  const [noteHistory, setNoteHistory] = useState<Record<string, any[]>>({});
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({});
  const [scannedText, setScannedText] = useState<string>("");
  const [showScannedPreview, setShowScannedPreview] = useState(false);
  const [scannedImage, setScannedImage] = useState<string>("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState<string>("");
  const [uploadingAudio, setUploadingAudio] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "meetings"), orderBy("scheduledAt", "desc"));
      const snapshot = await getDocs(q);
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Principal sees only meetings they created or are a participant in
      const meetingsList = all.filter(m =>
        m.createdBy === user?.id || m.participants?.includes(user?.id)
      );
      setMeetings(meetingsList);
      
      // Load tasks for each meeting
      for (const meeting of meetingsList) {
        loadMeetingTasks(meeting.id);
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const usersList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(u => !(u as any).isDeleted);
      setUsers(usersList);
      
      // Create a map of user IDs to names
      const namesMap: Record<string, string> = {};
      usersList.forEach(u => {
        namesMap[u.id] = u.name;
      });
      setParticipantNames(namesMap);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const loadMeetingTasks = async (meetingId: string) => {
    try {
      // Load ALL tasks for this meeting (suggested AND assigned)
      const tasksQuery = query(
        collection(db, "tasks"),
        where("meetingId", "==", meetingId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSuggestedTasks(prev => ({ ...prev, [meetingId]: tasks }));
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const loadPersonalNote = async (meetingId: string) => {
    if (!user?.id) return;
    try {
      const noteDoc = await getDocs(
        query(collection(db, "personal_notes"), 
          where("meetingId", "==", meetingId),
          where("userId", "==", user.id)
        )
      );
      if (!noteDoc.empty) {
        setPersonalNotes(prev => ({ ...prev, [meetingId]: noteDoc.docs[0].data().content || "" }));
      }
      
      // Load note history
      const historyQuery = query(
        collection(db, "note_history"),
        where("meetingId", "==", meetingId),
        where("userId", "==", user.id),
        orderBy("createdAt", "desc")
      );
      const historySnapshot = await getDocs(historyQuery);
      const history = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNoteHistory(prev => ({ ...prev, [meetingId]: history }));
    } catch (error) {
      console.error("Error loading note:", error);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchUsers();
  }, []);

  const toggleExpand = (meetingId: string) => {
    if (expandedMeeting === meetingId) {
      setExpandedMeeting(null);
    } else {
      setExpandedMeeting(meetingId);
      loadPersonalNote(meetingId);
      if (!activeTab[meetingId]) {
        setActiveTab(prev => ({ ...prev, [meetingId]: "details" }));
      }
    }
  };

  const handleStatusChange = async (meeting: any, newStatus: string) => {
    try {
      // Prevent changing status if already completed
      if (meeting.status === 'completed') {
        toast({
          title: "Cannot Change Status",
          description: "This meeting is already completed and cannot be modified.",
          variant: "destructive",
        });
        return;
      }

      // Prevent changing status if currently processing
      if (meeting.status === 'processing') {
        toast({
          title: "Please Wait",
          description: "Meeting is currently being processed. Please wait...",
          variant: "destructive",
        });
        return;
      }

      // Only use "processing" state when completing (task assignment + report generation)
      if (newStatus === 'completed') {
        // Set processing state first
        await updateDoc(doc(db, "meetings", meeting.id), {
          status: 'processing',
          updatedAt: Timestamp.now(),
        });
        fetchMeetings();

        await handleMeetingCompletion(meeting);

        await updateDoc(doc(db, "meetings", meeting.id), {
          status: 'completed',
          completedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      } else {
        // For scheduled → in_progress, cancelled etc. update directly (no processing state)
        await updateDoc(doc(db, "meetings", meeting.id), {
          status: newStatus,
          updatedAt: Timestamp.now(),
        });
      }

      toast({
        title: "Success",
        description: `Meeting marked as ${newStatus.replace('_', ' ')}`,
      });

      fetchMeetings();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
      
      // Reset status if error occurred
      fetchMeetings();
    }
  };

  const handleMeetingCompletion = async (meeting: any) => {
    try {
      toast({
        title: "Processing",
        description: "Assigning tasks and generating report...",
      });

      // 1. Get all suggested tasks for this meeting
      const tasksQuery = query(
        collection(db, "tasks"),
        where("meetingId", "==", meeting.id),
        where("status", "==", "suggested")
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      
      console.log(`Found ${tasksSnapshot.size} suggested tasks to process`);
      
      // 2. Auto-assign tasks with suggested assignees OR manually selected assignees
      let assignedCount = 0;
      const assignmentPromises = [];
      
      for (const taskDoc of tasksSnapshot.docs) {
        const task = taskDoc.data();
        
        // Check if task has been manually assigned (assignedTo field) or has suggested assignee
        const assigneeId = task.assignedTo || task.suggestedAssignee;
        const assigneeName = task.assignedTo 
          ? participantNames[task.assignedTo] 
          : task.suggestedAssigneeName;
        
        console.log(`Processing task: "${task.title}"`);
        console.log(`  - assignedTo: ${task.assignedTo}`);
        console.log(`  - suggestedAssignee: ${task.suggestedAssignee}`);
        console.log(`  - Final assigneeId: ${assigneeId}`);
        console.log(`  - Final assigneeName: ${assigneeName}`);
        
        if (assigneeId) {
          // Update task status and assignment
          const updatePromise = updateDoc(doc(db, "tasks", taskDoc.id), {
            assignedTo: assigneeId,
            assignedToName: assigneeName,
            assignedBy: user?.id,
            status: "pending",
            assignedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          }).then(async () => {
            console.log(`✓ Task "${task.title}" updated in Firestore`);
            console.log(`  - Status changed to: pending`);
            console.log(`  - Assigned to: ${assigneeName} (${assigneeId})`);
            
            // Send email notification to assigned user
            const assignedUser = users.find(u => u.id === assigneeId);
            console.log(`  - Looking for user with ID: ${assigneeId}`);
            console.log(`  - Found user:`, assignedUser);
            
            if (assignedUser && assignedUser.email) {
              try {
                const dueDate = task.suggestedDueDate?.toDate().toLocaleDateString() || 
                               task.dueDate?.toDate().toLocaleDateString() || 
                               'Not specified';
                
                // Build HTML email (like welcome email)
                const priorityColor = task.priority === 'high' ? '#ef4444' : 
                                     task.priority === 'medium' ? '#f59e0b' : '#10b981';
                
                const dueDateSection = (dueDate && dueDate !== 'Not specified') ? `
                  <div style="background: #fef3c7; padding: 15px; margin-top: 15px; border-left: 4px solid #f59e0b;">
                    <strong>📅 Due Date:</strong> ${dueDate}
                  </div>
                ` : '';
                
                const html = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1e3a8a; color: white; padding: 30px; text-align: center;">
                      <h1>✅ New Task Assigned</h1>
                    </div>
                    <div style="padding: 30px; background: #f9fafb;">
                      <p>Hello <strong>${assignedUser.name}</strong>,</p>
                      <p>You have been assigned a new task from the meeting: <strong>${meeting.title}</strong></p>
                      
                      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6;">
                        <h2 style="color: #1e3a8a;">${task.title}</h2>
                        <p style="color: #6b7280;">${task.description}</p>
                        
                        <div style="margin-top: 15px;">
                          <span style="background: ${priorityColor}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                            ${task.priority.toUpperCase()} PRIORITY
                          </span>
                        </div>
                        
                        ${dueDateSection}
                      </div>
                      
                      <div style="background: #dbeafe; padding: 15px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                        <strong>💡 Next Steps:</strong>
                        <ul style="margin: 10px 0;">
                          <li>Log in to MeetSync to view full task details</li>
                          <li>Check your dashboard for all assigned tasks</li>
                          <li>Update task status as you progress</li>
                        </ul>
                      </div>
                      
                      <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
                        This is an automated message from MeetSync
                      </p>
                    </div>
                  </div>
                `;
                
                await fetch(import.meta.env.VITE_EMAIL_SERVICE_URL, {
                  method: 'POST',
                  mode: 'no-cors',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: assignedUser.email,
                    subject: `New Task Assigned: ${task.title}`,
                    html: html,
                  })
                });
                
                console.log(`✓ Email request sent to ${assignedUser.email}`);
              } catch (emailError) {
                console.error('❌ Email error:', emailError);
              }
            } else {
              console.log(`⚠ Cannot send email - User not found or no email`);
            }
          }).catch(err => {
            console.error(`❌ Error updating task "${task.title}":`, err);
          });
          
          assignmentPromises.push(updatePromise);
          assignedCount++;
        } else {
          console.log(`⚠ Task "${task.title}" has no assignee, skipping`);
        }
      }
      
      // Wait for all assignments to complete
      await Promise.all(assignmentPromises);
      
      console.log(`✓ Completed ${assignedCount} task assignments`);

      // 3. Generate meeting report using Gemini AI
      toast({
        title: "Generating Report",
        description: "Creating Minutes of Meeting...",
      });
      
      const report = await generateMeetingReport(meeting);
      
      // 4. Save report to meeting
      await updateDoc(doc(db, "meetings", meeting.id), {
        report: report,
        reportGeneratedAt: Timestamp.now(),
        tasksAssigned: assignedCount,
      });

      toast({
        title: "Meeting Completed! ✓",
        description: `${assignedCount} tasks assigned and notifications sent. Report generated.`,
      });

      // Reload tasks to show updated status
      await loadMeetingTasks(meeting.id);
      
      // Reload meetings to refresh the UI
      await fetchMeetings();

    } catch (error) {
      console.error("❌ Error completing meeting:", error);
      toast({
        title: "Warning",
        description: "Meeting marked complete but some tasks may not be assigned",
        variant: "destructive",
      });
    }
  };

  const generateMeetingReport = async (meeting: any) => {
    try {
      // Get all participants' names
      const participantsList = meeting.participants
        ?.map((id: string) => participantNames[id] || 'Unknown')
        .filter((name: string) => name !== 'Unknown') || [];

      // Get all tasks with their assignments
      const tasksQuery = query(
        collection(db, "tasks"),
        where("meetingId", "==", meeting.id)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasks = tasksSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          assignedToName: data.assignedTo ? participantNames[data.assignedTo] : 'Unassigned',
        };
      });

      // Format meeting date and time
      const meetingDate = meeting.scheduledAt?.toDate();
      const dateStr = meetingDate?.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const timeStr = meetingDate?.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      const endTime = new Date(meetingDate?.getTime() + (meeting.duration * 60000));
      const endTimeStr = endTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });

      // Use AI ONLY for summary - keep it minimal to save tokens
      const aiPrompt = `Summarize this meeting transcript in 2-3 sentences:

${meeting.transcript || 'No transcript available'}

Return ONLY the summary, nothing else.`;

      let aiSummary = "Meeting discussion summary not available.";

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: aiPrompt }]
              }]
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const summary = data.candidates[0]?.content?.parts[0]?.text || "";
          if (summary.trim()) {
            aiSummary = summary.trim();
          }
        }
      } catch (aiError) {
        console.error("AI summary error:", aiError);
      }

      // Build the report with actual data ONLY
      const report = `# Minutes of Meeting (MoM) Report

---

## 1. Meeting Information

*   **Meeting Title:** ${meeting.title}
*   **Date:** ${dateStr}
*   **Time:** ${timeStr} - ${endTimeStr}
*   **Duration:** ${meeting.duration} minutes
*   **Venue:** ${meeting.venue || 'Not specified'}
*   **Organizer:** ${meeting.createdByName || 'Unknown'}

---

## 2. Attendees

*   **Organizer:** ${meeting.createdByName || 'Unknown'}
*   **Participants:**
${participantsList.map(name => `    *   ${name}`).join('\n')}

---

## 3. Agenda Items Discussed

${meeting.agendaItems?.map((item: any, i: number) => `${i + 1}.  **${item.title}:** ${item.description || 'Discussion item'}
    *   Added by: ${item.addedByName}`).join('\n\n') || '*No agenda items were recorded*'}

---

## 4. Summary

${aiSummary}

---

## 5. Action Items

| ID | Action Item | Assigned To | Priority | Status | Due Date |
| :-- | :------------------------------------------- | :---------- | :--------- | :----- | :------- |
${tasks.map((task: any, i: number) => {
  const dueDate = task.suggestedDueDate?.toDate().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }) || task.dueDate?.toDate().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }) || 'TBD';
  
  return `| A${i + 1} | ${task.title || task.description} | ${task.assignedToName} | ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} | ${task.status === 'pending' ? 'Open' : task.status} | ${dueDate} |`;
}).join('\n')}

---

*Report generated automatically by MeetSync on ${new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}*`;

      return report;
    } catch (error) {
      console.error("Error generating report:", error);
      return "Report generation failed - " + error;
    }
  };

  const handleDelete = async () => {
    if (!deletingMeeting) return;
    
    try {
      await deleteDoc(doc(db, "meetings", deletingMeeting.id));
      
      toast({
        title: "Success",
        description: "Meeting deleted successfully",
      });

      setDeletingMeeting(null);
      fetchMeetings();
    } catch (error) {
      console.error("Error deleting meeting:", error);
      toast({
        title: "Error",
        description: "Failed to delete meeting",
        variant: "destructive",
      });
    }
  };

  const formatDate = (timestamp: any) => {
    return timestamp?.toDate().toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDateShort = (timestamp: any) => {
    return timestamp?.toDate().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const downloadDocument = (doc: any) => {
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.name;
    link.click();
  };

  const saveNewNote = async (meetingId: string) => {
    if (!user?.id) return;
    
    const noteText = newNoteText[meetingId]?.trim();
    if (!noteText) {
      toast({
        title: "Empty Note",
        description: "Please enter some text before saving",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save to note history
      await addDoc(collection(db, "note_history"), {
        meetingId,
        userId: user.id,
        userName: user.name,
        content: noteText,
        type: "manual",
        createdAt: Timestamp.now(),
      });

      toast({
        title: "Success",
        description: "Note saved successfully",
      });

      // Clear input and reload
      setNewNoteText(prev => ({ ...prev, [meetingId]: "" }));
      loadPersonalNote(meetingId);
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
    }
  };

  const saveScannedNote = async (meetingId: string) => {
    if (!user?.id || !scannedText.trim()) return;

    try {
      // Save to note history with image
      await addDoc(collection(db, "note_history"), {
        meetingId,
        userId: user.id,
        userName: user.name,
        content: scannedText,
        type: "scanned",
        imageData: scannedImage,
        createdAt: Timestamp.now(),
      });

      toast({
        title: "Success",
        description: "Scanned note saved successfully",
      });

      // Clear and reload
      setScannedText("");
      setScannedImage("");
      setShowScannedPreview(false);
      loadPersonalNote(meetingId);
    } catch (error) {
      console.error("Error saving scanned note:", error);
      toast({
        title: "Error",
        description: "Failed to save scanned note",
        variant: "destructive",
      });
    }
  };

  const updateNote = async (meetingId: string, noteId: string) => {
    if (!editNoteText.trim()) {
      toast({
        title: "Empty Note",
        description: "Note cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateDoc(doc(db, "note_history", noteId), {
        content: editNoteText,
        updatedAt: Timestamp.now(),
      });

      toast({
        title: "Success",
        description: "Note updated successfully",
      });

      setEditingNoteId(null);
      setEditNoteText("");
      loadPersonalNote(meetingId);
    } catch (error) {
      console.error("Error updating note:", error);
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    }
  };

  const deleteNote = async (meetingId: string, noteId: string) => {
    try {
      await deleteDoc(doc(db, "note_history", noteId));

      toast({
        title: "Success",
        description: "Note deleted successfully",
      });

      loadPersonalNote(meetingId);
    } catch (error) {
      console.error("Error deleting note:", error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const scanHandwrittenNote = async (meetingId: string) => {
    try {
      setScanningNote(meetingId);
      
      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use camera on mobile
      
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) {
          setScanningNote(null);
          return;
        }

        toast({
          title: "Processing",
          description: "Scanning handwritten notes using Google Cloud Vision API...",
        });

        try {
          // Convert image to base64
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64Image = event.target?.result as string;
            const base64Data = base64Image.split(',')[1];

            // Use Google Cloud Vision API for OCR
            const response = await fetch(
              `https://vision.googleapis.com/v1/images:annotate?key=${import.meta.env.VITE_VISION_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  requests: [{
                    image: {
                      content: base64Data
                    },
                    features: [{
                      type: "DOCUMENT_TEXT_DETECTION",
                      maxResults: 1
                    }]
                  }]
                })
              }
            );

            if (response.ok) {
              const data = await response.json();
              const extractedText = data.responses[0]?.fullTextAnnotation?.text || "";
              
              if (extractedText.trim()) {
                toast({
                  title: "Correcting Spelling",
                  description: "Using AI to fix OCR spelling mistakes...",
                });

                // Use Gemini to correct spelling mistakes from OCR
                try {
                  const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contents: [{
                          parts: [{
                            text: `Fix ONLY spelling mistakes in this OCR-extracted text. Keep the original meaning, formatting, and language. Do not add or remove words, just correct spelling errors.

Text:
${extractedText}

Return ONLY the corrected text, nothing else.`
                          }]
                        }]
                      })
                    }
                  );

                  let finalText = extractedText; // Default to original if correction fails
                  
                  if (geminiResponse.ok) {
                    const geminiData = await geminiResponse.json();
                    const correctedText = geminiData.candidates[0]?.content?.parts[0]?.text || "";
                    if (correctedText.trim()) {
                      finalText = correctedText.trim();
                    }
                  } else {
                    console.log("Spell correction failed, using original OCR text");
                  }

                  // Show preview dialog for editing before saving
                  setScannedText(finalText);
                  setScannedImage(base64Image);
                  setShowScannedPreview(true);
                  
                  toast({
                    title: "Text Extracted & Corrected",
                    description: "Review and edit the text before saving",
                  });
                } catch (spellCheckError) {
                  console.error("Spell check error:", spellCheckError);
                  // Still show the original text even if spell check fails
                  setScannedText(extractedText);
                  setScannedImage(base64Image);
                  setShowScannedPreview(true);
                  
                  toast({
                    title: "Text Extracted",
                    description: "Spell check unavailable, review the text",
                  });
                }
              } else {
                toast({
                  title: "No Text Found",
                  description: "Could not extract text from the image",
                  variant: "destructive",
                });
              }
            } else {
              // Get detailed error message from API
              const errorData = await response.json().catch(() => ({}));
              console.error("Vision API error:", response.status, errorData);
              
              let errorMessage = "Failed to scan handwritten notes";
              if (response.status === 400) {
                errorMessage = "Invalid image format or API request";
              } else if (response.status === 403) {
                errorMessage = "Vision API key is invalid or API not enabled";
              } else if (response.status === 429) {
                errorMessage = "API rate limit exceeded. Please try again later";
              }
              
              toast({
                title: "OCR Failed",
                description: errorMessage,
                variant: "destructive",
              });
            }
          };
          
          reader.readAsDataURL(file);
        } catch (error) {
          console.error("Error scanning note:", error);
          toast({
            title: "Error",
            description: "Failed to scan handwritten notes",
            variant: "destructive",
          });
        } finally {
          setScanningNote(null);
        }
      };
      
      input.click();
    } catch (error) {
      console.error("Error initiating scan:", error);
      setScanningNote(null);
    }
  };

  const assignTask = async (meetingId: string, task: any, assigneeId: string, dueDate: string, dueTime: string, priority?: string) => {
    try {
      const assignedUser = users.find(u => u.id === assigneeId);
      let dueDateTimestamp = task.suggestedDueDate || task.dueDate || null;

      if (dueDate) {
        const [h, m] = (dueTime || "09:00").split(':');
        const dt = new Date(dueDate);
        dt.setHours(parseInt(h), parseInt(m), 0, 0);
        dueDateTimestamp = Timestamp.fromDate(dt);
      }

      await updateDoc(doc(db, "tasks", task.id), {
        assignedTo: assigneeId,
        assignedToName: assignedUser?.name || '',
        assignedBy: user?.id,
        status: "pending",
        priority: priority || task.priority,
        dueDate: dueDateTimestamp,
        assignedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Send email notification
      if (assignedUser?.email) {
        try {
          const dueDateStr = dueDateTimestamp?.toDate().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          }) || 'Not specified';
          const dueTimeStr = dueDateTimestamp?.toDate().toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true
          }) || '';
          const priorityColor = task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#10b981';
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1e3a8a; color: white; padding: 30px; text-align: center;">
                <h1>✅ New Task Assigned</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <p>Hello <strong>${assignedUser.name}</strong>,</p>
                <p>You have been assigned a new task by <strong>${user?.name}</strong>.</p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6;">
                  <h2 style="color: #1e3a8a; margin-top: 0;">${task.title}</h2>
                  <p style="color: #6b7280;">${task.description || ''}</p>
                  <div style="margin-top: 15px;">
                    <span style="background: ${priorityColor}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                      ${(task.priority || 'medium').toUpperCase()} PRIORITY
                    </span>
                  </div>
                  ${dueDateTimestamp ? `
                  <div style="background: #fef3c7; padding: 15px; margin-top: 15px; border-left: 4px solid #f59e0b;">
                    <strong>📅 Due:</strong> ${dueDateStr} at ${dueTimeStr}
                  </div>` : ''}
                </div>
                <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
                  This is an automated message from MeetSync
                </p>
              </div>
            </div>`;

          await fetch(import.meta.env.VITE_EMAIL_SERVICE_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: assignedUser.email,
              subject: `New Task Assigned: ${task.title}`,
              html,
            }),
          });
        } catch (emailError) {
          console.error('Email error:', emailError);
        }
      }

      toast({ title: "Task Assigned", description: `Task assigned to ${assignedUser?.name} and notification sent` });
      setPendingAssignments(prev => { const n = { ...prev }; delete n[task.id]; return n; });
      loadMeetingTasks(meetingId);
    } catch (error) {
      console.error("Error assigning task:", error);
      toast({ title: "Error", description: "Failed to assign task", variant: "destructive" });
    }
  };

  const deleteTask = async (meetingId: string, taskId: string) => {
    try {
      await deleteDoc(doc(db, "tasks", taskId));

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });

      // Reload tasks
      loadMeetingTasks(meetingId);
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const updateTask = async (meetingId: string, taskId: string, updates: any) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      toast({
        title: "Success",
        description: "Task updated successfully",
      });

      // Reload tasks
      loadMeetingTasks(meetingId);
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const startRecording = async (meetingId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processRecording(meetingId, audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(meetingId);

      // Start browser speech recognition for live transcription
      // Try multiple Indian languages in sequence
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          
          // Start with Hindi as it's most commonly supported
          // User can speak Hindi, Marathi, or English - all will be captured
          recognition.lang = 'hi-IN'; // Hindi (India) - works for Hindi, Marathi, and English mix
          
          let finalTranscript = '';
          
          recognition.onresult = (event: any) => {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
                setLiveTranscript(prev => ({ ...prev, [meetingId]: finalTranscript }));
                console.log('Live transcript updated:', finalTranscript);
              } else {
                interimTranscript += transcript;
              }
            }
            
            // Also show interim results in live preview
            if (interimTranscript) {
              setLiveTranscript(prev => ({ ...prev, [meetingId]: finalTranscript + interimTranscript }));
            }
          };
          
          recognition.onerror = (event: any) => {
            console.log('Speech recognition error:', event.error);
            // If Hindi fails, try English
            if (event.error === 'language-not-supported' || event.error === 'no-speech') {
              console.log('Trying English fallback...');
              recognition.lang = 'en-IN';
              try {
                recognition.start();
              } catch (e) {
                console.log('Could not restart recognition:', e);
              }
            }
          };
          
          recognition.onend = () => {
            console.log('Speech recognition ended');
            // Auto-restart if still recording
            if (recording === meetingId && mediaRecorder && mediaRecorder.state === 'recording') {
              console.log('Auto-restarting speech recognition...');
              try {
                recognition.start();
              } catch (e) {
                console.log('Could not restart recognition:', e);
              }
            } else {
              console.log('Not restarting - recording stopped or not active');
            }
          };
          
          recognition.start();
          setSpeechRecognition(recognition);
          
          console.log('✓ Live transcription started with Hindi/Marathi/English support (hi-IN)');
          console.log('  - Speak clearly into microphone');
          console.log('  - Watch the blue "Live:" box for real-time transcript');
        } else {
          console.log('Browser speech recognition not available');
        }
      } catch (speechError) {
        console.log('Browser speech recognition error:', speechError);
      }

      toast({
        title: "Recording Started",
        description: "Speaking Hindi, Marathi, or English - all will be transcribed",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Error",
        description: "Failed to start recording. Please allow microphone access.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = (meetingId?: string) => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      
      // Stop speech recognition
      if (speechRecognition) {
        speechRecognition.stop();
        setSpeechRecognition(null);
      }
      
      setRecording(null);
      toast({
        title: "Recording Stopped",
        description: "Processing audio and generating transcript...",
      });
    }
  };

  const uploadAudio = async (meetingId: string) => {
    try {
      setUploadingAudio(meetingId);
      
      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*,.mp3,.wav,.m4a,.webm';
      
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) {
          setUploadingAudio(null);
          return;
        }

        toast({
          title: "Processing Audio",
          description: "Transcribing uploaded audio file...",
        });

        try {
          // Convert audio file to base64
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64Audio = event.target?.result as string;
            const base64Data = base64Audio.split(',')[1];

            // Use Deepgram API to transcribe
            const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=hi&punctuate=true&smart_format=true&diarize=true', {
              method: 'POST',
              headers: {
                'Authorization': `Token ${import.meta.env.VITE_DEEPGRAM_API_KEY}`,
                'Content-Type': file.type,
              },
              body: await fetch(base64Audio).then(r => r.blob()),
            });

            if (response.ok) {
              const data = await response.json();
              const deepgramTranscript = data.results?.channels[0]?.alternatives[0]?.transcript || "";
              
              if (deepgramTranscript && deepgramTranscript.trim().length > 0) {
                await processRecording(meetingId, null, deepgramTranscript);
                
                toast({
                  title: "Audio Transcribed",
                  description: "Transcript generated successfully",
                });
              } else {
                toast({
                  title: "No Speech Detected",
                  description: "Could not detect speech in the audio file",
                  variant: "destructive",
                });
              }
            } else {
              throw new Error("Transcription failed");
            }
          };
          
          reader.readAsDataURL(file);
        } catch (error) {
          console.error("Error uploading audio:", error);
          toast({
            title: "Error",
            description: "Failed to transcribe audio file",
            variant: "destructive",
          });
        } finally {
          setUploadingAudio(null);
        }
      };
      
      input.click();
    } catch (error) {
      console.error("Error initiating upload:", error);
      setUploadingAudio(null);
    }
  };

  const processRecording = async (meetingId: string, audioBlob: Blob | null, providedTranscript?: string) => {
    try {
      toast({
        title: "Processing",
        description: "Transcribing audio (Hindi/Marathi/English)...",
      });

      let newTranscript = "";
      let detectedLanguage = "unknown";
      let usedBrowserTranscript = false;
      
      // If transcript is provided (from upload), use it directly
      if (providedTranscript) {
        newTranscript = providedTranscript;
        detectedLanguage = "hi";
        console.log("✓ Using provided transcript from uploaded audio");
      } else {
        // First, check if we have live transcript from browser
        const browserTranscript = liveTranscript[meetingId]?.trim() || "";
        console.log("Browser transcript length:", browserTranscript.length);
        console.log("Browser transcript:", browserTranscript);
        
        if (browserTranscript && browserTranscript.length > 5) {
          newTranscript = browserTranscript;
          usedBrowserTranscript = true;
          detectedLanguage = "hi"; // Browser was using Hindi mode
          console.log("✓ Using live browser transcript (Hindi/Marathi)");
          
          toast({
            title: "Using Live Transcript",
            description: "Browser captured your speech successfully",
          });
        } else if (audioBlob) {
          console.log("Browser transcript too short or empty, trying Deepgram...");
          // Only use Deepgram if browser transcript is not available
          try {
            const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=hi&punctuate=true&smart_format=true&diarize=true', {
              method: 'POST',
              headers: {
                'Authorization': `Token ${import.meta.env.VITE_DEEPGRAM_API_KEY}`,
                'Content-Type': 'audio/webm',
              },
              body: audioBlob,
            });

            if (response.ok) {
              const data = await response.json();
              console.log("Deepgram response:", data);
              
              const deepgramTranscript = data.results?.channels[0]?.alternatives[0]?.transcript || "";
              detectedLanguage = data.results?.channels[0]?.detected_language || "hi";
              
              if (deepgramTranscript && deepgramTranscript.trim().length > 0) {
                newTranscript = deepgramTranscript;
                console.log("Using Deepgram transcript (Hindi):", newTranscript);
              }
            }
          } catch (deepgramError) {
            console.log("Deepgram error:", deepgramError);
          }
        }
      }
      
      // If still no transcript, show message
      if (!newTranscript || newTranscript.trim().length < 5) {
        console.log("No transcript generated");
        toast({
          title: "Transcription Issue",
          description: "Could not transcribe audio. Please check microphone and speak clearly.",
          variant: "destructive",
        });
        
        newTranscript = `[Audio recorded at ${new Date().toLocaleTimeString()}]\n[Note: Transcription failed. Please add manual notes in the Notes tab.]`;
      }

      // Check if transcript might be in Marathi/Hindi and translate to English for better task extraction
      let englishTranscript = newTranscript;
      if (newTranscript && !newTranscript.includes("[Note:")) {
        // Check if transcript contains non-English characters or is in Hindi/Marathi
        const hasDevanagari = /[\u0900-\u097F]/.test(newTranscript);
        const isLikelyIndianLanguage = detectedLanguage === "hi" || detectedLanguage === "mr" || hasDevanagari;
        
        if (isLikelyIndianLanguage) {
          toast({
            title: "Translating",
            description: "Converting to English for better task extraction...",
          });
          
          try {
            const translateResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    parts: [{
                      text: `Translate this Hindi/Marathi text to English. Keep the meaning and context intact. If it's already in English, just return it as is.\n\nText: ${newTranscript}`
                    }]
                  }]
                })
              }
            );

            if (translateResponse.ok) {
              const translateData = await translateResponse.json();
              const translated = translateData.candidates[0]?.content?.parts[0]?.text || "";
              if (translated && translated.trim().length > 0) {
                englishTranscript = translated.trim();
                console.log("Translated to English:", englishTranscript);
              }
            }
          } catch (translateError) {
            console.log("Translation error:", translateError);
            // Continue with original transcript if translation fails
          }
        }
      }

      // Get current meeting
      const meeting = meetings.find(m => m.id === meetingId);
      if (!meeting) return;

      // Save BOTH original transcript and English translation
      const existingTranscript = meeting.transcript || "";
      const transcriptEntry = detectedLanguage === "hi" || detectedLanguage === "mr" 
        ? `${newTranscript}\n[English Translation]: ${englishTranscript}`
        : newTranscript;
      
      const combinedTranscript = existingTranscript 
        ? `${existingTranscript}\n\n[Recording ${new Date().toLocaleTimeString()}]\n${transcriptEntry}`
        : transcriptEntry;

      // Save combined transcript to meeting
      await updateDoc(doc(db, "meetings", meetingId), {
        transcript: combinedTranscript,
        audioRecorded: true,
        detectedLanguage: detectedLanguage,
        updatedAt: Timestamp.now(),
      });

      // Clear live transcript
      setLiveTranscript(prev => ({ ...prev, [meetingId]: "" }));

      // Generate tasks using ENGLISH transcript for better accuracy
      if (englishTranscript && !englishTranscript.includes("[Note: Transcription failed")) {
        toast({
          title: "Transcript Ready",
          description: "Generating tasks from transcript...",
        });

        // Use English transcript for task generation
        const taskTranscript = existingTranscript 
          ? `${existingTranscript}\n\n${englishTranscript}`
          : englishTranscript;
        
        await generateTasksFromTranscript(meetingId, taskTranscript);
      } else {
        toast({
          title: "Recording Saved",
          description: "Please use the Notes tab to add manual notes.",
        });
      }

      // Refresh meetings
      fetchMeetings();
    } catch (error) {
      console.error("Error processing recording:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process recording",
        variant: "destructive",
      });
    }
  };

  const generateTasksFromTranscript = async (meetingId: string, transcript: string) => {
    try {
      console.log("Generating tasks from transcript:", transcript.substring(0, 100));
      
      const meeting = meetings.find(m => m.id === meetingId);
      if (!meeting) return;

      // Build participant list with IDs for better AI matching
      const participantList = users
        .filter(u => meeting.participants?.includes(u.id))
        .map(u => u.name);
      const participantNames = participantList.join(", ");

      console.log("Meeting participants:", participantNames);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a meeting assistant. Extract ONLY the tasks that are explicitly mentioned or clearly assigned in this transcript. Do NOT infer, assume, or create tasks that are not directly stated.

Meeting Participants (use EXACTLY these names): ${participantNames}

Rules:
- Only extract tasks that are clearly stated as action items (e.g., "make a report", "organize the event", "prepare the list")
- If a person's name or title is mentioned with a task (even partially, like "Pavan sir", "पवन", first name only), match them to the participants list and return their EXACT full name from the list above
- Do NOT split one task into multiple tasks
- Do NOT create tasks for things that are just mentioned in passing
- If no clear tasks are mentioned, return an empty array []

Return ONLY a JSON array (no markdown, no explanation):
[{
  "title": "short task title",
  "description": "brief description",
  "priority": "high/medium/low",
  "suggestedAssignee": "EXACT full name from participants list if mentioned, otherwise empty string",
  "suggestedDeadline": "deadline if mentioned (e.g., 'tomorrow', 'next week'), otherwise empty string"
}]

Meeting Transcript:
${transcript}`
              }]
            }]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Gemini response:", data);
      
      const tasksText = data.candidates[0]?.content?.parts[0]?.text || "[]";
      console.log("Tasks text:", tasksText);
      
      // Clean up the response - remove markdown code blocks if present
      const cleanedText = tasksText.replace(/```json\n?|\n?```/g, '').trim();
      console.log("Cleaned text:", cleanedText);
      
      const tasks = JSON.parse(cleanedText);
      console.log("Parsed tasks:", tasks);
      
      if (!Array.isArray(tasks) || tasks.length === 0) {
        toast({
          title: "No Tasks Found",
          description: "AI couldn't identify any action items in the transcript",
        });
        return;
      }
      
      // Get ALL existing tasks for this meeting to avoid duplicates (regardless of status)
      const existingTasksQuery = query(
        collection(db, "tasks"),
        where("meetingId", "==", meetingId)
      );
      const existingTasksSnapshot = await getDocs(existingTasksQuery);
      const existingTasks = existingTasksSnapshot.docs.map(doc => ({
        title: doc.data().title?.toLowerCase().trim() || "",
        description: doc.data().description?.toLowerCase().trim() || "",
      }));

      // Extract meaningful keywords from a string (ignore filler words only)
      const stopWords = new Set(["a","an","the","and","or","of","to","in","for","on","with","by","is","are","be","that","this","it","as","at","from","all","new"]);
      const getKeywords = (text: string) =>
        text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)
          .filter(w => w.length > 2 && !stopWords.has(w));

      const isSimilarTask = (newTitle: string, newDesc: string) => {
        const newTitleNorm = newTitle.toLowerCase().trim();
        const newTitleKeywords = new Set(getKeywords(newTitle));
        for (const existing of existingTasks) {
          // Exact title match
          if (existing.title === newTitleNorm) return true;
          // Only compare title keywords (not description) to avoid false positives
          // Require >70% overlap AND at least 2 matching keywords
          const existingTitleKeywords = new Set(getKeywords(existing.title));
          if (newTitleKeywords.size === 0 || existingTitleKeywords.size === 0) continue;
          const overlap = [...newTitleKeywords].filter(k => existingTitleKeywords.has(k)).length;
          if (overlap >= 2 && overlap / newTitleKeywords.size >= 0.7) return true;
        }
        return false;
      };

      console.log("Existing task titles:", existingTasks.map(t => t.title));
      
      // Save only NEW tasks to Firestore as "suggested" status
      const savedTasks = [];
      for (const task of tasks) {
        // Skip if task is duplicate (exact title or keyword similarity)
        if (isSimilarTask(task.title || "", task.description || "")) {
          console.log("Skipping duplicate task:", task.title);
          continue;
        }

        // Try to match suggested assignee name to actual user ID
        let suggestedUserId = "";
        if (task.suggestedAssignee) {
          const aiName = task.suggestedAssignee.toLowerCase().trim();
          const matchedUser = users.find(u => {
            const userName = u.name.toLowerCase().trim();
            const userParts = userName.split(/\s+/); // first name, last name parts
            return (
              userName === aiName ||                                      // exact match
              userName.includes(aiName) ||                               // user name contains AI name
              aiName.includes(userName) ||                               // AI name contains user name
              userParts.some(part => part.length > 2 && aiName.includes(part)) || // any name part matches
              aiName.split(/\s+/).some(part => part.length > 2 && userName.includes(part)) // AI name part in user name
            );
          });
          if (matchedUser) {
            suggestedUserId = matchedUser.id;
            console.log(`Matched "${task.suggestedAssignee}" to user:`, matchedUser.name);
          } else {
            console.log(`No match found for "${task.suggestedAssignee}" in users:`, users.map(u => u.name));
          }
        }

        // Calculate suggested due date
        let suggestedDueDate = null;
        if (task.suggestedDeadline) {
          const deadline = task.suggestedDeadline.toLowerCase();
          const now = new Date();
          
          if (deadline.includes('tomorrow')) {
            suggestedDueDate = new Date(now.setDate(now.getDate() + 1));
          } else if (deadline.includes('next week')) {
            suggestedDueDate = new Date(now.setDate(now.getDate() + 7));
          } else if (deadline.includes('3 days')) {
            suggestedDueDate = new Date(now.setDate(now.getDate() + 3));
          } else if (deadline.includes('week')) {
            suggestedDueDate = new Date(now.setDate(now.getDate() + 7));
          }
        }
        
        console.log("Saving task to Firestore:", task.title);
        
        await addDoc(collection(db, "tasks"), {
          meetingId: meetingId,
          title: task.title,
          description: task.description,
          priority: task.priority || "medium",
          status: "suggested",
          assignedBy: user?.id,
          suggestedAssignee: suggestedUserId,
          suggestedAssigneeName: task.suggestedAssignee || "",
          suggestedDueDate: suggestedDueDate ? Timestamp.fromDate(suggestedDueDate) : null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        
        savedTasks.push(task);
      }
      
      console.log("Saved tasks count:", savedTasks.length);
      
      // Reload tasks
      await loadMeetingTasks(meetingId);
      
      if (savedTasks.length > 0) {
        setActiveTab(prev => ({ ...prev, [meetingId]: "tasks" }));
        toast({
          title: "Tasks Generated",
          description: `${savedTasks.length} new task(s) extracted from transcript`,
        });
      } else {
        toast({
          title: "No New Tasks",
          description: "All identified tasks already exist",
        });
      }
    } catch (error) {
      console.error("Error generating tasks:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate tasks from transcript",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout role="Principal Dashboard" navItems={principalNav}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Meetings</h1>
          <p className="text-muted-foreground">View and manage all institutional meetings</p>
        </div>
        <AddMeetingDialog onMeetingAdded={fetchMeetings} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : meetings.length > 0 ? (
        <div className="grid gap-4">
          {meetings.map(meeting => (
            <div 
              key={meeting.id} 
              className="bg-card rounded-xl shadow-card border border-border overflow-hidden"
            >
              {/* Meeting Header - Always Visible */}
              <div 
                className="p-6 cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => toggleExpand(meeting.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{meeting.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        meeting.status === 'completed' ? 'bg-green-100 text-green-800' :
                        meeting.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        meeting.status === 'processing' ? 'bg-purple-100 text-purple-800 animate-pulse' :
                        meeting.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {meeting.status === 'processing' ? '⚙️ Processing Meeting' : meeting.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDateShort(meeting.scheduledAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {meeting.duration} minutes
                      </div>
                      {meeting.venue && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {meeting.venue}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {meeting.participants?.length || 0} participants
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    {expandedMeeting === meeting.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedMeeting === meeting.id && (
                <div className="border-t border-border bg-accent/5">
                  {/* Action Buttons */}
                  <div className="p-4 border-b border-border bg-white flex items-center justify-between">
                    <div className="flex gap-2">
                      {meeting.createdBy === user?.id && meeting.status === 'scheduled' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusChange(meeting, 'in_progress')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Start Meeting
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStatusChange(meeting, 'cancelled')}
                            className="text-red-600 hover:text-red-700"
                          >
                            Cancel Meeting
                          </Button>
                        </>
                      )}
                      {meeting.createdBy === user?.id && meeting.status === 'in_progress' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusChange(meeting, 'completed')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Mark as Completed
                          </Button>
                          {meeting.createdBy === user?.id && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => recording === meeting.id ? stopRecording() : startRecording(meeting.id)}
                                className={recording === meeting.id ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
                              >
                                {recording === meeting.id ? (
                                  <>
                                    <MicOff className="w-4 h-4 mr-2" />
                                    Stop Recording
                                  </>
                                ) : (
                                  <>
                                    <Mic className="w-4 h-4 mr-2" />
                                    Start Recording
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => uploadAudio(meeting.id)}
                                disabled={uploadingAudio === meeting.id}
                              >
                                {uploadingAudio === meeting.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Audio
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      {meeting.status === 'processing' && (
                        <div className="flex items-center gap-2 text-purple-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm font-medium">Processing meeting, please wait...</span>
                        </div>
                      )}
                      {meeting.status === 'completed' && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckSquare className="w-5 h-5" />
                            <span className="text-sm font-medium">Meeting completed successfully</span>
                          </div>
                          {/* Admin option to reprocess meeting */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (confirm('Reprocess this meeting? This will reassign tasks and regenerate the report.')) {
                                await updateDoc(doc(db, "meetings", meeting.id), {
                                  status: 'in_progress',
                                  updatedAt: Timestamp.now(),
                                });
                                toast({
                                  title: "Meeting Reopened",
                                  description: "You can now mark it as completed again to reprocess",
                                });
                                fetchMeetings();
                              }
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Reprocess
                          </Button>
                        </div>
                      )}
                      {recording === meeting.id && liveTranscript[meeting.id] && (
                        <div className="ml-4 px-3 py-1 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                          <span className="font-medium">Live: </span>
                          {liveTranscript[meeting.id].substring(0, 50)}...
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {meeting.createdBy === user?.id && meeting.status !== 'completed' && meeting.status !== 'processing' && (
                        <AddMeetingDialog
                          onMeetingAdded={fetchMeetings}
                          editMeeting={meeting}
                          trigger={
                            <Button variant="outline" size="sm">
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          }
                        />
                      )}
                      {meeting.createdBy === user?.id && meeting.status !== 'completed' && meeting.status !== 'processing' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setDeletingMeeting(meeting)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  {(meeting.status === 'scheduled' || meeting.status === 'in_progress' || meeting.status === 'completed') && (
                    <div className="flex gap-2 p-4 border-b bg-white">
                      <button
                        onClick={() => setActiveTab(prev => ({ ...prev, [meeting.id]: "details" }))}
                        className={`px-4 py-2 font-medium rounded ${activeTab[meeting.id] === "details" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                      >
                        Details
                      </button>
                      <button
                        onClick={() => setActiveTab(prev => ({ ...prev, [meeting.id]: "notes" }))}
                        className={`px-4 py-2 font-medium rounded flex items-center gap-2 ${activeTab[meeting.id] === "notes" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                      >
                        <StickyNote className="w-4 h-4" />
                        My Notes
                      </button>
                      <button
                        onClick={() => setActiveTab(prev => ({ ...prev, [meeting.id]: "tasks" }))}
                        className={`px-4 py-2 font-medium rounded flex items-center gap-2 ${activeTab[meeting.id] === "tasks" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                      >
                        <CheckSquare className="w-4 h-4" />
                        Tasks ({suggestedTasks[meeting.id]?.length || 0})
                      </button>
                      {meeting.transcript && meeting.createdBy === user?.id && (
                        <button
                          onClick={() => setActiveTab(prev => ({ ...prev, [meeting.id]: "transcript" }))}
                          className={`px-4 py-2 font-medium rounded flex items-center gap-2 ${activeTab[meeting.id] === "transcript" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                        >
                          <FileText className="w-4 h-4" />
                          Transcript
                        </button>
                      )}
                      {meeting.status === 'completed' && meeting.report && (
                        <button
                          onClick={() => setActiveTab(prev => ({ ...prev, [meeting.id]: "report" }))}
                          className={`px-4 py-2 font-medium rounded flex items-center gap-2 ${activeTab[meeting.id] === "report" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                        >
                          <FileText className="w-4 h-4" />
                          Report
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tab Content */}
                  <div className="p-6 space-y-6">
                    {(!activeTab[meeting.id] || activeTab[meeting.id] === "details") && (
                      <>
                        {/* Meeting Info */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Date & Time</Label>
                            <p className="text-sm mt-1">{formatDate(meeting.scheduledAt)}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                            <p className="text-sm mt-1">{meeting.duration} minutes</p>
                          </div>
                          {meeting.venue && (
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Venue</Label>
                              <p className="text-sm mt-1">{meeting.venue}</p>
                            </div>
                          )}
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Organizer</Label>
                            <p className="text-sm mt-1">{meeting.createdByName || 'Unknown'}</p>
                          </div>
                        </div>

                        {/* Participants */}
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground mb-2 block">Participants ({meeting.participants?.length || 0})</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {meeting.participants?.map((participantId: string) => {
                              const participant = users.find(u => u.id === participantId);
                              const displayRole = participant?.designation || participant?.role.replace(/_/g, ' ') || '';
                              return (
                                <div key={participantId} className="bg-white p-3 rounded border flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                    {participantNames[participantId]?.charAt(0) || '?'}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{participantNames[participantId] || 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{displayRole}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Agenda */}
                        {meeting.agendaItems && meeting.agendaItems.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground mb-2 block">Agenda Items</Label>
                            <div className="space-y-2">
                              {meeting.agendaItems.map((item: any, index: number) => (
                                <div key={index} className="bg-white p-4 rounded border">
                                  <p className="font-medium text-sm">{item.title}</p>
                                  {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                                  <p className="text-xs text-muted-foreground mt-2">Added by: {item.addedByName}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Documents */}
                        {meeting.documents && meeting.documents.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground mb-2 block">Documents</Label>
                            <div className="space-y-2">
                              {meeting.documents.map((doc: any) => (
                                <div key={doc.id} className="flex items-center justify-between bg-white p-3 rounded border">
                                  <div className="flex items-center gap-2 flex-1">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{doc.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Uploaded by {doc.uploadedByName} • {(doc.size / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => setPreviewDocument(doc)}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Preview
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => downloadDocument(doc)}
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {activeTab[meeting.id] === "notes" && (
                      <div className="space-y-6">
                        {/* Add New Note Section */}
                        <div className="bg-white border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <Label className="text-base font-semibold">Add New Note</Label>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => scanHandwrittenNote(meeting.id)}
                                disabled={scanningNote === meeting.id}
                              >
                                {scanningNote === meeting.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Scanning...
                                  </>
                                ) : (
                                  <>
                                    <Camera className="w-4 h-4 mr-2" />
                                    Scan Handwritten
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            value={newNoteText[meeting.id] || ""}
                            onChange={(e) => setNewNoteText(prev => ({ ...prev, [meeting.id]: e.target.value }))}
                            placeholder="Type your note here or scan handwritten notes..."
                            rows={4}
                            className="w-full mb-3"
                          />
                          <Button 
                            size="sm"
                            onClick={() => saveNewNote(meeting.id)}
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!newNoteText[meeting.id]?.trim()}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Note
                          </Button>
                        </div>

                        {/* Saved Notes List */}
                        <div>
                          <h3 className="text-base font-semibold mb-3">My Notes ({noteHistory[meeting.id]?.length || 0})</h3>
                          {noteHistory[meeting.id] && noteHistory[meeting.id].length > 0 ? (
                            <div className="space-y-3">
                              {noteHistory[meeting.id].map((note: any) => (
                                <div key={note.id} className="bg-white border rounded-lg p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        note.type === 'scanned' 
                                          ? 'bg-purple-100 text-purple-800' 
                                          : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {note.type === 'scanned' ? '📷 Scanned' : '✍️ Manual'}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {note.createdAt?.toDate().toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                    <div className="flex gap-2">
                                      {note.imageData && (
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                              <Eye className="w-4 h-4" />
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-3xl">
                                            <DialogHeader>
                                              <DialogTitle>Scanned Image</DialogTitle>
                                              <DialogDescription>
                                                Original handwritten note
                                              </DialogDescription>
                                            </DialogHeader>
                                            <div className="mt-4">
                                              <img 
                                                src={note.imageData} 
                                                alt="Scanned note" 
                                                className="w-full h-auto rounded border"
                                              />
                                            </div>
                                          </DialogContent>
                                        </Dialog>
                                      )}
                                      {editingNoteId !== note.id && (
                                        <>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => {
                                              setEditingNoteId(note.id);
                                              setEditNoteText(note.content);
                                            }}
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => {
                                              if (confirm('Delete this note?')) {
                                                deleteNote(meeting.id, note.id);
                                              }
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {editingNoteId === note.id ? (
                                    <div className="space-y-2">
                                      <Textarea
                                        value={editNoteText}
                                        onChange={(e) => setEditNoteText(e.target.value)}
                                        rows={4}
                                        className="w-full"
                                      />
                                      <div className="flex gap-2">
                                        <Button 
                                          size="sm"
                                          onClick={() => updateNote(meeting.id, note.id)}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          <Save className="w-4 h-4 mr-2" />
                                          Save Changes
                                        </Button>
                                        <Button 
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setEditingNoteId(null);
                                            setEditNoteText("");
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                              <StickyNote className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">No notes yet</p>
                              <p className="text-xs text-muted-foreground mt-1">Add your first note above</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab[meeting.id] === "tasks" && (
                      <div className="space-y-3">
                        {suggestedTasks[meeting.id]?.length > 0 ? (
                          suggestedTasks[meeting.id].map((task: any) => (
                            <div key={task.id} className="bg-white p-4 rounded border space-y-3">
                              {editingTask === task.id ? (
                                // Edit Mode
                                <>
                                  <div className="space-y-3">
                                    <div>
                                      <Label className="text-sm font-medium">Task Title</Label>
                                      <Input
                                        value={editTaskData.title || task.title}
                                        onChange={(e) => setEditTaskData({ ...editTaskData, title: e.target.value })}
                                        className="mt-1"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Description</Label>
                                      <Textarea
                                        value={editTaskData.description || task.description}
                                        onChange={(e) => setEditTaskData({ ...editTaskData, description: e.target.value })}
                                        rows={3}
                                        className="mt-1"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Priority</Label>
                                      <Select 
                                        value={editTaskData.priority || task.priority}
                                        onValueChange={(value) => setEditTaskData({ ...editTaskData, priority: value })}
                                      >
                                        <SelectTrigger className="w-full mt-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="low">Low</SelectItem>
                                          <SelectItem value="medium">Medium</SelectItem>
                                          <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Due Date & Time</Label>
                                      <div className="flex gap-2 mt-1">
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              className="flex-1 justify-start text-left font-normal"
                                            >
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {editTaskData.dueDate ? 
                                                new Date(editTaskData.dueDate).toLocaleDateString('en-US', { 
                                                  month: 'short', 
                                                  day: 'numeric', 
                                                  year: 'numeric' 
                                                }) : 
                                                (task.suggestedDueDate || task.dueDate) ?
                                                  (task.suggestedDueDate || task.dueDate).toDate().toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric', 
                                                    year: 'numeric' 
                                                  }) :
                                                  "Pick a date"
                                              }
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarComponent
                                              mode="single"
                                              selected={editTaskData.dueDate ? new Date(editTaskData.dueDate) : (task.suggestedDueDate || task.dueDate)?.toDate()}
                                              onSelect={(date) => {
                                                if (date) {
                                                  // Preserve existing time if set
                                                  const existingTime = selectedTime[task.id] || "09:00";
                                                  const [hours, minutes] = existingTime.split(':');
                                                  date.setHours(parseInt(hours), parseInt(minutes));
                                                  setEditTaskData({ ...editTaskData, dueDate: date.getTime() });
                                                }
                                              }}
                                              initialFocus
                                            />
                                          </PopoverContent>
                                        </Popover>
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-4 h-4 text-muted-foreground" />
                                          <Input
                                            type="time"
                                            value={selectedTime[task.id] || (editTaskData.dueDate ? new Date(editTaskData.dueDate).toTimeString().slice(0, 5) : "09:00")}
                                            onChange={(e) => {
                                              setSelectedTime(prev => ({ ...prev, [task.id]: e.target.value }));
                                              if (editTaskData.dueDate) {
                                                const date = new Date(editTaskData.dueDate);
                                                const [hours, minutes] = e.target.value.split(':');
                                                date.setHours(parseInt(hours), parseInt(minutes));
                                                setEditTaskData({ ...editTaskData, dueDate: date.getTime() });
                                              }
                                            }}
                                            className="w-28"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 pt-2 border-t">
                                    <Button 
                                      size="sm"
                                      onClick={() => {
                                        const updates = { ...editTaskData };
                                        // Convert dueDate timestamp to Firestore Timestamp if it exists
                                        if (updates.dueDate) {
                                          updates.dueDate = Timestamp.fromMillis(updates.dueDate);
                                        }
                                        updateTask(meeting.id, task.id, updates);
                                        setEditingTask(null);
                                        setEditTaskData({});
                                      }}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Save Changes
                                    </Button>
                                    <Button 
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingTask(null);
                                        setEditTaskData({});
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                // View Mode
                                <>
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-semibold text-base">{task.title}</p>
                                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                                      
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        <span className={`text-xs px-2 py-1 rounded inline-block ${
                                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-green-100 text-green-800'
                                        }`}>
                                          {task.priority} priority
                                        </span>
                                        
                                        <span className={`text-xs px-2 py-1 rounded inline-block ${
                                          task.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                                          task.status === 'suggested' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {task.status}
                                        </span>
                                        
                                        {task.assignedTo && participantNames[task.assignedTo] && (
                                          <span className="text-xs px-2 py-1 rounded inline-block bg-green-100 text-green-800">
                                            {task.status === 'pending' ? '✓ Assigned to:' : '👤 Selected:'} {participantNames[task.assignedTo]}
                                          </span>
                                        )}
                                        
                                        {!task.assignedTo && task.suggestedAssigneeName && (
                                          <span className="text-xs px-2 py-1 rounded inline-block bg-purple-100 text-purple-800">
                                            💡 Suggested: {task.suggestedAssigneeName}
                                          </span>
                                        )}
                                        
                                        {(task.suggestedDueDate || task.dueDate) && (
                                          <span className="text-xs px-2 py-1 rounded inline-block bg-orange-100 text-orange-800">
                                            📅 Due: {(task.suggestedDueDate || task.dueDate)?.toDate().toLocaleDateString('en-US', { 
                                              month: 'short', 
                                              day: 'numeric', 
                                              year: 'numeric' 
                                            })} at {(task.suggestedDueDate || task.dueDate)?.toDate().toLocaleTimeString('en-US', { 
                                              hour: '2-digit', 
                                              minute: '2-digit',
                                              hour12: true 
                                            })}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      {meeting.createdBy === user?.id && (
                                      <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingTask(task.id);
                                          setEditTaskData({
                                            title: task.title,
                                            description: task.description,
                                            priority: task.priority
                                          });
                                        }}
                                      >
                                        <Pencil className="w-4 h-4 mr-1" />
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          if (confirm('Are you sure you want to delete this task?')) {
                                            deleteTask(meeting.id, task.id);
                                          }
                                        }}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                      </Button>
                                      </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2 pt-2 border-t">
                                    {meeting.createdBy === user?.id ? (
                                      !task.assignedTo ? (
                                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                                        <Label className="text-sm font-semibold">Assign Task</Label>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                          <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Assign to</Label>
                                            <Select
                                              value={pendingAssignments[task.id]?.assigneeId || task.suggestedAssignee || ""}
                                              onValueChange={(value) =>
                                                setPendingAssignments(prev => ({
                                                  ...prev,
                                                  [task.id]: { assigneeId: value, dueDate: prev[task.id]?.dueDate || "", dueTime: prev[task.id]?.dueTime || "09:00" }
                                                }))
                                              }
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select person..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {users.filter(u => meeting.participants?.includes(u.id)).map(u => (
                                                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Priority</Label>
                                            <Select
                                              value={pendingAssignments[task.id]?.priority || task.priority || "medium"}
                                              onValueChange={(value) =>
                                                setPendingAssignments(prev => ({
                                                  ...prev,
                                                  [task.id]: { ...prev[task.id] || { assigneeId: "", dueDate: "", dueTime: "09:00" }, priority: value }
                                                }))
                                              }
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Due Date</Label>
                                            <Input
                                              type="date"
                                              value={pendingAssignments[task.id]?.dueDate || (task.suggestedDueDate ? task.suggestedDueDate.toDate().toISOString().split('T')[0] : "")}
                                              onChange={(e) =>
                                                setPendingAssignments(prev => ({
                                                  ...prev,
                                                  [task.id]: { ...prev[task.id] || { assigneeId: "", dueDate: "", dueTime: "09:00" }, dueDate: e.target.value }
                                                }))
                                              }
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Due Time</Label>
                                            <Input
                                              type="time"
                                              value={pendingAssignments[task.id]?.dueTime || "09:00"}
                                              onChange={(e) =>
                                                setPendingAssignments(prev => ({
                                                  ...prev,
                                                  [task.id]: { ...prev[task.id] || { assigneeId: "", dueDate: "", dueTime: "09:00" }, dueTime: e.target.value }
                                                }))
                                              }
                                            />
                                          </div>
                                        </div>
                                        <Button
                                          size="sm"
                                          className="bg-teal-600 hover:bg-teal-700 w-full"
                                          disabled={!(pendingAssignments[task.id]?.assigneeId || task.suggestedAssignee) || !(pendingAssignments[task.id]?.dueDate || task.suggestedDueDate)}
                                          onClick={() => {
                                            const p = pendingAssignments[task.id];
                                            const assigneeId = p?.assigneeId || task.suggestedAssignee || "";
                                            const dueDate = p?.dueDate || (task.suggestedDueDate ? task.suggestedDueDate.toDate().toISOString().split('T')[0] : "");
                                            const dueTime = p?.dueTime || "09:00";
                                            const priority = p?.priority;
                                            assignTask(meeting.id, task, assigneeId, dueDate, dueTime, priority);
                                          }}
                                        >
                                          Assign & Send Notification
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-green-600 font-medium">
                                        ✓ Assigned to {task.assignedToName || participantNames[task.assignedTo]} — notification sent
                                      </div>
                                    )
                                    ) : (
                                      /* Participant view — read-only assignment info */
                                      task.assignedTo ? (
                                        <div className="text-sm text-green-600 font-medium">
                                          ✓ Assigned to {task.assignedToName || participantNames[task.assignedTo]}
                                        </div>
                                      ) : task.suggestedAssigneeName ? (
                                        <div className="text-sm text-purple-600">
                                          💡 Suggested: {task.suggestedAssigneeName}
                                        </div>
                                      ) : null
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No tasks generated yet. Start recording to generate tasks automatically.
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab[meeting.id] === "transcript" && (
                      <div className="space-y-3">
                        <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
                          <p className="text-sm whitespace-pre-wrap">{meeting.transcript || "No transcript available"}</p>
                        </div>
                      </div>
                    )}

                    {activeTab[meeting.id] === "report" && (
                      <div className="space-y-3">
                        <div className="bg-white p-6 rounded border">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Minutes of Meeting (MoM)</h3>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(meeting.report || '');
                                  toast({ title: "Copied", description: "Report copied to clipboard" });
                                }}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Copy
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    await setDoc(doc(db, "mom_documents", meeting.id), {
                                      meetingId: meeting.id,
                                      meetingTitle: meeting.title,
                                      report: meeting.report,
                                      createdByName: meeting.createdByName || "",
                                      completedAt: meeting.completedAt,
                                      savedAt: Timestamp.now(),
                                    });
                                    toast({ title: "Saved", description: "MoM saved to documents" });
                                  } catch {
                                    toast({ title: "Error", description: "Failed to save", variant: "destructive" });
                                  }
                                }}
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => downloadAsPDF(meeting.report, meeting.title)}>
                                <FileText className="w-4 h-4 mr-1" />
                                PDF
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => downloadAsWord(meeting.report, meeting.title)}>
                                <Download className="w-4 h-4 mr-1" />
                                Word
                              </Button>
                            </div>
                          </div>
                          <div className="prose prose-sm max-w-none report-content">
                            <style>{`
                              .report-content h1 { font-size: 1.5rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 1rem; }
                              .report-content h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.75rem; color: #1e40af; }
                              .report-content hr { margin: 1.5rem 0; border-color: #e5e7eb; }
                              .report-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
                              .report-content table th { background: #f3f4f6; padding: 0.75rem; text-align: left; font-weight: 600; border: 1px solid #d1d5db; }
                              .report-content table td { padding: 0.75rem; border: 1px solid #d1d5db; }
                              .report-content table tr:nth-child(even) { background: #f9fafb; }
                              .report-content ul { margin-left: 1.5rem; }
                              .report-content li { margin: 0.25rem 0; }
                            `}</style>
                            <div 
                              dangerouslySetInnerHTML={{
                                __html: (meeting.report || "Report not generated yet")
                                  // Convert markdown to HTML
                                  .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                                  .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                                  .replace(/^---$/gm, '<hr />')
                                  // Convert markdown table to HTML table
                                  .replace(/\| ID \| Action Item.*\n\| :--.*\n((?:\|.*\n?)+)/g, (match, rows) => {
                                    const tableRows = rows.trim().split('\n').map(row => {
                                      const cells = row.split('|').filter(c => c.trim()).map(c => c.trim());
                                      return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
                                    }).join('');
                                    return `<table>
                                      <thead>
                                        <tr>
                                          <th>ID</th>
                                          <th>Action Item</th>
                                          <th>Assigned To</th>
                                          <th>Priority</th>
                                          <th>Status</th>
                                          <th>Due Date</th>
                                        </tr>
                                      </thead>
                                      <tbody>${tableRows}</tbody>
                                    </table>`;
                                  })
                                  // Convert bullet points
                                  .replace(/^\*   \*\*(.+?):\*\* (.+)$/gm, '<div style="margin-left: 1.5rem;"><strong>$1:</strong> $2</div>')
                                  .replace(/^\*   (.+)$/gm, '<div style="margin-left: 2rem;">• $1</div>')
                                  // Convert bold and italic
                                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\*(.+?)\*/g, '<em>$1</em>')
                                  // Convert line breaks
                                  .replace(/\n\n/g, '<br/><br/>')
                                  .replace(/\n/g, '<br/>')
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl p-12 text-center border border-border">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No meetings yet</h3>
          <p className="text-muted-foreground mb-4">Schedule your first meeting to get started</p>
          <AddMeetingDialog onMeetingAdded={fetchMeetings} />
        </div>
      )}

      {/* Scanned Text Preview Dialog */}
      <Dialog open={showScannedPreview} onOpenChange={setShowScannedPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Review Scanned Text</DialogTitle>
            <DialogDescription>
              Edit the extracted text if needed, then save
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-auto max-h-[70vh]">
            {scannedImage && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Original Image</Label>
                <img 
                  src={scannedImage} 
                  alt="Scanned note" 
                  className="w-full h-auto rounded border max-h-64 object-contain"
                />
              </div>
            )}
            <div>
              <Label className="text-sm font-medium mb-2 block">Extracted Text (Editable)</Label>
              <Textarea
                value={scannedText}
                onChange={(e) => setScannedText(e.target.value)}
                rows={10}
                className="w-full"
                placeholder="Extracted text will appear here..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowScannedPreview(false);
                  setScannedText("");
                  setScannedImage("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const meetingId = expandedMeeting;
                  if (meetingId) {
                    saveScannedNote(meetingId);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDocument?.name}</DialogTitle>
            <DialogDescription>
              Uploaded by {previewDocument?.uploadedByName}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {previewDocument?.type.startsWith('image/') ? (
              <img 
                src={previewDocument.data} 
                alt={previewDocument.name}
                className="w-full h-auto"
              />
            ) : previewDocument?.type === 'application/pdf' ? (
              <iframe
                src={previewDocument.data}
                className="w-full h-[70vh]"
                title={previewDocument.name}
              />
            ) : (
              <div className="text-center p-12">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Preview not available for this file type
                </p>
                <Button onClick={() => downloadDocument(previewDocument)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download to View
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingMeeting} onOpenChange={(open) => !open && setDeletingMeeting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingMeeting?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default PrincipalMeetings;
