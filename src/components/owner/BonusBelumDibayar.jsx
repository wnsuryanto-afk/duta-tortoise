import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Wallet, ChevronRight } from "lucide-react";
import { bonusTertunda, ringkasBonusTertunda } from "@/lib/bonusTertunda";
import { rupiah } from "@/lib/rupiah";


/**
 * BonusBelumDibayar — bonus yang sudah dijanjikan tetapi belum keluar.
 *
 * Pada 3 September 2026 dibuat dua ganti rugi untuk tiga hari saat aplikasi
 * mati (13-15 Agustus): Angsolo Rp 27.225, Sholehuddin Rp 34.200. Angkanya
 * dihitung dari median poin harian masing-masing, alasannya ditulis panjang
 * di catatan, dan dibuat atas permintaan pemilik sendiri. Dua puluh lima hari
 * kemudian keduanya masih "pending".
 *
 * Bukan karena disembunyikan: BonusReward memang ditampilkan di tab "KPI &
 * Poin", lengkap dengan tombol "tandai dibayar". Tetapi daftar yang harus
 * SENGAJA DICARI bukan pengingat. Tidak ada satu pun tempat yang berkata
 * "ada Rp 61.425 yang sudah dijanjikan dan belum keluar".
 *
 * Kartu ini tidak membayar apa pun dan tidak mengubah status apa pun — ia
 * hanya menolak membiarkan janji itu tenggelam.
 */
export default function BonusBelumDibayar() {
  const { data: rewards = [] } = useQuery({
    queryKey: ["bonus-tertunda"],
    queryFn: () => base44.entities.BonusReward.list("-period", 200),
    staleTime: 5 * 60 * 1000,
  });

  const daftar = useMemo(() => bonusTertunda(rewards), [rewards]);
  const ringkas = useMemo(() => ringkasBonusTertunda(daftar), [daftar]);

  if (daftar.length === 0) return null;

  return (
    <Link
      to="/sop"
      className="block rounded-2xl border border-amber-500/40 bg-amber-500/8 p-4 hover:bg-amber-500/12 transition-colors"
    >
      <div className="flex items-start gap-2.5">
        <Wallet className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">
            {rupiah(ringkas.rupiah)} bonus sudah dijanjikan, belum dibayar
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ringkas.jumlah} catatan untuk {ringkas.orang} orang
            {ringkas.umurTertua !== null && (
              <> · yang tertua sudah {ringkas.umurTertua} hari</>
            )}{" "}
            · tandai lunas di tab KPI &amp; Poin
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {daftar.slice(0, 4).map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{b.nama}</p>
              {/* Alasannya ikut ditampilkan. Bonus tanpa keterangan mudah
                  ditunda lagi; yang tertulis alasannya jauh lebih sulit. */}
              <p className="text-[11px] text-muted-foreground line-clamp-2 break-words">
                {[b.periode, b.alasan].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums flex-shrink-0">
              {rupiah(b.rupiah)}
            </span>
          </div>
        ))}
        {daftar.length > 4 && (
          <p className="text-[11px] text-muted-foreground px-1">
            dan {daftar.length - 4} lagi
          </p>
        )}
      </div>
    </Link>
  );
}
