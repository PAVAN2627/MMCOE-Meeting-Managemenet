import { useState, useEffect } from "react";
import DashboardLayout, { staffNav } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, ChevronDown, ChevronUp, FileDown, Download } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { downloadAsPDF, downloadAsWord } from "@/lib/reportExport";

const StaffDocuments = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "meetings"));
        const mine = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((m: any) =>
            m.status === "completed" &&
            m.report &&
            (m.participants?.includes(user.id) || m.createdBy === user.id)
          )
          .sort((a: any, b: any) =>
            (b.completedAt?.toMillis?.() ?? b.scheduledAt?.toMillis?.() ?? 0) -
            (a.completedAt?.toMillis?.() ?? a.scheduledAt?.toMillis?.() ?? 0)
          );
        setMeetings(mine);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const fmtDate = (ts: any) =>
    ts?.toDate?.().toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });

  const renderReport = (report: string) => {
    const lines = report.split("\n");
    const els: JSX.Element[] = [];
    let tBuf: string[][] = [];
    let inT = false;

    const flush = (k: string) => {
      if (!tBuf.length) return;
      els.push(
        <div key={k} className="overflow-x-auto my-3">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-800 text-white">
                {tBuf[0].map((h, j) => (
                  <th key={j} className="px-3 py-2 text-left font-semibold border border-blue-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tBuf.slice(1).map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  {row.map((c, ci) => (
                    <td key={ci} className="px-3 py-2 border border-gray-200">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tBuf = [];
      inT = false;
    };

    lines.forEach((line, i) => {
      if (line.startsWith("| ") && line.includes("|") && !/^\|[\s|:\-]+\|$/.test(line.trim())) {
        inT = true;
        tBuf.push(line.split("|").map(c => c.trim()).filter(Boolean));
      } else {
        if (inT) flush(`t${i}`);
        if (line.startsWith("# "))
          els.push(<h1 key={i} className="text-xl font-bold text-blue-900 mt-4 mb-2">{line.slice(2)}</h1>);
        else if (line.startsWith("## "))
          els.push(<h2 key={i} className="text-sm font-bold text-blue-800 uppercase tracking-wide mt-5 mb-2 border-b border-blue-200 pb-1">{line.slice(3)}</h2>);
        else if (line.startsWith("*   "))
          els.push(<li key={i} className="ml-5 text-sm text-gray-700 list-disc">{line.replace(/^\*\s+/, "").replace(/\*\*/g, "")}</li>);
        else if (line.startsWith("---"))
          els.push(<hr key={i} className="my-3 border-gray-200" />);
        else if (line.trim())
          els.push(<p key={i} className="text-sm text-gray-700 my-0.5">{line.replace(/\*\*/g, "")}</p>);
      }
    });
    if (inT) flush("tend");
    return els;
  };

  return (
    <DashboardLayout role="Department Staff Dashboard" navItems={staffNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">Documents</h1>
        <p className="text-muted-foreground">Minutes of Meeting from completed meetings you are part of</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center border border-border">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
          <p className="text-muted-foreground">MoM reports will appear here once meetings you are part of are completed.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {meetings.map(meeting => (
            <div key={meeting.id} className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
              {/* Header */}
              <div className="p-5 flex items-center justify-between gap-3">
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => setExpanded(expanded === meeting.id ? null : meeting.id)}
                >
                  <FileText className="w-5 h-5 text-teal-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">{meeting.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Completed: {fmtDate(meeting.completedAt)}
                      </span>
                      {meeting.createdByName && <span>By: {meeting.createdByName}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => downloadAsPDF(meeting.report, meeting.title)}>
                    <FileDown className="w-4 h-4 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadAsWord(meeting.report, meeting.title)}>
                    <Download className="w-4 h-4 mr-1" /> Word
                  </Button>
                  <button onClick={() => setExpanded(expanded === meeting.id ? null : meeting.id)}>
                    {expanded === meeting.id
                      ? <ChevronUp className="w-5 h-5" />
                      : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Report body */}
              {expanded === meeting.id && (
                <div className="border-t border-border p-6 bg-white">
                  <div className="max-w-4xl">{renderReport(meeting.report)}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default StaffDocuments;
