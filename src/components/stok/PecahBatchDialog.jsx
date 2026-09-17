import { useState, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { kodeBatch } from "@/lib/pemakaianBarang";
import { BATAS_AMBIL } from "@/api/base44Client";

/**
 * PecahBatchDialog — bagi stok yang SUDAH ADA di rak menjadi beberapa batch,
 * masing-masing dengan tanggal kedaluwarsanya sendiri.
 *
 * ── KENAPA ADA ─────────────────────────────────────────────────────
 *
 * Satu baris barang hanya punya SATU kolom `expired_date`. Begitu rak berisi
 * dua kiriman dengan tanggal berbeda — hal yang biasa untuk obat — hanya satu
 * tanggal yang bisa disimpan, dan yang satunya hilang dari aplikasi. Yang
 * hilang justru berbahaya: Stone Breaker punya batch Feb 2026 (sudah lewat)
 * dan Nov 2026; yang tercatat hanya Nov, jadi botol yang kedaluwarsa tidak
 * pernah diperingatkan sekali pun.
 *
 * BatchBarang memang dibuat untuk ini, tapi sampai sekarang batch HANYA bisa
 * lahir dari penerimaan pembelian. Stok yang sudah lama di rak — hasil
 * pendataan awal, tanpa riwayat pembelian — tidak punya jalan sama sekali
 * untuk dipecah. Jadi permintaan "pisahkan jadi dua batch" tidak bisa
 * dikerjakan siapa pun di dalam aplikasi, termasuk pemiliknya.
 *
 * ── SATU ATURAN YANG DIJAGA KERAS ──────────────────────────────────
 *
 * Jumlah seluruh batch HARUS sama dengan stok barangnya. Kalau tidak,
 * aplikasi punya dua angka untuk satu rak, keduanya terlihat masuk akal, dan
 * tidak ada yang bisa tahu mana yang benar. Tombol simpan mati sampai
 * selisihnya nol — bukan peringatan yang bisa dilewati.
 */
export default function PecahBatchDialog({ item, onClose }) {
  const qc = useQueryClient();
  const stok = Number(item?.current_stock) || 0;
  const [baris, setBaris] = useState([
    { jumlah: "", tanggal_expired: item?.expired_date || "", catatan: "" },
    { jumlah: "", tanggal_expired: "", catatan: "" },
  ]);
  const [menyimpan, setMenyimpan] = useState(false);

  const { data: batchAda = [] } = useQuery({
    queryKey: ["batch-barang"],
    queryFn: () => base44.entities.BatchBarang.list("-tanggal_terima", BATAS_AMBIL),
  });
  const batchItemIni = useMemo(
    () => (batchAda || []).filter((b) => b.item_id === item?.id),
    [batchAda, item?.id],
  );

  const total = baris.reduce((t, b) => t + (Number(b.jumlah) || 0), 0);
  const selisih = stok - total;
  const adaTanggalKosong = baris.some((b) => Number(b.jumlah) > 0 && !b.tanggal_expired);
  const bisaSimpan = selisih === 0 && total > 0 && !adaTanggalKosong && !menyimpan;

  const ubah = (i, patch) => setBaris((p) => p.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const tambah = () => setBaris((p) => [...p, { jumlah: "", tanggal_expired: "", catatan: "" }]);
  const hapus = (i) => setBaris((p) => p.filter((_, j) => j !== i));

  const simpan = async () => {
    if (!bisaSimpan) return;
    setMenyimpan(true);
    try {
      const terpakai = (batchAda || []).map((b) => b.batch_code).filter(Boolean);
      const hariIni = format(new Date(), "yyyy-MM-dd");
      const stempel = format(new Date(), "yyMMdd");
      const isi = baris.filter((b) => Number(b.jumlah) > 0);

      for (const b of isi) {
        const kode = kodeBatch(item.sku || item.id, stempel, terpakai);
        terpakai.push(kode);
        await base44.entities.BatchBarang.create({
          batch_code: kode,
          item_id: item.id,
          item_sku: item.sku || "",
          nama_barang: item.name,
          jumlah_awal: Number(b.jumlah),
          jumlah_sisa: Number(b.jumlah),
          satuan: item.unit || "pcs",
          harga_satuan: Number(item.purchase_price) || 0,
          // Tanggal terima tidak diketahui untuk stok lama, jadi diisi hari
          // pendataannya dan disebut apa adanya di catatan — menebak tanggal
          // terima akan merusak urutan pengambilan FEFO tanpa ada yang tahu.
          tanggal_terima: hariIni,
          tanggal_expired: b.tanggal_expired,
          catatan:
            "Dipecah dari stok yang sudah ada di rak (tanpa riwayat pembelian). " +
            "Tanggal terima adalah tanggal pendataan, bukan tanggal barang datang." +
            (b.catatan ? ` ${b.catatan}` : ""),
          label_dicetak: false,
        });
      }

      /*
       * Kolom tanggal di barangnya diisi tanggal PALING AWAL dari semua batch.
       *
       * Kartu peringatan di beranda dan pemeriksaan stok harian masih membaca
       * kolom itu. Mengisinya dengan tanggal terjauh akan membuat botol yang
       * sudah lewat tanggal tetap terlihat aman — persis keadaan yang alat ini
       * dibuat untuk mengakhiri.
       */
      const paling = isi.map((b) => b.tanggal_expired).filter(Boolean).sort()[0];
      if (paling && paling !== item.expired_date) {
        await base44.entities.WarehouseItem.update(item.id, { expired_date: paling });
      }

      qc.invalidateQueries({ queryKey: ["batch-barang"] });
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
      toast.success(`${isi.length} batch dibuat untuk ${item.name}`);
      onClose();
    } catch (e) {
      toast.error("Gagal membuat batch: " + (e?.message || ""));
    }
    setMenyimpan(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm">
          Bagi <strong>{stok} {item.unit || "pcs"}</strong> {item.name} menjadi beberapa batch,
          masing-masing dengan tanggal kedaluwarsanya sendiri.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Hitung dulu fisiknya di rak. Jumlah seluruh batch harus pas dengan stok —
          kalau tidak, aplikasi punya dua angka untuk satu rak.
        </p>
      </div>

      {batchItemIni.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Barang ini sudah punya {batchItemIni.length} batch. Batch baru akan
            DITAMBAHKAN, bukan menggantikan — periksa dulu supaya tidak dobel.
          </span>
        </div>
      )}

      <div className="space-y-2">
        {baris.map((b, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3">
              <Label className="text-[10px]">Jumlah</Label>
              <Input
                type="number" min={0} inputMode="numeric"
                value={b.jumlah}
                onChange={(e) => ubah(i, { jumlah: e.target.value })}
                className="mt-0.5 h-9"
                placeholder="0"
              />
            </div>
            <div className="col-span-7">
              <Label className="text-[10px]">Kedaluwarsa</Label>
              <Input
                type="date"
                value={b.tanggal_expired}
                onChange={(e) => ubah(i, { tanggal_expired: e.target.value })}
                className="mt-0.5 h-9"
              />
            </div>
            <div className="col-span-2 flex justify-end">
              {baris.length > 1 && (
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-9 w-9 text-destructive"
                  onClick={() => hapus(i)}
                  aria-label={`Hapus baris batch ${i + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={tambah}>
        <Plus className="w-3.5 h-3.5" /> Tambah batch
      </Button>

      <div
        className={`rounded-lg p-2.5 text-sm ${
          selisih === 0 && total > 0
            ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-amber-50 border border-amber-200 text-amber-800"
        }`}
      >
        {total} dari {stok} {item.unit || "pcs"} terbagi
        {selisih !== 0 && (
          <span className="font-semibold">
            {" "}— {selisih > 0 ? `kurang ${selisih}` : `lebih ${Math.abs(selisih)}`}
          </span>
        )}
        {selisih === 0 && total > 0 && " — pas"}
      </div>

      {adaTanggalKosong && (
        <p className="text-xs text-amber-700">
          Setiap batch yang berisi jumlah harus punya tanggal kedaluwarsa — batch tanpa
          tanggal tidak akan pernah bisa diperingatkan.
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={menyimpan}>Batal</Button>
        <Button className="flex-1 gap-1.5" onClick={simpan} disabled={!bisaSimpan}>
          {menyimpan && <Loader2 className="w-4 h-4 animate-spin" />}
          Buat batch
        </Button>
      </div>
    </div>
  );
}
