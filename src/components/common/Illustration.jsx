import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Ilustrasi SVG bawaan aplikasi.
 *
 * Digambar langsung sebagai SVG, bukan file gambar: ukurannya beberapa kilobyte,
 * tajam di layar mana pun, dan warnanya ikut token tema — jadi mode gelap tidak
 * meninggalkan kotak putih. Semuanya memakai `currentColor` atau variabel tema,
 * tidak ada warna yang ditulis mati.
 */

const SIZES = { sm: 72, md: 120, lg: 168, xl: 220 };

function Frame({ size = "md", className, children, viewBox = "0 0 160 120", label }) {
  const px = typeof size === "number" ? size : SIZES[size] || SIZES.md;
  return (
    <svg
      width={px}
      height={px * 0.75}
      viewBox={viewBox}
      fill="none"
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
      className={cn("select-none", className)}
    >
      {children}
    </svg>
  );
}

/* Tanah + semak — alas yang dipakai ulang oleh beberapa ilustrasi */
function Ground({ y = 96 }) {
  return (
    <>
      <ellipse cx="80" cy={y} rx="56" ry="7" fill="hsl(var(--muted-foreground))" opacity="0.14" />
      <path
        d={`M28 ${y - 2}c3-8 9-11 13-6 2-9 9-11 12-4 3-5 8-4 9 3z`}
        fill="hsl(var(--accent))"
        opacity="0.28"
      />
      <path
        d={`M112 ${y - 2}c-3-7-8-9-11-5-2-7-8-9-10-3-2-4-6-3-7 3z`}
        fill="hsl(var(--accent))"
        opacity="0.22"
      />
    </>
  );
}

