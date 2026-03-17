import { useState, useEffect } from "react";
import DashboardLayout, { principalNav } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, ChevronDown, ChevronUp, Download, FileDown, Save } from "lucide-react";
import { collection, query, getDocs, where, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { downloadAsPDF, downloadAsWord } from "@/lib/reportExport";

const PrincipalMoM = () => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [savedMoMs, setSavedMoMs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      if (!user?.id) return;
      try {
        const q = query(collection(db, "meetings"), where("status", "==", "completed"));
        const snap = await getDocs(q);
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          // Only meetings principal created or participated in, and that have a report
          .filter((m: any) => m.report && (m.createdBy === user.id || m.participants?.includes(user.id)))
          .sort((a: any, b: any) => {
            const aTime = a.completedAt?.toMillis?.() ?? a.scheduledAt?.toMillis?.() ?? 0;
            const bTime = b.completedAt?.toMillis?.() ?? b.scheduledAt?.toMillis?.() ?? 0;
            return bTime - aTime;
          });
        setMeetings(list);

        // Check which ones are already saved as MoM docs
        const savedSnap = await getDocs(collection(db, "mom_documents"));
        const savedIds: Record<string, boolean> = {};
        savedSnap.docs.forEach(d => { savedIds[d.data().meetingId] = true; });
        setSavedMoMs(savedIds);
      } catch (e) {
        console.error("MoM fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user?.id]);

  const formatDate = (ts: any) =>
    ts?.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

  const saveToFirestore = async (meeting: any) => {
    setSaving(meeting.id);
    try {
      await setDoc(doc(db, "mom_documents", meeting.id), {
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        report: meeting.report,
        createdByName: meeting.createdByName || "",
        completedAt: meeting.completedAt,
        savedAt: Timestamp.now(),
      });
      setSavedMoMs(prev => ({ ...prev, [meeting.id]: true }));
      toast({ title: "Saved", description: "MoM document saved successfully" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save MoM", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const renderReport = (report: string) => {
    const lines = report.split("\n");
    const elements: JSX.Element[] = [];
    let tableBuffer: string[][] = [];
    let inTable = false;

    const flushTable = (key: string) => {
      if (!tableBuffer.length) return;
      elements.push(
        <div key={key} className="overflow-x-auto my-3">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-800 text-white">
                {tableBuffer[0].map((h, j) => <th key={j} className="px-3 py-2 text-left font-semibold border border-blue-700">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tableBuffer.slice(1).map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  {row.map((cell, ci) => <td key={ci} className="px-3 py-2 border border-gray-200">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableBuffer = [];
      inTable = false;
    };

    lines.forEach((line, i) => {
      if (line.startsWith("| ") && line.includes("|") && !line.includes(":--")) {
        const cells = line.split("|").map(c => c.trim()).filter(Boolean);
        if (!inTable) inTable = true;
        tableBuffer.push(cells);
      } else {
        if (inTable) flushTable(`table-${i}`);
        if (line.startsWith("# ")) {
          elements.push(<h1 key={i} className="text-xl font-bold text-blue-900 mt-4 mb-2">{line.slice(2)}</h1>);
        } else if (line.startsWith("## ")) {
          elements.push(<h2 key={i} className="text-sm font-bold text-blue-800 uppercase tracking-wide mt-5 mb-2 border-b border-blue-200 pb-1">{line.slice(3)}</h2>);
        } else if (line.startsWith("*   ")) {
          elements.push(<li key={i} className="ml-5 text-sm text-gray-700 list-disc">{line.replace(/^\*\s+/, "").replace(/\*\*/g, "")}</li>);
        } else if (line.startsWith("---")) {
          elements.push(<hr key={i} className="my-3 border-gray-200" />);
        } else if (line.trim()) {
          elements.push(<p key={i} className="text-sm text-gray-700 my-0.5">{line.replace(/\*\*/g, "")}</p>);
        }
      }
    });
    if (inTable) flushTable("table-end");
    return elements;
  };

  return (
    <DashboardLayout role="Principal Dashboard" navItems={principalNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">Minutes of Meeting</h1>
        <p className="text-muted-foreground">Reports from all completed meetings</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center border border-border">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No MoM documents yet</h3>
          <p className="text-muted-foreground">Reports are generated automatically when meetings are completed.</p>
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
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Completed: {formatDate(meeting.completedAt)}</span>
                      {meeting.createdByName && <span>By: {meeting.createdByName}</span>}
                      {savedMoMs[meeting.id] && <span className="text-green-600 font-medium">✓ Saved</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!savedMoMs[meeting.id] && (
                    <Button size="sm" variant="outline" disabled={saving === meeting.id} onClick={() => saveToFirestore(meeting)}>
                      <Save className="w-4 h-4 mr-1" />
                      {saving === meeting.id ? "Saving..." : "Save"}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => downloadAsPDF(meeting.report, meeting.title)}>
                    <FileDown className="w-4 h-4 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadAsWord(meeting.report, meeting.title)}>
                    <Download className="w-4 h-4 mr-1" /> Word
                  </Button>
                  <button onClick={() => setExpanded(expanded === meeting.id ? null : meeting.id)}>
                    {expanded === meeting.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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

export default PrincipalMoM;
