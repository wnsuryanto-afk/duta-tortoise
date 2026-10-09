/**
 * KartuPemeliharaan — kulit bersama kartu-kartu di halaman Pemeliharaan Sistem.
 *
 * ── Kenapa ada ──────────────────────────────────────────────────────────────
 *
 * Halaman Pemeliharaan Sistem dipotret 9 Okt 2026 di lebar telepon: 4.153
 * huruf, lima layar penuh. Isinya enam alat perawatan data, dan semuanya
 * menggambar kartu PENUH — judul, keterangan, kotak status, tombol — bahkan
 * ketika tidak ada satu pun pekerjaan di dalamnya.
 *
 * Padahal "tidak ada yang perlu dikerjakan" adalah keadaan NORMAL halaman ini.
 * Alat-alat ini dijalankan sekali, lalu diam berbulan-bulan. Jadi lima layar
 * itu hampir seluruhnya kartu yang berkata "nol", dan yang satu benar-benar
 * perlu dikerjakan tenggelam di antaranya.
 *
 * Empat dari enam kartu menyalin kulit yang sama persis — kotak, ikon dalam
 * persegi, judul, satu baris keterangan. Kulit itu sekarang di sini, dan
 * membawa satu kemampuan baru: KETIKA BERES, IA SATU BARIS.
 *
 * ── Ditutup, bukan dihapus ──────────────────────────────────────────────────
 *
 * Yang beres tetap bisa dibuka. Kartu yang hilang sama sekali membuat orang
 * mencari alat yang ia tahu pernah ada di situ; kartu yang menyusut jadi satu
 * baris tetap mengatakan "aku ada, dan tidak ada yang perlu kaukerjakan".
 *
 * Yang BELUM beres tidak pernah ditutup. Menyembunyikan pekerjaan di balik
 * satu klik adalah cara membuatnya tidak dikerjakan.
 */
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export default function KartuPemeliharaan({
  ikon: Ikon,
  judul,
  kicker,
  bantuan = null,
  /** Tidak ada pekerjaan di dalam kartu ini. */
  beres = false,
  /** Satu baris angka yang tetap terlihat saat tertutup. */
  ringkas = "",
  children,
}) {
  const [buka, setBuka] = useState(false);
  const tertutup = beres && !buka;

  if (tertutup) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        aria-expanded={false}
        className="w-full rounded-xl border border-border bg-card px-3 py-2 flex items-center gap-2.5 text-left hover:border-primary/40 transition-colors"
      >
        <Check className="w-4 h-4 text-accent flex-shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="text-sm font-medium block">{judul}</span>
          {ringkas && <span className="text-[11px] text-muted-foreground block">{ringkas}</span>}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-primary/12 text-primary flex items-center justify-center flex-shrink-0">
          {Ikon && <Ikon className="w-4 h-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold text-[15px] leading-tight flex items-center gap-1">
            {judul}
            {bantuan}
          </h3>
          {kicker && <p className="text-[11px] text-muted-foreground">{kicker}</p>}
        </div>
        {beres && (
          <button
            type="button"
            onClick={() => setBuka(false)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            Tutup
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
