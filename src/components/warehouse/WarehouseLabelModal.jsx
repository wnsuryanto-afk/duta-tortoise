/**
 * WarehouseLabelModal — cetak label barang gudang untuk printer thermal Niimbot.
 *
 * Ukurannya DIPILIH saat mencetak, karena barang di gudang ini tidak seukuran:
 * ada ampul dan sachet, ada juga karung dan drum. Sebelum ini modal ini memakai
 * 400×240 piksel yang ditulis mati di dalam kode, dan kalimat petunjuknya
 * menyebut "atur ukuran 50×30mm" seolah itu satu-satunya pilihan — padahal
 * layar Stok Pakan sudah lama punya tiga pilihan ukuran.
 *
 * Tata letak dan penggambarannya kini dipinjam dari lib/ukuranLabel.js dan
 * lib/gambarLabel.js, sama persis dengan yang dipakai Stok Pakan. Itu juga yang
 * menutup ruang kosong 40% di bawah label: dulu QR dipatok 108px dan setiap
 * baris teks memakai jarak tetap dari atas, sehingga isinya berhenti di piksel
 * ke-144 dari 240 berapa pun ukuran stikernya.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Info, AlertTriangle } from "lucide-react";
import { downloadDataUrl, dataUrlToBytes, downloadZip } from "@/lib/zipDownload";
import { UKURAN_LABEL, UKURAN_BAWAAN, cariUkuran } from "@/lib/ukuranLabel";
import { gambarLabel, namaBerkasLabel } from "@/lib/gambarLabel";

export default function WarehouseLabelModal({ open, items = [], onClose }) {
  const [previews, setPreviews] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [ukuranId, setUkuranId] = useState(UKURAN_BAWAAN);
  const ukuran = cariUkuran(ukuranId);

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

  const noSkuCount = items.filter((i) => !i.sku).length;

  const handleDownloadOne = (p) => downloadDataUrl(p.dataUrl, namaBerkasLabel(p.item, ukuran.id));

  const handleDownloadAll = () => {
    if (previews.length === 0) return;
    if (previews.length === 1) {
      handleDownloadOne(previews[0]);
      return;
    }
    const files = previews.map((p) => ({ name: namaBerkasLabel(p.item, ukuran.id), bytes: dataUrlToBytes(p.dataUrl) }));
    downloadZip(files, `label-gudang-${ukuran.id}.zip`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPreviews([]); } }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> Cetak Label Gudang
          </DialogTitle>
        </DialogHeader>

        {/* Instruksi Niimbot */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Cara cetak ke Niimbot:</p>
            <p>
              Download lalu impor ke app Niimbot. Pilih &quot;Import Gambar&quot;, atur ukuran
              kertas ke <b>{ukuran.label}</b> — sama dengan yang dipilih di bawah — lalu cetak.
            </p>
          </div>
        </div>

        {noSkuCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{noSkuCount} barang belum punya SKU — tetap dibuat labelnya namun tanpa QR (ditandai "BELUM ADA SKU").</p>
          </div>
        )}

        {/* Pemilih ukuran. Yang memilih sedang memegang barangnya, jadi tiap
            pilihan menyebut barang apa yang cocok — "40 × 30 mm" sendirian
            tidak memberi tahu apakah ia muat di botol yang ada di tangan. */}
        <div>
          <p className="text-xs font-semibold mb-1.5">Ukuran stiker</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {UKURAN_LABEL.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setUkuranId(u.id)}
                className={`text-left rounded-lg border px-2.5 py-2 transition-colors ${
                  ukuranId === u.id
                    ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
              >
                <span className="block text-xs font-semibold tabular-nums">{u.label}</span>
                <span className="block text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {u.untuk}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Pilih yang sama dengan gulungan stiker yang terpasang di printer. Label kecil
            otomatis menampilkan lebih sedikit keterangan supaya tetap terbaca.
          </p>
        </div>

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
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold">{previews.length} label siap diunduh</p>
              <Button size="sm" onClick={handleDownloadAll}>
                <Download className="w-3.5 h-3.5 mr-1" />
                {previews.length > 1 ? "Download ZIP" : "Download PNG"}
              </Button>
            </div>
            <div className="space-y-3">
              {previews.map(({ item, dataUrl }, idx) => (
                <div key={idx} className="border rounded-lg p-3 flex items-center gap-3">
                  {/* Lebarnya mengikuti perbandingan sisi ukuran terpilih,
                      supaya pratinjaunya memperlihatkan bentuk stiker yang akan
                      keluar. Di layar ponsel tingginya diturunkan: pratinjau
                      setinggi 72px menyisakan 90px untuk namanya, dan nama
                      barang gudang di sini rata-rata jauh lebih panjang. */}
                  <img
                    src={dataUrl}
                    alt={item.name}
                    className="border rounded bg-white flex-shrink-0 h-14 sm:h-[72px]"
                    style={{ aspectRatio: `${ukuran.mmW} / ${ukuran.mmH}` }}
                  />
                  {/* Nama DIBUNGKUS, bukan dipotong. `truncate` memaksa satu
                      baris tanpa putus, dan lebar minimum baris itu merambat
                      naik ke kolom grid dialog: di layar 390px seluruh isi
                      dialog jadi 475px dan tombolnya tergeser keluar layar.
                      Dibungkus, yang menentukan lebar minimum hanyalah kata
                      terpanjang — dan namanya pun terbaca utuh. */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 break-words">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {item.sku ? `QR isi SKU: ${item.sku}` : "belum ada SKU (tanpa QR)"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleDownloadOne({ item, dataUrl })}>
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