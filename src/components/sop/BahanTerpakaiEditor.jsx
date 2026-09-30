import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

/**
 * BahanTerpakaiEditor — mengisi `SOPTask.pakan_terpakai`.
 *
 * ── Kenapa komponen ini dibuat ──────────────────────────────────────
 *
 * Otomatisasi A6 ("Stok berkurang saat task dicentang") membaca kolom
 * `pakan_terpakai`. Halaman Otomatisasi menuliskan prasyaratnya dengan
 * jelas:
 *
 *     "Isi pakan_terpakai di tiap SOP task (SKU + jumlah sekali kerja).
 *      Selama kosong, fungsi ini tidak memotong apa pun."
 *
 * Sebelum berkas ini ada, kata `pakan_terpakai` muncul di SATU tempat di
 * seluruh frontend: kalimat prasyarat itu sendiri. Tidak ada satu pun
 * layar untuk mengisinya. Prasyaratnya menyuruh pemilik mengerjakan
 * sesuatu yang aplikasinya tidak sediakan caranya.
 *
 * Akibatnya terbaca di data, 30-09-2026:
 *
 *     52 SOPTask, 1 punya pakan_terpakai — dan yang satu itu nonaktif.
 *     Dari 9 task pakan yang aktif: nol.
 *     StockMovement: 7 baris, SEMUANYA "masuk". Nol "keluar", lima bulan.
 *
 * Stok gudang hanya pernah NAIK sejak aplikasi ini berdiri. Bukan karena
 * barangnya tidak dipakai — tapi karena satu-satunya jalur yang bisa
 * mencatat pemakaian rutin menunggu kolom yang tidak bisa diisi.
 *
 * Pola yang sama persis pernah terjadi di kolom sebelahnya,
 * `required_skus`, dan komentar di SOPTaskManager.jsx sudah menuliskan
 * kesimpulannya: "Bukan karena lupa diisi; memang tidak bisa diisi."
 *
 * ── Kenapa hanya barang ber-SKU ─────────────────────────────────────
 *
 * potongStokPakan mencocokkan bahan lewat SKU, bukan nama atau id. Bahan
 * tanpa SKU akan tercatat di sini lalu gagal diam-diam saat fungsinya
 * jalan — ia cuma menambah baris "SKU ... tidak ditemukan" di hasil yang
 * tidak dibaca siapa pun. Jadi yang tanpa SKU tidak bisa dipilih, dan
 * jumlahnya disebutkan supaya pemilik tahu ada yang perlu diberi SKU
 * lebih dulu.
 */
export default function BahanTerpakaiEditor({ nilai, onChange, stokPakan = [], barangGudang = [] }) {
  const [sumber, setSumber] = useState("pakan");
  const [sku, setSku] = useState("");
  const [jumlah, setJumlah] = useState("");

  const daftar = Array.isArray(nilai) ? nilai : [];

  /*
   * Bahan NONAKTIF tidak ditawarkan.
   *
   * Dari 12 baris FeedStock pada 30-09-2026, sembilan nonaktif dengan stok
   * nol — sisa daftar awal yang tidak pernah dipakai. Menawarkannya berarti
   * sembilan pilihan mati di antara tiga yang hidup, dan yang dipilih orang
   * dari daftar panjang biasanya yang paling atas.
   */
  const sumberItems = useMemo(
    () => (sumber === "gudang" ? barangGudang : stokPakan).filter((i) => i?.is_active !== false),
    [sumber, barangGudang, stokPakan],
  );
  const berSku = useMemo(
    () => sumberItems.filter((i) => (i.sku || "").trim()),
    [sumberItems],
  );
  const tanpaSku = sumberItems.length - berSku.length;

  // Bahan yang sudah ada di daftar tidak ditawarkan lagi — dua baris untuk
  // satu SKU akan dipotong dua kali oleh fungsinya.
  const tersedia = berSku.filter(
    (i) => !daftar.some((b) => b.sku === i.sku && (b.sumber || "pakan") === sumber),
  );

  const tambah = () => {
    const n = Number(jumlah);
    const item = berSku.find((i) => i.sku === sku);
    if (!item || !(n > 0)) return;
    onChange([...daftar, { sku: item.sku, nama: item.name, jumlah: n, sumber }]);
    setSku("");
    setJumlah("");
  };

  const buang = (i) => onChange(daftar.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {daftar.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {daftar.map((b, i) => (
            <li key={`${b.sumber}-${b.sku}-${i}`} className="flex items-center gap-2 px-2.5 py-2">
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                {b.sumber === "gudang" ? "Gudang" : "Pakan"}
              </span>
              <span className="text-xs flex-1 min-w-0 truncate">{b.nama || b.sku}</span>
              <span className="text-xs tabular-nums text-muted-foreground flex-shrink-0">{b.jumlah}</span>
              <button
                type="button"
                onClick={() => buang(i)}
                aria-label={`Hapus ${b.nama || b.sku}`}
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-28">
          <label className="text-[11px] text-muted-foreground mb-1 block">Sumber</label>
          <Select value={sumber} onValueChange={(v) => { setSumber(v); setSku(""); }}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pakan">Stok Pakan</SelectItem>
              <SelectItem value="gudang">Gudang</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className="text-[11px] text-muted-foreground mb-1 block">Bahan</label>
          <Select value={sku} onValueChange={setSku}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={tersedia.length ? "Pilih bahan" : "Tidak ada pilihan"} />
            </SelectTrigger>
            <SelectContent>
              {tersedia.map((i) => (
                <SelectItem key={i.sku} value={i.sku}>
                  {i.name} · {i.sku} (sisa {i.current_stock ?? 0} {i.unit || ""})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-24">
          <label className="text-[11px] text-muted-foreground mb-1 block">Jumlah</label>
          <Input
            type="number"
            min={0}
            step="any"
            className="h-9"
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            placeholder="0"
          />
        </div>
        <Button type="button" size="sm" variant="outline" onClick={tambah} disabled={!sku || !(Number(jumlah) > 0)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
        </Button>
      </div>

      {/* Peringatan yang menyebut jalan keluarnya. Tanpa kalimat terakhir ini
          ia cuma memberi tahu ada pintu terkunci, tanpa menyebut kuncinya —
          dan tombolnya ada di layar lain. */}
      {tanpaSku > 0 && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            {tanpaSku} bahan aktif di {sumber === "gudang" ? "gudang" : "stok pakan"} belum punya SKU, jadi
            belum bisa dipilih — pemotongan stok mencocokkan lewat SKU. Buatkan sekaligus lewat{" "}
            <Link to="/stok-unified" className="font-semibold underline">Stok &amp; Gudang → Generate SKU Massal</Link>.
          </span>
        </p>
      )}

      <p className="text-[11px] text-muted-foreground">
        {daftar.length === 0
          ? "Kosong. Selama kosong, otomatisasi \"Stok berkurang saat task dicentang\" tidak memotong apa pun untuk tugas ini."
          : `${daftar.length} bahan. Jumlahnya adalah pemakaian SEKALI kerja — dikalikan sendiri bila tugas ini punya beberapa target kandang.`}
      </p>
    </div>
  );
}
