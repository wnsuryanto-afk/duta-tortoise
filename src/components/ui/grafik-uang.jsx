import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, Cell,
} from "recharts";
import { cn } from "@/lib/utils";

/**
 * GrafikUang — pemasukan vs pengeluaran per bulan.
 *
 * Menggantikan deretan batang tanpa sumbu, tanpa kisi, dan tanpa angka yang
 * dipakai sebelumnya: enam batang mengambang di ruang kosong tidak bisa dibaca
 * besarannya, hanya bisa dibandingkan kasar satu sama lain.
 *
 * Warna kedua serinya sengaja BUKAN hijau-merah. Bagi mata deuteranopia — buta
 * warna merah-hijau, sekitar 6% pria — hijau dan merah yang dipakai aplikasi
 * ini berjarak ΔE 1,4, artinya praktis warna yang sama. Sian dan kuning tua di
 * `--seri-masuk`/`--seri-keluar` berjarak ΔE 17,7 pada penglihatan buta warna.
 * Identitas seri juga tidak pernah bergantung warna saja: ada legenda tetap,
 * dan bulan terakhir diberi label angkanya langsung.
 */

const rpSingkat = (n) => {
  const v = Math.abs(n || 0);
  if (v >= 1e9) return `${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (v >= 1e6) return `${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (v >= 1e3) return `${Math.round(n / 1e3)} rb`;
  return String(Math.round(n || 0));
};
const rpPenuh = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");

function Keterangan({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const masuk = payload.find((p) => p.dataKey === "masuk")?.value || 0;
  const keluar = payload.find((p) => p.dataKey === "keluar")?.value || 0;
  const laba = masuk - keluar;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm" style={{ background: "hsl(var(--seri-masuk))" }} />
        <span className="text-muted-foreground">Masuk</span>
        <span className="ml-auto tabular font-medium text-foreground">{rpPenuh(masuk)}</span>
      </p>
      <p className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm" style={{ background: "hsl(var(--seri-keluar))" }} />
        <span className="text-muted-foreground">Keluar</span>
        <span className="ml-auto tabular font-medium text-foreground">{rpPenuh(keluar)}</span>
      </p>
      <p className="flex items-center gap-1.5 pt-1 border-t border-border/60">
        <span className="text-muted-foreground">{laba >= 0 ? "Laba" : "Rugi"}</span>
        <span className={cn("ml-auto tabular font-semibold", laba >= 0 ? "text-accent" : "text-destructive")}>
          {rpPenuh(Math.abs(laba))}
        </span>
      </p>
    </div>
  );
}

/**
 * @param {Array} data  [{ label, masuk, keluar }]
 * @param {number} tinggi  tinggi area gambar
 */
export default function GrafikUang({ data = [], tinggi = 220, className }) {
  const adaIsi = useMemo(
    () => data.some((d) => (d.masuk || 0) > 0 || (d.keluar || 0) > 0),
    [data]
  );
  const terakhir = data.length - 1;

  if (!adaIsi) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground", className)}
        style={{ height: tinggi }}
      >
        Belum ada catatan pemasukan atau pengeluaran pada rentang ini
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={tinggi}>
        <BarChart data={data} margin={{ top: 18, right: 6, left: -6, bottom: 0 }} barGap={2}>
          {/* Kisi horizontal saja, dan sengaja pudar: ia alat bantu baca,
              bukan bagian dari datanya. */}
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.7} />
          <XAxis
            dataKey="label" tickLine={false} axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          {/* Sumbu Y-nya ADA. Versi lama menyembunyikannya, sehingga tinggi
              batang tidak bisa dibaca sebagai angka sama sekali. */}
          <YAxis
            tickLine={false} axisLine={false} width={52}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={rpSingkat}
          />
          <Tooltip content={<Keterangan />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.5 }} />
          {/* Teks legenda memakai warna TEKS, bukan warna serinya. Recharts
              secara bawaan mewarnai hurufnya sesuai seri — huruf berwarna di
              atas latar terang sulit dibaca, dan identitas serinya sudah
              dibawa oleh kotak kecil di sebelahnya. */}
          <Legend
            verticalAlign="top" align="left" height={26} iconSize={9} iconType="square"
            wrapperStyle={{ fontSize: 11, paddingBottom: 4 }}
            formatter={(nilai) => (
              <span style={{ color: "hsl(var(--muted-foreground))" }}>{nilai}</span>
            )}
          />
          <Bar dataKey="masuk" name="Uang masuk" fill="hsl(var(--seri-masuk))" radius={[4, 4, 0, 0]} maxBarSize={26}>
            {/* Bulan terakhir diberi label angkanya — pembaca butuh setidaknya
                satu titik acuan tanpa harus mengarahkan kursor. */}
            <LabelList
              dataKey="masuk" position="top" offset={6}
              content={({ x, y, width, value, index }) =>
                index === terakhir && value > 0 ? (
                  <text x={x + width / 2} y={y - 5} textAnchor="middle"
                    className="fill-foreground" style={{ fontSize: 10, fontWeight: 600 }}>
                    {rpSingkat(value)}
                  </text>
                ) : null
              }
            />
            {data.map((_, i) => <Cell key={i} />)}
          </Bar>
          <Bar dataKey="keluar" name="Uang keluar" fill="hsl(var(--seri-keluar))" radius={[4, 4, 0, 0]} maxBarSize={26}>
            <LabelList
              dataKey="keluar" position="top" offset={6}
              content={({ x, y, width, value, index }) =>
                index === terakhir && value > 0 ? (
                  <text x={x + width / 2} y={y - 5} textAnchor="middle"
                    className="fill-foreground" style={{ fontSize: 10, fontWeight: 600 }}>
                    {rpSingkat(value)}
                  </text>
                ) : null
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
