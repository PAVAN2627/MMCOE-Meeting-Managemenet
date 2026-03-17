import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Image, Download, Eye, X } from "lucide-react";

interface TaskCompletionPreviewProps {
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  completionNote?: string | null;
}

export const TaskCompletionPreview = ({ fileUrl, fileName, fileType, completionNote }: TaskCompletionPreviewProps) => {
  const [open, setOpen] = useState(false);

  if (!fileUrl && !completionNote) return null;

  const isImage = fileType?.startsWith("image/");
  const isPdf = fileType === "application/pdf";

  const handleDownload = () => {
    if (!fileUrl || !fileName) return;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    a.target = "_blank";
    a.click();
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap mt-1">
        {completionNote && (
          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
            Note: {completionNote}
          </span>
        )}
        {fileUrl && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <Eye className="w-3 h-3" />
              View Proof
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 hover:bg-purple-100 transition-colors"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isImage ? <Image className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              {fileName || "Completion Proof"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {completionNote && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                <strong>Completion Note:</strong> {completionNote}
              </div>
            )}
            {fileUrl && isImage && (
              <img src={fileUrl} alt="Completion proof" className="w-full rounded-lg border border-border" />
            )}
            {fileUrl && isPdf && (
              <iframe src={fileUrl} className="w-full h-[500px] rounded-lg border border-border" title="PDF Preview" />
            )}
            {fileUrl && !isImage && !isPdf && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2" />
                <p>Preview not available for this file type</p>
              </div>
            )}
            {fileUrl && (
              <Button onClick={handleDownload} className="w-full" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download {fileName}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
