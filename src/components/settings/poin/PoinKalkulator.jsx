/**
 * PoinKalkulator — Bagian B: kalkulator dampak biaya real-time.
 * Hitung bonus dengan nilai LAMA vs BARU tanpa menyimpan, per karyawan.
 */
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function PoinKalkulator({ rows, oldNilai, newNilai }) {
  if (!rows || rows.length === 0) {
    return <Card className="p-4 text-sm text-muted-foreground">Belum ada data poin 30 hari terakhir.</Card>;
  }
  const totalOld = rows.reduce((s, r) => s + r.poin30 * oldNilai, 0);
  const totalNew = rows.reduce((s, r) => s + r.poin30 * newNilai, 0);
  const totalSelisih = totalNew - totalOld;
  const anyOver = newNilai > 0 && rows.some((r) => r.monthlyBase > 0 && (r.poin30 * newNilai / r.monthlyBase) * 100 > 30);

  return (
    <Card className="p-4 space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="text-left py-2 pr-3 font-medium">Karyawan</th>
              <th className="text-right py-2 px-2 font-medium">Poin 30 hari</th>
              <th className="text-right py-2 px-2 font-medium">Bonus nilai lama</th>
              <th className="text-right py-2 px-2 font-medium">Bonus nilai baru</th>
              <th className="text-right py-2 px-2 font-medium">Selisih</th>
              <th className="text-right py-2 pl-3 font-medium">% Gaji Pokok</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => {
              const bOld = r.poin30 * oldNilai;
              const bNew = r.poin30 * newNilai;
              const sel = bNew - bOld;
              const pct = r.monthlyBase > 0 ? (bNew / r.monthlyBase) * 100 : null;
              const over30 = pct !== null && pct > 30;
              return (
                <tr key={r.name}>
                  <td className="py-2 pr-3 font-medium">{r.name}</td>
                  <td className="text-right py-2 px-2">{r.poin30}</td>
                  <td className="text-right py-2 px-2 text-muted-foreground">{fmt(bOld)}</td>
                  <td className="text-right py-2 px-2 font-semibold">{fmt(bNew)}</td>
                  <td className={`text-right py-2 px-2 font-medium ${sel > 0 ? "text-red-600" : sel < 0 ? "text-green-600" : "text-muted-foreground"}`}>
                    {sel > 0 ? "+" : ""}{fmt(sel)}
                  </td>
                  <td className="text-right py-2 pl-3">
                    {pct === null ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : (
                      <span className={over30 ? "text-red-600 font-medium" : ""}>{pct.toFixed(0)}%</span>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 font-bold">
              <td className="py-2 pr-3">Total</td>
              <td className="text-right py-2 px-2">{rows.reduce((s, r) => s + r.poin30, 0)}</td>
              <td className="text-right py-2 px-2">{fmt(totalOld)}</td>
              <td className="text-right py-2 px-2">{fmt(totalNew)}</td>
              <td className={`text-right py-2 px-2 ${totalSelisih > 0 ? "text-red-600" : totalSelisih < 0 ? "text-green-600" : ""}`}>
                {totalSelisih > 0 ? "+" : ""}{fmt(totalSelisih)}
              </td>
              <td className="text-right py-2 pl-3"></td>
            </tr>
          </tbody>
        </table>
      </div>
      {anyOver && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Bonus salah satu karyawan melebihi 30% gaji pokok — bonus sudah menjadi gaji utama, bukan insentif. Pertimbangkan menurunkan nilai per poin.</span>
        </div>
      )}
    </Card>
  );
}