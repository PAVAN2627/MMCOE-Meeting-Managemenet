import { useEffect, useState } from "react";
import DashboardLayout, { adminNav } from "@/components/dashboard/DashboardLayout";
import { StatCard, SectionHeader, MeetingItem } from "@/components/dashboard/DashboardWidgets";
import { Calendar, CheckSquare, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { Meeting } from "@/types/meeting.types";
import { Task } from "@/types/task.types";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    invitedMeetings: 0,
    upcomingMeetings: 0,
    myTasks: 0,
    overdueTasks: 0,
    documents: 0,
  });
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Fetch tasks assigned to user
        const tasksQuery = query(
          collection(db, "tasks"),
          where("assignedTo", "==", user.id)
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        const allTasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        const overdue = allTasks.filter(t => 
          t.status !== "completed" && t.dueDate && t.dueDate.toMillis() < now.toMillis()
        );

        // Get recent meetings
        const recentMeetings = allMeetings
          .sort((a, b) => b.scheduledAt.toMillis() - a.scheduledAt.toMillis())
          .slice(0, 4);

        setStats({
          invitedMeetings: allMeetings.length,
          upcomingMeetings: upcoming.length,
          myTasks: allTasks.length,
          overdueTasks: overdue.length,
          documents: 0, // Will be implemented with storage
        });

        setMeetings(recentMeetings);
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

  if (loading) {
    return (
      <DashboardLayout role="Office Staff Dashboard" navItems={adminNav}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="Office Staff Dashboard" navItems={adminNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">Office Staff Dashboard</h1>
        <p className="text-muted-foreground">View meetings invited by Principal, manage uploads, and update assigned tasks.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard 
          icon={Calendar} 
          label="Invited Meetings" 
          value={stats.invitedMeetings.toString()} 
          subtitle={`${stats.upcomingMeetings} upcoming`} 
        />
        <StatCard 
          icon={CheckSquare} 
          label="My Tasks" 
          value={stats.myTasks.toString()} 
          subtitle={`${stats.overdueTasks} overdue`} 
        />
        <StatCard 
          icon={FileText} 
          label="Documents" 
          value={stats.documents.toString()} 
        />
      </div>

      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <SectionHeader title="Institution-Level Meetings" />
        {meetings.length > 0 ? (
          meetings.map(meeting => (
            <MeetingItem 
              key={meeting.id}
              title={meeting.title} 
              time={formatMeetingTime(meeting.scheduledAt)} 
              department={meeting.department || "Institution"} 
              status={meeting.status === "completed" ? "completed" : "upcoming"} 
            />
          ))
        ) : (
          <p className="text-muted-foreground text-sm py-4">No meetings assigned</p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
