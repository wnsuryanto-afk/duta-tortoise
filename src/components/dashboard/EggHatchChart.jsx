import { Card } from "@/components/ui/card";
import { Egg } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function EggHatchChart({ breedings = [] }) {
  // Use egg_records for accurate count
  let totalEggs = 0, menetasCount = 0, fertileCount = 0, infertilCount = 0, belumCek = 0, gagalCount = 0;
  breedings.forEach(b => {
    const records = b.egg_records || [];
    if (records.length > 0) {
      records.forEach(e => {
        totalEggs++;
        if (e.status === "menetas") menetasCount++;
        else if (e.status === "fertile") fertileCount++;
        else if (e.status === "infertil") infertilCount++;
        else if (e.status === "gagal") gagalCount++;
        else belumCek++;
      });
    } else {
      // No per-egg records → all "belum dicek"
      totalEggs += (b.egg_count || 0);
      belumCek += (b.egg_count || 0);
    }
  });

  const checkedTotal = menetasCount + fertileCount + infertilCount + gagalCount;
  const hatchRate = checkedTotal > 0 ? Math.round((menetasCount / checkedTotal) * 100) : 0;

  const data = [
    { name: "🐢 Menetas", value: menetasCount, color: "#22c55e" },
    { name: "🟢 Fertile", value: fertileCount, color: "#86efac" },
    { name: "🔴 Infertil", value: infertilCount, color: "#fca5a5" },
    { name: "⚫ Gagal", value: gagalCount, color: "#6b7280" },
    { name: "⬜ Belum Cek", value: belumCek, color: "#d1d5db" },
  ].filter((d) => d.value > 0);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Egg className="w-4 h-4 text-accent" />
        <h2 className="font-semibold text-base">Status Telur</h2>
        <span className="ml-auto text-sm font-bold text-accent">{totalEggs} total telur</span>
      </div>
      {totalEggs === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Belum ada data telur</p>
      ) : (
        <>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="p-2.5 rounded-xl bg-green-50 text-center">
              <p className="text-xl font-bold text-green-600">{menetasCount}</p>
              <p className="text-xs text-green-700">🐢 Sudah Menetas</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 text-center">
              <p className="text-xl font-bold text-blue-600">{checkedTotal > 0 ? `${hatchRate}%` : "-"}</p>
              <p className="text-xs text-blue-700">📊 Hatch Rate (dari {checkedTotal} dicek)</p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}