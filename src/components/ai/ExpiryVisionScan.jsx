import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarClock, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import MultiImagePicker from "@/components/ai/MultiImagePicker";

const EMPTY = { expired_date: "", batch_number: "", nama_produk: "", keyakinan: "rendah" };

const EXPIRY_SCHEMA = {
  type: "object",
  properties: {
    expired_date: { type: "string" },
    batch_number: { type: "string" },
    nama_produk: { type: "string" },
    keyakinan: { type: "string" },
  },
};

/**
 * Pemindai tanggal kadaluarsa dengan AI Vision memakai integrasi bawaan Base44 (InvokeLLM).
 * Tidak butuh kunci API tambahan. Mendukung beberapa gambar (maks 5).
 * Props: onApplied({ expired_date, batch_number, nama_produk, keyakinan }), disabled
 */
export default function ExpiryVisionScan({ onApplied, disabled }) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const reset = () => { setImages([]); setData(null); setError(null); };

  const uploadImages = async () => {
    const urls = [];
    for (const img of images) {
      if (!img.blob) continue;
      try { const r = await base44.integrations.Core.UploadFile({ file: img.blob }); if (r?.file_url) urls.push(r.file_url); } catch { /* opsional */ }
    }
    return urls;
  };

  const handleScan = async () => {
    if (images.length === 0) return;
    setLoading(true); setError(null); setData(null);
    try {
      const urls = await uploadImages();
      if (urls.length === 0) {
        setError("Gagal mengunggah gambar untuk dianalisis. Coba foto yang lebih kecil atau periksa koneksi.");
        setData({ ...EMPTY });
        setLoading(false);
        return;
      }
      const multiNote = urls.length > 1
        ? " Beberapa gambar adalah beberapa sisi kemasan yang sama — ambil tanggal kadaluarsa dan nomor batch dari sisi mana pun yang paling jelas terbaca."
        : "";
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Anda pembaca kemasan obat/vitamin. Baca foto kemasan.${multiNote}\n\nKembalikan JSON: expired_date (YYYY-MM-DD), batch_number, nama_produk, keyakinan (tinggi/sedang/rendah). Tanggal kadaluarsa di kemasan Indonesia sering ditulis MM/YYYY atau "EXP 03/28". Bila hanya bulan dan tahun tertulis, pakai tanggal terakhir bulan itu (YYYY-MM-28/30/31 sesuai bulan). Bila tidak terbaca jelas, isi null dan keyakinan "rendah". JANGAN menebak.`,
        file_urls: urls,
        response_json_schema: EXPIRY_SCHEMA,
      });
      if (!result) {
        setError("Gagal membaca kemasan.");
        setData({ ...EMPTY });
      } else {
        setData({
          expired_date: result.expired_date || "",
          batch_number: result.batch_number || "",
          nama_produk: result.nama_produk || "",
          keyakinan: result.keyakinan || "rendah",
        });
      }
    } catch (e) {
      const msg = e?.message || "";
      setError(`Gagal memanggil AI bawaan Base44 (mungkin layanan sibuk, gambar terlalu besar, atau waktu habis). ${msg}`);
      setData({ ...EMPTY });
    }
    setLoading(false);
  };

  const upd = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const handleApply = () => { onApplied?.(data); setOpen(false); reset(); };

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button type="button" variant="outline" size="sm" className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50" disabled={disabled} onClick={() => setOpen(true)}>
          <CalendarClock className="w-4 h-4" /> Foto Tanggal Kadaluarsa
        </Button>
        <span className="text-[10px] text-muted-foreground">Hasil AI perlu diperiksa.</span>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-amber-600" /> Baca Kadaluarsa AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <MultiImagePicker
              images={images}
              onChange={setImages}
              hint="Foto sisi depan dan sisi yang bertuliskan EXP."
            />
            <p className="text-[10px] text-muted-foreground">Memakai AI bawaan Base44 — tidak perlu kunci API tambahan.</p>
            <Button type="button" className="w-full" disabled={images.length === 0 || loading} onClick={handleScan}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membaca kemasan...</> : `Baca Kadaluarsa (${images.length} foto)`}
            </Button>

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