/**
 * SopTerkunciCard — SOP yang sedang tidak bisa dikerjakan karena bahannya habis.
 *
 * Ini jawaban atas satu keadaan yang selama berbulan-bulan tidak terlihat di
 * layar mana pun: tugas harian tetap muncul dan tetap berpoin walau bahannya
 * nol. Contoh nyatanya pemberian Vitamin Reproduksi — tugasnya aktif tiap hari
 * jam 08:30 dengan 10 poin, sementara stok racikannya 0 dari minimum 3.000 g.
 *
 * Penanda `terkunci_bahan` diisi otomatis oleh fungsi kunciBahanSOP. Kartu ini
 * hanya menampilkannya, dan menghilang sendiri saat tidak ada yang terkunci.
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function SopTerkunciCard() {
  const { data: terkunci = [] } = useQuery({
    queryKey: ["sop-terkunci"],
    queryFn: () => base44.entities.SOPTask.filter({ terkunci_bahan: true, is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  if (!terkunci.length) return null;

  const totalPoin = terkunci.reduce((s, t) => s + Number(t.points || 0), 0);

  return (
    <div className="bg-card rounded-xl border border-red-200 dark:border-red-900 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />
        <h2 className="font-semibold text-sm text-foreground">
          {terkunci.length} SOP terhenti karena bahan habis
        </h2>
        <Link to="/warehouse" className="ml-auto text-xs text-primary hover:underline">
          Gudang →
        </Link>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Tugas ini tidak bisa dicentang keeper sampai bahannya ada. Senilai {totalPoin} poin per hari
        yang tidak bisa mereka dapatkan.
      </p>

      <div className="space-y-2">
        {terkunci.slice(0, 6).map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 dark:bg-red-950/30 dark:border-red-900"
          >
            <span className="text-base mt-0.5">🔒</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-red-800 dark:text-red-300 font-medium leading-snug">{t.title}</p>
              {t.terkunci_alasan && (
                <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5">{t.terkunci_alasan}</p>
              )}
            </div>
            <span className="text-[11px] text-red-700/70 dark:text-red-400/70 tabular-nums flex-shrink-0">
              {t.points} poin
            </span>
          </div>
        ))}
        {terkunci.length > 6 && (
          <p className="text-xs text-muted-foreground">dan {terkunci.length - 6} lainnya</p>
        )}
      </div>
    </div>
  );
}
