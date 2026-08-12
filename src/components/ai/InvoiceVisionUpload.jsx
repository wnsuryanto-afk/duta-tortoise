import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScanLine, Loader2, Trash2, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import MultiImagePicker from "@/components/ai/MultiImagePicker";

const EMPTY = { toko: "", tanggal: "", total: "", ongkir: "", diskon: "", items: [{ nama: "", qty: 1, satuan: "", harga_satuan: "", subtotal: "" }] };

const fromInvoice = (r) => ({
  toko: r.toko ?? "",
  tanggal: r.tanggal ?? "",
  total: r.total ?? "",
  ongkir: r.ongkir ?? "",
  diskon: r.diskon ?? "",
  items: (r.items?.length ? r.items : []).map((it) => ({
    nama: it.nama ?? "", qty: it.qty ?? 1, satuan: it.satuan ?? "",
    harga_satuan: it.harga_satuan ?? "", subtotal: it.subtotal ?? "",
  })),
});

/**
 * Pemindai invoice dengan AI Vision (case claudeAI "baca_invoice").
 * Mendukung beberapa gambar sekaligus (maks 5).
 * Props:
 *   onApplied({ invoice, photoUrls })  — dipanggil saat pemilik menyetujui hasil bacaan
 *   buttonLabel, disabled, hint
 */
export default function InvoiceVisionUpload({ onApplied, buttonLabel = "Scan Invoice dengan AI", disabled, hint }) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [catatan, setCatatan] = useState(null);

  const reset = () => { setImages([]); setData(null); setError(null); setCatatan(null); };

  const handleScan = async () => {
    if (images.length === 0) return;
    setLoading(true); setError(null); setData(null); setCatatan(null);
    try {
      const res = await base44.functions.invoke("claudeAI", { mode: "baca_invoice", payload: { images: images.map((i) => i.base64) } });
      const r = res.data?.result;
      if (res.data?.catatan_gambar) setCatatan(res.data.catatan_gambar);
      if (!r || r.error) {
        setError(r?.error === "bukan invoice" ? "Gambar ini bukan invoice." : "Gagal membaca invoice.");
        setData({ ...EMPTY });
      } else if (Array.isArray(r)) {
        const first = r[0] || {};
        setData(fromInvoice(first));
        const note = `Terdeteksi ${r.length} invoice berbeda — hanya invoice pertama ditampilkan.`;
        setCatatan((prev) => (prev ? `${prev} ${note}` : note));
      } else {
        setData(fromInvoice(r));
      }
    } catch (err) {
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.data?.error ||
        err?.body?.error ||
        err?.message ||
        String(err);
      const status = err?.response?.status || err?.status;
      let ramah = "Panggilan AI gagal.";
      const d = String(detail).toLowerCase();
      if (d.includes("api_key") || d.includes("api key") || status === 500) {
        ramah = "Kunci API Claude belum diisi atau salah. Isi CLAUDE_API_KEY di Dashboard Base44 → Secrets.";
      } else if (d.includes("timeout") || d.includes("timed out") || status === 504) {
        ramah = "Waktu habis. Coba kurangi jumlah foto atau gunakan satu foto saja.";
      } else if (d.includes("too large") || d.includes("payload") || status === 413) {
        ramah = "Ukuran gambar terlalu besar. Coba unggah lebih sedikit foto.";
      } else if (status === 401 || status === 403) {
        ramah = "Kunci API ditolak. Periksa CLAUDE_API_KEY di Dashboard Base44 → Secrets.";
      } else if (d.includes("model")) {
        ramah = "Model AI tidak tersedia untuk kunci API ini.";
      }
      setError(`${ramah}\n\nRincian teknis: ${detail}${status ? ` (status ${status})` : ""}`);
      setData({ ...EMPTY });
    }
    setLoading(false);
  };

  const upd = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const updItem = (i, k, v) => setData((d) => { const items = [...d.items]; items[i] = { ...items[i], [k]: v }; return { ...d, items }; });
  const addItem = () => setData((d) => ({ ...d, items: [...d.items, { nama: "", qty: 1, satuan: "", harga_satuan: "", subtotal: "" }] }));
  const delItem = (i) => setData((d) => ({ ...d, items: d.items.filter((_, x) => x !== i) }));

  const handleApply = async () => {
    const photoUrls = [];
    for (const img of images) {
      if (img.blob) {
        try { const r = await base44.integrations.Core.UploadFile({ file: img.blob }); photoUrls.push(r.file_url); } catch { /* lampiran opsional */ }
      }
    }
    onApplied?.({ invoice: data, photoUrls });
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
            <DialogTitle className="flex items-center gap-2"><ScanLine className="w-5 h-5 text-blue-600" /> Scan Invoice AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <MultiImagePicker
              images={images}
              onChange={setImages}
              hint={hint || "Bila invoice panjang dan terpotong saat di-scroll, ambil beberapa tangkapan layar dan unggah semuanya."}
            />

            <Button type="button" className="w-full" disabled={images.length === 0 || loading} onClick={handleScan}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membaca invoice...</> : `Baca Invoice (${images.length} foto)`}
            </Button>

            {error && !loading && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap break-words">{error}{"\n\n"}Silakan isi manual di bawah.</span>
              </div>
            )}
            {catatan && !loading && (
              <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {catatan}
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