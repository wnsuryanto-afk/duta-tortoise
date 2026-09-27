/**
 * ModalCetakLabel — SATU modal cetak label untuk seluruh aplikasi.
 *
 * ── Kenapa cuma satu ───────────────────────────────────────────────────────
 *
 * Sebelum ini ada dua, dan keduanya sudah menyimpang jauh:
 *
 *   · `WarehouseLabelModal` (Gudang & Stok) — ukuran 400×240 ditulis mati,
 *     tanpa pilihan sama sekali; unduh massal lewat ZIP.
 *   · `NiimbotLabelGenerator` (Stok Pakan)  — punya tiga pilihan ukuran;
 *     unduh massal lewat `a.click()` berulang dalam satu putaran, yang
 *     DIBLOKIR peramban sesudah berkas pertama atau kedua. "Unduh Semua"
 *     di layar itu tidak pernah benar-benar mengunduh semuanya.
 *
 * Dua salinan yang menggambar hal yang sama adalah sebabnya pilihan ukuran
 * cuma ada di satu layar dan cacatnya cuma diperbaiki di satu sisi. Sekarang
 * kedua layar memakai berkas ini, jadi tidak ada lagi sisi yang tertinggal.
 *
 * Tata letak labelnya sendiri ada di lib/ukuranLabel.js (perencana) dan
 * lib/gambarLabel.js (penggambar).
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Info, AlertTriangle } from "lucide-react";
import { downloadDataUrl, dataUrlToBytes, downloadZip } from "@/lib/zipDownload";
import PemilihUkuranLabel, { useUkuranLabel } from "@/components/label/PemilihUkuranLabel";
import { gambarLabel, namaBerkasLabel } from "@/lib/gambarLabel";

export default function ModalCetakLabel({ open, items = [], onClose, judul = "Cetak Label" }) {
  const [previews, setPreviews] = useState([]);
  const [generating, setGenerating] = useState(false);

  const { ukuran, ukuranId, ikutPrinter, pilih, lepas } = useUkuranLabel(open);

  useEffect(() => {
    if (!open || !items.length) {
      setPreviews([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setGenerating(true);
      const out = [];
      for (const item of items) {
        const c = document.createElement("canvas");
        await gambarLabel(c, item, ukuran);
        if (cancelled) return;
        out.push({ item, dataUrl: c.toDataURL("image/png") });
      }
      if (!cancelled) {
        setPreviews(out);
        setGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, items, ukuran]);

  const noSkuCount = items.filter((i) => !i.sku && !i.code).length;

  const unduhSatu = (p) => downloadDataUrl(p.dataUrl, namaBerkasLabel(p.item, ukuran.id));

  // Banyak berkas SELALU lewat ZIP. Memanggil unduhan berkali-kali dalam satu
  // putaran hanya menghasilkan satu atau dua berkas — sisanya diblokir peramban
  // tanpa pesan apa pun, dan yang menekan tombolnya mengira semuanya turun.
  const unduhSemua = () => {
    if (previews.length === 0) return;
    if (previews.length === 1) return unduhSatu(previews[0]);
    const files = previews.map((p) => ({
      name: namaBerkasLabel(p.item, ukuran.id),
      bytes: dataUrlToBytes(p.dataUrl),
    }));
    downloadZip(files, `label-${ukuran.id}.zip`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPreviews([]); lepas(); } }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> {judul}
          </DialogTitle>
        </DialogHeader>

        {/* Petunjuknya sengaja tidak menyebut nama menu di aplikasi printernya.
            Langkah yang dikarang — "pilih Import Gambar", "tekan tombol ini" —
            lebih menyesatkan daripada tidak ada petunjuk sama sekali kalau
            menunya ternyata bernama lain. Yang disebut hanya hal yang pasti:
            ukuran kertas harus sama, dan skalanya jangan diubah. */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Cara cetak ke Xprinter:</p>
            <p>
              Unduh PNG-nya, lalu impor gambar itu di aplikasi printer Anda. Atur ukuran
              kertas ke <b>{ukuran.label}</b> — sama dengan yang dipilih di bawah — dan
              cetak pada <b>skala 100%</b>. &quot;Fit to page&quot; atau &quot;sesuaikan
              halaman&quot; akan mengubah ukurannya dan QR-nya jadi sulit dipindai.
            </p>
          </div>
        </div>

        {noSkuCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              {noSkuCount} barang belum punya SKU — tetap dibuat labelnya namun tanpa QR
              (ditandai &quot;BELUM ADA SKU&quot;).
            </p>
          </div>
        )}

        <PemilihUkuranLabel ukuranId={ukuranId} ikutPrinter={ikutPrinter} onPilih={pilih} />

        <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          {items.length} item dipilih: {items.slice(0, 3).map((i) => i.name).join(", ")}
          {items.length > 3 ? ` ...+${items.length - 3} lainnya` : ""}
        </div>

        {generating ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            <span className="ml-3 text-sm text-muted-foreground">Membuat label…</span>
          </div>
        ) : previews.length > 0 ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center gap-2">
              <p className="text-sm font-semibold">{previews.length} label siap diunduh</p>
              <Button size="sm" className="flex-shrink-0" onClick={unduhSemua}>
                <Download className="w-3.5 h-3.5 mr-1" />
                {previews.length > 1 ? "Download ZIP" : "Download PNG"}
              </Button>
            </div>
            <div className="space-y-3">
              {previews.map(({ item, dataUrl }, idx) => (
                <div key={idx} className="border rounded-lg p-3 flex items-center gap-3">
                  {/* Lebarnya mengikuti perbandingan sisi ukuran terpilih, supaya
                      pratinjaunya memperlihatkan bentuk stiker yang akan keluar.
                      Di layar ponsel tingginya diturunkan: pratinjau setinggi
                      72px menyisakan 90px untuk namanya, dan nama barang di sini
                      rata-rata jauh lebih panjang. */}
                  <img
                    src={dataUrl}
                    alt={item.name}
                    className="border rounded bg-white flex-shrink-0 h-14 sm:h-[72px]"
                    style={{ aspectRatio: `${ukuran.mmW} / ${ukuran.mmH}` }}
                  />
                  {/* Nama DIBUNGKUS, bukan dipotong. `truncate` memaksa satu baris
                      tanpa putus, dan lebar minimum baris itu merambat naik ke
                      kolom grid dialog: di layar 390px seluruh isi dialog jadi
                      475px dan tombolnya tergeser keluar layar. Dibungkus, yang
                      menentukan lebar minimum hanyalah kata terpanjang. */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 break-words">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {item.sku || item.code
                        ? `QR isi SKU: ${item.sku || item.code}`
                        : "belum ada SKU (tanpa QR)"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="flex-shrink-0"
                    onClick={() => unduhSatu({ item, dataUrl })}>
                    <Download className="w-3.5 h-3.5 mr-1" /> PNG
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={() => { onClose(); setPreviews([]); lepas(); }}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
