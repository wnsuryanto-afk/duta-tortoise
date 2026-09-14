import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScanLine, Loader2, Trash2, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import MultiImagePicker from "@/components/ai/MultiImagePicker";

const EMPTY = { toko: "", tanggal: "", total: "", ongkir: "", diskon: "", items: [{ nama: "", qty: 1, satuan: "", harga_satuan: "", subtotal: "" }] };

const INVOICE_SCHEMA = {
  type: "object",
  properties: {
    toko: { type: "string" },
    tanggal: { type: "string" },
    total: { type: "number" },
    ongkir: { type: "number" },
    diskon: { type: "number" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nama: { type: "string" },
          qty: { type: "number" },
          satuan: { type: "string" },
          harga_satuan: { type: "number" },
          subtotal: { type: "number" },
        },
      },
    },
    error: { type: "string" },
  },
};

const rp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");

/**
 * Selisih antara jumlah item dan total yang tertulis di invoice.
 *
 * Belanja peternakan ini lewat marketplace, dan di marketplace hampir selalu
 * ada potongan yang TIDAK muncul sebagai baris item: flash sale, kupon toko,
 * cashback, gratis ongkir sebagian. AI membaca angka yang terlihat, jadi
 * jumlah subtotal item sering tidak sama dengan total yang dibayar — dan
 * selisih itulah satu-satunya petunjuk bahwa ada promo yang belum tercatat.
 *
 * Dulu tidak ada yang menghitungnya, jadi angka yang meleset masuk diam-diam
 * dan baru terasa berbulan-bulan kemudian saat harga pokok terlihat aneh.
 * Sekarang dihitung dan ditampilkan sebelum tombol simpan ditekan.
 *
 * Toleransi Rp 1.000 supaya pembulatan sen/ongkos kecil tidak memicu alarm.
 */
const TOLERANSI_SELISIH = 1000;
function hitungSelisih(d) {
  if (!d) return null;
  const total = Number(d.total) || 0;
  if (!total) return null;
  const jumlahItem = (d.items || []).reduce((t, it) => t + (Number(it.subtotal) || 0), 0);
  if (!jumlahItem) return null;
  const diharapkan = jumlahItem + (Number(d.ongkir) || 0) - (Number(d.diskon) || 0);
  const selisih = total - diharapkan;
  if (Math.abs(selisih) <= TOLERANSI_SELISIH) return null;
  return { selisih, jumlahItem, diharapkan, total };
}

/**
 * Pemindai invoice dengan AI Vision memakai integrasi bawaan Base44 (InvokeLLM).
 * Tidak butuh kunci API tambahan. Mendukung beberapa gambar (maks 5).
 * Props: onApplied({ invoice, photoUrls }), buttonLabel, disabled, hint
 */
