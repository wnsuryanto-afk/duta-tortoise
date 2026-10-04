import { Link } from "react-router-dom";
import { LeafPattern } from "@/components/common/Illustration";
import { cn } from "@/lib/utils";

/**
 * PageHeader — kepala halaman bergradien dengan ringkasan angka.
 *
 * Menggantikan judul polos: selain nama halaman, ia langsung menampilkan
 * beberapa angka penting (`chips`) sehingga pengguna tahu keadaan sebelum
 * menggulir. Ilustrasi ditaruh di kanan dan disembunyikan di layar sempit —
 * di ponsel, ruang itu lebih berguna untuk angka.
 *
 * ── KENAPA SUSUNANNYA MENUMPUK DI PONSEL ───────────────────────────
 *
 * Dulu kepala halaman ini SELALU dua kolom bersebelahan: teks di kiri,
 * tombol di kanan. Kolom tombol memakai flex-shrink-0 — artinya menolak
 * mengecil — sementara kolom teks memakai flex-1 min-w-0, artinya bersedia
 * mengecil sampai nyaris nol.
 *
 * Di ponsel, halaman dengan tiga tombol lebar (Breeding: "Pindai Label",
 * "Unduh Label Aktif", "Tambah Data") membuat kolom tombol memakan hampir
 * seluruh lebar layar. Sisanya untuk judul: "Breeding & Telur" terpotong
 * jadi "B.", anak judulnya turun satu kata per baris, dan keempat angka
 * ringkasan berdiri bertumpuk ke bawah.
 *
 * Sekarang di bawah md kepala halaman menumpuk: teks dulu, tombol di
 * bawahnya dengan lebar penuh. Bersebelahan hanya mulai md ke atas, di
 * mana memang ada ruangnya.
 */
/**
 * Satu angka ringkas di kepala halaman.
 *
 * `ke` membuatnya bisa diklik. Disurvei 4 Okt 2026: sepuluh halaman memajang
 * chip seperti ini dan TIDAK SATU PUN bisa diklik — "23 kura sakit" di kepala
 * halaman memunculkan pertanyaan lalu membiarkan orang mencari sendiri
 * halamannya. Tujuan yang diawali "#" dipasang sebagai <a> biasa, karena
 * React Router tidak menggulir ke jangkar.
 */
export function HeaderChip({ icon: Icon, label, value, tone = "default", onClick, ke, title }) {
  const tones = {
    default: "bg-card/70 text-foreground border-border",
    good: "bg-accent/12 text-accent border-accent/25",
    warn: "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/25",
    bad: "bg-destructive/12 text-destructive border-destructive/25",
  };
  const bisaDiklik = Boolean(onClick || ke);
  const jangkar = typeof ke === "string" && ke.startsWith("#");
  const Comp = ke ? (jangkar ? "a" : Link) : onClick ? "button" : "div";
  const tujuan = ke ? (jangkar ? { href: ke } : { to: ke }) : {};
  return (
    <Comp
      {...tujuan}
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-sm",
        "transition-all",
        bisaDiklik && "hover:-translate-y-0.5 hover:shadow-card cursor-pointer",
        tones[tone] || tones.default
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="tabular">{value}</span>
    </Comp>
  );
}

/**
 * Chip yang menuntut perhatian didahulukan.
 *
 * Di kesepuluh halaman yang memakai chip, `tone: "warn"` dan `tone: "bad"`
 * SELALU dipasang bersyarat — hanya saat angkanya memang buruk ("sakit > 0
 * ? warn : good", "kritis > 0 ? bad : good"). Jadi mengangkat keduanya ke
 * depan sama dengan mengangkat yang perlu dikerjakan, bukan sekadar
 * mengurutkan warna.
 *
 * Urutannya STABIL: chip dengan tingkat yang sama tetap pada urutan yang
 * ditulis halamannya, dan pada hari yang tenang (tidak ada warn/bad sama
 * sekali) susunannya persis seperti sebelum fungsi ini ada.
 *
 * "good" TIDAK dibedakan dari "default": pada beberapa halaman "good" berarti
 * "angkanya bagus" (margin positif), bukan "tidak ada yang perlu dikerjakan".
 * Mendorongnya ke belakang akan memindahkan margin ke ujung tanpa alasan.
 */
function urutkanChip(chips) {
  const tingkat = (c) => (c?.tone === "bad" ? 0 : c?.tone === "warn" ? 1 : 2);
  return [...chips]
    .map((c, i) => ({ c, i }))
    .sort((a, b) => tingkat(a.c) - tingkat(b.c) || a.i - b.i)
    .map((x) => x.c);
}

