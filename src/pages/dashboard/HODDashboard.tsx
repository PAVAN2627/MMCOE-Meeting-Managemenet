import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout, { hodNav } from "@/components/dashboard/DashboardLayout";
import { StatCard, SectionHeader, MeetingItem } from "@/components/dashboard/DashboardWidgets";
import { Calendar, CheckSquare, FileText, Clock, ArrowDownToLine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, orderBy, limit, Timestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { Meeting } from "@/types/meeting.types";
import { Task } from "@/types/task.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TaskCompletionUploadDialog } from "@/components/forms/TaskCompletionUploadDialog";
import { MeetingCalendar } from "@/components/shared/MeetingCalendar";

const HODDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    deptMeetings: 0,
    upcomingMeetings: 0,
    deptTasks: 0,
    pendingTasks: 0,
    assignedToMe: 0,
    momDocs: 0,
  });
  const [myMeetings, setMyMeetings] = useState<Meeting[]>([]);
  const [prcMeetings, setPrcMeetings] = useState<Meeting[]>([]);
  const [allMeetings, setAllMeetings] = useState<any[]>([]);
  const [assignedToMe, setAssignedToMe] = useState<Task[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [completionDialog, setCompletionDialog] = useState<{ taskId: string; taskTitle: string } | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;

      try {
        const now = Timestamp.now();

        // Fetch all meetings
        const allMeetingsSnap = await getDocs(collection(db, "meetings"));
        const allMeetings = allMeetingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // My dept meetings (created by HOD)
        const myDeptMeetings = allMeetings.filter(m => m.createdBy === user.id);
        // All meetings where HOD is a participant but didn't create
        const invitedMeetings = allMeetings.filter(
          m => m.participants?.includes(user.id) && m.createdBy !== user.id
        );

        const upcoming = [...myDeptMeetings, ...invitedMeetings].filter(
          m => m.scheduledAt?.toMillis() > now.toMillis()
        );

        // Fetch department tasks - tasks assigned by this HOD or assigned to dept members
        const assignedByMeSnap = await getDocs(
          query(collection(db, "tasks"), where("assignedBy", "==", user.id))
        );
        const assignedToMeSnap = await getDocs(
          query(collection(db, "tasks"), where("assignedTo", "==", user.id))
        );

        // Merge both sets, deduplicate by id
        const taskMap = new Map<string, Task>();
        [...assignedByMeSnap.docs, ...assignedToMeSnap.docs].forEach(d => {
          taskMap.set(d.id, { id: d.id, ...d.data() } as Task);
        });
        const allTasks = [...taskMap.values()].filter(t => t.status !== 'suggested');
        const pending = allTasks.filter(t => t.status === "pending");

        // MoM docs — count completed meetings that have a report
        const completedMeetingsSnap = await getDocs(
          query(collection(db, "meetings"), where("status", "==", "completed"))
        );
        const momCount = completedMeetingsSnap.docs.filter(d => {
          const data = d.data();
          return data.report && (data.createdBy === user.id || data.participants?.includes(user.id));
        }).length;

        // User names map
        const usersSnap = await getDocs(collection(db, "users"));
        const namesMap: Record<string, string> = {};
        usersSnap.docs.forEach(d => { namesMap[d.id] = (d.data() as any).name; });
        setUserNames(namesMap);

        // Tasks assigned TO this HOD (for the widget list)
        const toMeAll = assignedToMeSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Task))
          .filter(t => t.status !== 'suggested')
          .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setAssignedToMe(toMeAll.slice(0, 5));

        setStats({
          deptMeetings: myDeptMeetings.length,
          upcomingMeetings: upcoming.length,
          deptTasks: allTasks.length,
          pendingTasks: pending.length,
          assignedToMe: toMeAll.length,
          momDocs: momCount,
        });

        setAllMeetings([...myDeptMeetings, ...invitedMeetings]);

        setMyMeetings(
          myDeptMeetings
            .filter((m: any) => m.scheduledAt?.toMillis() > now.toMillis())
            .sort((a: any, b: any) => a.scheduledAt?.toMillis() - b.scheduledAt?.toMillis())
            .slice(0, 5) as Meeting[]
        );
        setPrcMeetings(
          invitedMeetings
            .filter((m: any) => m.scheduledAt?.toMillis() > now.toMillis())
            .sort((a: any, b: any) => a.scheduledAt?.toMillis() - b.scheduledAt?.toMillis())
            .slice(0, 5) as Meeting[]
        );
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const handleStatusChange = (taskId: string, newStatus: string, taskTitle: string) => {
    if (newStatus === "completed") {
      setCompletionDialog({ taskId, taskTitle });
    } else {
      updateTaskStatus(taskId, newStatus);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string, extra?: Record<string, any>) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
        ...(newStatus === 'completed' ? { completedAt: Timestamp.now() } : {}),
        ...(extra || {}),
      });
      toast({ title: "Status updated" });
      setAssignedToMe(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const formatMeetingTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    if (diffDays === 1) return `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    if (diffDays < 0) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <DashboardLayout role="HOD Dashboard" navItems={hodNav}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="HOD Dashboard" navItems={hodNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">Department Overview</h1>
        <p className="text-muted-foreground">Manage your department meetings, track tasks, and monitor your team.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar} label="Dept Meetings" value={stats.deptMeetings.toString()} subtitle={`${stats.upcomingMeetings} upcoming`} />
        <StatCard icon={CheckSquare} label="Dept Tasks" value={stats.deptTasks.toString()} subtitle={`${stats.pendingTasks} pending`} />
        <StatCard icon={ArrowDownToLine} label="Tasks Assigned to Me" value={stats.assignedToMe.toString()} subtitle={stats.assignedToMe === 1 ? "task" : "tasks"} />
        <StatCard icon={FileText} label="MoM Docs" value={stats.momDocs.toString()} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <MeetingCalendar
            meetings={allMeetings}
            onMeetingClick={() => navigate("/dashboard/hod/meetings")}
          />
        </div>

        {/* My Upcoming Dept Meetings */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <SectionHeader title="My Upcoming Meetings" />
          {myMeetings.length > 0 ? (
            myMeetings.map(meeting => (
              <MeetingItem
                key={meeting.id}
                title={(meeting as any).title}
                time={formatMeetingTime(meeting.scheduledAt)}
                department={(meeting as any).department || user?.department || "Department"}
                status="upcoming"
              />
            ))
          ) : (
            <p className="text-muted-foreground text-sm py-4">No upcoming department meetings</p>
          )}
        </div>
      </div>

      {/* Invited meetings — upcoming only */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border mb-6">
        <SectionHeader title="Meetings (Invited by Principal)" />
        {prcMeetings.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-2">
            {prcMeetings.map(meeting => (
              <MeetingItem
                key={meeting.id}
                title={(meeting as any).title}
                time={formatMeetingTime(meeting.scheduledAt)}
                department={(meeting as any).type === 'prc' ? 'PRC' : ((meeting as any).department || 'Principal')}
                status="upcoming"
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-4">No upcoming meetings from Principal</p>
        )}
      </div>

      {/* Tasks Assigned to Me */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <ArrowDownToLine className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-foreground">Tasks Assigned to Me</h3>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
            {assignedToMe.length}
          </span>
        </div>
        {assignedToMe.length > 0 ? (
          <div className="space-y-3">
            {assignedToMe.map(task => {
              const due = task.dueDate || task.suggestedDueDate;
              const overdue = due && due.toDate() < new Date() && task.status !== 'completed';
              return (
                <div key={task.id} className={`p-3 rounded-lg border ${overdue ? 'border-red-200 bg-red-50/40' : 'border-border bg-accent/5'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{task.title || task.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {task.assignedBy && userNames[task.assignedBy] && (
                          <span className="text-xs text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            From: {userNames[task.assignedBy]}
                          </span>
                        )}
                        {due && (
                          <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                            <Clock className="w-3 h-3" />
                            {overdue ? 'Overdue: ' : 'Due: '}
                            {due.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Select
                      value={task.status as string}
                      onValueChange={(v) => handleStatusChange(task.id, v, task.title || task.description)}
                    >
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
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-4">No tasks assigned to you</p>
        )}
      </div>

      {/* Completion upload dialog */}
      {completionDialog && (
        <TaskCompletionUploadDialog
          open={!!completionDialog}
          taskId={completionDialog.taskId}
          taskTitle={completionDialog.taskTitle}
          onConfirmed={(taskId) => {
            setAssignedToMe(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' as any } : t));
            setCompletionDialog(null);
          }}
          onCancel={() => setCompletionDialog(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default HODDashboard;
