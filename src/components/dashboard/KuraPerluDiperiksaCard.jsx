/**
 * KuraPerluDiperiksaCard — kura yang sistem minta dilihat langsung.
 *
 * Menggabungkan dua sinyal yang selama ini tidak pernah sampai ke satu layar:
 *
 *   1. Temuan dari foto (PhotoFinding berstatus aktif) — hasil pembacaan AI
 *      atas foto bukti kerja yang memang sudah diunggah tiap hari. Ini BUKAN
 *      diagnosis; ia hanya menunjuk foto yang perlu dilihat manusia.
 *   2. Kura yang PERLU ditimbang hari ini, menurut aturan pemicu di
 *      lib/jadwalTimbang.js: dilaporkan tidak makan, sedang diobati dengan
 *      berat sudah basi, atau baby/juvenile yang jatuh tempo rutin.
 *
 * ── KENAPA BUKAN LAGI "BELUM DITIMBANG 30 HARI" (17-09-2026) ───────
 *
 * Kartu ini dulu menghitung setiap kura yang tidak ditimbang lebih dari 30
 * hari. Dengan rotasi dihentikan, angka itu akan berisi 44 kura dewasa yang
 * memang TIDAK AKAN ditimbang — sehat, makan, tidak ada alasan. Kartu yang
 * menyuruh mengerjakan sesuatu yang memang tidak perlu dikerjakan akan
 * berhenti dibaca, dan temuan foto di kartu yang sama ikut berhenti dibaca.
 *
 * Yang dihitung sekarang hanya yang benar-benar ada tugasnya hari ini.
 *
 * Kartu menghilang sendiri saat tidak ada satu pun yang perlu diperiksa.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Stethoscope, Camera, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { diPeternakan } from "@/lib/populasiKura";
import { perluDitimbang } from "@/lib/jadwalTimbang";
import { ambilLaporanMakan, hariIniWIB } from "@/lib/laporMakan";

export default function KuraPerluDiperiksaCard() {
  const { data: temuan = [] } = useQuery({
    queryKey: ["temuan-foto-aktif"],
    queryFn: () => base44.entities.PhotoFinding.filter({ status: "active", category: "kesehatan_kura" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-timbang"],
    queryFn: () => base44.entities.Tortoise.list("name", 2000),
    staleTime: 10 * 60 * 1000,
  });

  const { data: laporanMakan = [] } = useQuery({
    queryKey: ["laporan-makan"],
    queryFn: ambilLaporanMakan,
    staleTime: 5 * 60 * 1000,
  });

  const perluTimbang = useMemo(
    () => perluDitimbang((tortoises || []).filter(diPeternakan), laporanMakan, hariIniWIB()),
    [tortoises, laporanMakan],
  );

  if (temuan.length === 0 && perluTimbang.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Stethoscope className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-sm text-foreground">Kura yang Perlu Diperiksa</h2>
      </div>

      {temuan.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Camera className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <p className="text-xs font-semibold text-foreground">
              {temuan.length} temuan dari foto rutin
            </p>
            <Link to="/temuan-foto" className="ml-auto text-xs text-primary hover:underline">
              Lihat →
            </Link>
          </div>
          <div className="space-y-1.5">
            {temuan.slice(0, 4).map((f) => (
              <div
                key={f.id}
                className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900"
              >
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
                  <span className="font-semibold">{f.tortoise_code || f.enclosure || f.task_title}</span>
                  {" — "}
                  {f.finding_text}
                </p>
              </div>
            ))}
            {temuan.length > 4 && (
              <p className="text-xs text-muted-foreground">dan {temuan.length - 4} lainnya</p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Hasil pembacaan AI atas foto kerja, bukan diagnosis. Perlu dilihat langsung.
          </p>
        </div>
      )}

      {perluTimbang.length > 0 && (
        <div className={temuan.length > 0 ? "pt-3 border-t border-border" : ""}>
          <div className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{perluTimbang.length} kura</span> perlu
              ditimbang hari ini
            </p>
            <Link to="/tortoise" className="ml-auto text-xs text-primary hover:underline">
              Daftar →
            </Link>
          </div>
          {/* Alasannya disebut, bukan hanya jumlahnya: itu yang membedakan
              tugas yang dikerjakan dari angka yang dilewati. */}
          <div className="mt-1.5 space-y-0.5">
            {perluTimbang.slice(0, 3).map((d) => (
              <p key={d.kura.id} className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{d.kura.code || d.kura.name}</span>
                {" — "}{d.teks}
              </p>
            ))}
            {perluTimbang.length > 3 && (
              <p className="text-[11px] text-muted-foreground">
                +{perluTimbang.length - 3} lagi
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
