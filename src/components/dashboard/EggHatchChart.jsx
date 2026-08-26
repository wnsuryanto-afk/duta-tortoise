import { Egg, Info } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import ProgressRing from "@/components/ui/progress-ring";
import InfoHint from "@/components/ui/info-hint";
import Illustration from "@/components/common/Illustration";
import NoteCard from "@/components/common/NoteCard";

/**
 * EggHatchChart — sebaran status telur beserta tingkat penetasan.
 *
 * Donatnya memakai satu palet hijau→merah yang berurutan (bukan warna acak
 * per kategori) sehingga urutan "baik → buruk" terbaca dari warnanya saja.
 * Legenda dipindah ke daftar di samping: label recharts memotong teks pada
 * lebar kartu, dan daftar sendiri muat menampilkan angka serta persentase.
 */
const STATUS = [
  { key: "menetas",  label: "Menetas",   color: "hsl(var(--accent))" },
  { key: "fertile",  label: "Fertile",   color: "hsl(var(--accent) / 0.5)" },
  { key: "infertil", label: "Infertil",  color: "hsl(var(--destructive) / 0.5)" },
  { key: "gagal",    label: "Gagal",     color: "hsl(var(--muted-foreground))" },
  { key: "belumCek", label: "Belum Cek", color: "hsl(var(--muted-foreground) / 0.35)" },
];

export default function EggHatchChart({ breedings = [] }) {
  const hitung = { menetas: 0, fertile: 0, infertil: 0, gagal: 0, belumCek: 0 };
  let totalEggs = 0;

  breedings.forEach((b) => {
    const records = b.egg_records || [];
    if (records.length > 0) {
      records.forEach((e) => {
        totalEggs++;
        if (e.status === "menetas") hitung.menetas++;
        else if (e.status === "fertile") hitung.fertile++;
        else if (e.status === "infertil") hitung.infertil++;
        else if (e.status === "gagal") hitung.gagal++;
        else hitung.belumCek++;
      });
    } else {
      // Batch tanpa catatan per telur → seluruhnya dianggap belum dicek
      totalEggs += b.egg_count || 0;
      hitung.belumCek += b.egg_count || 0;
    }
  });

  const checkedTotal = hitung.menetas + hitung.fertile + hitung.infertil + hitung.gagal;
  const hatchRate = checkedTotal > 0 ? Math.round((hitung.menetas / checkedTotal) * 100) : 0;
  const belumCekPct = totalEggs > 0 ? Math.round((hitung.belumCek / totalEggs) * 100) : 0;

  const data = STATUS.map((s) => ({ ...s, value: hitung[s.key] })).filter((d) => d.value > 0);

  return (
    <div className="surface-raised p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/12 text-accent flex-shrink-0">
          <Egg className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading font-semibold text-[15px] leading-tight">Status Telur</h2>
          <p className="text-[11px] text-muted-foreground">Sebaran seluruh batch aktif</p>
        </div>
        <span className="ml-auto text-right">
          <span className="block stat-value text-lg text-accent">{totalEggs}</span>
          <span className="block text-[10px] text-muted-foreground">butir telur</span>
        </span>
      </div>

      {totalEggs === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <Illustration name="breeding" size="sm" className="animate-float" />
          <p className="text-sm text-muted-foreground mt-2">Belum ada data telur</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Grafik muncul setelah batch breeding pertama dicatat.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative w-[132px] h-[132px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={64}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    animationDuration={700}
                  >
                    {data.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [`${v} butir (${Math.round((v / totalEggs) * 100)}%)`, n]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 10,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Angka di tengah donat — hal pertama yang dicari saat melihat grafik ini */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="stat-value text-xl text-foreground">{hatchRate}%</span>
                <span className="text-[9px] text-muted-foreground">menetas</span>
              </div>
            </div>

            <ul className="flex-1 min-w-0 space-y-1.5">
              {data.map((d) => (
                <li key={d.key} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: d.color }}
                  />
                  <span className="text-muted-foreground truncate flex-1">{d.label}</span>
                  <span className="font-semibold tabular">{d.value}</span>
                  <span className="text-[10px] text-muted-foreground/70 tabular w-9 text-right">
                    {Math.round((d.value / totalEggs) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-accent/8 border border-accent/20 p-3 flex items-center gap-3">
              <span className="text-2xl">🐢</span>
              <div className="min-w-0">
                <p className="stat-value text-xl text-accent">{hitung.menetas}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Sudah menetas</p>
              </div>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border p-3 flex items-center gap-3">
              <ProgressRing value={hatchRate} size={44} thickness={5} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold flex items-center gap-1">
                  Hatch rate
                  <InfoHint title="Hatch rate" variant="info" size={12}>
                    Persentase telur menetas dari telur yang <b>sudah diperiksa</b>
                    {" "}({checkedTotal} butir). Telur yang belum dicek sengaja tidak
                    dihitung agar angkanya tidak terlihat lebih buruk dari kenyataan.
                  </InfoHint>
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  dari {checkedTotal} butir dicek
                </p>
              </div>
            </div>
          </div>

          {/* Catatan otomatis — menerjemahkan grafik jadi tindakan */}
          {hitung.belumCek > 0 && belumCekPct >= 30 && (
            <NoteCard tone="tip" compact className="mt-3" icon={Info}>
              <b>{hitung.belumCek} butir ({belumCekPct}%)</b> belum pernah diperiksa.
              Hatch rate di atas baru mewakili {checkedTotal} butir — periksa (candling)
              sisanya agar angkanya bisa dipercaya.
            </NoteCard>
          )}
          {checkedTotal >= 10 && hatchRate < 50 && (
            <NoteCard tone="warning" compact className="mt-3">
              Hatch rate <b>{hatchRate}%</b> tergolong rendah. Periksa suhu dan
              kelembapan inkubator, serta kondisi indukan pada batch ini.
            </NoteCard>
          )}
        </>
      )}
    </div>
  );
}
