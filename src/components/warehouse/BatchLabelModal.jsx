/**
 * BatchLabelModal — cetak label per BATCH, bukan per jenis barang.
 *
 * Bedanya dengan label rak:
 *
 *   Label rak    QR berisi SKU. Menempel di rak, umurnya panjang, tanggal
 *                kedaluwarsanya ditulis tangan karena satu rak dilewati
 *                banyak pembelian.
 *   Label batch  QR berisi kode batch. Menempel di botol atau kemasan yang
 *                datang bersama satu pesanan, membawa tanggal kedaluwarsa dan
 *                harga belinya sendiri.
 *
 * Kenapa label batch penting di sini: urutan pengambilan stok didasarkan pada
 * tanggal kedaluwarsa. Tanpa label yang menempel di botolnya, orang di depan
 * rak tidak punya cara tahu botol mana yang harus diambil lebih dulu — dan
 * botol yang tertinggal di belakang adalah botol yang terbuang.
 *
 * Menandai "sudah dicetak" bukan basa-basi: itu yang membedakan batch yang
 * labelnya sudah tertempel dari yang belum, supaya pencetakan berikutnya tidak
 * mengulang seluruh isi gudang.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Info, Loader2 } from "lucide-react";
import { downloadDataUrl, dataUrlToBytes, downloadZip } from "@/lib/zipDownload";
import { gambarLabel, namaBerkasLabel } from "@/lib/labelBarang";

const rp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");

async function gambarLabelBatch(canvas, batch) {
  await gambarLabel(canvas, {
    strip: "BATCH",
    qrText: batch.batch_code || "",
    judul: batch.nama_barang || "—",
    mono: batch.batch_code || "(tanpa kode)",
    kecil: `${batch.jumlah_awal ?? batch.jumlah_sisa ?? 0} ${batch.satuan || ""} · ${rp(batch.harga_satuan)}/${batch.satuan || "unit"}`,
    // Tanggal asli, bukan garis kosong. Inilah alasan label batch ada.
    bawah: batch.tanggal_expired ? `Exp: ${batch.tanggal_expired}` : "Exp: tidak dicatat",
  });
}

export default function BatchLabelModal({ open, batches = [], onClose }) {
  const qc = useQueryClient();
  const [previews, setPreviews] = useState([]);
  const [membuat, setMembuat] = useState(false);
  const [menandai, setMenandai] = useState(false);

  useEffect(() => {
    if (!open || batches.length === 0) { setPreviews([]); return; }
    let batal = false;
    (async () => {
      setMembuat(true);
      const out = [];
      for (const b of batches) {
        const c = document.createElement("canvas");
        await gambarLabelBatch(c, b);
        if (batal) return;
        out.push({ batch: b, dataUrl: c.toDataURL("image/png") });
      }
      if (!batal) { setPreviews(out); setMembuat(false); }
    })();
    return () => { batal = true; };
  }, [open, batches]);

  const tandaiDicetak = async (daftar) => {
    setMenandai(true);
    for (const b of daftar) {
      try {
        if (!b.label_dicetak) await base44.entities.BatchBarang.update(b.id, { label_dicetak: true });
      } catch { /* penandaan gagal tidak boleh membatalkan unduhan yang sudah jadi */ }
    }
    qc.invalidateQueries({ queryKey: ["batch-barang"] });
    setMenandai(false);
  };

  const unduhSatu = async (p) => {
    downloadDataUrl(p.dataUrl, namaBerkasLabel(p.batch.batch_code));
    await tandaiDicetak([p.batch]);
  };

  const unduhSemua = async () => {
    if (previews.length === 0) return;
    if (previews.length === 1) return unduhSatu(previews[0]);
    downloadZip(
      previews.map((p) => ({ name: namaBerkasLabel(p.batch.batch_code), bytes: dataUrlToBytes(p.dataUrl) })),
      "label-batch.zip"
    );
    await tandaiDicetak(previews.map((p) => p.batch));
  };

  const tanpaExp = batches.filter((b) => !b.tanggal_expired).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPreviews([]); } }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> Cetak Label Batch
          </DialogTitle>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Tempel di botol/kemasannya, bukan di rak.</p>
            <p>
              QR-nya berisi kode batch, jadi saat dipindai aplikasi tahu persis botol mana yang
              diambil — beserta tanggal kedaluwarsa dan harga belinya. Unduh lalu impor ke app
              Niimbot, ukuran 50×30mm.
            </p>
          </div>
        </div>

        {tanpaExp > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>{tanpaExp} batch belum punya tanggal kedaluwarsa.</strong> Labelnya tetap dibuat
            dan tertulis “tidak dicatat”. Urutan pengambilan stok memakai tanggal itu, jadi batch
            tanpa tanggal tidak pernah diprioritaskan — isi dulu lewat “Barang Datang → Atur per barang”
            bila masih terbaca di kemasannya.
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          {batches.length} batch dipilih
        </div>

        {membuat ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Membuat label…</span>
          </div>
        ) : previews.length > 0 ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold">{previews.length} label siap diunduh</p>
              <Button size="sm" onClick={unduhSemua} disabled={menandai}>
                {menandai ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
                {previews.length > 1 ? "Download ZIP" : "Download PNG"}
              </Button>
            </div>
            <div className="space-y-3">
              {previews.map(({ batch, dataUrl }) => (
                <div key={batch.id} className="border rounded-lg p-3 flex items-center gap-3">
                  <img src={dataUrl} alt={batch.batch_code} className="border rounded bg-white" style={{ height: 72 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{batch.nama_barang}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{batch.batch_code}</p>
                    {batch.label_dicetak && (
                      <Badge variant="secondary" className="text-[10px] mt-1">sudah pernah dicetak</Badge>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => unduhSatu({ batch, dataUrl })} disabled={menandai}>
                    <Download className="w-3.5 h-3.5 mr-1" /> PNG
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={() => { onClose(); setPreviews([]); }}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
