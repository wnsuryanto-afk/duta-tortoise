import { Card } from "@/components/ui/card";
import { Egg } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function EggHatchChart({ breedings = [] }) {
  const totalEggs = breedings.reduce((s, b) => s + (b.egg_count || 0), 0);
  const totalHatched = breedings.reduce((s, b) => s + (b.hatched_count || 0), 0);
  const belumMenetas = Math.max(0, totalEggs - totalHatched);

  const data = [
    { name: "Sudah Menetas", value: totalHatched, color: "#22c55e" },
    { name: "Belum Menetas", value: belumMenetas, color: "#f97316" },
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
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="p-2.5 rounded-xl bg-green-50 text-center">
              <p className="text-xl font-bold text-green-600">{totalHatched}</p>
              <p className="text-xs text-green-700">Sudah Menetas</p>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-50 text-center">
              <p className="text-xl font-bold text-orange-600">{belumMenetas}</p>
              <p className="text-xs text-orange-700">Belum Menetas</p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}