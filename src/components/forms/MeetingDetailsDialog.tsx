import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, deleteDoc, getDocs, collection, Timestamp, addDoc, query, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types/user.types";
import { Loader2, Pencil, Trash2, X, Plus, Download, FileText, Calendar, Clock, MapPin, Users as UsersIcon, Eye, Upload, Mic, MicOff, StickyNote, CheckSquare } from "lucide-react";
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

interface MeetingDetailsDialogProps {
  meeting: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMeetingUpdated?: () => void;
}

/** Small inline component for non-creator participants to add agenda to PRC meetings */
const AddAgendaInDialog = ({ meeting, user, onSaved }: { meeting: any; user: any; onSaved?: () => void }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const newItem = {
        id: `agenda_${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        addedBy: user?.id || '',
        addedByName: user?.name || '',
        order: (meeting.agendaItems?.length || 0),
        createdAt: Timestamp.now(),
      };
      await updateDoc(doc(db, "meetings", meeting.id), {
        agendaItems: [...(meeting.agendaItems || []), newItem],
        updatedAt: Timestamp.now(),
      });
      toast({ title: "Agenda item added" });
      setTitle(""); setDescription(""); setOpen(false);
      onSaved?.();
    } catch {
      toast({ title: "Error", description: "Failed to add agenda item", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-1" />
        Add Agenda Item
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 border border-blue-200 rounded-lg bg-blue-50 w-72">
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Agenda item title *" disabled={saving} />
      <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} disabled={saving} />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAdd} disabled={saving || !title.trim()} className="flex-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Add
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
};

export const MeetingDetailsDialog = ({ meeting, open, onOpenChange, onMeetingUpdated }: MeetingDetailsDialogProps) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [personalNote, setPersonalNote] = useState("");
  const [suggestedTasks, setSuggestedTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "tasks" | "transcript">("details");
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: meeting.title,
    scheduledDate: "",
    scheduledTime: "",
    duration: meeting.duration?.toString() || "60",
    venue: meeting.venue || "",
    participants: meeting.participants || [],
    agendaItems: meeting.agendaItems || [],
    documents: meeting.documents || [],
  });

  const [newAgendaItem, setNewAgendaItem] = useState({ title: "", description: "" });
  const [previewDocument, setPreviewDocument] = useState<any>(null);

  useEffect(() => {
    if (meeting.scheduledAt) {
      const date = meeting.scheduledAt.toDate();
      setFormData(prev => ({
        ...prev,
        scheduledDate: date.toISOString().split('T')[0],
        scheduledTime: date.toTimeString().slice(0, 5),
      }));
    }
    fetchUsers();
    loadPersonalNote();
    loadMeetingTasks();
  }, [meeting]);

  const loadPersonalNote = async () => {
    if (!user?.id) return;
    try {
      const noteDoc = await getDocs(
        query(collection(db, "personal_notes"), 
          where("meetingId", "==", meeting.id),
          where("userId", "==", user.id)
        )
      );
      if (!noteDoc.empty) {
        setPersonalNote(noteDoc.docs[0].data().content || "");
      }
    } catch (error) {
      console.error("Error loading note:", error);
    }
  };

  const loadMeetingTasks = async () => {
    try {
      console.log("Loading tasks for meeting:", meeting.id);
      
      const tasksQuery = query(
        collection(db, "tasks"),
        where("meetingId", "==", meeting.id),
        where("status", "==", "suggested")
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      
      console.log("Found tasks:", tasksSnapshot.size);
      
      const tasks = tasksSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Task data:", data);
        return { id: doc.id, ...data };
      });
      
      console.log("Setting suggested tasks:", tasks);
      setSuggestedTasks(tasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const savePersonalNote = async () => {
    if (!user?.id) return;
    try {
      const noteQuery = query(
        collection(db, "personal_notes"),
        where("meetingId", "==", meeting.id),
        where("userId", "==", user.id)
      );
      const noteSnapshot = await getDocs(noteQuery);

      if (noteSnapshot.empty) {
        await addDoc(collection(db, "personal_notes"), {
          meetingId: meeting.id,
          userId: user.id,
          userName: user.name,
          content: personalNote,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      } else {
        await updateDoc(doc(db, "personal_notes", noteSnapshot.docs[0].id), {
          content: personalNote,
          updatedAt: Timestamp.now(),
        });
      }

      toast({
        title: "Success",
        description: "Note saved successfully",
      });
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
    }
  };

  const startRecording = async () => {
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
        await processRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setAudioChunks(chunks);

      toast({
        title: "Recording Started",
        description: "Meeting audio is being recorded",
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

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      toast({
        title: "Recording Stopped",
        description: "Processing audio and generating transcript...",
      });
    }
  };

  const processRecording = async (audioBlob: Blob) => {
    try {
      toast({
        title: "Processing",
        description: "Transcribing audio...",
      });

      // Call Deepgram API for transcription with multi-language support
      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=multi&detect_language=true&punctuate=true&smart_format=true', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${import.meta.env.VITE_DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/webm',
        },
        body: audioBlob,
      });

      if (!response.ok) {
        throw new Error(`Deepgram API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Deepgram response:", data);
      
      const newTranscript = data.results?.channels[0]?.alternatives[0]?.transcript || "";
      
      if (!newTranscript) {
        throw new Error("No transcript generated");
      }

      // Get existing transcript and append new one
      const existingTranscript = meeting.transcript || "";
      const combinedTranscript = existingTranscript 
        ? `${existingTranscript}\n\n[Recording ${new Date().toLocaleTimeString()}]\n${newTranscript}`
        : newTranscript;

      // Save combined transcript to meeting
      await updateDoc(doc(db, "meetings", meeting.id), {
        transcript: combinedTranscript,
        audioRecorded: true,
        updatedAt: Timestamp.now(),
      });

      // Update local meeting object
      meeting.transcript = combinedTranscript;

      toast({
        title: "Transcript Ready",
        description: "Generating tasks from transcript...",
      });

      // Generate tasks using Gemini AI from the FULL transcript
      await generateTasksFromTranscript(combinedTranscript);

      if (onMeetingUpdated) onMeetingUpdated();
    } catch (error) {
      console.error("Error processing recording:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process recording",
        variant: "destructive",
      });
    }
  };

  const generateTasksFromTranscript = async (transcript: string) => {
    try {
      console.log("Generating tasks from transcript:", transcript.substring(0, 100));
      
      // Get list of participant names for AI to match
      const participantNames = users
        .filter(u => meeting.participants?.includes(u.id))
        .map(u => u.name)
        .join(", ");

      console.log("Meeting participants:", participantNames);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analyze this meeting transcript and extract ALL action items and tasks. 

Meeting Participants: ${participantNames}

IMPORTANT: If a person's name is mentioned with a task (e.g., "Anubhav will make the report", "assign this to Rajesh", "John should handle this"), include that person's name in the suggestedAssignee field. Match names from the participant list above.

Also try to detect deadlines or timeframes mentioned (e.g., "by tomorrow", "next week", "in 3 days").

Return ONLY a JSON array with this exact format (no markdown, no explanation):
[{
  "title": "task title",
  "description": "detailed task description",
  "priority": "high/medium/low",
  "suggestedAssignee": "person name if mentioned, otherwise empty string",
  "suggestedDeadline": "deadline if mentioned (e.g., 'tomorrow', 'next week', '3 days'), otherwise empty string"
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
      
      // Get existing suggested tasks to avoid duplicates
      const existingTasksQuery = query(
        collection(db, "tasks"),
        where("meetingId", "==", meeting.id),
        where("status", "==", "suggested")
      );
      const existingTasksSnapshot = await getDocs(existingTasksQuery);
      const existingTitles = new Set(existingTasksSnapshot.docs.map(doc => doc.data().title));
      
      console.log("Existing task titles:", Array.from(existingTitles));
      
      // Save only NEW tasks to Firestore as "suggested" status
      const savedTasks = [];
      for (const task of tasks) {
        // Skip if task with same title already exists
        if (existingTitles.has(task.title)) {
          console.log("Skipping duplicate task:", task.title);
          continue;
        }

        // Try to match suggested assignee name to actual user ID
        let suggestedUserId = "";
        if (task.suggestedAssignee) {
          const matchedUser = users.find(u => 
            u.name.toLowerCase().includes(task.suggestedAssignee.toLowerCase()) ||
            task.suggestedAssignee.toLowerCase().includes(u.name.toLowerCase())
          );
          if (matchedUser) {
            suggestedUserId = matchedUser.id;
            console.log(`Matched "${task.suggestedAssignee}" to user:`, matchedUser.name);
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
        
        const taskDoc = await addDoc(collection(db, "tasks"), {
          meetingId: meeting.id,
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
        
        console.log("Task saved with ID:", taskDoc.id);
        
        savedTasks.push({ 
          id: taskDoc.id, 
          ...task,
          suggestedAssignee: suggestedUserId,
          suggestedAssigneeName: task.suggestedAssignee || "",
          suggestedDueDate: suggestedDueDate ? Timestamp.fromDate(suggestedDueDate) : null,
        });
      }
      
      console.log("Saved tasks count:", savedTasks.length);
      
      // Reload all suggested tasks
      await loadMeetingTasks();
      
      if (savedTasks.length > 0) {
        setActiveTab("tasks");
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

  const assignTask = async (task: any, assigneeId: string, dueDate?: Date) => {
    try {
      // Update existing task or create new one
      if (task.id) {
        await updateDoc(doc(db, "tasks", task.id), {
          assignedTo: assigneeId,
          dueDate: dueDate ? Timestamp.fromDate(dueDate) : (task.suggestedDueDate || null),
          status: "pending",
          updatedAt: Timestamp.now(),
        });
      } else {
        await addDoc(collection(db, "tasks"), {
          meetingId: meeting.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          assignedTo: assigneeId,
          assignedBy: user?.id,
          dueDate: dueDate ? Timestamp.fromDate(dueDate) : null,
          status: "pending",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      toast({
        title: "Success",
        description: "Task assigned successfully",
      });

      // Remove from suggested tasks
      setSuggestedTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (error) {
      console.error("Error assigning task:", error);
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive",
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const usersList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(u => u.id !== user?.id && !(u as any).isDeleted);
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      
      await updateDoc(doc(db, "meetings", meeting.id), {
        title: formData.title,
        scheduledAt: Timestamp.fromDate(scheduledDateTime),
        duration: parseInt(formData.duration),
        venue: formData.venue,
        participants: formData.participants,
        agendaItems: formData.agendaItems,
        updatedAt: Timestamp.now(),
      });

      toast({
        title: "Success",
        description: "Meeting updated successfully",
      });

      setEditing(false);
      if (onMeetingUpdated) onMeetingUpdated();
    } catch (error) {
      console.error("Error updating meeting:", error);
      toast({
        title: "Error",
        description: "Failed to update meeting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "meetings", meeting.id));
      
      toast({
        title: "Success",
        description: "Meeting deleted successfully",
      });

      onOpenChange(false);
      if (onMeetingUpdated) onMeetingUpdated();
    } catch (error) {
      console.error("Error deleting meeting:", error);
      toast({
        title: "Error",
        description: "Failed to delete meeting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "meetings", meeting.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      toast({
        title: "Success",
        description: `Meeting marked as ${newStatus.replace('_', ' ')}`,
      });

      if (onMeetingUpdated) onMeetingUpdated();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter((id: string) => id !== userId)
        : [...prev.participants, userId]
    }));
  };

  const addAgendaItem = () => {
    if (!newAgendaItem.title.trim()) return;

    const newItem = {
      id: `agenda_${Date.now()}`,
      title: newAgendaItem.title,
      description: newAgendaItem.description,
      addedBy: user?.id || '',
      addedByName: user?.name || '',
      order: formData.agendaItems.length,
      createdAt: Timestamp.now(),
    };

    setFormData(prev => ({
      ...prev,
      agendaItems: [...prev.agendaItems, newItem]
    }));
    setNewAgendaItem({ title: "", description: "" });
  };

  const removeAgendaItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      agendaItems: prev.agendaItems.filter((_: any, i: number) => i !== index)
    }));
  };

  const downloadDocument = (doc: any) => {
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.name;
    link.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      for (const file of files) {
        if (file.size > maxSize) {
          toast({
            title: "File Too Large",
            description: `${file.name} is larger than 5MB`,
            variant: "destructive",
          });
          continue;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          const newDoc = {
            id: `doc_${Date.now()}_${Math.random()}`,
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
            uploadedBy: user?.id || '',
            uploadedByName: user?.name || '',
            uploadedAt: Timestamp.now(),
          };

          const updatedDocs = [...formData.documents, newDoc];
          setFormData(prev => ({ ...prev, documents: updatedDocs }));

          // Update in Firestore immediately
          try {
            await updateDoc(doc(db, "meetings", meeting.id), {
              documents: updatedDocs,
              updatedAt: Timestamp.now(),
            });

            toast({
              title: "Success",
              description: "Document uploaded successfully",
            });

            if (onMeetingUpdated) onMeetingUpdated();
          } catch (error) {
            console.error("Error uploading document:", error);
            toast({
              title: "Error",
              description: "Failed to upload document",
              variant: "destructive",
            });
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeDocument = async (docId: string) => {
    try {
      const updatedDocs = formData.documents.filter((d: any) => d.id !== docId);
      setFormData(prev => ({ ...prev, documents: updatedDocs }));

      await updateDoc(doc(db, "meetings", meeting.id), {
        documents: updatedDocs,
        updatedAt: Timestamp.now(),
      });

      toast({
        title: "Success",
        description: "Document removed successfully",
      });

      if (onMeetingUpdated) onMeetingUpdated();
    } catch (error) {
      console.error("Error removing document:", error);
      toast({
        title: "Error",
        description: "Failed to remove document",
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{editing ? "Edit Meeting" : "Meeting Details"}</span>
              <div className="flex gap-2">
                {!editing && meeting.createdBy === user?.id && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Meeting Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Venue</Label>
                  <Input
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Participants</Label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-accent/10 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.participants.includes(u.id)}
                        onChange={() => toggleParticipant(u.id)}
                        disabled={loading}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{u.name} ({u.role.replace('_', ' ')})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Agenda Items</Label>
                <div className="border rounded-lg p-3 space-y-2">
                  {formData.agendaItems.map((item: any, index: number) => (
                    <div key={index} className="bg-accent/10 p-3 rounded flex justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeAgendaItem(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="space-y-2 pt-2 border-t">
                    <Input
                      placeholder="New agenda item"
                      value={newAgendaItem.title}
                      onChange={(e) => setNewAgendaItem({ ...newAgendaItem, title: e.target.value })}
                    />
                    <Textarea
                      placeholder="Description"
                      value={newAgendaItem.description}
                      onChange={(e) => setNewAgendaItem({ ...newAgendaItem, description: e.target.value })}
                      rows={2}
                    />
                    <Button variant="outline" size="sm" onClick={addAgendaItem} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Agenda Item
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleUpdate} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Change Buttons */}
              <div className="flex gap-2 p-4 bg-accent/10 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">Meeting Status</p>
                  <div className="flex gap-2">
                    {meeting.createdBy === user?.id && meeting.status === 'scheduled' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Start Meeting
                      </Button>
                    )}
                    {meeting.createdBy === user?.id && meeting.status === 'in_progress' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStatusChange('completed')}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Mark as Completed
                      </Button>
                    )}
                    {meeting.createdBy === user?.id && meeting.status === 'scheduled' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStatusChange('cancelled')}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700"
                      >
                        Cancel Meeting
                      </Button>
                    )}
                    {meeting.status === 'completed' && (
                      <span className="px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                        ✓ Meeting Completed
                      </span>
                    )}
                    {meeting.status === 'cancelled' && (
                      <span className="px-4 py-2 bg-red-100 text-red-800 rounded-md text-sm font-medium">
                        ✗ Meeting Cancelled
                      </span>
                    )}
                    {/* HOD can add agenda to PRC meetings before they start */}
                    {meeting.meetingType === 'prc' && meeting.status === 'scheduled' && meeting.createdBy !== user?.id && (
                      <AddAgendaInDialog meeting={meeting} user={user} onSaved={onMeetingUpdated} />
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Created by</p>
                  <p className="text-sm font-medium">{meeting.createdByName || 'Unknown'}</p>
                </div>
              </div>

              {/* Meeting Features: Recording, Notes, Tasks, Transcript */}
              {(meeting.status === 'in_progress' || meeting.status === 'completed') && (
                <div className="border border-border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-blue-900">
                      {meeting.status === 'in_progress' ? 'Meeting In Progress' : 'Meeting Completed'}
                    </h3>
                    {meeting.createdBy === user?.id && meeting.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={recording ? stopRecording : startRecording}
                        className={recording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
                      >
                        {recording ? (
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
                    )}
                  </div>

                  {/* Tabs for Details, Notes, Tasks, Transcript */}
                  <div className="flex gap-2 mb-4 border-b">
                    <button
                      onClick={() => setActiveTab("details")}
                      className={`px-4 py-2 font-medium ${activeTab === "details" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
                    >
                      Details
                    </button>
                    <button
                      onClick={() => setActiveTab("notes")}
                      className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === "notes" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
                    >
                      <StickyNote className="w-4 h-4" />
                      My Notes
                    </button>
                    <button
                      onClick={() => setActiveTab("tasks")}
                      className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === "tasks" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
                    >
                      <CheckSquare className="w-4 h-4" />
                      Tasks ({suggestedTasks.length})
                    </button>
                    {meeting.transcript && (
                      <button
                        onClick={() => setActiveTab("transcript")}
                        className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === "transcript" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
                      >
                        <FileText className="w-4 h-4" />
                        Transcript
                      </button>
                    )}
                  </div>

                  {/* Tab Content */}
                  {activeTab === "notes" && (
                    <div className="space-y-3">
                      <Label>Personal Notes</Label>
                      <Textarea
                        value={personalNote}
                        onChange={(e) => setPersonalNote(e.target.value)}
                        placeholder="Take notes during the meeting..."
                        rows={8}
                        className="w-full"
                      />
                      <Button onClick={savePersonalNote} size="sm">
                        Save Notes
                      </Button>
                    </div>
                  )}

                  {activeTab === "tasks" && (
                    <div className="space-y-3">
                      {suggestedTasks.length > 0 ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            AI-generated tasks from meeting transcript. Review and confirm assignments:
                          </p>
                          {suggestedTasks.map((task, index) => (
                            <div key={task.id || index} className="bg-white p-4 rounded border space-y-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-semibold text-base">{task.title}</p>
                                  <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                                  
                                  <div className="flex gap-2 mt-2">
                                    <span className={`text-xs px-2 py-1 rounded inline-block ${
                                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {task.priority} priority
                                    </span>
                                    
                                    {task.suggestedAssigneeName && (
                                      <span className="text-xs px-2 py-1 rounded inline-block bg-blue-100 text-blue-800">
                                        Suggested: {task.suggestedAssigneeName}
                                      </span>
                                    )}
                                    
                                    {task.suggestedDueDate && (
                                      <span className="text-xs px-2 py-1 rounded inline-block bg-purple-100 text-purple-800">
                                        Due: {task.suggestedDueDate.toDate().toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 items-center pt-2 border-t">
                                <Label className="text-sm font-medium">Assign to:</Label>
                                <Select 
                                  defaultValue={task.suggestedAssignee || ""}
                                  onValueChange={(value) => {
                                    // Store the selected value temporarily
                                    task.selectedAssignee = value;
                                  }}
                                >
                                  <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select person..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {users.filter(u => meeting.participants?.includes(u.id)).map(u => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {u.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Label className="text-sm font-medium ml-2">Due Date:</Label>
                                <Input
                                  type="date"
                                  className="w-[160px]"
                                  defaultValue={task.suggestedDueDate ? task.suggestedDueDate.toDate().toISOString().split('T')[0] : ""}
                                  onChange={(e) => {
                                    task.selectedDueDate = e.target.value ? new Date(e.target.value) : null;
                                  }}
                                />

                                <Button 
                                  size="sm"
                                  onClick={() => {
                                    const assigneeId = task.selectedAssignee || task.suggestedAssignee;
                                    if (!assigneeId) {
                                      toast({
                                        title: "Error",
                                        description: "Please select a person to assign this task",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    assignTask(task, assigneeId, task.selectedDueDate);
                                  }}
                                  className="ml-auto bg-blue-600 hover:bg-blue-700"
                                >
                                  Confirm & Assign
                                </Button>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          {recording ? "Recording in progress..." : "Start recording to generate tasks automatically"}
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === "transcript" && (
                    <div className="space-y-3">
                      <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
                        <p className="text-sm whitespace-pre-wrap">{meeting.transcript || "No transcript available"}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "details" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDate(meeting.scheduledAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{meeting.duration} minutes</span>
                </div>
                {meeting.venue && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{meeting.venue}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <UsersIcon className="w-4 h-4 text-muted-foreground" />
                  <span>{meeting.participants?.length || 0} participants</span>
                </div>
              </div>

              {meeting.agendaItems && meeting.agendaItems.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Agenda</h3>
                  <div className="space-y-2">
                    {meeting.agendaItems.map((item: any, index: number) => (
                      <div key={index} className="bg-accent/10 p-3 rounded">
                        <p className="font-medium text-sm">{item.title}</p>
                        {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">Added by: {item.addedByName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {meeting.documents && meeting.documents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Documents</h3>
                    {editing && (
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload New
                          </span>
                        </Button>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        />
                      </label>
                    )}
                  </div>
                  <div className="space-y-2">
                    {formData.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between bg-accent/10 p-3 rounded">
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
                          {editing && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => removeDocument(doc.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editing && (!meeting.documents || meeting.documents.length === 0) && (
                <div>
                  <h3 className="font-semibold mb-3">Documents</h3>
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-accent/5 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload documents (max 5MB each)</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    />
                  </label>
                </div>
              )}
                </>
              )}
            </div>
          )}

          {/* Show details for scheduled/cancelled meetings */}
          {!editing && meeting.status !== 'in_progress' && meeting.status !== 'completed' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDate(meeting.scheduledAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{meeting.duration} minutes</span>
                </div>
                {meeting.venue && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{meeting.venue}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <UsersIcon className="w-4 h-4 text-muted-foreground" />
                  <span>{meeting.participants?.length || 0} participants</span>
                </div>
              </div>

              {meeting.agendaItems && meeting.agendaItems.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Agenda</h3>
                  <div className="space-y-2">
                    {meeting.agendaItems.map((item: any, index: number) => (
                      <div key={index} className="bg-accent/10 p-3 rounded">
                        <p className="font-medium text-sm">{item.title}</p>
                        {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">Added by: {item.addedByName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {meeting.documents && meeting.documents.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Documents</h3>
                  <div className="space-y-2">
                    {meeting.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between bg-accent/10 p-3 rounded">
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
            </div>
          )}
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{meeting.title}"? This action cannot be undone.
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
    </>
  );
};
