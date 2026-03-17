import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Image, X, Loader2, CheckCircle2 } from "lucide-react";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useToast } from "@/hooks/use-toast";

interface TaskCompletionUploadDialogProps {
  open: boolean;
  taskId: string;
  taskTitle: string;
  onConfirmed: (taskId: string) => void;
  onCancel: () => void;
}

export const TaskCompletionUploadDialog = ({
  open,
  taskId,
  taskTitle,
  onConfirmed,
  onCancel,
}: TaskCompletionUploadDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowed.includes(f.type)) {
      toast({ title: "Invalid file", description: "Only PDF or image files are allowed", variant: "destructive" });
      return;
    }
    // Firestore document limit is 1MB, keep files under 900KB to be safe
    if (f.size > 900 * 1024) {
      toast({ title: "File too large", description: "Max file size is 900KB for direct storage", variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const toBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      // Simulate progress
      reader.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      reader.readAsDataURL(f);
    });

  const handleConfirm = async () => {
    setUploading(true);
    setProgress(0);
    try {
      let fileData: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;

      if (file) {
        fileData = await toBase64(file);
        fileName = file.name;
        fileType = file.type;
      }

      await updateDoc(doc(db, "tasks", taskId), {
        status: "completed",
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        completionNote: note.trim() || null,
        completionFileData: fileData,   // base64 stored directly in Firestore
        completionFileName: fileName,
        completionFileType: fileType,
      });

      toast({ title: "Task marked as completed" });
      onConfirmed(taskId);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to complete task", variant: "destructive" });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleSkip = async () => {
    setUploading(true);
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        status: "completed",
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      toast({ title: "Task marked as completed" });
      onConfirmed(taskId);
    } catch {
      toast({ title: "Error", description: "Failed to complete task", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const isImage = file?.type.startsWith("image/");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !uploading) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Mark Task as Completed
          </DialogTitle>
          <DialogDescription>
            Optionally upload a proof document (PDF or image, max 900KB) for: <strong>{taskTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file ? "border-green-400 bg-green-50" : "border-border hover:border-accent hover:bg-accent/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                {isImage ? <Image className="w-8 h-8 text-green-600" /> : <FileText className="w-8 h-8 text-green-600" />}
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload PDF or image</p>
                <p className="text-xs text-muted-foreground mt-1">Max 900KB (stored in database)</p>
              </div>
            )}
          </div>

          {uploading && progress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing...</span><span>{progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Completion Note (optional)</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Brief note about task completion..."
              rows={2}
              disabled={uploading}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleConfirm} disabled={uploading} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Confirm Complete"}
            </Button>
            <Button variant="outline" onClick={handleSkip} disabled={uploading}>
              Skip Upload
            </Button>
            <Button variant="ghost" onClick={onCancel} disabled={uploading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
