import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarClock, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { fileToCompressedBase64 } from "@/lib/aiImageBase64";

const EMPTY = { expired_date: "", batch_number: "", nama_produk: "", keyakinan: "rendah" };

/**
 * Pemindai tanggal kadaluarsa dengan AI Vision (case claudeAI "baca_kadaluarsa").
 * Props:
 *   onApplied({ expired_date, batch_number, nama_produk, keyakinan })
 *   disabled
 */
export default function ExpiryVisionScan({ onApplied, disabled }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const reset = () => { setPreview(null); setData(null); setError(null); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(null); setData(null);
    try {
      const { base64, dataUrl } = await fileToCompressedBase64(file, 1500);
      setPreview(dataUrl);
      const res = await base44.functions.invoke("claudeAI", { mode: "baca_kadaluarsa", payload: { imageBase64: base64 } });
      const r = res.data?.result;
      if (!r || r.error) { setError("Gagal membaca kemasan."); setData({ ...EMPTY }); }
      else setData({ expired_date: r.expired_date || "", batch_number: r.batch_number || "", nama_produk: r.nama_produk || "", keyakinan: r.keyakinan || "rendah" });
    } catch {
      setError("Panggilan AI gagal atau habis waktu.");
      setData({ ...EMPTY });
    }
    setLoading(false);
  };

  const upd = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const handleApply = () => { onApplied?.(data); setOpen(false); reset(); };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50" disabled={disabled} onClick={() => setOpen(true)}>
        <CalendarClock className="w-4 h-4" /> Foto Tanggal Kadaluarsa
      </Button>
      <span className="text-[10px] text-muted-foreground ml-1">Hasil AI perlu diperiksa.</span>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-amber-600" /> Baca Kadaluarsa AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:border-amber-400 text-sm text-muted-foreground transition-colors">
              <CalendarClock className="w-4 h-4" /> Ambil / Pilih Foto Kemasan
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            {preview && <img src={preview} alt="preview" className="rounded-lg max-h-40 mx-auto border" />}
            {loading && <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-4 h-4 animate-spin" /> Membaca kemasan...</div>}
            {error && !loading && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error} Isi manual di bawah.
              </div>
            )}
            {data && !loading && (
              <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                {data.keyakinan === "rendah" && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Tanggal kurang jelas terbaca — mohon periksa kembali.
                  </div>
                )}
                <div><Label className="text-xs">Tanggal Kadaluarsa</Label><Input type="date" value={data.expired_date || ""} onChange={(e) => upd("expired_date", e.target.value)} /></div>
                <div><Label className="text-xs">No. Batch</Label><Input value={data.batch_number || ""} onChange={(e) => upd("batch_number", e.target.value)} /></div>
                <div><Label className="text-xs">Nama Produk</Label><Input value={data.nama_produk || ""} onChange={(e) => upd("nama_produk", e.target.value)} /></div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setOpen(false); reset(); }}>Batal</Button>
                  <Button type="button" className="flex-1" onClick={handleApply}><CheckCircle2 className="w-4 h-4 mr-1" /> Gunakan</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}