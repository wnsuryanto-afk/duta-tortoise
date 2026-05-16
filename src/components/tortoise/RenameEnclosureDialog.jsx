import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, PenLine } from "lucide-react";

// Rename semua tortoise di kandang lama -> kandang baru
export default function RenameEnclosureDialog({ open, onClose, enclosureName, tortoiseIds }) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState(enclosureName);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === enclosureName) { onClose(); return; }
    setSaving(true);
    await Promise.all(
      tortoiseIds.map((id) => base44.entities.Tortoise.update(id, { enclosure: newName.trim() }))
    );
    qc.invalidateQueries({ queryKey: ["tortoises"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-primary" />
            Ubah Nama Kandang
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nama Kandang Baru</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="cth: W1" autoFocus />
            <p className="text-xs text-muted-foreground">
              Akan memperbarui {tortoiseIds.length} kura-kura sekaligus.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={saving || !newName.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}