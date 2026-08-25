import { useState } from "react";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pin } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

/**
 * IncidentalFromTemuanDialog — form buat tugas insidentil dari temuan AI.
 * Pre-isi judul & catatan dari teks temuan.
 */
export default function IncidentalFromTemuanDialog({ finding, user, onClose, onResolved }) {
  const [title, setTitle] = useState(finding ? `Tindak lanjut: ${finding.task_title}` : "");
  const [notes, setNotes] = useState(finding?.finding_text || "");
  const [assignedTo, setAssignedTo] = useState("");
  const [points, setPoints] = useState(10);
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [submitting, setSubmitting] = useState(false);

  const { data: users = [] } = useActiveUsers({ enabled: !!finding });

  if (!finding) return null;

  const staff = users.filter(u => ["keeper", "kepala_feeder", "admin", "manajer"].includes(u.role));
  const selectedUser = users.find(u => u.id === assignedTo);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await base44.entities.IncidentalTask.create({
        title,
        assigned_to_email: selectedUser?.email || "",
        assigned_to_name: selectedUser?.full_name || "",
        points,
        due_date: dueDate,
        notes: `Dari temuan foto (${finding.employee_name}, ${finding.date}): ${notes}`,
        status: "pending",
        is_active: true,
        created_by_email: user?.email || "",
        created_by_name: user?.full_name || "",
      });

      await onResolved(finding, "incidental_task");
      toast.success("Tugas insidentil dibuat & temuan ditandai selesai");
      onClose();
    } catch (e) {
      toast.error("Gagal: " + (e.message || e));
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={!!finding} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pin className="w-4 h-4 text-blue-600" /> Jadikan Tugas Insidentil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {finding.photo_url && (
            <img src={finding.photo_url} alt="Bukti" className="h-24 w-full object-cover rounded-lg border" />
          )}

          <div>
            <Label className="text-xs">Judul Tugas</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="text-sm mt-1" />
          </div>

          <div>
            <Label className="text-xs">Catatan (terisi dari temuan)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="resize-none h-16 text-xs mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Ditugaskan ke</Label>
              <select
                className="w-full mt-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
              >
                <option value="">— Siapa saja —</option>
                {staff.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Poin</Label>
              <Input type="number" value={points} onChange={e => setPoints(Number(e.target.value) || 0)} className="text-sm mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Tenggat</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-sm mt-1" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Batal</Button>
          <Button size="sm" onClick={handleSave} disabled={!title.trim() || submitting} className="gap-1.5">
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Buat Tugas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}