export default function InvoiceVisionUpload({ onApplied, buttonLabel = "Scan Invoice dengan AI", disabled, hint }) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [fileUrls, setFileUrls] = useState([]);

  const reset = () => { setImages([]); setData(null); setError(null); setFileUrls([]); };

  const uploadImages = async () => {
    const urls = [];
    for (const img of images) {
      // img.file, bukan img.blob — blob hasil canvas ditolak Base44 karena tidak
      // punya nama berkas. Selama ini gagalnya ditelan catch di bawah, jadi
      // lampiran foto invoice tidak pernah tersimpan tanpa ada yang tahu.
      const berkas = img.file || img.blob;
      if (!berkas) continue;
      try { const r = await base44.integrations.Core.UploadFile({ file: berkas }); if (r?.file_url) urls.push(r.file_url); } catch { /* lampiran opsional */ }
    }
    return urls;
  };

  const handleScan = async () => {
    if (images.length === 0) return;
    setLoading(true); setError(null); setData(null);
    try {
      const urls = await uploadImages();
      setFileUrls(urls);
      if (urls.length === 0) {
        setError("Gagal mengunggah gambar untuk dianalisis. Coba foto yang lebih kecil atau periksa koneksi.");
        setData({ ...EMPTY });
        setLoading(false);
        return;
      }
      const multiNote = urls.length > 1
        ? " Beberapa gambar yang dikirim adalah beberapa halaman atau potongan dari SATU invoice yang sama (mis. bagian atas dan bagian bawah yang terpotong saat di-scroll) — GABUNGKAN menjadi SATU hasil, jangan hasilkan beberapa invoice terpisah."
        : "";
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Anda pembaca invoice/nota belanja. Baca gambar screenshot invoice marketplace (Tokopedia, Shopee, Lazada) atau nota toko.${multiNote}\n\nKembalikan JSON dengan field: toko (nama penjual), tanggal (YYYY-MM-DD), total (Rupiah angka bulat tanpa titis/koma), ongkir, diskon, dan items berisi nama, qty, satuan (kg/gram/pcs/botol/strip), harga_satuan, subtotal. Semua harga dalam Rupiah sebagai angka bulat tanpa titik atau koma. Bila suatu nilai tidak terbaca, isi null, JANGAN mengarang. Bila gambar bukan invoice, isi field error dengan teks "bukan invoice".`,
        file_urls: urls,
        response_json_schema: INVOICE_SCHEMA,
      });
      if (!result || result.error === "bukan invoice") {
        setError("Gambar ini bukan invoice. Sebagian data tidak terbaca — silakan isi manual di bawah.");
        setData({ ...EMPTY });
      } else {
        setData({
          toko: result.toko ?? "",
          tanggal: result.tanggal ?? "",
          total: result.total ?? "",
          ongkir: result.ongkir ?? "",
          diskon: result.diskon ?? "",
          items: (result.items?.length ? result.items : []).map((it) => ({
            nama: it.nama ?? "", qty: it.qty ?? 1, satuan: it.satuan ?? "",
            harga_satuan: it.harga_satuan ?? "", subtotal: it.subtotal ?? "",
          })),
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
  /*
   * Mengubah harga satuan atau qty ikut menghitung ulang subtotal, tapi hanya
   * kalau subtotal lama memang konsisten dengan harga lama — kalau tidak,
   * subtotal itu angka yang sengaja ditulis (mis. sudah kena potongan promo)
   * dan menimpanya justru menghapus koreksi yang baru saja diketik.
   */
  const updItem = (i, k, v) => setData((d) => {
    const items = [...d.items];
    const lama = items[i];
    const baru = { ...lama, [k]: v };
    if (k === "harga_satuan" || k === "qty") {
      const subLama = Number(lama.subtotal) || 0;
      const cocok = Math.abs(subLama - (Number(lama.harga_satuan) || 0) * (Number(lama.qty) || 0)) < 1;
      if (!subLama || cocok) {
        const hitung = (Number(baru.harga_satuan) || 0) * (Number(baru.qty) || 0);
        if (hitung > 0) baru.subtotal = Math.round(hitung);
      }
    }
    items[i] = baru;
    return { ...d, items };
  });
  const addItem = () => setData((d) => ({ ...d, items: [...d.items, { nama: "", qty: 1, satuan: "", harga_satuan: "", subtotal: "" }] }));
  const delItem = (i) => setData((d) => ({ ...d, items: d.items.filter((_, x) => x !== i) }));

  const selisih = hitungSelisih(data);

  const handleApply = () => {
    onApplied?.({ invoice: data, photoUrls: fileUrls });
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
            <p className="text-[10px] text-muted-foreground">Memakai AI bawaan Base44 — tidak perlu kunci API tambahan.</p>

            <Button type="button" className="w-full" disabled={images.length === 0 || loading} onClick={handleScan}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membaca invoice...</> : `Baca Invoice (${images.length} foto)`}
            </Button>

            {error && !loading && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
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
                        <Input className="h-8" placeholder="Nama barang" value={it.nama ?? ""} onChange={(e) => updItem(i, "nama", e.target.value)} />
                        <div className="grid grid-cols-12 gap-1 items-center">
                          <Input className="col-span-2 h-8" type="number" placeholder="Qty" value={it.qty ?? ""} onChange={(e) => updItem(i, "qty", e.target.value)} />
                          <Input className="col-span-2 h-8" placeholder="Satuan" value={it.satuan ?? ""} onChange={(e) => updItem(i, "satuan", e.target.value)} />
                          <Input className="col-span-4 h-8" type="number" placeholder="Harga satuan" value={it.harga_satuan ?? ""} onChange={(e) => updItem(i, "harga_satuan", e.target.value)} />
                          <Input className="col-span-4 h-8" type="number" placeholder="Subtotal" value={it.subtotal ?? ""} onChange={(e) => updItem(i, "subtotal", e.target.value)} />
                        </div>
                        <button type="button" onClick={() => delItem(i)} className="text-xs text-red-600 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Hapus</button>
                      </div>
                    ))}
                  </div>
                </div>
                {selisih && (
                  <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        Angka belum cocok — selisih {rp(Math.abs(selisih.selisih))}{" "}
                        {selisih.selisih < 0 ? "lebih murah dari jumlah item" : "lebih mahal dari jumlah item"}.
                      </p>
                      <p>
                        Jumlah item {rp(selisih.jumlahItem)} + ongkir − diskon = {rp(selisih.diharapkan)}, tapi total tertulis {rp(selisih.total)}.
                      </p>
                      <p className="text-amber-700">
                        {selisih.selisih < 0
                          ? "Biasanya ada promo atau kupon yang belum masuk kolom Diskon. Isi kolom Diskon, atau perbaiki harga satuan yang kena potongan."
                          : "Biasanya ada biaya (ongkir/admin) yang belum masuk, atau ada item yang tidak terbaca AI."}
                      </p>
                    </div>
                  </div>
                )}

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