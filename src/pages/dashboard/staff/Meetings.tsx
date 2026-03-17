import { useState, useEffect } from "react";
import DashboardLayout, { staffNav } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar, Clock, MapPin, Users, ChevronDown, ChevronUp,
  FileText, StickyNote, CheckSquare, FileDown, Download,
  Pencil, Trash2, Save, Plus, Camera, Loader2, Eye,
} from "lucide-react";
import {
  collection, getDocs, query, where, orderBy,
  addDoc, updateDoc, deleteDoc, doc, Timestamp,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { downloadAsPDF, downloadAsWord } from "@/lib/reportExport";
import { TaskCompletionPreview } from "@/components/shared/TaskCompletionPreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const StaffMeetings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [pNames, setPNames] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [mTasks, setMTasks] = useState<Record<string, any[]>>({});
  const [noteHistory, setNoteHistory] = useState<Record<string, any[]>>({});
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [scanningNote, setScanningNote] = useState<string | null>(null);
  const [scannedText, setScannedText] = useState("");
  const [scannedImage, setScannedImage] = useState("");
  const [showScannedPreview, setShowScannedPreview] = useState(false);
  const [scanMeetingId, setScanMeetingId] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const [mSnap, uSnap] = await Promise.all([
          getDocs(collection(db, "meetings")),
          getDocs(collection(db, "users")),
        ]);
        const nm: Record<string, string> = {};
        uSnap.docs.forEach(d => { nm[d.id] = (d.data() as any).name; });
        setPNames(nm);
        const allUsers = uSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(allUsers);
        const mine = mSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((m: any) => m.participants?.includes(user.id))
          .sort((a: any, b: any) => (b.scheduledAt?.toMillis() ?? 0) - (a.scheduledAt?.toMillis() ?? 0));
        setMeetings(mine);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const loadTasks = async (mid: string) => {
    try {
      const snap = await getDocs(query(collection(db, "tasks"), where("meetingId", "==", mid)));
      setMTasks(p => ({
        ...p,
        [mid]: snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((t: any) => t.status !== "suggested"),
      }));
    } catch (e) { console.error(e); }
  };

  const loadNotes = async (mid: string) => {
    if (!user?.id) return;
    try {
      const snap = await getDocs(
        query(
          collection(db, "note_history"),
          where("meetingId", "==", mid),
          where("userId", "==", user.id),
          orderBy("createdAt", "desc"),
        )
      );
      setNoteHistory(p => ({ ...p, [mid]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
    } catch (e) { console.error(e); }
  };

  const toggleExpand = (mid: string) => {
    if (expanded === mid) { setExpanded(null); return; }
    setExpanded(mid);
    if (!activeTab[mid]) setActiveTab(p => ({ ...p, [mid]: "details" }));
    loadNotes(mid);
    loadTasks(mid);
  };

  const saveNote = async (mid: string) => {
    const text = newNoteText[mid]?.trim();
    if (!text) return;
    try {
      await addDoc(collection(db, "note_history"), {
        meetingId: mid, userId: user!.id, userName: user!.name,
        content: text, type: "manual", createdAt: Timestamp.now(),
      });
      setNewNoteText(p => ({ ...p, [mid]: "" }));
      loadNotes(mid);
      toast({ title: "Note saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save note", variant: "destructive" });
    }
  };

  const updateNote = async (mid: string, nid: string) => {
    if (!editNoteText.trim()) return;
    try {
      await updateDoc(doc(db, "note_history", nid), { content: editNoteText, updatedAt: Timestamp.now() });
      setEditingNoteId(null);
      setEditNoteText("");
      loadNotes(mid);
      toast({ title: "Note updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update note", variant: "destructive" });
    }
  };

  const deleteNote = async (mid: string, nid: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteDoc(doc(db, "note_history", nid));
      loadNotes(mid);
      toast({ title: "Note deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
    }
  };

  const saveScannedNote = async (mid: string) => {
    if (!scannedText.trim()) return;
    try {
      await addDoc(collection(db, "note_history"), {
        meetingId: mid, userId: user!.id, userName: user!.name,
        content: scannedText, type: "scanned", imageData: scannedImage,
        createdAt: Timestamp.now(),
      });
      setScannedText(""); setScannedImage(""); setShowScannedPreview(false);
      loadNotes(mid);
      toast({ title: "Scanned note saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save scanned note", variant: "destructive" });
    }
  };

  const scanNote = (mid: string) => {
    setScanningNote(mid); setScanMeetingId(mid);
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.capture = "environment";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) { setScanningNote(null); return; }
      toast({ title: "Processing", description: "Scanning handwritten notes..." });
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const b64 = ev.target?.result as string;
        try {
          const res = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${import.meta.env.VITE_VISION_API_KEY}`,
            {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ requests: [{ image: { content: b64.split(",")[1] }, features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }] }] }),
            }
          );
          if (res.ok) {
            const extracted = (await res.json()).responses[0]?.fullTextAnnotation?.text || "";
            if (extracted.trim()) {
              let finalText = extracted;
              try {
                const gr = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
                  {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `Fix ONLY spelling mistakes. Return ONLY corrected text:\n\n${extracted}` }] }] }),
                  }
                );
                if (gr.ok) {
                  const c = (await gr.json()).candidates[0]?.content?.parts[0]?.text || "";
                  if (c.trim()) finalText = c.trim();
                }
              } catch { /* use original */ }
              setScannedText(finalText); setScannedImage(b64); setShowScannedPreview(true);
              toast({ title: "Text Extracted", description: "Review and edit before saving" });
            } else {
              toast({ title: "No Text Found", description: "Could not extract text from image", variant: "destructive" });
            }
          } else {
            toast({ title: "Scan Failed", description: res.status === 403 ? "Vision API key invalid" : "OCR failed", variant: "destructive" });
          }
        } catch {
          toast({ title: "Error", description: "Failed to scan image", variant: "destructive" });
        }
        setScanningNote(null);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const fmtDate = (ts: any) =>
    ts?.toDate().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });

  const fmtShort = (ts: any) =>
    ts?.toDate().toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });

  const sColor = (s: string) =>
    s === "completed" ? "bg-green-100 text-green-800" :
    s === "in_progress" ? "bg-blue-100 text-blue-800" :
    s === "cancelled" ? "bg-red-100 text-red-800" :
    "bg-yellow-100 text-yellow-800";

  const pClass = (p: string) =>
    p === "high" ? "bg-red-100 text-red-800" :
    p === "medium" ? "bg-orange-100 text-orange-800" :
    "bg-gray-100 text-gray-800";

  const tsClass = (s: string) =>
    s === "completed" ? "bg-green-100 text-green-800" :
    s === "in_progress" ? "bg-blue-100 text-blue-800" :
    "bg-yellow-100 text-yellow-800";

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
    <>
    <DashboardLayout role="Department Staff Dashboard" navItems={staffNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">My Meetings</h1>
        <p className="text-muted-foreground">Meetings you have been invited to</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center border border-border">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No meetings yet</h3>
          <p className="text-muted-foreground">You haven't been added to any meetings.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {meetings.map(meeting => (
            <div key={meeting.id} className="bg-card rounded-xl shadow-card border border-border overflow-hidden">

              {/* Header */}
              <div
                className="p-5 cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => toggleExpand(meeting.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-foreground">{meeting.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sColor(meeting.status)}`}>
                        {meeting.status?.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{fmtDate(meeting.scheduledAt)}</span>
                      {meeting.duration && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{meeting.duration} min</span>}
                      {meeting.venue && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{meeting.venue}</span>}
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" />{meeting.participants?.length ?? 0} participants</span>
                    </div>
                  </div>
                  {expanded === meeting.id
                    ? <ChevronUp className="w-5 h-5 shrink-0" />
                    : <ChevronDown className="w-5 h-5 shrink-0" />}
                </div>
              </div>

              {/* Expanded */}
              {expanded === meeting.id && (
                <div className="border-t border-border">

                  {/* Tab bar */}
                  <div className="flex gap-2 p-4 border-b bg-white">
                    <button
                      onClick={() => setActiveTab(p => ({ ...p, [meeting.id]: "details" }))}
                      className={`px-4 py-2 font-medium rounded ${activeTab[meeting.id] === "details" || !activeTab[meeting.id] ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                    >
                      Details
                    </button>
                    <button
                      onClick={() => setActiveTab(p => ({ ...p, [meeting.id]: "notes" }))}
                      className={`px-4 py-2 font-medium rounded flex items-center gap-2 ${activeTab[meeting.id] === "notes" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                    >
                      <StickyNote className="w-4 h-4" /> My Notes
                    </button>
                    {mTasks[meeting.id]?.length > 0 && (
                      <button
                        onClick={() => setActiveTab(p => ({ ...p, [meeting.id]: "tasks" }))}
                        className={`px-4 py-2 font-medium rounded flex items-center gap-2 ${activeTab[meeting.id] === "tasks" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                      >
                        <CheckSquare className="w-4 h-4" /> Tasks ({mTasks[meeting.id].length})
                      </button>
                    )}
                    {meeting.report && (
                      <button
                        onClick={() => setActiveTab(p => ({ ...p, [meeting.id]: "report" }))}
                        className={`px-4 py-2 font-medium rounded flex items-center gap-2 ${activeTab[meeting.id] === "report" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                      >
                        <FileText className="w-4 h-4" /> Report
                      </button>
                    )}
                  </div>

                  {/* ── DETAILS ── */}
                  {activeTab[meeting.id] === "details" && (
                    <div className="p-6 space-y-6">
                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Date & Time</Label>
                          <p className="text-sm mt-1">{fmtDate(meeting.scheduledAt)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                          <p className="text-sm mt-1">{meeting.duration} minutes</p>
                        </div>
                        {meeting.venue && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Venue</Label>
                            <p className="text-sm mt-1">{meeting.venue}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Organizer</Label>
                          <p className="text-sm mt-1">{meeting.createdByName || pNames[meeting.createdBy] || "Unknown"}</p>
                        </div>
                      </div>

                      {/* Participants */}
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                          Participants ({meeting.participants?.length || 0})
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          {meeting.participants?.map((pid: string) => {
                            const participant = users.find((u: any) => u.id === pid);
                            const displayRole = participant?.designation || participant?.role?.replace(/_/g, " ") || "";
                            return (
                              <div key={pid} className="bg-white p-3 rounded border flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                  {pNames[pid]?.charAt(0) || "?"}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{pNames[pid] || "Unknown"}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{displayRole}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Agenda */}
                      {meeting.agendaItems?.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground mb-2 block">Agenda Items</Label>
                          <div className="space-y-2">
                            {meeting.agendaItems.map((item: any, i: number) => (
                              <div key={i} className="bg-white p-4 rounded border">
                                <p className="font-medium text-sm">{item.title}</p>
                                {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                                <p className="text-xs text-muted-foreground mt-2">Added by: {item.addedByName}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Documents */}
                      {meeting.documents?.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground mb-2 block">Documents</Label>
                          <div className="space-y-2">
                            {meeting.documents.map((d: any) => (
                              <div key={d.id} className="flex items-center justify-between bg-white p-3 rounded border">
                                <div className="flex items-center gap-2 flex-1">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{d.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded by {d.uploadedByName} · {(d.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setPreviewDocument(d)}>
                                    <Eye className="w-4 h-4 mr-1" /> Preview
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => {
                                    const link = document.createElement("a");
                                    link.href = d.data; link.download = d.name; link.click();
                                  }}>
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Completed banner */}
                      {meeting.status === "completed" && meeting.completedAt && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                          Meeting completed on {fmtShort(meeting.completedAt)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── NOTES ── */}
                  {activeTab[meeting.id] === "notes" && (
                    <div className="p-5 space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Note</p>
                        <Textarea
                          placeholder="Write your personal note for this meeting..."
                          value={newNoteText[meeting.id] || ""}
                          onChange={e => setNewNoteText(p => ({ ...p, [meeting.id]: e.target.value }))}
                          rows={3}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveNote(meeting.id)} disabled={!newNoteText[meeting.id]?.trim()}>
                            <Plus className="w-4 h-4 mr-1" /> Save Note
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => scanNote(meeting.id)}
                            disabled={scanningNote === meeting.id}
                          >
                            {scanningNote === meeting.id
                              ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              : <Camera className="w-4 h-4 mr-1" />}
                            {scanningNote === meeting.id ? "Scanning..." : "Scan Image"}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          Note History ({noteHistory[meeting.id]?.length ?? 0})
                        </p>
                        {(noteHistory[meeting.id]?.length ?? 0) === 0 ? (
                          <p className="text-sm text-muted-foreground">No notes yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {noteHistory[meeting.id].map((note: any) => (
                              <div key={note.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                {editingNoteId === note.id ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editNoteText}
                                      onChange={e => setEditNoteText(e.target.value)}
                                      rows={3}
                                      className="text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => updateNote(meeting.id, note.id)}>
                                        <Save className="w-3 h-3 mr-1" /> Save
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingNoteId(null)}>
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {note.type === "scanned" ? "📷 Scanned" : "✏️ Manual"} ·{" "}
                                        {note.createdAt?.toDate().toLocaleDateString("en-US", {
                                          month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                                        })}
                                      </p>
                                      {note.imageData && (
                                        <img src={note.imageData} alt="Scanned" className="mt-2 max-h-32 rounded border" />
                                      )}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <button
                                        onClick={() => { setEditingNoteId(note.id); setEditNoteText(note.content); }}
                                        className="p-1 text-muted-foreground hover:text-blue-600"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => deleteNote(meeting.id, note.id)}
                                        className="p-1 text-muted-foreground hover:text-red-600"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── TASKS ── */}
                  {activeTab[meeting.id] === "tasks" && (
                    <div className="p-5 space-y-3">
                      {(mTasks[meeting.id] ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No tasks for this meeting.</p>
                      ) : (
                        (mTasks[meeting.id] ?? []).map((task: any) => {
                          const due = task.dueDate || task.suggestedDueDate;
                          const overdue = due && due.toDate() < new Date() && task.status !== "completed";
                          return (
                            <div key={task.id} className={`bg-white rounded-lg border p-4 ${overdue ? "border-red-300 bg-red-50/20" : "border-border"}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{task.title || task.description}</p>
                                  {task.title && task.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                                  )}
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <span className={`text-xs px-2 py-0.5 rounded ${pClass(task.priority)}`}>{task.priority} priority</span>
                                    {task.assignedTo && pNames[task.assignedTo] && (
                                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                        → {pNames[task.assignedTo]}
                                      </span>
                                    )}
                                    {due && (
                                      <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${overdue ? "bg-red-100 text-red-700" : "bg-orange-50 text-orange-700"}`}>
                                        <Clock className="w-3 h-3" />
                                        {overdue ? "Overdue: " : "Due: "}
                                        {due.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                      </span>
                                    )}
                                  </div>
                                  {task.status === "completed" && (task.completionFileData || task.completionNote) && (
                                    <TaskCompletionPreview
                                      fileUrl={task.completionFileData}
                                      fileName={task.completionFileName}
                                      fileType={task.completionFileType}
                                      completionNote={task.completionNote}
                                    />
                                  )}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${tsClass(task.status)}`}>
                                  {task.status.replace("_", " ")}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* ── REPORT ── */}
                  {activeTab[meeting.id] === "report" && meeting.report && (
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Minutes of Meeting</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => downloadAsPDF(meeting.report, meeting.title)}>
                            <FileDown className="w-4 h-4 mr-1" /> PDF
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => downloadAsWord(meeting.report, meeting.title)}>
                            <Download className="w-4 h-4 mr-1" /> Word
                          </Button>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-border p-5 max-w-4xl">
                        {renderReport(meeting.report)}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>

    {/* Document preview dialog */}
    {previewDocument && (
      <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewDocument.name}</DialogTitle>
          </DialogHeader>
          {previewDocument.type?.startsWith("image/") ? (
            <img src={previewDocument.data} alt={previewDocument.name} className="w-full rounded" />
          ) : previewDocument.type === "application/pdf" ? (
            <iframe src={previewDocument.data} className="w-full h-[70vh] rounded border" title={previewDocument.name} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3" />
              <p>Preview not available for this file type.</p>
              <Button className="mt-3" onClick={() => {
                const link = document.createElement("a");
                link.href = previewDocument.data; link.download = previewDocument.name; link.click();
              }}>
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    )}

    {/* Scanned note preview dialog */}
    <Dialog open={showScannedPreview} onOpenChange={setShowScannedPreview}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Scanned Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {scannedImage && (
            <img src={scannedImage} alt="Scanned" className="w-full max-h-48 object-contain rounded border" />
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Extracted Text</p>
            <textarea
              className="w-full border rounded p-2 text-sm min-h-[120px]"
              value={scannedText}
              onChange={e => setScannedText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveScannedNote(scanMeetingId)} disabled={!scannedText.trim()}>
              <Save className="w-4 h-4 mr-1" /> Save Note
            </Button>
            <Button variant="outline" onClick={() => { setShowScannedPreview(false); setScannedText(""); setScannedImage(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default StaffMeetings;
