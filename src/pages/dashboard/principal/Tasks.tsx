import { useState, useEffect } from "react";
import DashboardLayout, { principalNav } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckSquare, Clock, User, RefreshCw, Pencil, Trash2, Save, X } from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { Task } from "@/types/task.types";
import { AddTaskDialog } from "@/components/forms/AddTaskDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCompletionPreview } from "@/components/shared/TaskCompletionPreview";

const STATUS_FILTERS = ['all', 'pending', 'in_progress', 'completed'] as const;

const PrincipalTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>('all');
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [meetingTitles, setMeetingTitles] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Names map
      const usersSnap = await getDocs(collection(db, "users"));
      const namesMap: Record<string, string> = {};
      usersSnap.docs.forEach(d => { namesMap[d.id] = (d.data() as any).name; });
      setUserNames(namesMap);

      // All meetings — for titles map + finding principal's meetings
      const allMeetingsSnap = await getDocs(collection(db, "meetings"));
      const titlesMap: Record<string, string> = {};
      allMeetingsSnap.docs.forEach(d => { titlesMap[d.id] = (d.data() as any).title; });
      setMeetingTitles(titlesMap);

      // Meeting IDs where principal is creator or participant
      const myMeetingIds = allMeetingsSnap.docs
        .filter(d => {
          const data = d.data();
          return data.createdBy === user?.id || data.participants?.includes(user?.id);
        })
        .map(d => d.id);

      // Tasks assigned by principal directly (no orderBy to avoid composite index requirement)
      const byMeSnap = await getDocs(
        query(collection(db, "tasks"), where("assignedBy", "==", user?.id))
      );

      // Tasks from meetings principal created (catches auto-assigned without assignedBy)
      const meetingTaskSnaps = await Promise.all(
        myMeetingIds.map(mid =>
          getDocs(query(collection(db, "tasks"), where("meetingId", "==", mid)))
        )
      );

      // Merge + deduplicate by id
      const taskMap = new Map<string, Task>();
      byMeSnap.docs.forEach(d => taskMap.set(d.id, { id: d.id, ...d.data() } as Task));
      meetingTaskSnaps.forEach(snap => snap.docs.forEach(d => taskMap.set(d.id, { id: d.id, ...d.data() } as Task)));

      const list = [...taskMap.values()]
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

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const formatDate = (ts: any) =>
    ts?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const isOverdue = (task: Task) => {
    const due = task.dueDate || task.suggestedDueDate;
    return due && due.toDate() < new Date() && task.status !== 'completed';
  };

  const statusClass = (s: string) =>
    s === 'completed' ? 'bg-green-100 text-green-800' :
    s === 'in_progress' ? 'bg-blue-100 text-blue-800' :
    'bg-yellow-100 text-yellow-800';

  const priorityClass = (p: string) =>
    p === 'high' ? 'bg-red-100 text-red-800' :
    p === 'medium' ? 'bg-orange-100 text-orange-800' :
    'bg-gray-100 text-gray-800';

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
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

  return (
    <DashboardLayout role="Principal Dashboard" navItems={principalNav}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground">Track all tasks you've assigned — live status updates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <AddTaskDialog onTaskAdded={fetchData} />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-card text-muted-foreground border-border hover:border-blue-400'}`}
          >
            {f.replace('_', ' ')} <span className="ml-1 font-bold">{counts[f]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map(task => (
            <div key={task.id} className={`bg-card rounded-xl p-5 shadow-card border ${isOverdue(task) ? 'border-red-300 bg-red-50/30' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-foreground">{task.title || task.description}</h3>
                    {isOverdue(task) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Overdue</span>
                    )}
                  </div>
                  {task.title && <p className="text-sm text-muted-foreground mb-2">{task.description}</p>}
                  {editingTask === task.id ? (
                    <div className="flex flex-wrap gap-3 mt-2 items-center">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                        <Input
                          type="date"
                          className="h-7 text-xs w-36"
                          defaultValue={(task.dueDate || task.suggestedDueDate) ? (task.dueDate || task.suggestedDueDate).toDate().toISOString().split('T')[0] : ""}
                          onChange={e => setEditDueDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Priority</p>
                        <Select defaultValue={task.priority as string} onValueChange={setEditPriority}>
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
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
                    {task.assignedTo && (
                      <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        <User className="w-3 h-3" />
                        {userNames[task.assignedTo] || task.assignedTo}
                      </div>
                    )}
                    {task.meetingId && meetingTitles[task.meetingId] && (
                      <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                        Meeting: {meetingTitles[task.meetingId]}
                      </div>
                    )}
                    {(task.dueDate || task.suggestedDueDate) && (
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="w-3 h-3" />
                        Due: {formatDate(task.dueDate || task.suggestedDueDate)}
                      </div>
                    )}
                  </div>
                  )}
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
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass(task.status as string)}`}>
                    {(task.status as string).replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityClass(task.priority as string)}`}>
                    {task.priority} priority
                  </span>
                  {editingTask !== task.id && (
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => { setEditingTask(task.id); setEditDueDate(""); setEditPriority(task.priority as string); }}
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
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl p-12 text-center border border-border">
          <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No tasks found</h3>
          <p className="text-muted-foreground mb-4">
            {filter === 'all' ? 'Assign your first task to get started' : `No ${filter.replace('_', ' ')} tasks`}
          </p>
          <AddTaskDialog onTaskAdded={fetchData} />
        </div>
      )}
    </DashboardLayout>
  );
};

export default PrincipalTasks;
