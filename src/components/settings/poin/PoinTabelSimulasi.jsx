/**
 * PoinTabelSimulasi — Bagian D: tabel simulasi cepat.
 * Biaya bonus bulanan pada beberapa nilai sekaligus, per karyawan + total.
 */
import { Card } from "@/components/ui/card";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const OPSI_NILAI = [25, 50, 75, 100, 150, 200];

export default function PoinTabelSimulasi({ rows }) {
  if (!rows || rows.length === 0) return null;
  const totalPoin = rows.reduce((s, r) => s + r.poin30, 0);
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold mb-1">Tabel Simulasi Cepat — Biaya Bonus Bulanan per Nilai</p>
      <p className="text-xs text-muted-foreground mb-3">Biaya = poin 30 hari × nilai. Membantu memilih angka tanpa mencoba satu per satu.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="text-left py-2 pr-3 font-medium">Karyawan</th>
              <th className="text-right py-2 px-2 font-medium">Poin</th>
              {OPSI_NILAI.map((v) => (
                <th key={v} className="text-right py-2 px-2 font-medium">Rp {v}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="py-2 pr-3 font-medium">{r.name}</td>
                <td className="text-right py-2 px-2 text-muted-foreground">{r.poin30}</td>
                {OPSI_NILAI.map((v) => (
                  <td key={v} className="text-right py-2 px-2">{fmt(r.poin30 * v)}</td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 font-bold">
              <td className="py-2 pr-3">Total</td>
              <td className="text-right py-2 px-2">{totalPoin}</td>
              {OPSI_NILAI.map((v) => (
                <td key={v} className="text-right py-2 px-2 text-primary">{fmt(totalPoin * v)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}