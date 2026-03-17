import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, getDocs, Timestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { notificationService } from "@/services/notification.service";
import { User } from "@/types/user.types";
import { Loader2, Plus, X, Upload, FileText } from "lucide-react";

interface AddMeetingDialogProps {
  onMeetingAdded?: () => void;
  /** When true: hides PRC option, filters participants to HOD's department only */
  hodMode?: boolean;
  /** When provided: opens in edit mode pre-filled with this meeting's data */
  editMeeting?: any;
  /** Custom trigger element (used when editing inline) */
  trigger?: React.ReactNode;
}

export const AddMeetingDialog = ({ onMeetingAdded, hodMode = false, editMeeting, trigger }: AddMeetingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    scheduledDate: "",
    scheduledTime: "",
    duration: "60",
    venue: "",
    meetingType: hodMode ? "department" : "department" as "department" | "prc" | "general",
    participants: [] as string[],
    agendaItems: [] as { title: string; description: string }[],
    documents: [] as { name: string; type: string; size: number; data: string }[],
  });

  const [newAgendaItem, setNewAgendaItem] = useState({ title: "", description: "" });

  useEffect(() => {
    if (open) {
      fetchUsers();
      // Pre-fill form when editing
      if (editMeeting) {
        const dt = editMeeting.scheduledAt?.toDate();
        const dateStr = dt ? dt.toISOString().split('T')[0] : "";
        const h = dt ? String(dt.getHours()).padStart(2, '0') : "09";
        const m = dt ? String(dt.getMinutes()).padStart(2, '0') : "00";
        setFormData({
          title: editMeeting.title || "",
          scheduledDate: dateStr,
          scheduledTime: `${h}:${m}`,
          duration: String(editMeeting.duration || 60),
          venue: editMeeting.venue || "",
          meetingType: editMeeting.meetingType || "department",
          participants: editMeeting.participants || [],
          agendaItems: (editMeeting.agendaItems || []).map((a: any) => ({ title: a.title, description: a.description || "" })),
          documents: editMeeting.documents || [],
        });
      }
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const usersList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(u => {
          if (u.id === user?.id || (u as any).isDeleted) return false;
          // HOD mode: only show staff from the same department
          if (hodMode) return u.department === user?.department;
          return true;
        });
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.scheduledDate || !formData.scheduledTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);

      const agendaItems = formData.agendaItems.map((item, index) => ({
        id: `agenda_${Date.now()}_${index}`,
        title: item.title,
        description: item.description,
        addedBy: user?.id || '',
        addedByName: user?.name || '',
        order: index,
        createdAt: Timestamp.now(),
      }));

      const documents = formData.documents.map((d, index) => ({
        id: d.id || `doc_${Date.now()}_${index}`,
        name: d.name,
        type: d.type,
        size: d.size,
        data: d.data,
        uploadedBy: d.uploadedBy || user?.id || '',
        uploadedByName: d.uploadedByName || user?.name || '',
        uploadedAt: d.uploadedAt || Timestamp.now(),
      }));

      if (editMeeting) {
        // UPDATE existing meeting
        await updateDoc(doc(db, "meetings", editMeeting.id), {
          title: formData.title,
          scheduledAt: Timestamp.fromDate(scheduledDateTime),
          duration: parseInt(formData.duration),
          venue: formData.venue || null,
          meetingType: formData.meetingType,
          participants: formData.participants,
          agendaItems,
          documents,
          updatedAt: Timestamp.now(),
        });
        toast({ title: "Success", description: `Meeting "${formData.title}" updated` });

        // Only send update emails if date, time, or venue changed
        const oldDt = editMeeting.scheduledAt?.toDate();
        const oldDate = oldDt ? oldDt.toISOString().split('T')[0] : "";
        const oldTime = oldDt ? `${String(oldDt.getHours()).padStart(2,'0')}:${String(oldDt.getMinutes()).padStart(2,'0')}` : "";
        const oldVenue = editMeeting.venue || "";
        const dateChanged = oldDate !== formData.scheduledDate;
        const timeChanged = oldTime !== formData.scheduledTime;
        const venueChanged = oldVenue !== (formData.venue || "");

        if ((dateChanged || timeChanged || venueChanged) && formData.participants.length > 0) {
          try {
            const selectedUsers = users.filter(u => formData.participants.includes(u.id));
            for (const participant of selectedUsers) {
              await notificationService.sendMeetingInvitation(participant.email, {
                title: formData.title,
                date: scheduledDateTime,
                time: scheduledDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                duration: parseInt(formData.duration),
                location: formData.venue,
                description: `Meeting details updated${dateChanged || timeChanged ? ' — new schedule' : ''}${venueChanged ? ' — new venue' : ''}`,
                organizerName: user?.name || 'System',
              });
            }
            toast({ title: "Update Notifications Sent", description: `Participants notified of schedule changes` });
          } catch (emailError) {
            console.error('Error sending update notifications:', emailError);
          }
        }
      } else {
        // CREATE new meeting
        const meetingData = {
          title: formData.title,
          scheduledAt: Timestamp.fromDate(scheduledDateTime),
          duration: parseInt(formData.duration),
          venue: formData.venue || null,
          meetingType: formData.meetingType,
          createdBy: user?.id,
          createdByName: user?.name,
          department: hodMode ? user?.department : null,
          participants: formData.participants,
          status: "scheduled",
          agendaItems,
          documents,
          isPRCEditable: formData.meetingType === 'prc',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await addDoc(collection(db, "meetings"), meetingData);
        toast({ title: "Success", description: `Meeting "${formData.title}" has been scheduled` });

        // Send invitation emails
        if (formData.participants.length > 0) {
          try {
            const selectedUsers = users.filter(u => formData.participants.includes(u.id));
            for (const participant of selectedUsers) {
              await notificationService.sendMeetingInvitation(participant.email, {
                title: formData.title,
                date: scheduledDateTime,
                time: scheduledDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                duration: parseInt(formData.duration),
                location: formData.venue,
                description: agendaItems.map(a => a.title).join(', '),
                organizerName: user?.name || 'System',
              });
            }
            toast({ title: "Invitations Sent", description: `Meeting invitations sent to ${selectedUsers.length} participant(s)` });
          } catch (emailError) {
            console.error('Error sending meeting invitations:', emailError);
          }
        }
      }

      // Reset form
      setFormData({
        title: "",
        scheduledDate: "",
        scheduledTime: "",
        duration: "60",
        venue: "",
        meetingType: "department",
        participants: [],
        agendaItems: [],
        documents: [],
      });
      setNewAgendaItem({ title: "", description: "" });
      setOpen(false);
      if (onMeetingAdded) onMeetingAdded();
    } catch (error: any) {
      console.error("Error saving meeting:", error);
      toast({ title: "Error", description: "Failed to save meeting", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...prev.participants, userId]
    }));
  };

  const addAgendaItem = () => {
    if (!newAgendaItem.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Agenda item title is required",
        variant: "destructive",
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      agendaItems: [...prev.agendaItems, { ...newAgendaItem }]
    }));
    setNewAgendaItem({ title: "", description: "" });
  };

  const removeAgendaItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      agendaItems: prev.agendaItems.filter((_, i) => i !== index)
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Check file size (max 5MB per file to avoid Firestore limits)
      const maxSize = 5 * 1024 * 1024; // 5MB
      const validFiles = files.filter(file => {
        if (file.size > maxSize) {
          toast({
            title: "File Too Large",
            description: `${file.name} is larger than 5MB`,
            variant: "destructive",
          });
          return false;
        }
        return true;
      });

      // Convert files to base64
      for (const file of validFiles) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setFormData(prev => ({
            ...prev,
            documents: [...prev.documents, {
              name: file.name,
              type: file.type,
              size: file.size,
              data: base64,
            }]
          }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Meeting
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMeeting ? "Edit Meeting" : "Schedule New Meeting"}</DialogTitle>
          <DialogDescription>
            {editMeeting ? "Update meeting details" : "Create a new meeting and invite participants"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Weekly Team Sync"
              disabled={loading}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Date *</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledTime">Time *</Label>
              <Select
                value={formData.scheduledTime}
                onValueChange={(v) => setFormData({ ...formData, scheduledTime: v })}
                disabled={loading}
              >
                <SelectTrigger id="scheduledTime">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 21 }, (_, i) => {
                    const totalMins = 8 * 60 + i * 30; // 8:00 AM to 6:00 PM, 30-min slots
                    const h24 = Math.floor(totalMins / 60);
                    const min = totalMins % 60;
                    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
                    const ampm = h24 < 12 ? "AM" : "PM";
                    const value = `${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
                    const label = `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
                    return <SelectItem key={value} value={value}>{label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="60"
                disabled={loading}
                min="15"
                step="15"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingType">Meeting Type *</Label>
              <Select
                value={formData.meetingType}
                onValueChange={(value) => setFormData({ ...formData, meetingType: value as any })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">Department Meeting</SelectItem>
                  {!hodMode && <SelectItem value="prc">PRC Meeting (Editable by all)</SelectItem>}
                  <SelectItem value="general">General Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              placeholder="e.g., Conference Room A, Main Building"
              disabled={loading}
            />
          </div>

          {/* Agenda Items Section */}
          <div className="space-y-2">
            <Label>Agenda Items</Label>
            <div className="border border-border rounded-lg p-3 space-y-3">
              {formData.agendaItems.map((item, index) => (
                <div key={index} className="bg-accent/10 p-3 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAgendaItem(index)}
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="space-y-2 pt-2 border-t">
                <Input
                  placeholder="Agenda item title *"
                  value={newAgendaItem.title}
                  onChange={(e) => setNewAgendaItem({ ...newAgendaItem, title: e.target.value })}
                  disabled={loading}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newAgendaItem.description}
                  onChange={(e) => setNewAgendaItem({ ...newAgendaItem, description: e.target.value })}
                  disabled={loading}
                  rows={2}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAgendaItem}
                  disabled={loading}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Agenda Item
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.agendaItems.length} agenda item(s) added
              {formData.meetingType === 'prc' && ' • PRC meetings allow participants to edit agenda'}
            </p>
          </div>

          {/* Document Upload Section */}
          <div className="space-y-2">
            <Label>Documents (Images, PDF, Excel)</Label>
            <div className="border border-border rounded-lg p-3 space-y-2">
              {formData.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between bg-accent/10 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{doc.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(doc.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(index)}
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:bg-accent/5 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload documents (max 5MB each)</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  disabled={loading}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.documents.length} document(s) attached • Participants can view all documents
            </p>
          </div>

          <div className="space-y-2">
            <Label>Participants</Label>
            <div className="border border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {users.length > 0 ? (
                users.map(u => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-accent/10 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.participants.includes(u.id)}
                      onChange={() => toggleParticipant(u.id)}
                      disabled={loading}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      {u.name} ({u.role.replace('_', ' ')})
                      {u.department && ` - ${u.department}`}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Loading users...</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.participants.length} participant(s) selected
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1 bg-accent hover:bg-accent/90">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editMeeting ? "Saving..." : "Scheduling..."}
                </>
              ) : (
                editMeeting ? "Save Changes" : "Schedule Meeting"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
