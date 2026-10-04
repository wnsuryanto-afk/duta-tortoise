import { Egg } from "lucide-react";
import { kelompokkanPerInduk, labelBulan, saringBulan } from "@/lib/cariInduk";

/**
 * "Bulan September kemarin, induk mana saja yang bertelur?"
 *
 * Daftar clutch tersusun per catatan, bukan per bulan, dan pencarian nama
 * hanya menjawab satu kura sekaligus. Pertanyaan ini — yang ditanyakan tiap
 * awal bulan — sebelumnya hanya bisa dijawab dengan menggulir dan menghitung
 * sendiri.
 *
 * Dipisahkan dari BreedingAndEggs.jsx dengan alasan yang sama seperti
 * RiwayatBertelurInduk: halaman itu sudah seribu baris lebih, dan apa pun
 * yang tinggal di dalamnya tidak bisa diuji sendirian.
 *
 * @param bulan     kunci bulan terpilih, mis. "2026-09" (kosong = diam)
 * @param breedings SELURUH catatan pembiakan, bukan yang sudah disaring tab
 */
export default function BulanBertelur({ bulan = "", breedings = [] }) {
  if (!bulan) return null;

  const clutchBulan = saringBulan(breedings, bulan);
  const induk = kelompokkanPerInduk(clutchBulan);
  const totalTelur = clutchBulan.reduce((t, b) => t + (Number(b?.egg_count) || 0), 0);

  if (induk.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Tidak ada catatan bertelur pada {labelBulan(bulan)}.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Egg className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="font-semibold text-sm">{labelBulan(bulan)}</span>
        <span className="text-xs text-muted-foreground">
          {induk.length} induk · {clutchBulan.length} clutch · {totalTelur} butir
        </span>
      </div>

      {/*
        Satu baris per INDUK, bukan per clutch. Pada September 2026 ada tujuh
        clutch dari tujuh induk berbeda, tetapi C23 bertelur dua kali di bulan
        lain — daftar per clutch akan menyebut namanya dua kali dan membuat
        "berapa induk yang bertelur" harus dihitung ulang dengan mata.
      */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {induk.map((i) => {
          const butir = i.clutch.reduce((t, b) => t + (Number(b?.egg_count) || 0), 0);
          return (
            <span
              key={i.kunci}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background px-2 py-0.5 text-xs"
            >
              <span className="font-semibold">{i.nama}</span>
              <span className="text-muted-foreground tabular-nums">
                {i.clutch.length > 1 ? `${i.clutch.length}× · ` : ""}{butir} butir
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
