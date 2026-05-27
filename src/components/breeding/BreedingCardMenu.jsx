import { useState, useRef, useEffect } from "react";
import { MoreVertical, Pencil, Trash2, Egg, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BreedingCardMenu({ onEdit, onDelete, onHatch, canEdit, canDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
      >
        <MoreVertical className="w-4 h-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {canEdit && (
            <button
              onClick={() => { setOpen(false); onEdit?.(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Edit
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => { setOpen(false); onHatch?.(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-amber-700"
            >
              <Egg className="w-3.5 h-3.5" /> Tandai Menetas
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => { setOpen(false); onDelete?.(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-red-50 transition-colors text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </button>
          )}
        </div>
      )}
    </div>
  );
}