import { useState, useEffect } from "react";
import DashboardLayout, { staffNav } from "@/components/dashboard/DashboardLayout";
import { CheckSquare, Clock, ArrowDownToLine } from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { Task } from "@/types/task.types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCompletionUploadDialog } from "@/components/forms/TaskCompletionUploadDialog";
import { TaskCompletionPreview } from "@/components/shared/TaskCompletionPreview";

const STATUS_FILTERS = ['all', 'pending', 'in_progress', 'completed'] as const;

const StaffTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>('all');
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [meetingTitles, setMeetingTitles] = useState<Record<string, string>>({});
  const [completionDialog, setCompletionDialog] = useState<{ taskId: string; taskTitle: string } | null>(null);
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

      const snap = await getDocs(
        query(collection(db, "tasks"), where("assignedTo", "==", user.id))
      );
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Task))
        .filter(t => t.status !== 'suggested')
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTasks(list);
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
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const formatDate = (ts: any) =>
    ts?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const isOverdue = (task: Task) => {
    const due = task.dueDate || task.suggestedDueDate;
    return due && due.toDate() < new Date() && task.status !== 'completed';
  };

  const priorityClass = (p: string) =>
    p === 'high' ? 'bg-red-100 text-red-800' :
    p === 'medium' ? 'bg-orange-100 text-orange-800' :
    'bg-gray-100 text-gray-800';

  return (
    <DashboardLayout role="Department Staff Dashboard" navItems={staffNav}>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <ArrowDownToLine className="w-5 h-5 text-blue-600" />
          <h1 className="text-2xl font-display font-bold text-foreground">My Tasks</h1>
        </div>
        <p className="text-muted-foreground">Tasks assigned to you — update status as you progress</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map(f => {
          const count = f === 'all' ? tasks.length : tasks.filter(t => t.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-card text-muted-foreground border-border hover:border-blue-400'}`}
            >
              {f.replace('_', ' ')} <span className="ml-1 font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : tasks.length > 0 ? (
        <div className="grid gap-3">
          {(filter === 'all' ? tasks : tasks.filter(t => t.status === filter)).map(task => (
            <div key={task.id} className={`bg-card rounded-xl p-5 border ${isOverdue(task) ? 'border-red-300 bg-red-50/30' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-foreground">{task.title || task.description}</h3>
                    {isOverdue(task) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Overdue</span>
                    )}
                  </div>
                  {task.title && task.description && (
                    <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {task.assignedBy && userNames[task.assignedBy] && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                        Assigned by: {userNames[task.assignedBy]}
                      </span>
                    )}
                    {task.meetingId && meetingTitles[task.meetingId] && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        Meeting: {meetingTitles[task.meetingId]}
                      </span>
                    )}
                    {(task.dueDate || task.suggestedDueDate) && (
                      <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${isOverdue(task) ? 'bg-red-100 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
                        <Clock className="w-3 h-3" />
                        {isOverdue(task) ? 'Overdue: ' : 'Due: '}
                        {formatDate(task.dueDate || task.suggestedDueDate)}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded ${priorityClass(task.priority as string)}`}>
                      {task.priority} priority
                    </span>
                  </div>
                  {/* Completion proof */}
                  {task.status === 'completed' && ((task as any).completionFileData || (task as any).completionNote) && (
                    <TaskCompletionPreview
                      fileUrl={(task as any).completionFileData}
                      fileName={(task as any).completionFileName}
                      fileType={(task as any).completionFileType}
                      completionNote={(task as any).completionNote}
                    />
                  )}
                </div>
                <div className="shrink-0">
                  <Select
                    value={task.status as string}
                    onValueChange={(v) => handleStatusChange(task.id, v, task.title || task.description)}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl p-12 text-center border border-border">
          <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No tasks assigned yet</h3>
          <p className="text-muted-foreground text-sm">Tasks assigned to you will appear here</p>
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

export default StaffTasks;
