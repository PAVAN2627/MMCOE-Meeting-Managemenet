import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout, { principalNav } from "@/components/dashboard/DashboardLayout";
import { StatCard, SectionHeader, MeetingItem } from "@/components/dashboard/DashboardWidgets";
import { Calendar, CheckSquare, Users, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { Meeting } from "@/types/meeting.types";
import { Task } from "@/types/task.types";
import { MeetingCalendar } from "@/components/shared/MeetingCalendar";

const PrincipalDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMeetings: 0,
    upcomingMeetings: 0,
    activeTasks: 0,
    overdueTasks: 0,
    totalUsers: 0,
    momGenerated: 0,
  });
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const now = Timestamp.now();

        const meetingsSnapshot = await getDocs(collection(db, "meetings"));
        const meetings = meetingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting));

        const upcoming = meetings.filter(m => m.scheduledAt.toMillis() > now.toMillis());

        const tasksSnapshot = await getDocs(collection(db, "tasks"));
        const allTasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        const activeTasks = allTasks.filter(t => t.status !== "completed");
        const overdueTasks = allTasks.filter(
          t => t.status !== "completed" && t.dueDate && t.dueDate.toMillis() < now.toMillis()
        );

        const usersSnapshot = await getDocs(collection(db, "users"));
        const momSnapshot = await getDocs(collection(db, "mom"));

        // Upcoming meetings sorted asc — only created by principal
        const myUpcoming = meetings
          .filter(m => (m as any).createdBy === user?.id && m.scheduledAt.toMillis() > now.toMillis())
          .sort((a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis())
          .slice(0, 5);

        setStats({
          totalMeetings: meetings.length,
          upcomingMeetings: upcoming.length,
          activeTasks: activeTasks.length,
          overdueTasks: overdueTasks.length,
          totalUsers: usersSnapshot.size,
          momGenerated: momSnapshot.size,
        });

        setAllMeetings(meetings);
        setUpcomingMeetings(myUpcoming);
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
    if (diffDays === 0) return `Today, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    if (diffDays === 1) return `Tomorrow, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  if (loading) {
    return (
      <DashboardLayout role="Principal Dashboard" navItems={principalNav}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="Principal Dashboard" navItems={principalNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Welcome back, {user?.name || "Principal"}
        </h1>
        <p className="text-muted-foreground">
          Schedule meetings with HODs & Office Staff. Institution-wide oversight of tasks and reports.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar} label="Total Meetings" value={stats.totalMeetings.toString()} subtitle={`${stats.upcomingMeetings} upcoming`} />
        <StatCard icon={CheckSquare} label="Active Tasks" value={stats.activeTasks.toString()} subtitle={`${stats.overdueTasks} overdue`} />
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers.toString()} subtitle="Active users" />
        <StatCard icon={FileText} label="MoM Generated" value={stats.momGenerated.toString()} subtitle="Total documents" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar — full width on small, 2 cols on large */}
        <div className="lg:col-span-2">
          <MeetingCalendar
            meetings={allMeetings as any[]}
            onMeetingClick={() => navigate("/dashboard/principal/meetings")}
          />
        </div>

        {/* My Upcoming Meetings */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <SectionHeader title="My Upcoming Meetings" />
          {upcomingMeetings.length > 0 ? (
            upcomingMeetings.map(meeting => (
              <MeetingItem
                key={meeting.id}
                title={meeting.title}
                time={formatMeetingTime(meeting.scheduledAt)}
                department={(meeting as any).department || "All Departments"}
                status="upcoming"
              />
            ))
          ) : (
            <p className="text-muted-foreground text-sm py-4">No upcoming meetings</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PrincipalDashboard;
