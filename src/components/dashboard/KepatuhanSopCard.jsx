/**
 * KepatuhanSopCard — berapa persen tugas terjadwal yang benar-benar dikerjakan.
 *
 * ── APA YANG DIPIMPIN KARTU INI (diubah 18-09-2026) ────────────────
 *
 * Dulu angka besarnya adalah kepatuhan HARI INI. Itu angka yang paling
 * gelisah: satu tugas tertinggal pada hari dengan sedikit jadwal bisa
 * menjatuhkannya belasan persen, lalu naik lagi besok tanpa ada yang
 * berubah pada cara kerja tim. Angka yang melompat-lompat tidak bisa
 * dipakai memutuskan apa pun.
 *
 * Sekarang yang dipimpin adalah RATA-RATA 14 HARI, dan hari ini turun jadi
 * keterangan. Rata-rata bergerak pelan; kalau ia turun, memang ada yang
 * berubah.
 *
 * Bentuknya: satu angka pahlawan + satu grafik garis, tidak lebih. Kartu ini
 * hanya menjawab dua pertanyaan — "seberapa patuh kita" dan "membaik atau
 * memburuk". Sumbu, kisi, dan legenda tidak menambah jawaban apa pun untuk
 * satu deret data, jadi tidak dipasang.
 *
 * Statusnya selalu diucapkan dengan kata DAN ikon ("Baik" / "Perlu
 * perhatian" / "Rendah"), tidak pernah hanya lewat warna.
 *
 * Angka kandang ditampilkan terpisah, tidak dilebur ke dalam persentase.
 * Alasannya ada di lib/kepatuhanSOP.js: melebur keduanya berarti menebak
 * pemetaan pencatatan yang belum tentu benar, dan satu angka rapi yang
 * separuhnya tebakan lebih berbahaya daripada dua angka jujur.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { base44 } from "@/api/base44Client";
import { ListChecks, CheckCircle2, AlertTriangle, AlertCircle, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { kandangWajib } from "@/lib/kandang";
import GrafikKepatuhan from "@/components/dashboard/GrafikKepatuhan";
import {
  kepatuhanBeberapaHari,
  rataRataPersen,
  statusKepatuhan,
  hariSelesai,
  AMBANG_BAIK,
} from "@/lib/kepatuhanSOP";

/*
 * Warna status TIDAK pernah sendirian: tiap nada membawa ikonnya sendiri.
 * Pada layar di bawah matahari — dan bagi mata yang sulit membedakan merah
 * dan hijau — warna saja tidak sampai.
 */
const NADA = {
  baik:   { teks: "text-primary",                          Ikon: CheckCircle2 },
  sedang: { teks: "text-amber-600 dark:text-amber-400",    Ikon: AlertTriangle },
  buruk:  { teks: "text-red-600 dark:text-red-400",        Ikon: AlertCircle },
  netral: { teks: "text-muted-foreground",                 Ikon: Minus },
};

const ARAH = {
  membaik: { teks: "text-primary",                       Ikon: TrendingUp,   label: "membaik" },
  menurun: { teks: "text-amber-600 dark:text-amber-400", Ikon: TrendingDown, label: "menurun" },
  stabil:  { teks: "text-muted-foreground",              Ikon: Minus,        label: "stabil" },
};

