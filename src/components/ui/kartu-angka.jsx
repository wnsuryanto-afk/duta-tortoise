import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { rupiah, rupiahSingkat } from "@/lib/rupiah";

/**
 * KartuAngka — satu bentuk untuk "satu angka penting" di seluruh aplikasi.
 *
 * ── Kenapa berkas ini ada ──────────────────────────────────────────────────
 *
 * Ada LIMA komponen kartu-angka yang ditulis terpisah — StatCard di
 * UnifiedStokPage, StatCard lain di UserDetailPage, StatBox di
 * BreedingBatchDetail, Stat di LayarTimPage, KpiCard di OwnerDashboard — dan
 * lima puluh enam berkas lain yang menulis polanya langsung di tempat. Tidak
 * ada satu pun yang salah sendirian; yang salah adalah tidak ada dua yang
 * sama. Jarak, ukuran huruf, warna, dan perilaku saat diklik berbeda-beda di
 * tiap halaman, dan itulah yang membuat aplikasinya terasa kaku: tiap layar
 * seperti dibuat orang yang berbeda.
 *
 * ── Tiga hal yang diperbaiki sekaligus ─────────────────────────────────────
 *
 * 1. ANGKA YANG TIDAK MUAT. Kartu "Total Nilai Stok" mencetak Rp 9.385.201
 *    dengan huruf text-2xl di kolom selebar ±150px. Di layar hasilnya "Rp"
 *    sendirian di satu baris dan "9.385.201,3" terpotong tepi kartu — angka
 *    terpenting di halaman itu justru satu-satunya yang tidak terbaca utuh.
 *    Di sini nilai uang diringkas ("Rp 9,4 jt") dan angka persisnya tetap ada
 *    di tooltip, jadi tidak ada yang hilang.
 *
 * 2. WARNA YANG DIKIRIM PEMANGGIL. Bentuk lama menerima `color="text-red-600"`
 *    — artinya tiap pemanggil memutuskan sendiri merah yang mana, dan tidak
 *    satu pun punya pasangan mode gelap. Di sini pemanggil menyebut NADA
 *    ("bahaya", "awas", "baik"), dan berkas ini yang tahu warnanya — di kedua
 *    tema.
 *
 * 3. YANG BISA DIKLIK TIDAK TERLIHAT BISA DIKLIK. Kartu "Item Wajib Habis"
 *    dibungkus <div onClick> dengan sub-teks "⚠️ Klik untuk lihat" — kalimat
 *    itu ada justru karena kartunya sendiri tidak memberi tanda apa pun.
 *    Div ber-onClick juga tidak bisa dijangkau keyboard dan tidak terbaca
 *    pembaca layar sebagai tombol. Di sini kartu yang bisa ditekan menjadi
 *    <Link> atau <button> sungguhan, dengan panah dan sedikit angkat saat
 *    disentuh — tandanya pada bentuknya, bukan pada tulisannya.
 */

const NADA = {
  netral: {
    nilai: "text-foreground",
    chip: "bg-muted text-muted-foreground",
    bingkai: "border-border",
  },
  baik: {
    nilai: "text-accent",
    chip: "bg-accent/12 text-accent",
    bingkai: "border-accent/25",
  },
  awas: {
    nilai: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    bingkai: "border-amber-500/25",
  },
  bahaya: {
    nilai: "text-destructive",
    chip: "bg-destructive/12 text-destructive",
    bingkai: "border-destructive/25",
  },
  utama: {
    nilai: "text-primary",
    chip: "bg-primary/12 text-primary",
    bingkai: "border-primary/25",
  },
};

/**
 * @param {string}  label   nama angkanya, kecil di atas
 * @param {*}       nilai   angka mentah, atau teks yang sudah jadi
 * @param {string}  format  "rupiah" meringkas dan menyiapkan tooltip; "teks" apa adanya
 * @param {string}  sub     satu baris keterangan di bawah angka
 * @param {Function} ikon   komponen ikon lucide
 * @param {string}  nada    netral | baik | awas | bahaya | utama
 * @param {string}  ke      tujuan Link — membuat kartunya bisa ditekan
 * @param {Function} onKlik aksi — juga membuat kartunya bisa ditekan
 */
export default function KartuAngka({
  label,
  nilai,
  format = "teks",
  sub,
  ikon: Ikon,
  nada = "netral",
  ke,
  onKlik,
  className,
}) {
  const n = NADA[nada] || NADA.netral;
  const angka = format === "rupiah" ? rupiahSingkat(nilai) : nilai;
  // Judul lengkap hanya berguna kalau memang ada yang disembunyikan.
  const judul = format === "rupiah" ? rupiah(nilai) : undefined;
  const bisaDitekan = !!(ke || onKlik);

  const isi = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground min-w-0 break-words">{label}</p>
        {Ikon && (
          <span className={cn("flex items-center justify-center w-7 h-7 rounded-xl flex-shrink-0", n.chip)}>
            <Ikon className="w-4 h-4" />
          </span>
        )}
      </div>

      {/* `min-w-0` + `break-words` + ukuran yang mengecil di ponsel: tiga hal
          yang membuat angka sepanjang apa pun tidak pernah lagi terpotong. */}
      <p
        title={judul}
        className={cn(
          "mt-1.5 text-xl sm:text-2xl font-bold leading-tight tabular-nums break-words min-w-0",
          n.nilai,
        )}
      >
        {angka}
      </p>

      {sub && (
        <p className="text-xs text-muted-foreground mt-0.5 break-words flex items-center gap-1">
          <span className="min-w-0">{sub}</span>
          {bisaDitekan && <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-60" />}
        </p>
      )}
    </>
  );

  const gaya = cn(
    "block w-full text-left rounded-2xl border bg-card p-4 min-w-0 transition-all",
    n.bingkai,
    bisaDitekan && "hover:-translate-y-0.5 hover:shadow-card cursor-pointer active:scale-[0.99]",
    className,
  );

  if (ke) return <Link to={ke} className={gaya}>{isi}</Link>;
  if (onKlik) return <button type="button" onClick={onKlik} className={gaya}>{isi}</button>;
  return <div className={gaya}>{isi}</div>;
}
