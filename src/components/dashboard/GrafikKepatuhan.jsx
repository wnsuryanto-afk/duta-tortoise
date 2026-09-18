/**
 * GrafikKepatuhan — deret kepatuhan harian sebagai garis + area, bukan batang.
 *
 * ── KENAPA BUKAN BATANG ────────────────────────────────────────────
 *
 * Kepatuhan di peternakan ini bergerak di pita 85–100%. Pada skala 0–100,
 * empat belas batang setinggi itu terlihat sama persis — mata tidak bisa
 * membedakan 88 dari 97, padahal justru selisih itu yang ingin dilihat.
 *
 * Memendekkan sumbu supaya selisihnya terlihat adalah kebohongan visual:
 * batang yang dipotong pangkalnya membuat 97% terlihat dua kali lebih besar
 * dari 88%. Jadi sumbunya tetap 0–100, bentuknya yang diganti: garis dengan
 * area tipis membaca perubahan kecil jauh lebih baik daripada batang, dan
 * garis ambang 90% memberi mata tempat berpegang.
 *
 * Satu deret data, jadi satu warna dan tanpa legenda — judul kartu sudah
 * menyebut apa yang digambar.
 *
 * Titik hari ini ditebalkan dan diberi label langsung; sisanya tidak diberi
 * angka. Angka di setiap titik membuat grafik jadi tabel yang sulit dibaca.
 */

const LEBAR = 320;
const TINGGI = 84;
const PAD_ATAS = 10;
const PAD_BAWAH = 14;
const AMBANG = 90;

function y(persen) {
  const tinggiPlot = TINGGI - PAD_ATAS - PAD_BAWAH;
  return PAD_ATAS + (1 - Math.max(0, Math.min(100, persen)) / 100) * tinggiPlot;
}

export default function GrafikKepatuhan({ hari = [], label = "" }) {
  const titik = (hari || []).map((h, i) => ({
    ...h,
    x: hari.length > 1 ? (i / (hari.length - 1)) * (LEBAR - 8) + 4 : LEBAR / 2,
  }));
  const berisi = titik.filter((t) => t.persen !== null && t.persen !== undefined);
  if (berisi.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-6 text-center">
        Belum ada tugas terjadwal pada rentang ini.
      </p>
    );
  }

  const garis = berisi.map((t, i) => `${i === 0 ? "M" : "L"}${t.x.toFixed(1)},${y(t.persen).toFixed(1)}`).join(" ");
  const area =
    `M${berisi[0].x.toFixed(1)},${(TINGGI - PAD_BAWAH).toFixed(1)} ` +
    berisi.map((t) => `L${t.x.toFixed(1)},${y(t.persen).toFixed(1)}`).join(" ") +
    ` L${berisi[berisi.length - 1].x.toFixed(1)},${(TINGGI - PAD_BAWAH).toFixed(1)} Z`;
  const akhir = berisi[berisi.length - 1];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${LEBAR} ${TINGGI}`}
        className="w-full h-[84px] block"
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="isiKepatuhan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Garis dasar & ambang 90% — recessive, tugasnya hanya memberi acuan. */}
        <line
          x1="0" y1={TINGGI - PAD_BAWAH} x2={LEBAR} y2={TINGGI - PAD_BAWAH}
          stroke="hsl(var(--border))" strokeWidth="1"
        />
        <line
          x1="0" y1={y(AMBANG)} x2={LEBAR} y2={y(AMBANG)}
          stroke="hsl(var(--muted-foreground))" strokeWidth="1"
          strokeDasharray="3 4" opacity="0.5"
        />
        <text
          x="2" y={y(AMBANG) - 3}
          fontSize="8" fill="hsl(var(--muted-foreground))"
        >
          batas baik 90%
        </text>

        <path d={area} fill="url(#isiKepatuhan)" />
        <path
          d={garis} fill="none" stroke="hsl(var(--primary))"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />

        {/*
          * Sasaran sentuh dibuat lebih besar dari titiknya: lingkaran tembus
          * pandang radius 10 supaya jari di layar ponsel tetap mengenainya,
          * sementara titik yang terlihat tetap kecil.
          */}
        {berisi.map((t) => (
          <g key={t.tanggal}>
            <circle cx={t.x} cy={y(t.persen)} r="10" fill="transparent">
              <title>{`${t.tanggal}: ${t.persen}% (${t.selesai}/${t.terjadwal} tugas)`}</title>
            </circle>
            {t.tanggal === akhir.tanggal ? null : (
              <circle cx={t.x} cy={y(t.persen)} r="2.5" fill="hsl(var(--primary))" opacity="0.55" />
            )}
          </g>
        ))}

        {/* Hari ini: titik tebal + cincin permukaan supaya tidak melebur ke garis. */}
        <circle cx={akhir.x} cy={y(akhir.persen)} r="5.5" fill="hsl(var(--card))" />
        <circle cx={akhir.x} cy={y(akhir.persen)} r="4" fill="hsl(var(--primary))" />
        <text
          x={Math.min(akhir.x + 8, LEBAR - 26)}
          y={Math.max(y(akhir.persen) + 3, 10)}
          fontSize="10" fontWeight="700" fill="hsl(var(--foreground))"
        >
          {akhir.persen}%
        </text>

        <text x="2" y={TINGGI - 3} fontSize="8" fill="hsl(var(--muted-foreground))">
          {titik[0]?.tanggal?.slice(5)}
        </text>
        <text x={LEBAR - 2} y={TINGGI - 3} fontSize="8" textAnchor="end" fill="hsl(var(--muted-foreground))">
          hari ini
        </text>
      </svg>
    </div>
  );
}
