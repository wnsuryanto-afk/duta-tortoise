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
import ExpiryVisionScan from "@/components/ai/ExpiryVisionScan";
import { Input } from "@/components/ui/input";
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
  // Tanggal kedaluwarsa diisi DI SINI, tepat sebelum labelnya dicetak.
  // Itu satu-satunya saat orangnya sedang memegang botolnya dan bisa membaca
  // tanggal di kemasannya. Menyuruhnya kembali ke halaman pembelian untuk
  // mengisi tanggal, lalu kembali lagi ke sini untuk mencetak, adalah cara
  // pasti membuat kolom itu tetap kosong selamanya.
  const [tanggal, setTanggal] = useState({});
  // Tanggal botol DIBUKA, terpisah dari tanggal cetak. Untuk botol multi-dosis
  // yang menentukan adalah mana di antara keduanya yang lebih dulu tiba —
  // lihat lib/kedaluwarsaBatch.js.
  const [buka, setBuka] = useState({});
  const [menyimpanTgl, setMenyimpanTgl] = useState(false);

  const expOf = (b) => (tanggal[b.id] !== undefined ? tanggal[b.id] : b.tanggal_expired || "");
  const bukaOf = (b) => (buka[b.id] !== undefined ? buka[b.id] : b.tanggal_buka || "");
  const adaPerubahanTgl = batches.some(
    (b) => expOf(b) !== (b.tanggal_expired || "") || bukaOf(b) !== (b.tanggal_buka || ""),
  );

  const simpanTanggal = async () => {
    setMenyimpanTgl(true);
    for (const b of batches) {
      const baruExp = expOf(b);
      const baruBuka = bukaOf(b);
      const ubah = {};
      if (baruExp !== (b.tanggal_expired || "")) ubah.tanggal_expired = baruExp || null;
      if (baruBuka !== (b.tanggal_buka || "")) ubah.tanggal_buka = baruBuka || null;
      if (Object.keys(ubah).length === 0) continue;
      try {
        await base44.entities.BatchBarang.update(b.id, ubah);
      } catch { /* satu gagal tidak boleh membatalkan sisanya */ }
    }
    qc.invalidateQueries({ queryKey: ["batch-barang"] });
    setMenyimpanTgl(false);
  };

  useEffect(() => {
    if (!open || batches.length === 0) { setPreviews([]); return; }
    let batal = false;
    (async () => {
      setMembuat(true);
      const out = [];
      for (const b of batches) {
        const c = document.createElement("canvas");
        // Pratinjau ikut memakai tanggal yang BARU diketik, belum disimpan —
        // supaya orangnya melihat labelnya berubah dan tahu isiannya masuk.
        await gambarLabelBatch(c, { ...b, tanggal_expired: expOf(b) });
        if (batal) return;
        out.push({ batch: b, dataUrl: c.toDataURL("image/png") });
      }
      if (!batal) { setPreviews(out); setMembuat(false); }
    })();
    return () => { batal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, batches, tanggal]);

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
            <strong>{tanpaExp} batch belum punya tanggal kedaluwarsa.</strong> Isi sekarang, selagi
            botolnya di tangan — ketik, atau foto sisi kemasan yang bertuliskan EXP dan biarkan
            AI membacanya. Urutan pengambilan stok memakai tanggal ini; batch tanpa tanggal tidak
            pernah diprioritaskan, jadi ia yang tertinggal di rak sampai kedaluwarsa betulan.
            Kalau memang tidak tercetak di kemasan (mis. bahan racikan curah), biarkan kosong.
          </div>
        )}

        {/*
          Pengisian tanggal TIDAK lagi disembunyikan di balik pembuatan label.
          Sebelumnya kolom tanggal hanya muncul setelah label dibuat, sehingga
          untuk mengisi 23 batch orang harus merender 23 gambar label lebih
          dulu — pekerjaan yang tidak ada hubungannya. Batch tanpa tanggal
          ditaruh di atas karena itu yang sedang dikejar.
        */}
        <div className="space-y-2">
          {[...batches]
            .sort((a, b) => (a.tanggal_expired ? 1 : 0) - (b.tanggal_expired ? 1 : 0))
            .map((b) => (
              <div key={b.id} className="border rounded-lg p-2.5 space-y-1.5">
                <p className="text-sm font-medium truncate">{b.nama_barang}</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">{b.batch_code}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Kedaluwarsa (kemasan)</p>
                    <Input
                      type="date"
                      className="h-8 text-xs w-40"
                      value={expOf(b)}
                      onChange={(e) => setTanggal((t) => ({ ...t, [b.id]: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Tgl botol dibuka</p>
                    <Input
                      type="date"
                      className="h-8 text-xs w-40"
                      value={bukaOf(b)}
                      onChange={(e) => setBuka((t) => ({ ...t, [b.id]: e.target.value }))}
                    />
                  </div>
                  <ExpiryVisionScan
                    onApplied={(d) => {
                      if (d?.expired_date) setTanggal((t) => ({ ...t, [b.id]: d.expired_date }));
                    }}
                  />
                </div>
              </div>
            ))}
        </div>

        {adaPerubahanTgl && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-primary/40 bg-primary/5">
            <p className="text-xs">Ada tanggal kedaluwarsa yang belum disimpan.</p>
            <Button size="sm" onClick={simpanTanggal} disabled={menyimpanTgl}>
              {menyimpanTgl && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />} Simpan tanggal
            </Button>
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
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium truncate">{batch.nama_barang}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{batch.batch_code}</p>
                    {/* Satu kolom tanggal saja, di daftar atas. Dua kolom untuk
                        satu nilai membuat orang ragu mana yang tersimpan. */}
                    <p className="text-[10px] text-muted-foreground">
                      Exp: {expOf(batch) || "belum diisi"}
                    </p>
                    {batch.label_dicetak && (
                      <Badge variant="secondary" className="text-[10px]">sudah pernah dicetak</Badge>
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
