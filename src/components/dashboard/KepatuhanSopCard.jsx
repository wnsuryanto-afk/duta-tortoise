/**
 * KepatuhanSopCard — berapa persen tugas terjadwal yang benar-benar dikerjakan.
 *
 * Bentuknya sengaja angka utama + satu deret batang 14 hari, bukan grafik penuh:
 * pertanyaan yang dijawab kartu ini hanya dua — "hari ini bagaimana" dan
 * "membaik atau memburuk". Sumbu, kisi, dan legenda tidak menambah jawaban apa
 * pun untuk satu deret data, jadi tidak dipasang.
 *
 * Statusnya selalu diucapkan dengan kata ("Baik" / "Perlu perhatian" /
 * "Rendah"), tidak pernah hanya lewat warna.
 *
 * Angka kandang ditampilkan terpisah, tidak dilebur ke dalam persentase.
 * Alasannya ada di lib/kepatuhanSOP.js: melebur keduanya berarti menebak
 * pemetaan pencatatan yang belum tentu benar, dan satu angka rapi yang
 * separuhnya tebakan lebih berbahaya daripada dua angka jujur.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ListChecks } from "lucide-react";
import {
  kepatuhanBeberapaHari,
  rataRataPersen,
  statusKepatuhan,
} from "@/lib/kepatuhanSOP";

const NADA = {
  baik: "text-primary",
  sedang: "text-amber-600 dark:text-amber-400",
  buruk: "text-red-600 dark:text-red-400",
  netral: "text-muted-foreground",
};

export default function KepatuhanSopCard() {
  const { data: sopTasks = [] } = useQuery({
    queryKey: ["kepatuhan-sop-tasks"],
    queryFn: () => base44.entities.SOPTask.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["kepatuhan-logs"],
    queryFn: () => base44.entities.MaintenanceLog.list("-period_key", 900),
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

  const hari = useMemo(
    () => kepatuhanBeberapaHari(14, sopTasks, logs, jumlahKandang),
    [sopTasks, logs, jumlahKandang],
  );

  if (!sopTasks.length) return null;

  const hariIni = hari[hari.length - 1];
  const rata14 = rataRataPersen(hari);
  const rata7 = rataRataPersen(hari.slice(-7));
  const status = statusKepatuhan(hariIni?.persen);
  const arah =
    rata7 !== null && rata14 !== null
      ? rata7 > rata14 + 2
        ? "membaik"
        : rata7 < rata14 - 2
          ? "menurun"
          : "stabil"
      : null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-sm text-foreground">Kepatuhan SOP</h2>
        <span className="ml-auto text-xs text-muted-foreground">14 hari terakhir</span>
      </div>

      {/* Angka utama */}
      <div className="flex items-end gap-3 mb-1">
        <p className="text-3xl font-extrabold text-foreground leading-none tabular-nums">
          {hariIni?.persen === null || hariIni?.persen === undefined ? "–" : `${hariIni.persen}%`}
        </p>
        <div className="pb-0.5">
          <p className={`text-sm font-bold leading-tight ${NADA[status.nada]}`}>{status.label}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            {hariIni?.terjadwal
              ? `${hariIni.selesai} dari ${hariIni.terjadwal} tugas hari ini`
              : "tidak ada tugas terjadwal hari ini"}
          </p>
        </div>
      </div>

      {/* Deret 14 hari. Satu deret data, satu warna — batang paling kanan hari ini. */}
      <div className="flex items-end gap-[2px] h-12 mt-3" role="img"
           aria-label={`Kepatuhan SOP 14 hari terakhir, rata-rata ${rata14 ?? "belum ada"} persen`}>
        {hari.map((h) => {
          const tinggi = h.persen === null ? 0 : Math.max(4, (h.persen / 100) * 48);
          const iniHariIni = h.tanggal === hariIni?.tanggal;
          return (
            <div
              key={h.tanggal}
              className="flex-1 flex items-end"
              title={
                h.persen === null
                  ? `${h.tanggal}: tidak ada tugas terjadwal`
                  : `${h.tanggal}: ${h.persen}% (${h.selesai}/${h.terjadwal} tugas)`
              }
            >
              <div
                className={`w-full rounded-t ${
                  h.persen === null
                    ? "bg-muted"
                    : iniHariIni
                      ? "bg-primary"
                      : "bg-primary/45"
                }`}
                style={{ height: `${tinggi || 3}px` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-2 pt-2 border-t border-border">
        <p className="text-[11px] text-muted-foreground">
          Rata-rata 14 hari: <span className="text-foreground font-semibold tabular-nums">{rata14 ?? "–"}%</span>
          {arah && <> · 7 hari terakhir {arah}</>}
        </p>
        {hariIni?.kandangTotal > 0 && (
          <p className="text-[11px] text-muted-foreground tabular-nums">
            Kandang dibersihkan{" "}
            <span className="text-foreground font-semibold">
              {hariIni.kandangSelesai}/{hariIni.kandangTotal}
            </span>
          </p>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-2">
        Ukuran tim, bukan perorangan — sebagian besar tugas berskala bersama. Tugas yang bahannya
        sedang habis tidak dihitung sebagai kewajiban.
      </p>
    </div>
  );
}
