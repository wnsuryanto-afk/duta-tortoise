import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

const ENCLOSURES = ["W1","W2","W3","W4","W5","N1","N2","E1","E2","E3","E4","E5","L2"];

export default function MoveEnclosureDialog({ tortoise, open, onClose, onMoved }) {
  const [newEnclosure, setNewEnclosure] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!newEnclosure.trim()) return;
    setSaving(true);
    await base44.entities.Tortoise.update(tortoise.id, { enclosure: newEnclosure.trim().toUpperCase() });
    onMoved();
    onClose();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pindah Kandang</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 text-sm">
            <div className="px-3 py-1.5 rounded bg-muted font-medium">{tortoise?.enclosure || "-"}</div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className="px-3 py-1.5 rounded bg-primary/10 text-primary font-medium min-w-12 text-center">
              {newEnclosure || "?"}
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Kandang Tujuan</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ENCLOSURES.filter(e => e !== tortoise?.enclosure).map(e => (
                <button
                  key={e}
                  onClick={() => setNewEnclosure(e)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                    newEnclosure === e
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:bg-muted"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <Input
              placeholder="Atau ketik manual..."
              value={newEnclosure}
              onChange={(e) => setNewEnclosure(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={!newEnclosure.trim() || saving}>
            {saving ? "Memindahkan..." : "Pindahkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}