import { Leaf, Truck, Clock, HelpCircle, Image as ImageIcon } from "lucide-react";
import { bacaKeterlambatan, tulisDurasi } from "@/lib/keterlambatan";

/**
 * KeteranganMasuk — satu baris yang menerangkan kenapa jam masuknya begitu.
 *
 * Dipakai bersama oleh layar keeper, layar tim, dan laporan HR. Ketiganya
 * memanggil `bacaKeterlambatan` lewat komponen ini alih-alih menghitung
 * sendiri, supaya hari yang sama tidak pernah disebut dengan tiga sebutan
 * berbeda di tiga tempat.
 *
 * Tidak menampilkan apa pun untuk orang yang datang tepat waktu — sebagian
 * besar hari, dan tidak ada yang perlu diterangkan di sana.
 */

const RUPA = {
  kerja_lain: {
    Ikon: Leaf,
    kelas: "border-accent/30 bg-accent/10 text-accent",
  },
  telat: {
    Ikon: Clock,
    kelas: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  },
  telat_ringan: {
    Ikon: Clock,
    kelas: "border-border bg-muted/60 text-muted-foreground",
  },
  tanpa_alasan: {
    Ikon: HelpCircle,
    kelas: "border-border bg-muted/60 text-muted-foreground",
  },
};

export default function KeteranganMasuk({ att, tampilkanRingan = false, className = "" }) {
  const b = bacaKeterlambatan(att);
  if (b.tingkat === "tepat" || b.tingkat === "tidak_diketahui") return null;
  if (b.tingkat === "telat_ringan" && !tampilkanRingan) return null;

  const rupa = RUPA[b.tingkat] || RUPA.tanpa_alasan;
  const Ikon = b.alasan?.nilai === "tugas_luar" ? Truck : rupa.Ikon;
  const durasi = tulisDurasi(b.menit);

  return (
    <div className={`mt-1 flex flex-wrap items-center gap-1.5 ${className}`}>
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${rupa.kelas}`}
      >
        <Ikon className="w-3 h-3 flex-shrink-0" />
        {b.tingkat === "tanpa_alasan" ? `Telat ${durasi} · tanpa keterangan` : b.label}
        {/* Durasi hanya ditambahkan kalau labelnya BUKAN durasi itu sendiri.
            Pada telat ringan `label` sudah berbunyi "+21 mnt", dan menempelkan
            durasi lagi menghasilkan "+21 mnt · 21 mnt". */}
        {b.alasan && durasi ? <span className="opacity-70">· {durasi}</span> : null}
      </span>

      {att?.late_note && (
        <span className="text-[11px] text-muted-foreground">{att.late_note}</span>
      )}

      {att?.late_photo_url && (
        <a
          href={att.late_photo_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <ImageIcon className="w-3 h-3" /> Foto
        </a>
      )}
    </div>
  );
}