/** Kura-kura — dipakai di layar kosong daftar kura & sambutan */
export function TortoiseArt({ size, className }) {
  const id = useId();
  return (
    <Frame size={size} className={className} label="Ilustrasi kura-kura">
      <defs>
        <linearGradient id={`shell-${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <Ground />
      {/* kaki */}
      <rect x="42" y="76" width="14" height="14" rx="6" fill="hsl(var(--chart-2))" opacity="0.85" />
      <rect x="98" y="76" width="14" height="14" rx="6" fill="hsl(var(--chart-2))" opacity="0.85" />
      {/* kepala */}
      <path d="M112 62c9-3 17 2 17 9s-8 11-17 8z" fill="hsl(var(--chart-2))" />
      <circle cx="123" cy="69" r="1.9" fill="hsl(var(--card))" />
      {/* tempurung */}
      <path d="M30 82c0-22 15-38 42-38s42 16 42 38z" fill={`url(#shell-${id})`} />
      <path d="M30 82h84a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6z" fill="hsl(var(--primary))" opacity="0.55" />
      {/* sisik */}
      <g stroke="hsl(var(--card))" strokeOpacity="0.45" strokeWidth="1.6" fill="none">
        <path d="M72 46v36M48 58c8 5 16 7 24 7s16-2 24-7M40 70c10 6 21 8 32 8s22-2 32-8" />
      </g>
      <circle cx="72" cy="62" r="9" fill="hsl(var(--card))" opacity="0.22" />
    </Frame>
  );
}

/** Telur di sarang — layar kosong breeding & inkubasi */
export function EggNestArt({ size, className }) {
  const id = useId();
  return (
    <Frame size={size} className={className} label="Ilustrasi telur di sarang">
      <defs>
        <linearGradient id={`egg-${id}`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>
      <Ground />
      <path
        d="M34 92c0-14 20-22 46-22s46 8 46 22z"
        fill="hsl(var(--chart-2))"
        opacity="0.3"
      />
      <ellipse cx="62" cy="72" rx="13" ry="17" fill={`url(#egg-${id})`} stroke="hsl(var(--border))" strokeWidth="1.5" />
      <ellipse cx="97" cy="74" rx="12" ry="16" fill={`url(#egg-${id})`} stroke="hsl(var(--border))" strokeWidth="1.5" />
      <ellipse cx="80" cy="58" rx="14" ry="18" fill={`url(#egg-${id})`} stroke="hsl(var(--accent))" strokeWidth="1.8" />
      <path d="M74 54c2-4 6-6 10-5" stroke="hsl(var(--card))" strokeWidth="2.5" strokeLinecap="round" />
      <g stroke="hsl(var(--chart-2))" strokeWidth="2" strokeLinecap="round" opacity="0.55">
        <path d="M38 88c10-5 20-7 26-6M122 90c-10-6-20-8-26-7" />
      </g>
    </Frame>
  );
}

/** Kotak kosong — layar kosong daftar/tabel umum */
export function EmptyBoxArt({ size, className }) {
  return (
    <Frame size={size} className={className} label="Ilustrasi data kosong">
      <Ground />
      <path d="M44 60h72l-8 32H52z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.6" />
      <path d="M38 50h84l-6 12H44z" fill="hsl(var(--secondary))" stroke="hsl(var(--border))" strokeWidth="1.6" />
      <path d="M70 62h20v6H70z" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <g stroke="hsl(var(--accent))" strokeWidth="2" strokeLinecap="round" opacity="0.5">
        <path d="M80 34v-9M62 40l-6-7M98 40l6-7" />
      </g>
    </Frame>
  );
}

/** Grafik naik — layar kosong laporan & analitik */
export function ChartArt({ size, className }) {
  const id = useId();
  return (
    <Frame size={size} className={className} label="Ilustrasi grafik">
      <defs>
        <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.4" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="26" y="24" width="108" height="72" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.6" />
      <g stroke="hsl(var(--border))" strokeWidth="1" opacity="0.7">
        <path d="M26 48h108M26 66h108M26 84h108" />
      </g>
      <path d="M36 82l20-14 18 8 22-22 20 10v22H36z" fill={`url(#area-${id})`} />
      <path d="M36 82l20-14 18 8 22-22 20 10" stroke="hsl(var(--accent))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="116" cy="64" r="3.4" fill="hsl(var(--accent))" />
      <rect x="36" y="32" width="30" height="5" rx="2.5" fill="hsl(var(--muted-foreground))" opacity="0.25" />
    </Frame>
  );
}

/** Kotak obat — layar kosong kesehatan */
export function HealthArt({ size, className }) {
  return (
    <Frame size={size} className={className} label="Ilustrasi kesehatan">
      <Ground />
      <rect x="46" y="46" width="68" height="46" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.8" />
      <rect x="46" y="46" width="68" height="12" rx="6" fill="hsl(var(--destructive))" opacity="0.18" />
      <path d="M74 66h12v6h8v12h-8v6H74v-6h-8V72h8z" fill="hsl(var(--destructive))" opacity="0.7" />
      <circle cx="118" cy="44" r="11" fill="hsl(var(--accent))" opacity="0.18" />
      <circle cx="44" cy="38" r="7" fill="hsl(var(--chart-4))" opacity="0.2" />
    </Frame>
  );
}

/** Rak gudang — layar kosong stok & gudang */
export function WarehouseArt({ size, className }) {
  return (
    <Frame size={size} className={className} label="Ilustrasi gudang">
      <Ground />
      <g stroke="hsl(var(--border))" strokeWidth="1.8" fill="hsl(var(--card))">
        <rect x="34" y="40" width="92" height="52" rx="8" />
      </g>
      <path d="M34 60h92M34 76h92" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <rect x="42" y="44" width="18" height="14" rx="3" fill="hsl(var(--accent))" opacity="0.45" />
      <rect x="64" y="46" width="14" height="12" rx="3" fill="hsl(var(--chart-2))" opacity="0.45" />
      <rect x="42" y="62" width="14" height="12" rx="3" fill="hsl(var(--chart-4))" opacity="0.4" />
      <rect x="60" y="62" width="22" height="12" rx="3" fill="hsl(var(--chart-5))" opacity="0.4" />
      <rect x="96" y="78" width="22" height="12" rx="3" fill="hsl(var(--primary))" opacity="0.3" />
    </Frame>
  );
}

/** Tim — layar kosong SDM & karyawan */
export function TeamArt({ size, className }) {
  return (
    <Frame size={size} className={className} label="Ilustrasi tim">
      <Ground />
      <g opacity="0.55">
        <circle cx="52" cy="54" r="12" fill="hsl(var(--chart-2))" />
        <path d="M32 92c0-12 9-20 20-20s20 8 20 20z" fill="hsl(var(--chart-2))" />
      </g>
      <g opacity="0.55">
        <circle cx="110" cy="54" r="12" fill="hsl(var(--chart-4))" />
        <path d="M90 92c0-12 9-20 20-20s20 8 20 20z" fill="hsl(var(--chart-4))" />
      </g>
      <circle cx="81" cy="46" r="15" fill="hsl(var(--primary))" />
      <path d="M56 92c0-14 11-24 25-24s25 10 25 24z" fill="hsl(var(--primary))" />
    </Frame>
  );
}

/** Dompet — layar kosong keuangan & penjualan */
export function WalletArt({ size, className }) {
  return (
    <Frame size={size} className={className} label="Ilustrasi keuangan">
      <Ground />
      <rect x="34" y="46" width="92" height="48" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.8" />
      <path d="M34 60h92v14H34z" fill="hsl(var(--primary))" opacity="0.12" />
      <rect x="94" y="62" width="32" height="16" rx="8" fill="hsl(var(--accent))" opacity="0.3" />
      <circle cx="110" cy="70" r="4" fill="hsl(var(--accent))" />
      <path d="M48 46l40-16 22 16z" fill="hsl(var(--chart-5))" opacity="0.35" />
    </Frame>
  );
}

/** Pola daun samar — latar belakang header, bukan objek utama */
export function LeafPattern({ className }) {
  const id = useId();
  return (
    <svg
      className={cn("absolute inset-0 w-full h-full pointer-events-none", className)}
      aria-hidden="true"
    >
      <defs>
        <pattern id={`leaf-${id}`} width="52" height="52" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
          <path
            d="M14 26c0-8 6-14 14-14 0 8-6 14-14 14zM32 40c0-6 5-11 11-11 0 6-5 11-11 11z"
            fill="currentColor"
            opacity="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#leaf-${id})`} />
    </svg>
  );
}

const ART = {
  tortoise: TortoiseArt,
  breeding: EggNestArt,
  egg: EggNestArt,
  empty: EmptyBoxArt,
  chart: ChartArt,
  report: ChartArt,
  health: HealthArt,
  warehouse: WarehouseArt,
  stock: WarehouseArt,
  team: TeamArt,
  employee: TeamArt,
  wallet: WalletArt,
  sale: WalletArt,
  finance: WalletArt,
};

/** Pemilih ilustrasi lewat nama, agar pemanggil tidak perlu impor satu-satu */
export default function Illustration({ name = "empty", size = "md", className }) {
  const Art = ART[name] || EmptyBoxArt;
  return <Art size={size} className={className} />;
}
