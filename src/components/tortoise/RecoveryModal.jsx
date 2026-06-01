/**
 * RecoveryModal — dialog konfirmasi saat is_currently_sick: true→false
 * Props: tortoise, open, onClose, onConfirm(withCheckup: boolean)
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HeartHandshake } from "lucide-react";

export default function RecoveryModal({ tortoise, open, onClose, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <HeartHandshake className="w-5 h-5" /> Konfirmasi Sembuh
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tandai <strong>{tortoise?.name}</strong> sebagai sembuh dari sakit?
            <br />
            Apakah perlu membuat catatan checkup pemulihan?
          </p>
          <div className="flex flex-col gap-2">
            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => onConfirm(true)}>
              ✅ Ya, buat catatan checkup
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onConfirm(false)}>
              Ya, tanpa catatan checkup
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={onClose}>
              Batal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}