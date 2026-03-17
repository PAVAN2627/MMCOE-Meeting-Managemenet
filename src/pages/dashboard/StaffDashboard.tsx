import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout, { staffNav } from "@/components/dashboard/DashboardLayout";
import { StatCard, SectionHeader, MeetingItem } from "@/components/dashboard/DashboardWidgets";
import { Calendar, CheckSquare, FileText, Building2, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { Meeting } from "@/types/meeting.types";
import { Task } from "@/types/task.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TaskCompletionUploadDialog } from "@/components/forms/TaskCompletionUploadDialog";
import { MeetingCalendar } from "@/components/shared/MeetingCalendar";

const StaffDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    deptMeetings: 0,
    upcomingMeetings: 0,
    myTasks: 0,
    documents: 0,
  });
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionDialog, setCompletionDialog] = useState<{ taskId: string; taskTitle: string } | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        const now = Timestamp.now();

        // Fetch meetings where user is a participant
        const meetingsSnapshot = await getDocs(collection(db, "meetings"));
        const allMeetings = meetingsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Meeting))
          .filter(m => m.participants?.includes(user.id));
        
        const upcoming = allMeetings.filter(m => m.scheduledAt.toMillis() > now.toMillis());

        // Fetch tasks assigned to user (exclude suggested)
        const tasksQuery = query(
          collection(db, "tasks"),
          where("assignedTo", "==", user.id)
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        const allTasks = tasksSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Task))
          .filter(t => t.status !== 'suggested');

        // Count completed meetings with reports (documents)
        const docsCount = allMeetings.filter(
          (m: any) => m.status === "completed" && m.report
        ).length;

        // Upcoming meetings only for the list
        const upcomingMeetings = allMeetings
          .filter(m => m.scheduledAt.toMillis() > now.toMillis())
          .sort((a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis())
          .slice(0, 5);

        setStats({
          deptMeetings: allMeetings.length,
          upcomingMeetings: upcoming.length,
          myTasks: allTasks.length,
          documents: docsCount,
        });

        setAllMeetings(allMeetings);
        setMeetings(upcomingMeetings);
        setTasks(allTasks.slice(0, 3));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const formatMeetingTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    if (diffDays === 1) return `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    if (diffDays < 0) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const formatTaskDate = (timestamp: any) => {
    return timestamp?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
        ...(newStatus === 'completed' ? { completedAt: Timestamp.now() } : {}),
      });
      toast({ title: "Status updated" });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  const handleTaskStatusChange = (taskId: string, newStatus: string, taskTitle: string) => {
    if (newStatus === "completed") {
      setCompletionDialog({ taskId, taskTitle });
    } else {
      updateTaskStatus(taskId, newStatus);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="Department Staff Dashboard" navItems={staffNav}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout role="Department Staff Dashboard" navItems={staffNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">My Department Dashboard</h1>
        <p className="text-muted-foreground">View meetings scheduled by your HOD, access summaries & MoM, and update tasks.</p>
      </div>

      {user?.department && (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-foreground rounded-lg mb-6">
          <Building2 className="w-4 h-4 text-background" />
          <span className="text-sm font-medium text-background">Department: {user.department}</span>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard 
          icon={Calendar} 
          label="Dept Meetings" 
          value={stats.deptMeetings.toString()} 
          subtitle={`${stats.upcomingMeetings} upcoming`} 
        />
        <StatCard 
          icon={CheckSquare} 
          label="My Tasks" 
          value={stats.myTasks.toString()} 
          subtitle={stats.myTasks > 0 ? "Track progress" : "All clear"} 
        />
        <StatCard 
          icon={FileText} 
          label="Documents" 
          value={stats.documents.toString()} 
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <MeetingCalendar
            meetings={allMeetings as any[]}
            onMeetingClick={() => navigate("/dashboard/staff/meetings")}
          />
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <SectionHeader title="Upcoming Meetings" />
            {meetings.length > 0 ? (
              meetings.map(meeting => (
                <MeetingItem
                  key={meeting.id}
                  title={meeting.title}
                  time={formatMeetingTime(meeting.scheduledAt)}
                  department={(meeting as any).department || user?.department || "Department"}
                  status="upcoming"
                />
              ))
            ) : (
              <p className="text-muted-foreground text-sm py-4">No upcoming meetings</p>
            )}
          </div>

          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <SectionHeader title="My Tasks" />
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map(task => {
                  const due = task.dueDate || (task as any).suggestedDueDate;
                  const overdue = due && due.toDate() < new Date() && task.status !== 'completed';
                  return (
                    <div key={task.id} className={`flex items-center justify-between py-3 border-b border-border last:border-0 ${overdue ? 'bg-red-50/40 rounded-lg px-2' : ''}`}>
                      <div>
                        <p className="font-medium text-foreground text-sm">{task.title || task.description}</p>
                        <p className={`text-xs mt-0.5 ${overdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {due ? `${overdue ? 'Overdue: ' : 'Due: '}${formatTaskDate(due)}` : 'No due date'}
                        </p>
                      </div>
                      <Select value={task.status as string} onValueChange={(v) => handleTaskStatusChange(task.id, v, task.title || task.description)}>
                        <SelectTrigger className="w-28 h-7 text-xs shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4">No tasks assigned</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>

    {completionDialog && (
      <TaskCompletionUploadDialog
        open={!!completionDialog}
        taskId={completionDialog.taskId}
        taskTitle={completionDialog.taskTitle}
        onConfirmed={(taskId) => {
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' as any } : t));
          setCompletionDialog(null);
        }}
        onCancel={() => setCompletionDialog(null)}
      />
    )}
    </>
  );
};

export default StaffDashboard;