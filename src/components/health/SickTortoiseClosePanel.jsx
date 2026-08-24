/**
 * SickTortoiseClosePanel — panel di halaman Rekam Kesehatan untuk owner,
 * manajer, dan admin. Menampilkan kura yang masih berstatus sakit beserta
 * tombol "Tandai Sembuh" agar status sakit tidak menggantung berbulan-bulan.
 *
 * Menjalankan alur yang sama dengan tombol "✓ Sudah Sembuh" di layar keeper:
 * membuat catatan jenis "sembuh", mengembalikan is_currently_sick=false,
 * status kura menjadi "aktif", dan riwayat kesehatan tetap utuh.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Heart, CheckCircle2, AlertTriangle } from "lucide-react";

export default function SickTortoiseClosePanel({ user }) {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [sembuhLoading, setSembuhLoading] = useState(null);

  const { data: sickTortoises = [] } = useQuery({
    queryKey: ["sick-tortoises-close-panel"],
    queryFn: async () => {
      const sick = await base44.entities.Tortoise.filter({ is_currently_sick: true }, "name", 200);
      if (sick.length === 0) return [];
      const hrs = await base44.entities.HealthRecord.list("-date", 200);
      return sick.map((t) => {
        const last = hrs.find((h) => h.tortoise_id === t.id && h.type === "sakit");
        return {
          id: t.id,
          tortoise_id: t.id,
          tortoise_name: t.name,
          enclosure: t.enclosure,
          severity: last?.severity,
          since: last?.date,
          diagnosis_notes: last?.diagnosis_notes,
          treatment: last?.treatment,
          description: last?.description,
        };
      });
    },
    staleTime: 60 * 1000,
  });

  const handleLaporSembuh = async (t) => {
    if (sembuhLoading) return;
    setSembuhLoading(t.tortoise_id);
    try {
      await base44.entities.HealthRecord.create({
        tortoise_id: t.tortoise_id,
        tortoise_name: t.tortoise_name,
        date: today,
        type: "sembuh",
        source: "manual",
        description: `Ditandai sembuh oleh ${user?.full_name || user?.email || "pengelola"} dari halaman Rekam Kesehatan.`,
      });
      await base44.entities.Tortoise.update(t.tortoise_id, {
        is_currently_sick: false,
        status: "aktif",
        last_status_change: today,
      });
      qc.invalidateQueries({ queryKey: ["sick-tortoises-close-panel"] });
      qc.invalidateQueries({ queryKey: ["sick-tortoises-today"] });
      qc.invalidateQueries({ queryKey: ["health-records"] });
      qc.invalidateQueries({ queryKey: ["health-records-all"] });
    } catch (e) {
      alert("Gagal menyimpan: " + (e.message || e));
    }
    setSembuhLoading(null);
  };

  if (sickTortoises.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 space-y-3">
      <div className="flex items-center gap-2 font-bold text-red-700">
        <Heart className="w-5 h-5" />
        Kura Sedang Sakit ({sickTortoises.length})
      </div>
      <p className="text-xs text-red-600 -mt-1">
        Tandai sembuh untuk menghentikan tugas perawatan harian kura ybs.
      </p>
      {sickTortoises.map((h) => {
        const hari = h.since
          ? Math.max(0, Math.round((new Date(today) - new Date(h.since)) / 86400000))
          : null;
        return (
          <div key={h.id} className="p-3 bg-white rounded-xl border border-red-200 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-red-800">
                  {h.tortoise_name}
                  {h.enclosure ? <span className="font-normal text-red-500"> · {h.enclosure}</span> : null}
                </p>
                <p className="text-xs text-red-600">{h.diagnosis_notes || h.description || "Perlu diperiksa"}</p>
              </div>
              {h.severity && (
                <span className="flex-shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-red-100 text-red-700">
                  {h.severity}
                </span>
              )}
            </div>

            {h.treatment && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Perlakuan</p>
                <p className="text-xs text-amber-900 whitespace-pre-line">{h.treatment}</p>
              </div>
            )}

            {hari !== null && hari > 14 && (
              <div className="p-2.5 rounded-lg bg-amber-50 border-2 border-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-[11px] font-semibold text-amber-800 flex-1 leading-snug">
                  Sudah {hari} hari dalam perawatan — masih sakit atau lupa ditutup?
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {hari !== null && (
                <span className="text-[11px] text-red-500 flex-1">
                  {hari === 0 ? "Dilaporkan hari ini" : `Sudah ${hari} hari sakit`}
                </span>
              )}
              <button
                onClick={() => handleLaporSembuh(h)}
                disabled={sembuhLoading === h.tortoise_id}
                className="flex-shrink-0 text-xs font-bold text-white bg-green-600 px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {sembuhLoading === h.tortoise_id ? "Menyimpan…" : "✓ Tandai Sembuh"}
              </button>
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-red-500 flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> Catatan "sembuh" akan dibuat & status kura kembali aktif.
      </p>
    </div>
  );
}