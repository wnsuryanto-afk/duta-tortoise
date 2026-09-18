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
 * ── DUA CACAT YANG KETAHUAN SAAT DILIHAT ───────────────────────────
 *
 * Versi pertama dirender lalu dipandang, dan dua hal langsung terlihat:
 *
 *   `preserveAspectRatio="none"` meregangkan SELURUH isi svg secara
 *   mendatar, termasuk hurufnya — "batas baik 90%" jadi melar dan garisnya
 *   menipis tidak rata. Atribut itu dibuang; lebar mengikuti kotak pandang
 *   secara wajar.
 *
 *   Label persen hari ini ditaruh di kanan titik terakhir, dan titik
 *   terakhir memang berada di tepi kanan — labelnya terpotong dan menabrak
 *   titiknya sendiri. Sekarang ia ditaruh DI ATAS titik dan ditarik masuk
 *   bila mepet tepi.
 */

import { AMBANG_BAIK } from "@/lib/kepatuhanSOP";

const LEBAR = 320;
const TINGGI = 96;
const PAD_ATAS = 18;     // ruang untuk label persen hari ini
const PAD_BAWAH = 16;    // ruang untuk keterangan tanggal
const PAD_KIRI = 5;
const PAD_KANAN = 7;
/*
 * Ambang TIDAK ditulis ulang di sini. Grafik dan kartu harus memakai lantai
 * target yang sama; dua konstanta 90 di dua berkas adalah cara paling mudah
 * untuk membuat grafik dan kartu bercerita beda setelah salah satunya diubah.
 */
const AMBANG = AMBANG_BAIK;

function y(persen) {
  const tinggiPlot = TINGGI - PAD_ATAS - PAD_BAWAH;
  return PAD_ATAS + (1 - Math.max(0, Math.min(100, persen)) / 100) * tinggiPlot;
}

export default function GrafikKepatuhan({ hari = [], label = "" }) {
  const lebarPlot = LEBAR - PAD_KIRI - PAD_KANAN;
  const titik = (hari || []).map((h, i) => ({
    ...h,
    x: hari.length > 1 ? PAD_KIRI + (i / (hari.length - 1)) * lebarPlot : LEBAR / 2,
  }));
  const berisi = titik.filter((t) => t.persen !== null && t.persen !== undefined);
  if (berisi.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-6 text-center">
        Belum ada tugas terjadwal pada rentang ini.
      </p>
    );
  }

  const garis = berisi
    .map((t, i) => `${i === 0 ? "M" : "L"}${t.x.toFixed(1)},${y(t.persen).toFixed(1)}`)
    .join(" ");
  const dasar = (TINGGI - PAD_BAWAH).toFixed(1);
  const area =
    `M${berisi[0].x.toFixed(1)},${dasar} ` +
    berisi.map((t) => `L${t.x.toFixed(1)},${y(t.persen).toFixed(1)}`).join(" ") +
    ` L${berisi[berisi.length - 1].x.toFixed(1)},${dasar} Z`;
  const akhir = berisi[berisi.length - 1];

  // Label hari ini ditarik masuk supaya tidak terpotong tepi kanan.
  const labelX = Math.min(Math.max(akhir.x, 16), LEBAR - 16);

  return (
    <svg
      viewBox={`0 0 ${LEBAR} ${TINGGI}`}
      className="w-full block"
      style={{ maxHeight: 110 }}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id="isiKepatuhan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.26" />
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
        strokeDasharray="3 4" opacity="0.45"
      />

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
          {t.tanggal !== akhir.tanggal && (
            <circle cx={t.x} cy={y(t.persen)} r="2.4" fill="hsl(var(--primary))" opacity="0.5" />
          )}
          <circle cx={t.x} cy={y(t.persen)} r="10" fill="transparent">
            <title>{`${t.tanggal}: ${t.persen}% (${t.selesai}/${t.terjadwal} tugas)`}</title>
          </circle>
        </g>
      ))}

      {/*
        * Titik terakhir = hari SELESAI terakhir, bukan hari ini.
        *
        * Hari berjalan sengaja tidak diplot: pada pukul 08.00 ia selalu 0%
        * dan grafiknya terbaca seperti tim yang ambruk semalam. Angka hari
        * ini tetap ada, di baris bawah kartu, dengan keterangan "sedang
        * berjalan" supaya tidak tertukar dengan hari yang gagal.
        */
      <circle cx={akhir.x} cy={y(akhir.persen)} r="5.5" fill="hsl(var(--card))" />
      <circle cx={akhir.x} cy={y(akhir.persen)} r="3.5" fill="hsl(var(--primary))" />
      <text
        x={labelX} y={Math.max(y(akhir.persen) - 9, 9)}
        fontSize="11" fontWeight="700" textAnchor="middle"
        fill="hsl(var(--foreground))"
      >
        {akhir.persen}%
      </text>

      {/* Keterangan ditaruh di baris bawah supaya tidak pernah menabrak garis. */}
      <text x="0" y={TINGGI - 4} fontSize="8.5" fill="hsl(var(--muted-foreground))">
        {titik[0]?.tanggal?.slice(5)}
      </text>
      <text
        x={LEBAR / 2} y={TINGGI - 4} fontSize="8.5" textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
      >
        {`garis putus = target ${AMBANG}%`}
      </text>
      <text
        x={LEBAR} y={TINGGI - 4} fontSize="8.5" textAnchor="end"
        fill="hsl(var(--muted-foreground))"
      >
        {akhir.tanggal?.slice(5)}
      </text>
    </svg>
  );
}