export default function PageHeader({
  title,
  subtitle,
  description,
  icon: Icon,
  art,
  chips,
  actions,
  children,
  className,
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border surface-leaf p-5 sm:p-6 mb-5 animate-fade-in",
        className
      )}
    >
      <LeafPattern className="text-primary opacity-[0.045]" />

      {/* Di ponsel kepala ini MENUMPUK, tidak berdampingan.
          Sebelumnya `flex` tanpa arah: kolom tombol `flex-shrink-0` memakan
          hampir seluruh 390px, kolom judul tersisa sekitar 100px — judulnya
          terpotong, anak kalimatnya melipat empat baris, dan chip angkanya
          berjejer ke bawah satu per baris alih-alih mengalir. Itu sebabnya
          kepala ini nyaris tak dipakai halaman mana pun. */}
      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/*
          `min-w-[13rem]`, bukan `min-w-0`.

          Tambalan di atas menyelesaikan ponsel: di bawah sm kepala ini
          menumpuk, jadi judulnya dapat lebar penuh. Tablet tidak ikut
          tertambal, dan di sanalah bencana yang sama terulang dalam bentuk
          yang lebih parah.

          Di lebar sekitar 760px kepala ini kembali berdampingan. Kolom
          tombol memakai flex-shrink-0 — menolak mengecil — dan pada halaman
          Laporan Keuangan isinya tiga: pemilih bulan selebar 160px, "Export
          Laporan PDF", dan "Tambah Transaksi". Ketiganya menuntut sekitar
          620px dan mendapatkannya. Sisa untuk judul: kira-kira 76px, dikurangi
          46px untuk ikonnya, tinggal 30px.

          Tiga puluh piksel lebih sempit daripada satu suku kata, jadi
          `break-words` melakukan satu-satunya hal yang bisa ia lakukan: ia
          memutus di mana saja. "Laporan Keuangan" turun satu HURUF per baris,
          setinggi seribu piksel ke bawah.

          Lebar minimum ini membuat judul tidak bisa lagi dijepit sampai tak
          terbaca. Kalau ruangnya kurang, yang mengalah kolom tombol — dan ia
          memang bisa mengalah, karena tombolnya sudah flex-wrap.
        */}
        <div className="min-w-0 sm:min-w-[13rem] flex-1">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/12 text-primary flex-shrink-0">
                <Icon className="w-[18px] h-[18px]" />
              </span>
            )}
            <div className="min-w-0">
              {/* Tanpa truncate: judul halaman yang terpotong jadi satu huruf
                  lebih buruk daripada judul yang turun dua baris. */}
              <h1 className="font-heading text-lg sm:text-xl font-bold text-foreground leading-tight break-words">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{subtitle}</p>
              )}
            </div>
          </div>

          {description && (
            <p className="text-[13px] text-muted-foreground mt-2.5 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}

          {chips?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {/* `key` dikeluarkan dari objeknya: menyebarkan objek yang masih
                  memuat key ke JSX membuat React memperingatkan, dan key itu
                  bukan prop yang perlu diterima HeaderChip. */}
              {urutkanChip(chips).map(({ key, ...c }, i) => (
                <HeaderChip key={key || c.label || i} {...c} />
              ))}
            </div>
          )}

          {children && <div className="mt-4">{children}</div>}
        </div>

        {/* Di ponsel kolom ini turun ke bawah judul, bukan naik ke atasnya.
            Semula `order-first`, dengan maksud supaya tombolnya terlihat tanpa
            menggulir — hasilnya tombol "Buat Tugas" melayang di atas nama
            halaman, dan orang membaca perintah sebelum tahu sedang di mana.
            Kepala ini sudah muat satu layar; tombolnya tetap terlihat. */}
        {/* `sm:flex-shrink-0` DIHAPUS dari sini. Itu yang membuat kolom tombol
            menolak mengalah sementara judul di sebelahnya bersedia mengecil
            sampai tak terbaca. Tombolnya sudah flex-wrap, jadi saat ruangnya
            kurang ia turun ke baris berikutnya — yang benar, karena tombol
            yang melipat masih bisa dipakai sedangkan judul selebar satu huruf
            tidak bisa dibaca. */}
        <div className="flex flex-col items-stretch sm:items-end gap-3">
          {actions && (
            <div className="flex items-center gap-2 flex-wrap sm:justify-end">
              {actions}
            </div>
          )}
          {art && (
            <div className="hidden md:block opacity-90 animate-float">{art}</div>
          )}
        </div>
      </div>
    </div>
  );
}
