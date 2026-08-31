import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { compressImage } from "@/lib/useImageCompression";
import { safeFormatDate } from "@/lib/safeDate";

export default function ReturnDialog({ user, onClose, onSaved }) {
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [condition, setCondition] = useState("baik");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const { data: myLoans = [] } = useQuery({
    queryKey: ["my-active-loans", user?.email],
    queryFn: () => base44.entities.ToolLoan.filter({
      borrower_email: user.email,
      status: "dipinjam",
    }, "-loan_date", 50),
    enabled: !!user?.email,
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, quality: 0.8 });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed.file });
      setPhotoUrl(file_url);
    } catch (err) {
      toast.error("Gagal upload foto: " + (err?.message || ""));
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedLoanId) { toast.error("Pilih alat yang dikembalikan"); return; }
    setSaving(true);
    try {
      await base44.entities.ToolLoan.update(selectedLoanId, {
        return_date: format(new Date(), "yyyy-MM-dd"),
        return_condition: condition,
        return_notes: notes.trim() || null,
        return_photo_url: photoUrl || null,
        status: "dikembalikan",
      });
      toast.success("Alat dikembalikan" + (condition !== "baik" ? ` (kondisi: ${condition})` : ""));
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setSaving(false);
  };

  if (myLoans.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        Tidak ada alat yang sedang Anda pinjam.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Pilih alat yang dikembalikan</Label>
        <select
          className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={selectedLoanId}
          onChange={(e) => setSelectedLoanId(e.target.value)}
        >
          <option value="">— Pilih —</option>
          {myLoans.map((l) => (
            <option key={l.id} value={l.id}>
              {l.tool_name} (sejak {safeFormatDate(l.loan_date, "d MMM")})
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-xs">Kondisi saat kembali</Label>
        <div className="mt-1 flex gap-2">
          {["baik", "rusak", "hilang"].map((c) => (
            <Button
              key={c}
              size="sm"
              variant={condition === c ? "default" : "outline"}
              className={`flex-1 capitalize ${c === "rusak" ? "border-orange-300" : c === "hilang" ? "border-red-300" : ""}`}
              onClick={() => setCondition(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {(condition === "rusak" || condition === "hilang") && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-800">
          ⚠️ Alat {condition} akan otomatis masuk Daftar Belanja di halaman Belanja sebagai pengganti.
        </div>
      )}

      <div>
        <Label className="text-xs">Catatan (opsional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Catatan kondisi alat..."
          className="mt-1 h-14 resize-none text-sm"
          maxLength={200}
        />
      </div>

      <div>
        <Label className="text-xs">Foto kondisi (opsional)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
        {photoUrl ? (
          <div className="relative mt-1">
            <img src={photoUrl} alt="foto" className="w-full max-h-32 object-contain rounded-lg border" />
            <button type="button" onClick={() => setPhotoUrl("")} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="mt-1 w-full border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary/40">
            {uploading ? <Loader2 className="w-5 h-5 mx-auto animate-spin text-muted-foreground" /> : <ImagePlus className="w-5 h-5 mx-auto text-muted-foreground" />}
            <p className="text-[11px] text-muted-foreground mt-0.5">{uploading ? "Upload..." : "Upload foto (opsional)"}</p>
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Batal</Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={saving || uploading}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Kembalikan
        </Button>
      </div>
    </div>
  );
}