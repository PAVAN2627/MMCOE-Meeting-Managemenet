import { useState, useEffect } from "react";
import DashboardLayout, { hodNav } from "@/components/dashboard/DashboardLayout";
import { CheckSquare, Clock, User, ArrowDownToLine, ArrowUpFromLine, Trash2, Pencil, Save, X } from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { Task } from "@/types/task.types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TaskCompletionUploadDialog } from "@/components/forms/TaskCompletionUploadDialog";
import { TaskCompletionPreview } from "@/components/shared/TaskCompletionPreview";

const STATUS_FILTERS = ['all', 'pending', 'in_progress', 'completed'] as const;

const HODTasks = () => {
  const [assignedToMe, setAssignedToMe] = useState<Task[]>([]);
  const [assignedByMe, setAssignedByMe] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterToMe, setFilterToMe] = useState<typeof STATUS_FILTERS[number]>('all');
  const [filterByMe, setFilterByMe] = useState<typeof STATUS_FILTERS[number]>('all');
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [meetingTitles, setMeetingTitles] = useState<Record<string, string>>({});
  const [completionDialog, setCompletionDialog] = useState<{ taskId: string; taskTitle: string } | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const namesMap: Record<string, string> = {};
      usersSnap.docs.forEach(d => { namesMap[d.id] = (d.data() as any).name; });
      setUserNames(namesMap);

      const meetingsSnap = await getDocs(collection(db, "meetings"));
      const titlesMap: Record<string, string> = {};
      meetingsSnap.docs.forEach(d => { titlesMap[d.id] = (d.data() as any).title; });
      setMeetingTitles(titlesMap);

      // Tasks assigned TO me
      const toMeSnap = await getDocs(
        query(collection(db, "tasks"), where("assignedTo", "==", user.id))
      );
      const toMe = toMeSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Task))
        .filter(t => t.status !== 'suggested')
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setAssignedToMe(toMe);

      // Tasks assigned BY me to others
      const byMeSnap = await getDocs(
        query(collection(db, "tasks"), where("assignedBy", "==", user.id))
      );
      const byMe = byMeSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Task))
        .filter(t => t.assignedTo !== user.id && t.status !== 'suggested')
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setAssignedByMe(byMe);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.id]);

  const handleStatusChange = (taskId: string, newStatus: string, taskTitle: string) => {
    if (newStatus === "completed") {
      setCompletionDialog({ taskId, taskTitle });
    } else {
      updateStatus(taskId, newStatus);
    }
  };

  const updateStatus = async (taskId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
        ...(newStatus === 'completed' ? { completedAt: Timestamp.now() } : {}),
      });
      toast({ title: "Status updated" });
      fetchData();
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      toast({ title: "Task deleted" });
      fetchData();
    } catch {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    }
  };

  const saveTaskEdit = async (taskId: string) => {
    try {
      const updates: any = { updatedAt: Timestamp.now() };
      if (editPriority) updates.priority = editPriority;
      if (editDueDate) updates.dueDate = Timestamp.fromDate(new Date(editDueDate));
      await updateDoc(doc(db, "tasks", taskId), updates);
      setEditingTask(null);
      toast({ title: "Task updated" });
      fetchData();
    } catch {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    }
  };

  const formatDate = (timestamp: any) =>
    timestamp?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const priorityClass = (p: string) =>
    p === 'high' ? 'bg-red-100 text-red-800' :
    p === 'medium' ? 'bg-orange-100 text-orange-800' :
    'bg-gray-100 text-gray-800';

  const statusClass = (s: string) =>
    s === 'completed' ? 'bg-green-100 text-green-800' :
    s === 'in_progress' ? 'bg-blue-100 text-blue-800' :
    'bg-yellow-100 text-yellow-800';

  const TaskCard = ({ task, showAssignee = false, canUpdateStatus = false, canEditDelete = false }: {
    task: any;
    showAssignee?: boolean;
    canUpdateStatus?: boolean;
    canEditDelete?: boolean;
  }) => {
    const due = task.dueDate || task.suggestedDueDate;
    const overdue = due && due.toDate() < new Date() && task.status !== 'completed';
    const isEditing = editingTask === task.id;

    return (
      <div className={`bg-card rounded-xl p-5 shadow-card border ${overdue ? 'border-red-300 bg-red-50/20' : 'border-border'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-foreground">{task.title || task.description}</h3>
              {overdue && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Overdue</span>}
            </div>
            {task.title && task.description && (
              <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
            )}
            {isEditing ? (
              <div className="flex flex-wrap gap-3 mt-2 items-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                  <Input
                    type="date"
                    className="h-7 text-xs w-36"
                    defaultValue={due ? due.toDate().toISOString().split('T')[0] : ""}
                    onChange={e => setEditDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Priority</p>
                  <Select defaultValue={task.priority} onValueChange={setEditPriority}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => saveTaskEdit(task.id)} className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200">
                    <Save className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingTask(null)} className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-2">
                {showAssignee && task.assignedTo && (
                  <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    <User className="w-3 h-3" />
                    {userNames[task.assignedTo] || task.assignedTo}
                  </div>
                )}
                {!showAssignee && task.assignedBy && (
                  <div className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded">
                    From: {userNames[task.assignedBy] || 'Unknown'}
                  </div>
                )}
                {task.meetingId && meetingTitles[task.meetingId] && (
                  <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                    Meeting: {meetingTitles[task.meetingId]}
                  </div>
                )}
                {due && (
                  <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${overdue ? 'bg-red-100 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
                    <Clock className="w-3 h-3" />
                    {overdue ? 'Overdue: ' : 'Due: '}{formatDate(due)}
                  </div>
                )}
              </div>
            )}
            {task.status === 'completed' && (task.completionFileData || task.completionNote) && (
              <TaskCompletionPreview
                fileUrl={task.completionFileData}
                fileName={task.completionFileName}
                fileType={task.completionFileType}
                completionNote={task.completionNote}
              />
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityClass(task.priority as string)}`}>
              {task.priority} priority
            </span>
            {canUpdateStatus ? (
              <Select
                value={task.status as string}
                onValueChange={(v) => handleStatusChange(task.id, v, task.title || task.description)}
              >
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass(task.status as string)}`}>
                {(task.status as string).replace('_', ' ')}
              </span>
            )}
            {canEditDelete && !isEditing && (
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => { setEditingTask(task.id); setEditDueDate(""); setEditPriority(task.priority); }}
                  className="p-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout role="HOD Dashboard" navItems={hodNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">Tasks</h1>
        <p className="text-muted-foreground">Your assigned tasks and tasks you've assigned to your team</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Assigned to Me */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownToLine className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-foreground">Assigned to Me</h2>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                {assignedToMe.length}
              </span>
            </div>
            <div className="flex gap-2 mb-4">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setFilterToMe(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterToMe === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-card text-muted-foreground border-border hover:border-blue-400'}`}
                >
                  {f.replace('_', ' ')} ({f === 'all' ? assignedToMe.length : assignedToMe.filter(t => t.status === f).length})
                </button>
              ))}
            </div>
            {(filterToMe === 'all' ? assignedToMe : assignedToMe.filter(t => t.status === filterToMe)).length > 0 ? (
              <div className="grid gap-3">
                {(filterToMe === 'all' ? assignedToMe : assignedToMe.filter(t => t.status === filterToMe)).map(task => (
                  <TaskCard key={task.id} task={task} canUpdateStatus />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl p-8 text-center border border-border text-muted-foreground text-sm">
                No {filterToMe !== 'all' ? filterToMe.replace('_', ' ') : ''} tasks assigned to you
              </div>
            )}
          </section>

          {/* Assigned by Me */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpFromLine className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-foreground">Assigned by Me</h2>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                {assignedByMe.length}
              </span>
            </div>
            <div className="flex gap-2 mb-4">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setFilterByMe(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterByMe === f ? 'bg-green-600 text-white border-green-600' : 'bg-card text-muted-foreground border-border hover:border-green-400'}`}
                >
                  {f.replace('_', ' ')} ({f === 'all' ? assignedByMe.length : assignedByMe.filter(t => t.status === f).length})
                </button>
              ))}
            </div>
            {(filterByMe === 'all' ? assignedByMe : assignedByMe.filter(t => t.status === filterByMe)).length > 0 ? (
              <div className="grid gap-3">
                {(filterByMe === 'all' ? assignedByMe : assignedByMe.filter(t => t.status === filterByMe)).map(task => (
                  <TaskCard key={task.id} task={task} showAssignee canEditDelete />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl p-8 text-center border border-border text-muted-foreground text-sm">
                No {filterByMe !== 'all' ? filterByMe.replace('_', ' ') : ''} tasks assigned by you
              </div>
            )}
          </section>
        </div>
      )}

      {completionDialog && (
        <TaskCompletionUploadDialog
          open={!!completionDialog}
          taskId={completionDialog.taskId}
          taskTitle={completionDialog.taskTitle}
          onConfirmed={() => { setCompletionDialog(null); fetchData(); }}
          onCancel={() => setCompletionDialog(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default HODTasks;
