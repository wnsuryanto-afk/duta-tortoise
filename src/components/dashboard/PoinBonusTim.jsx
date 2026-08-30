/**
 * PoinBonusTim — posisi tiap keeper terhadap target bonus, dari sisi owner.
 *
 * Kartu ini pasangan dari kartu "Bonus Bulan Ini" di layar keeper. Keduanya
 * membaca angka yang sama persis, supaya tidak pernah terjadi keeper melihat
 * satu posisi dan owner melihat posisi lain untuk orang yang sama.
 *
 * Yang ditampilkan hanya perbandingan tiap orang dengan targetnya sendiri.
 * Peringkat antar karyawan sengaja tidak ada: dengan tim dua-tiga orang,
 * papan peringkat lebih sering merusak hubungan kerja daripada menaikkan
 * semangat, dan owner tetap bisa melihat siapa yang tertinggal dari angkanya.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Trophy, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { tingkatanBonus, tingkatTercapai } from "@/lib/bonus";
import { masukLaporan } from "@/lib/laporan";

const rupiah = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
const PERAN = ["keeper", "kepala_feeder"];

export default function PoinBonusTim() {
  const monthKey = format(new Date(), "yyyy-MM");

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const r = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return r[0] || null;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["poin-bonus-users"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["poin-bonus-checklists", monthKey],
    queryFn: () => base44.entities.DailyChecklist.list("-date", 500),
    staleTime: 3 * 60 * 1000,
  });

  const tingkatan = useMemo(() => tingkatanBonus(settings), [settings]);

  // D16 - Poin tim dihitung lebih dulu karena tingkat Dasar bergantung padanya.
  const poinTim = useMemo(
    () =>
      (checklists || [])
        .filter(
          (c) =>
            String(c.date || "").startsWith(monthKey) &&
            c.status !== "rejected" &&
            masukLaporan(c),
        )
        .reduce((t, c) => t + Number(c.approved_points || c.total_points_claimed || 0), 0),
    [checklists, monthKey],
  );

  const baris = useMemo(() => {
    const nilaiPoin = Number(settings?.nilai_per_poin || 0);
    return (users || [])
      .filter((u) => PERAN.includes(u.role))
      .map((u) => {
        const poin = (checklists || [])
          .filter(
            (c) =>
              c.employee_email === u.email &&
              String(c.date || "").startsWith(monthKey) &&
              c.status !== "rejected" &&
              masukLaporan(c),
          )
          .reduce((t, c) => t + Number(c.approved_points || c.total_points_claimed || 0), 0);

        const tercapai =
          [...tingkatan].reverse().find((t) => tingkatTercapai(t, poin, poinTim)) || null;
        const berikut = tingkatan.find((t) => !tingkatTercapai(t, poin, poinTim)) || null;
        return {
          nama: u.full_name || u.email,
          poin,
          tercapai,
          berikut,
          upah: poin * nilaiPoin,
          bonus: tercapai?.bonus || 0,
        };
      })
      .sort((a, b) => b.poin - a.poin);
  }, [users, checklists, tingkatan, settings, monthKey, poinTim]);

  if (!settings || tingkatan.length === 0 || baris.length === 0) return null;

  const targetAkhir = tingkatan[tingkatan.length - 1].target;
  const totalBonus = baris.reduce((s, b) => s + b.bonus, 0);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-sm text-foreground">Poin &amp; Bonus Tim Bulan Ini</h2>
        <Link to="/rekap-poin-gaji" className="ml-auto text-xs text-primary hover:underline">
          Rekap →
        </Link>
      </div>

      <div className="space-y-3">
        {baris.map((b) => {
          const persen = Math.min(100, (b.poin / targetAkhir) * 100);
          return (
            <div key={b.nama}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-foreground truncate">{b.nama}</span>
                <span className="text-sm tabular-nums text-foreground">
                  {b.poin.toLocaleString("id-ID")}
                  <span className="text-xs text-muted-foreground"> poin</span>
                </span>
              </div>

              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${persen}%`, transition: "width .7s cubic-bezier(.16,1,.3,1)" }}
                />
              </div>

              <div className="flex items-baseline justify-between gap-2 mt-1">
                <span className="text-[11px] text-muted-foreground">
                  {b.tercapai ? (
                    <span className="text-primary font-semibold">✓ {b.tercapai.nama}</span>
                  ) : (
                    "belum mencapai tingkat pertama"
                  )}
                  {b.berikut && (
                    <> · kurang {(b.berikut.target - b.poin).toLocaleString("id-ID")} ke {b.berikut.nama}</>
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {rupiah(b.upah)}
                  {b.bonus > 0 && ` + ${rupiah(b.bonus)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border flex items-center gap-1.5">
        <Star className="w-3 h-3 flex-shrink-0" />
        {totalBonus > 0
          ? `Bonus yang sudah terkunci bulan ini: ${rupiah(totalBonus)}.`
          : "Belum ada yang mencapai tingkat bonus bulan ini."}
      </p>
    </div>
  );
}
