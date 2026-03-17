import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types/user.types";
import { Loader2, Plus } from "lucide-react";

interface AddTaskDialogProps {
  onTaskAdded?: () => void;
}

export const AddTaskDialog = ({ onTaskAdded }: AddTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high",
    department: "",
  });

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.assignedTo) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const assignedUser = users.find(u => u.id === formData.assignedTo);
      
      // Create task document
      await addDoc(collection(db, "tasks"), {
        title: formData.title,
        description: formData.description || null,
        assignedTo: formData.assignedTo,
        assignedToName: assignedUser?.name || "Unknown",
        assignedBy: user?.id,
        assignedByName: user?.name,
        dueDate: formData.dueDate ? Timestamp.fromDate(new Date(formData.dueDate)) : null,
        priority: formData.priority,
        status: "pending",
        department: formData.department || assignedUser?.department || null,
        meetingId: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Send email notification to assignee
      if (assignedUser?.email && import.meta.env.VITE_EMAIL_SERVICE_URL) {
        try {
          const priorityColor = formData.priority === 'high' ? '#ef4444' :
                                formData.priority === 'medium' ? '#f59e0b' : '#10b981';
          const dueDateStr = formData.dueDate
            ? new Date(formData.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : null;

          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#1e3a8a;color:white;padding:30px;text-align:center;">
                <h1>✅ New Task Assigned</h1>
              </div>
              <div style="padding:30px;background:#f9fafb;">
                <p>Hello <strong>${assignedUser.name}</strong>,</p>
                <p><strong>${user?.name}</strong> has assigned you a new task.</p>
                <div style="background:white;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #14b8a6;">
                  <h2 style="color:#1e3a8a;margin-top:0;">${formData.title}</h2>
                  ${formData.description ? `<p style="color:#6b7280;">${formData.description}</p>` : ''}
                  <div style="margin-top:12px;">
                    <span style="background:${priorityColor};color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;">
                      ${formData.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  ${dueDateStr ? `<div style="background:#fef3c7;padding:12px;margin-top:12px;border-left:4px solid #f59e0b;"><strong>📅 Due Date:</strong> ${dueDateStr}</div>` : ''}
                </div>
                <p style="text-align:center;color:#6b7280;font-size:12px;margin-top:30px;">This is an automated message from MeetSync</p>
              </div>
            </div>`;

          await fetch(import.meta.env.VITE_EMAIL_SERVICE_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: assignedUser.email, subject: `New Task Assigned: ${formData.title}`, html }),
          });
        } catch (emailErr) {
          console.error('Email notification error:', emailErr);
        }
      }

      toast({
        title: "Success",
        description: `Task "${formData.title}" has been created and assigned`,
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        assignedTo: "",
        dueDate: "",
        priority: "medium",
        department: "",
      });

      setOpen(false);
      
      if (onTaskAdded) {
        onTaskAdded();
      }
    } catch (error: any) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/90">
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Assign a task to a team member
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Prepare quarterly report"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task details and requirements"
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assign To *</Label>
            <Select
              value={formData.assignedTo}
              onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.role.replace('_', ' ')})
                    {u.department && ` - ${u.department}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g., Computer Science"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1 bg-accent hover:bg-accent/90">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Task"
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
