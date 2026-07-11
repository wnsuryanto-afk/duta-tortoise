/**
 * IncidentalTaskCard — kartu ringkasan Tugas Insidentil untuk dashboard owner/manajer/admin.
 * Menampilkan: [X] menunggu barang · [Y] belum dikerjakan · [Z] selesai hari ini.
 * Klik kartu → halaman daftar. Tombol "+ Beri Tugas" → buka form langsung.
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Pin, Plus } from "lucide-react";
import { format } from "date-fns";

export default function IncidentalTaskCard() {
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: tasks = [] } = useQuery({
    queryKey: ["incidental-tasks-all"],
    queryFn: () => base44.entities.IncidentalTask.list("-due_date", 300),
    staleTime: 60 * 1000,
  });

  const waitingMaterials = tasks.filter(
    (t) => t.status === "pending" && t.material_status === "waiting_materials"
  ).length;
  const belumDikerjakan = tasks.filter(
    (t) => t.status === "pending" && t.material_status !== "waiting_materials"
  ).length;
  const selesaiHariIni = tasks.filter(
    (t) => t.status === "done" && t.done_date === today
  ).length;
  const totalAktif = waitingMaterials + belumDikerjakan;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => navigate("/tugas-insidentil")}
          className="flex items-start gap-3 flex-1 min-w-0 text-left"
        >
          <span className="p-2 rounded-lg bg-orange-100 text-orange-700 flex-shrink-0">
            <Pin className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-orange-900">📌 Tugas Insidentil</p>
            <p className="text-xs text-orange-700 mt-0.5">
              {totalAktif > 0
                ? `${waitingMaterials} menunggu barang · ${belumDikerjakan} belum dikerjakan · ${selesaiHariIni} selesai hari ini`
                : `✓ Tidak ada tugas aktif · ${selesaiHariIni} selesai hari ini`}
            </p>
          </div>
        </button>
        <button
          onClick={() => navigate("/tugas-insidentil?buat=1")}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors flex-shrink-0 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" /> Beri Tugas
        </button>
      </div>
    </div>
  );
}