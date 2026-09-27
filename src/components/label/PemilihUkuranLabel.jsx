/**
 * PemilihUkuranLabel — pemilih ukuran stiker, dipakai semua modal cetak label.
 *
 * Pilihan ukuran pernah cuma ada di satu dari tiga modal, dan itu bukan
 * kebetulan: selama tiap modal punya pemilihnya sendiri, layar yang dibuat
 * belakangan berangkat tanpa pemilih sama sekali dan langsung mematikan satu
 * ukuran di dalam kodenya. Modal label batch adalah kasus terakhirnya — 50×30
 * ditulis mati, padahal gulungan 30×15 juga ada di peternakan.
 *
 * `useUkuranLabel` membawa satu aturan yang tidak boleh berbeda antar layar:
 * ukuran AWALNYA mengikuti gulungan yang tercatat di halaman Printer & Label,
 * dan baru berhenti mengikutinya begitu orangnya memilih sendiri.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { UKURAN_LABEL, UKURAN_BAWAAN, cariUkuran, ukuranTerpasang } from "@/lib/ukuranLabel";

export function useUkuranLabel(open) {
  // `null` berarti "ikut gulungan yang tercatat di printer". Begitu orangnya
  // menekan salah satu kartu, pilihannya yang dipakai sampai dialog ditutup.
  const [dipilih, setDipilih] = useState(null);

  // Halaman Printer & Label sudah ada sejak lama, tetapi TIDAK ADA satu pun
  // layar yang pernah membacanya — apa pun yang diisi di sana tidak pernah
  // berpengaruh ke mana-mana. Inilah yang akhirnya membacanya.
  const { data: printers = [] } = useQuery({
    queryKey: ["printer-config"],
    queryFn: () => base44.entities.PrinterConfig.list(),
    staleTime: 5 * 60 * 1000,
    enabled: !!open,
  });

  const dariPrinter = ukuranTerpasang(printers);
  const ukuranId = dipilih ?? dariPrinter ?? UKURAN_BAWAAN;

  return {
    ukuranId,
    ukuran: cariUkuran(ukuranId),
    ikutPrinter: dipilih === null && dariPrinter !== null,
    pilih: setDipilih,
    lepas: () => setDipilih(null),
  };
}

/**
 * Kartu-kartu pilihan ukuran.
 *
 * Tiap pilihan menyebut barang apa yang cocok, karena yang memilih sedang
 * memegang barangnya — "50 × 30 mm" sendirian tidak memberi tahu apakah ia
 * muat di botol yang ada di tangan.
 */
export default function PemilihUkuranLabel({ ukuranId, ikutPrinter, onPilih }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5">Ukuran stiker</p>
      <div className="grid grid-cols-2 gap-1.5">
        {UKURAN_LABEL.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onPilih(u.id)}
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
        {ikutPrinter
          ? "Terpilih mengikuti gulungan yang tercatat di halaman Printer & Label. Ganti di sini kalau gulungan di printer sedang berbeda."
          : "Pilih yang sama dengan gulungan stiker yang terpasang di printer."}{" "}
        Label kecil otomatis menampilkan lebih sedikit keterangan supaya tetap terbaca.
      </p>
    </div>
  );
}
