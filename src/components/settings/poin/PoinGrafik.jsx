/**
 * PoinGrafik — Bagian C: grafik riwayat poin & bonus.
 * - Bar chart poin harian per karyawan (30 hari)
 * - Line chart total biaya bonus per bulan (6 bulan, dari slip gaji)
 * - Kartu ringkasan
 */
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid } from "recharts";
import { Star, TrendingUp, ArrowDown, CalendarDays } from "lucide-react";

const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const COLORS = ["#2D5016", "#6B9B37", "#8B5E3C", "#3b82f6", "#a855f7", "#ef4444", "#C19A6B"];

export default function PoinGrafik({ barData, empNames, lineData, summary }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <Star className="w-4 h-4 text-amber-500 mb-1.5" />
          <p className="text-xl font-bold">{summary.avgPerDay.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Rata-rata poin/hari</p>
        </Card>
        <Card className="p-4">
          <TrendingUp className="w-4 h-4 text-green-600 mb-1.5" />
          <p className="text-xl font-bold">{summary.maxDay}</p>
          <p className="text-xs text-muted-foreground">Poin tertinggi (1 hari)</p>
        </Card>
        <Card className="p-4">
          <ArrowDown className="w-4 h-4 text-red-500 mb-1.5" />
          <p className="text-xl font-bold">{summary.minDay}</p>
          <p className="text-xs text-muted-foreground">Poin terendah (1 hari)</p>
        </Card>
        <Card className="p-4">
          <CalendarDays className="w-4 h-4 text-primary mb-1.5" />
          <p className="text-xl font-bold">{summary.totalThisMonth}</p>
          <p className="text-xs text-muted-foreground">Total bulan ini</p>
        </Card>
      </div>

      <Card className="p-4">
        <p className="text-sm font-semibold mb-3">Poin Harian per Karyawan (30 hari terakhir)</p>
        {barData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Belum ada checklist approved 30 hari terakhir.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {empNames.map((name, i) => (
                <Bar key={name} dataKey={name} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-4">
        <p className="text-sm font-semibold mb-3">Total Biaya Bonus per Bulan (6 bulan terakhir, dari slip gaji)</p>
        {lineData.every((d) => d.bonus === 0) ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Belum ada slip gaji dengan poin bonus 6 bulan terakhir.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`} />
              <Tooltip formatter={(v) => fmtRp(v)} />
              <Line type="monotone" dataKey="bonus" name="Bonus" stroke="#2D5016" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}