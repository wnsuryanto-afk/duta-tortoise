/**
 * Kartu dan penanda kecil untuk dashboard.
 *
 * Dipisahkan dari OwnerDashboard.jsx: semuanya komponen presentasi murni
 * tanpa state, dan bisa dipakai ulang oleh dashboard role lain tanpa
 * menyalin ulang gayanya.
 */
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown } from "lucide-react";

// Sengaja memakai formatter lokal, bukan formatCurrency dari
// @/lib/formatIndonesian: formatCurrency membulatkan ke rupiah penuh
// (1.234,56 menjadi 1.235), sedangkan badge tren selama ini menampilkan
// desimalnya. Menyeragamkannya adalah perubahan tampilan tersendiri.
const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export function TrendBadge({ value, suffix = "" }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">sama</span>;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? "+" : ""}{fmt(Math.abs(value))}{suffix} vs bln lalu
    </span>
  );
}

/**
 * Sparkline — garis tren 7 hari di bawah angka KPI.
 * Digambar langsung sebagai SVG, tanpa pustaka grafik: ukurannya kecil dan
 * jumlahnya banyak, jadi memuat recharts untuk ini justru memberatkan.
 * Angka tanpa arah tidak bisa dipakai memutuskan — ini yang memberi arahnya.
 */
export function Sparkline({ data = [], positiveIsGood = true }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const span = max - min || 1;
  const W = 56, H = 18;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / span) * (H - 3) - 1.5}`)
    .join(" ");
  const naik = data[data.length - 1] >= data[0];
  const baik = positiveIsGood ? naik : !naik;
  const warna = baik ? "#1d9e75" : "#d03b3b";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="flex-shrink-0">
      <polyline points={pts} fill="none" stroke={warna} strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({ icon: Icon, label, value, sub, color = "bg-primary/10 text-primary", href, spark }) {
  const inner = (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground mt-0.5 leading-tight">{value}</p>
      <div className="flex items-end justify-between gap-2 mt-1">
        {sub ? <div className="min-w-0">{sub}</div> : <span />}
        {spark}
      </div>
    </div>
  );
  if (href) return <Link to={href}>{inner}</Link>;
  return inner;
}

export function SectionTitle({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="w-4 h-4 text-primary" />}
      <h2 className="font-semibold text-sm text-foreground">{children}</h2>
    </div>
  );
}