export default function KepatuhanSopCard() {
  const { data: sopTasks = [] } = useQuery({
    queryKey: ["kepatuhan-sop-tasks"],
    queryFn: () => base44.entities.SOPTask.list(),
    staleTime: 10 * 60 * 1000,
  });

  // Kartu ini hanya butuh 14 hari terakhir, tapi dulu mengambil 900 baris
  // TERBARU dari seluruh log dan berharap 900 itu menutupi 14 hari.
  // MaintenanceLog sudah lewat 2.000 baris: kalau sehari menghasilkan lebih
  // dari 64 log, jendela 900 tidak sampai 14 hari dan titik paling kiri
  // diam-diam kosong — terbaca sebagai "kepatuhan turun", padahal datanya
  // yang tidak terambil. Sekarang jendelanya ditentukan tanggal, di server:
  // lebih benar sekaligus lebih ringan.
  const awalJendela = useMemo(
    () => format(subDays(new Date(), 15), "yyyy-MM-dd"),
    [],
  );
  const { data: logs = [] } = useQuery({
    queryKey: ["kepatuhan-logs", awalJendela],
    queryFn: () =>
      base44.entities.MaintenanceLog.filter(
        { period_key: { $gte: awalJendela } },
        "-period_key",
      ),
    staleTime: 5 * 60 * 1000,
  });

  const { data: enclosures = [] } = useQuery({
    queryKey: ["kepatuhan-enclosures"],
    queryFn: () => base44.entities.Enclosure.list("name", 100),
    staleTime: 30 * 60 * 1000,
  });

  // Penyebut = kandang yang memang ditugaskan ke kiper (KANDANG_LIST) dan
  // sedang berisi kura. Memakai jumlah baris Enclosure salah: di sana ada
  // Bonsai 1-4 dan Baby 1-3 yang bukan kandang kebersihan harian.
  const jumlahKandang = useMemo(
    () => kandangWajib(enclosures).length,
    [enclosures],
  );

  /*
   * 15 hari diambil supaya SETELAH hari berjalan dibuang masih tersisa 14
   * hari penuh. Kalau yang diambil 14, rata-ratanya diam-diam jadi 13 hari
   * sementara judul kartu tetap berkata 14 — angka yang tidak sesuai
   * labelnya adalah cara paling halus untuk berbohong.
   */
  const hari = useMemo(
    () => kepatuhanBeberapaHari(15, sopTasks, logs, jumlahKandang),
    [sopTasks, logs, jumlahKandang],
  );

  if (!sopTasks.length) return null;

  const hariIni = hari[hari.length - 1];
  const selesai = hariSelesai(hari);
  const rata14 = rataRataPersen(selesai);
  const rata7 = rataRataPersen(selesai.slice(-7));
  const status = statusKepatuhan(rata14);
  const { Ikon } = NADA[status.nada];
  const arahKode =
    rata7 !== null && rata14 !== null
      ? rata7 > rata14 + 2 ? "membaik" : rata7 < rata14 - 2 ? "menurun" : "stabil"
      : null;
  const arah = arahKode ? ARAH[arahKode] : null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-sm text-foreground">Kepatuhan SOP</h2>
        <span className="ml-auto text-xs text-muted-foreground">14 hari terakhir</span>
      </div>

      {/*
        * Angka pahlawan: rata-rata, bukan hari ini.
        *
        * Sengaja TANPA tabular-nums — angka sebesar ini memakai lebar digit
        * apa adanya; tabular membuat "94" tampak renggang pada ukuran besar.
        * tabular-nums disimpan untuk kolom angka yang harus lurus ke bawah.
        */}
      <div className="flex items-end gap-3">
        <p className="text-5xl font-extrabold text-foreground leading-none">
          {rata14 === null ? "–" : `${rata14}%`}
        </p>
        <div className="pb-1 min-w-0">
          <p className={`text-sm font-bold leading-tight flex items-center gap-1 ${NADA[status.nada].teks}`}>
            <Ikon className="w-4 h-4 flex-shrink-0" />
            {status.label}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            rata-rata 14 hari · target {AMBANG_BAIK}%
          </p>
        </div>
      </div>

      {arah && (
        <p className={`text-xs mt-1.5 flex items-center gap-1 ${arah.teks}`}>
          <arah.Ikon className="w-3.5 h-3.5 flex-shrink-0" />
          7 hari terakhir {arah.label}
          <span className="text-muted-foreground">· {rata7}%</span>
        </p>
      )}

      <div className="mt-3">
        <GrafikKepatuhan
          hari={selesai}
          label={`Kepatuhan SOP harian 14 hari selesai terakhir, rata-rata ${rata14 ?? "belum ada"} persen, target ${AMBANG_BAIK} persen`}
        />
      </div>

      {/* Angka harian turun ke sini: penting, tapi bukan yang dipimpin. */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
        <div>
          <p className="text-[11px] text-muted-foreground">Hari ini (berjalan)</p>
          <p className="text-sm font-semibold text-foreground tabular-nums">
            {hariIni?.persen === null || hariIni?.persen === undefined
              ? "tidak ada tugas"
              : `${hariIni.persen}%`}
            {hariIni?.terjadwal ? (
              <span className="font-normal text-muted-foreground">
                {" "}· {hariIni.selesai}/{hariIni.terjadwal} tugas
              </span>
            ) : null}
          </p>
        </div>
        {hariIni?.kandangTotal > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground">Kandang dibersihkan</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {hariIni.kandangSelesai}/{hariIni.kandangTotal}
            </p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-2">
        Ukuran tim, bukan perorangan — sebagian besar tugas berskala bersama. Rata-rata hanya
        menghitung hari yang sudah selesai. Tugas yang bahannya sedang habis, dan tugas wadah
        yang isinya berubah tiap hari seperti rotasi timbang, tidak dihitung sebagai kewajiban.
      </p>
    </div>
  );
}
