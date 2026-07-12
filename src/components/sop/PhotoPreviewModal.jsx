import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock } from "lucide-react";

export default function PhotoPreviewModal({ open, onClose, photoUrl, takenAt, taskTitle }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {taskTitle && (
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-sm">{taskTitle}</DialogTitle>
          </DialogHeader>
        )}
        {photoUrl ? (
          <div className="px-4 pb-4">
            <img src={photoUrl} alt="Bukti foto" className="w-full rounded-xl" />
            {takenAt && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Foto diambil pukul {takenAt}
              </p>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">Tidak ada foto</div>
        )}
      </DialogContent>
    </Dialog>
  );
}