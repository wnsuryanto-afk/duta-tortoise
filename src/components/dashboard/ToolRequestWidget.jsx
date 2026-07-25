import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Wrench } from "lucide-react";

/** Kartu "🛠️ Pengajuan alat menunggu" untuk RingkasanPagi. Hanya tampil jika >0. */
export default function ToolRequestWidget() {
  const { data: pending = [] } = useQuery({
    queryKey: ["tool-requests-pending"],
    queryFn: () => base44.entities.ToolRequest.filter({ status: "menunggu" }, "-request_date", 200),
    staleTime: 60 * 1000,
  });

  if (pending.length === 0) return null;

  return (
    <Link
      to="/alat-kerja"
      className="block bg-blue-50 border border-blue-300 rounded-xl p-3 hover:bg-blue-100 transition-colors"
    >
      <p className="text-sm font-bold flex items-center gap-1.5">
        <Wrench className="w-4 h-4" />
        🛠️ Pengajuan alat menunggu: {pending.length}
      </p>
    </Link>
  );
}