import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Grafik mungil untuk disisipkan di dalam kartu KPI.
 *
 * Digambar sebagai SVG mentah, bukan lewat recharts: ukurannya kecil dan
 * jumlahnya banyak dalam satu layar, jadi memuat pustaka grafik penuh untuk
 * tiap kartu justru memberatkan halaman.
 */

const GOOD = "hsl(var(--accent))";
const BAD = "hsl(var(--destructive))";
const NEUTRAL = "hsl(var(--muted-foreground))";

function pickColor(data, positiveIsGood) {
  if (positiveIsGood === null) return NEUTRAL;
  const naik = data[data.length - 1] >= data[0];
  return (positiveIsGood ? naik : !naik) ? GOOD : BAD;
}

/**
 * Sparkline — garis tren dengan area bergradien di bawahnya.
 * Angka tanpa arah tidak bisa dipakai memutuskan; ini yang memberi arahnya.
 */
export function Sparkline({
  data = [],
  positiveIsGood = true,
  width = 64,
  height = 22,
  showDot = true,
  color,
  className,
}) {
  const gid = useId();
  if (!data || data.length < 2) return null;

  const nums = data.map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0));
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const span = max - min || 1;
  const pad = 2;
  const stroke = color || pickColor(nums, positiveIsGood);

  const x = (i) => (i / (nums.length - 1)) * (width - pad * 2) + pad;
  const y = (v) => height - pad - ((v - min) / span) * (height - pad * 2);

  const line = nums.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${pad},${height} ${line} ${width - pad},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={cn("flex-shrink-0 overflow-visible", className)}
    >
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#spark-${gid})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDot && (
        <circle
          cx={x(nums.length - 1)}
          cy={y(nums[nums.length - 1])}
          r="2.2"
          fill={stroke}
        />
      )}
    </svg>
  );
}

/**
 * MiniBars — deret batang kecil. Lebih terbaca dari garis untuk data
 * harian yang sering nol (mis. jumlah penjualan per hari).
 */
export function MiniBars({
  data = [],
  positiveIsGood = true,
  width = 64,
  height = 22,
  color,
  labels = [],
  className,
}) {
  if (!data || data.length === 0) return null;
  const nums = data.map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0));
  const max = Math.max(...nums, 1);
  const gap = 1.5;
  const barW = (width - gap * (nums.length - 1)) / nums.length;
  const fill = color || pickColor(nums, positiveIsGood);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("flex-shrink-0", className)}
      role="img"
      aria-label={labels.length ? labels.join(", ") : undefined}
    >
      {nums.map((v, i) => {
        const h = Math.max(1.5, (v / max) * height);
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={height - h}
            width={barW}
            height={h}
            rx={Math.min(1.5, barW / 2)}
            fill={fill}
            opacity={i === nums.length - 1 ? 1 : 0.42}
          >
            {labels[i] && <title>{labels[i]}</title>}
          </rect>
        );
      })}
    </svg>
  );
}

export default Sparkline;
