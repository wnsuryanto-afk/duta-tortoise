import { Link } from "react-router-dom";
import { Target } from "lucide-react";
import { rupiahSingkat } from "@/lib/rupiah";
import { kalimatSasaran } from "@/lib/targetTahunan";
import { useTargetTahunan } from "@/lib/useTargetTahunan";

/**
 * TargetTahunanRingkas — target tahun berjalan, di kepala beranda Owner.
 *
 * ── Ruang yang diisinya ─────────────────────────────────────────────────────
 *
 * Kolom kanan kepala beranda hanya berisi tombol "Laporan Lengkap" dan satu
 * ilustrasi kura setinggi 90px. Di bawah keduanya kosong sampai dasar kartu —
 * pada 11 Okt 2026 pemiliknya melingkari ruang itu dan bertanya apa yang
 * sebaiknya ditaruh di sana.
 *
 * Jawabannya bukan grafik baru. Targetnya SUDAH ADA di AnnualGoal sejak 21 Mei
 * 2026, hanya tergambar di baris 1332 dari 1579 — untuk melihat apakah
 * targetnya tercapai, pemiliknya harus menggulir melewati seluruh halaman.
 *
 * ── Kenapa ada penanda waktu di bilahnya ────────────────────────────────────
 *
 * Bilah kemajuan biasa berbohong dengan cara yang halus. Omzet 2026 ada di 21%
 * pada 11 Oktober; satu bilah yang terisi seperlima terbaca seperti "baru
 * mulai". Padahal 78% tahun sudah lewat.
 *
 * Garis tipis di posisi waktu itulah yang membuat selisihnya terlihat tanpa
 * membaca satu angka pun: isian jauh di kiri garis = tertinggal. Dengan itu
 * bilahnya menjawab "cukup cepat atau tidak", bukan sekadar "sudah berapa".
 *
 * Alasan ambang dan cara hitungnya ada di lib/targetTahunan.js; berkas ini
 * tidak menghitung apa pun sendiri.
 */

const NADA = {
  aman: { bilah: "bg-accent", teks: "text-accent" },
  waspada: { bilah: "bg-amber-500", teks: "text-amber-700 dark:text-amber-400" },
  tertinggal: { bilah: "bg-destructive", teks: "text-destructive" },
};

function Bilah({ label, s, persenWaktu, nilai, satuan, format }) {
  if (!s) return null;
  const nada = NADA[s.status] || NADA.waspada;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <span className={`text-[11px] font-bold tabular-nums ${nada.teks}`}>{s.persenAsli}%</span>
      </div>

      <div className="relative h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
        <div className={`absolute inset-y-0 left-0 rounded-full ${nada.bilah}`} style={{ width: `${s.persen}%` }} />
        {/*
          Penanda waktu digambar DI ATAS isian, bukan di belakangnya: saat
          isiannya sudah melewati garis, yang perlu terlihat justru bahwa ia
          melewatinya.
        */}
        <div
          className="absolute inset-y-0 w-px bg-foreground/45"
          style={{ left: `${Math.min(100, persenWaktu)}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-1">
        <span className="text-[10px] text-muted-foreground tabular-nums">{nilai}</span>
        <span className="text-[10px] text-muted-foreground">{kalimatSasaran(s, satuan, format)}</span>
      </div>
    </div>
  );
}

/**
 * Penggambarnya saja, tanpa kueri.
 *
 * Dipisah supaya `scripts/render/kasus.jsx` bisa menggambarnya dengan angka
 * sungguhan: komponen yang menarik datanya sendiri tergambar KOSONG di
 * penjaga lebar — tidak ada backend di sana — jadi ia akan lolos pemeriksaan
 * tanpa satu huruf pun pernah diukur.
 */
export function PanelTarget({ kemajuan: k }) {
  /*
    Tanpa target, panel ini TIDAK menggambar bilah nol — bilah kosong terbaca
    sebagai "belum tercapai" padahal yang benar adalah "belum ditetapkan".
    Yang ditawarkan tautan untuk menetapkannya.
  */
  if (!k) {
    return (
      <Link
        to="/#target-tahunan"
        className="block w-full md:w-52 rounded-xl border border-dashed border-border bg-card/60 p-3 text-left hover:border-primary/40 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Target className="w-3.5 h-3.5 text-primary" /> Target tahun ini
        </span>
        <span className="block text-[10px] text-muted-foreground mt-1">Belum ditetapkan — pasang di sini</span>
      </Link>
    );
  }

  return (
    <a
      href="#target-tahunan"
      className="block w-full md:w-52 rounded-xl border border-border bg-card/70 p-3 backdrop-blur-sm hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Target className="w-3.5 h-3.5 text-primary" /> Target {k.tahun}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{k.sisaHari} hari lagi</span>
      </div>

      <div className="mt-2.5 space-y-2.5">
        <Bilah
          label="Telur"
          s={k.telur}
          persenWaktu={k.persenWaktu}
          nilai={`${k.telur?.capai?.toLocaleString("id-ID")} / ${k.telur?.target?.toLocaleString("id-ID")}`}
          satuan=" telur"
        />
        <Bilah
          label="Omzet"
          s={k.omzet}
          persenWaktu={k.persenWaktu}
          nilai={`${rupiahSingkat(k.omzet?.capai)} / ${rupiahSingkat(k.omzet?.target)}`}
          satuan=""
          format={rupiahSingkat}
        />
      </div>

      {/* Garisnya perlu dijelaskan sekali; tanpa keterangan ia hanya goresan. */}
      <p className="text-[9px] text-muted-foreground mt-2 leading-tight">
        Garis tipis = posisi waktu ({k.persenWaktu}% tahun berjalan)
      </p>
    </a>
  );
}

/**
 * Yang dipasang di kepala beranda.
 *
 * Angkanya ditanyakan sendiri lewat useTargetTahunan, bukan dioper beranda:
 * daftar `breedings` dan `sales` milik beranda dipotong 50 baris dan tidak
 * menyaring data uji — alasan lengkapnya di lib/useTargetTahunan.js.
 */
export default function TargetTahunanRingkas({ hariIni }) {
  const { kemajuan, memuat } = useTargetTahunan(hariIni ? { hariIni } : undefined);

  // Selagi dimuat panel ini TIDAK menggambar apa pun: bilah nol yang muncul
  // sekejap lalu melompat ke 69% terbaca sebagai angka yang berubah sendiri.
  if (memuat) return null;

  return <PanelTarget kemajuan={kemajuan} />;
}
