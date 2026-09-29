import { cn } from "@/lib/utils";

/**
 * UbinAngka — ubin ringkas untuk kisi angka yang rapat di dalam panel.
 *
 * ── Bedanya dengan KartuAngka ──────────────────────────────────────────────
 *
 * Keduanya menampilkan "satu angka penting", tetapi untuk dua tempat yang
 * berbeda, dan itu bukan kebetulan yang perlu disatukan:
 *
 *   KartuAngka   kepala halaman. Besar, berikon di kanan, punya sub-keterangan,
 *                bisa ditekan. Empat buah berjajar mengisi lebar layar.
 *   UbinAngka    di DALAM panel rincian. Kecil, rapat, enam sampai delapan
 *                buah dalam satu kisi, hanya dibaca — tidak ditekan.
 *
 * Memaksa keduanya jadi satu komponen akan menghasilkan satu komponen dengan
 * delapan saklar. Dua bentuk yang masing-masing jelas lebih baik daripada satu
 * bentuk yang bisa jadi apa saja.
 *
 * ── Yang disatukan di sini ─────────────────────────────────────────────────
 *
 * Tiga salinan bentuk yang SAMA, di tiga berkas:
 *
 *   StatBox   components/breeding/BreedingBatchDetail.jsx   (8 baris)
 *   Stat      pages/LayarTimPage.jsx                        (16 baris)
 *   StatCard  pages/UserDetailPage.jsx                      (9 baris)
 *
 * Ketiganya ubin kecil berlabel dan berangka. Bedanya cuma urutan (angka di
 * atas label, atau sebaliknya), perataan, dan cara warnanya ditentukan — dua
 * menerima kelas Tailwind mentah dari pemanggil, satu punya daftar nada
 * sendiri. Tidak ada satu pun yang salah; yang salah adalah tidak ada dua yang
 * sama, dan itulah yang membuat tiap halaman terasa dibuat orang berbeda.
 *
 * Satu lagi yang ikut terbawa: daftar nada di LayarTimPage memakai
 * `bg-green-50 text-green-700` tanpa pasangan mode gelap — di tema gelap
 * ubinnya tetap terang sementara teks di sekitarnya menerang. Nada di sini
 * punya kedua tema.
 */

const NADA = {
  netral: "bg-muted/60 text-foreground border-transparent",
  baik: "bg-accent/10 text-accent border-accent/20",
  awas: "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/25",
  bahaya: "bg-destructive/10 text-destructive border-destructive/25",
  utama: "bg-primary/8 text-primary border-primary/20",
};

/**
 * @param {string}   label  nama angkanya
 * @param {*}        nilai  angka atau teks pendek
 * @param {Function} ikon   komponen ikon lucide (opsional)
 * @param {string}   nada   netral | baik | awas | bahaya | utama
 */
export default function UbinAngka({ label, nilai, ikon: Ikon, nada = "netral", className }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-2.5 text-center min-w-0",
        NADA[nada] || NADA.netral,
        className,
      )}
    >
      {Ikon && <Ikon className="w-4 h-4 mx-auto mb-1 opacity-80" />}
      {/* `break-words` + `tabular-nums`: ubin ini paling sempit di seluruh
          aplikasi — enam dalam satu baris di layar 390px — jadi angka panjang
          harus melipat, bukan meluber. */}
      <p className="text-base font-bold leading-tight tabular-nums break-words">{nilai}</p>
      <p className="text-[11px] mt-0.5 leading-tight opacity-75 break-words">{label}</p>
    </div>
  );
}
