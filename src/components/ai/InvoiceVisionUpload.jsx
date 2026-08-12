import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScanLine, Camera, Loader2, Trash2, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { fileToCompressedBase64 } from "@/lib/aiImageBase64";

const EMPTY = { toko: "", tanggal: "", total: "", ongkir: "", diskon: "", items: [{ nama: "", qty: 1, satuan: "", harga_satuan: "", subtotal: "" }] };

/**
 * Pemindai invoice dengan AI Vision (case claudeAI "baca_invoice").
 * Props:
 *   onApplied({ invoice, photoUrl })  — dipanggil saat pemilik menyetujui hasil bacaan
 *   buttonLabel, disabled
 */
export default function InvoiceVisionUpload({ onApplied, buttonLabel = "Scan Invoice dengan AI", disabled }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [blob, setBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const reset = () => { setPreview(null); setBlob(null); setData(null); setError(null); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(null); setData(null);
    try {
      const { base64, dataUrl, blob: bl } = await fileToCompressedBase64(file, 1500);
      setPreview(dataUrl); setBlob(bl);
      const res = await base44.functions.invoke("claudeAI", { mode: "baca_invoice", payload: { imageBase64: base64 } });
      const r = res.data?.result;
      if (!r || r.error) {
        setError(r?.error === "bukan invoice" ? "Gambar ini bukan invoice." : "Gagal membaca invoice.");
        setData({ ...EMPTY });
      } else {
        setData({
          toko: r.toko ?? "",
          tanggal: r.tanggal ?? "",
          total: r.total ?? "",
          ongkir: r.ongkir ?? "",
          diskon: r.diskon ?? "",
          items: (r.items?.length ? r.items : []).map((it) => ({
            nama: it.nama ?? "",
            qty: it.qty ?? 1,
            satuan: it.satuan ?? "",
            harga_satuan: it.harga_satuan ?? "",
            subtotal: it.subtotal ?? "",
          })),
        });
      }
    } catch {
      setError("Panggilan AI gagal atau habis waktu.");
      setData({ ...EMPTY });
    }
    setLoading(false);
  };

  const upd = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const updItem = (i, k, v) => setData((d) => { const items = [...d.items]; items[i] = { ...items[i], [k]: v }; return { ...d, items }; });
  const addItem = () => setData((d) => ({ ...d, items: [...d.items, { nama: "", qty: 1, satuan: "", harga_satuan: "", subtotal: "" }] }));
  const delItem = (i) => setData((d) => ({ ...d, items: d.items.filter((_, x) => x !== i) }));

  const handleApply = async () => {
    let photoUrl = null;
    if (blob) {
      try { const r = await base44.integrations.Core.UploadFile({ file: blob }); photoUrl = r.file_url; } catch { /* lampiran opsional */ }
    }
    onApplied?.({ invoice: data, photoUrl });
    setOpen(false); reset();
  };

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button type="button" variant="outline" size="sm" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50" disabled={disabled} onClick={() => setOpen(true)}>
          <ScanLine className="w-4 h-4" /> {buttonLabel}
        </Button>
        <span className="text-[10px] text-muted-foreground">Hasil AI perlu diperiksa sebelum disimpan.</span>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Camera className="w-5 h-5 text-blue-600" /> Scan Invoice AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:border-blue-400 text-sm text-muted-foreground transition-colors">
              <Camera className="w-4 h-4" /> Ambil / Pilih Foto Invoice
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>

            {preview && <img src={preview} alt="preview" className="rounded-lg max-h-48 mx-auto border" />}

            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Membaca invoice...
              </div>
            )}

            {error && !loading && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error} Sebagian data tidak terbaca — silakan isi manual di bawah.</span>
              </div>
            )}

            {data && !loading && (
              <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Toko</Label><Input value={data.toko ?? ""} onChange={(e) => upd("toko", e.target.value)} /></div>
                  <div><Label className="text-xs">Tanggal</Label><Input type="date" value={data.tanggal ?? ""} onChange={(e) => upd("tanggal", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Total</Label><Input type="number" value={data.total ?? ""} onChange={(e) => upd("total", e.target.value)} /></div>
                  <div><Label className="text-xs">Ongkir</Label><Input type="number" value={data.ongkir ?? ""} onChange={(e) => upd("ongkir", e.target.value)} /></div>
                  <div><Label className="text-xs">Diskon</Label><Input type="number" value={data.diskon ?? ""} onChange={(e) => upd("diskon", e.target.value)} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Item</Label>
                    <Button type="button" size="sm" variant="ghost" onClick={addItem} className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Tambah</Button>
                  </div>
                  <div className="space-y-2">
                    {data.items.map((it, i) => (
                      <div key={i} className="space-y-1">
                        <div className="grid grid-cols-12 gap-1 items-center">
                          <Input className="col-span-5 h-8" placeholder="Nama barang" value={it.nama ?? ""} onChange={(e) => updItem(i, "nama", e.target.value)} />
                          <Input className="col-span-2 h-8" type="number" placeholder="Qty" value={it.qty ?? ""} onChange={(e) => updItem(i, "qty", e.target.value)} />
                          <Input className="col-span-2 h-8" placeholder="Satuan" value={it.satuan ?? ""} onChange={(e) => updItem(i, "satuan", e.target.value)} />
                          <Input className="col-span-3 h-8" type="number" placeholder="Subtotal" value={it.subtotal ?? ""} onChange={(e) => updItem(i, "subtotal", e.target.value)} />
                        </div>
                        <button type="button" onClick={() => delItem(i)} className="text-xs text-red-600 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Hapus</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setOpen(false); reset(); }}>Batal</Button>
                  <Button type="button" className="flex-1" onClick={handleApply}><CheckCircle2 className="w-4 h-4 mr-1" /> Gunakan Data Ini</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}