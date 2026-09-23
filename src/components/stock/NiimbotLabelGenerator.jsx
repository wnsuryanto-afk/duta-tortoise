/**
 * NiimbotLabelGenerator — label stok pakan untuk printer thermal Niimbot.
 *
 * Layar inilah yang sudah lebih dulu punya pilihan ukuran, sementara layar
 * Gudang tidak punya sama sekali. Sekarang keduanya memakai daftar ukuran dan
 * penggambar yang SAMA (lib/ukuranLabel.js + lib/gambarLabel.js), jadi
 * pilihannya bertambah dari tiga jadi lima dan hasilnya tidak lagi berbeda
 * bentuk hanya karena dicetak dari layar yang berbeda.
 *
 * Penggambar lamanya memutuskan tata letak dari ID ukuran
 * (`size.id === "30x15" ? 32 : 52`), sehingga ukuran yang tidak disebut di
 * percabangan itu akan digambar memakai angka milik ukuran lain — pilihan
 * ukuran yang tidak pernah benar-benar bisa bertambah.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Printer, Info } from "lucide-react";
import { UKURAN_LABEL, UKURAN_BAWAAN, cariUkuran } from "@/lib/ukuranLabel";
import { gambarLabel, namaBerkasLabel } from "@/lib/gambarLabel";

export default function NiimbotLabelGenerator({ items = [], open, onClose }) {
  const [ukuranId, setUkuranId] = useState(UKURAN_BAWAAN);
  const [previews, setPreviews] = useState([]);
  const [generating, setGenerating] = useState(false);
  const ukuran = cariUkuran(ukuranId);

  const handleGenerate = async () => {
    setGenerating(true);
    const results = [];
    for (const item of items) {
      const canvas = document.createElement("canvas");
      await gambarLabel(canvas, item, ukuran);
      results.push({ item, dataUrl: canvas.toDataURL("image/png") });
    }
    setPreviews(results);
    setGenerating(false);
  };

  const handleDownload = (dataUrl, item) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = namaBerkasLabel(item, ukuran.id);
    a.click();
  };

  const handleDownloadAll = () => {
    previews.forEach(({ dataUrl, item }) => handleDownload(dataUrl, item));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPreviews([]); } }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Buat Label Niimbot B21
          </DialogTitle>
        </DialogHeader>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Cara mencetak ke Niimbot B21:</p>
            <ol className="list-decimal ml-3 space-y-0.5">
              <li>Klik "Generate Label" lalu "Download PNG"</li>
              <li>Simpan gambar ke HP/komputer Anda</li>
              <li>Buka aplikasi <strong>Niimbot</strong> di HP</li>
              <li>Pilih "Import Gambar" → pilih file PNG yang diunduh</li>
              <li>Atur ukuran kertas ke <strong>{ukuran.label}</strong> → Cetak</li>
            </ol>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold mb-1.5">Ukuran stiker</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {UKURAN_LABEL.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setUkuranId(u.id); setPreviews([]); }}
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
              Pilih yang sama dengan gulungan stiker di printer. Label kecil otomatis
              menampilkan lebih sedikit keterangan supaya tetap terbaca.
            </p>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            {items.length} item dipilih: {items.slice(0, 3).map(i => i.name).join(", ")}{items.length > 3 ? `... +${items.length - 3} lainnya` : ""}
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? "Generating..." : "⚡ Generate Label"}
          </Button>
        </div>

        {previews.length > 0 && (
          <div className="space-y-3 mt-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold">{previews.length} label siap diunduh</p>
              {previews.length > 1 && (
                <Button size="sm" variant="outline" onClick={handleDownloadAll}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Unduh Semua
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {previews.map(({ item, dataUrl }, idx) => (
                <div key={idx} className="border rounded-lg p-3 flex items-center gap-3">
                  {/* Lebarnya mengikuti perbandingan sisi ukuran terpilih,
                      dan tingginya diturunkan di layar ponsel supaya nama
                      barangnya kebagian ruang. */}
                  <img
                    src={dataUrl}
                    alt={item.name}
                    className="border rounded bg-white flex-shrink-0 h-14 sm:h-20"
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
                    <p className="text-xs text-muted-foreground font-mono">{item.sku || item.code}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleDownload(dataUrl, item)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> PNG
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}