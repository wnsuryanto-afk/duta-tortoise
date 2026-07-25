import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Wrench } from "lucide-react";

/** Kartu "🔧 Alat belum kembali" untuk RingkasanPagi. Hanya tampil jika >0. */
export default function ToolLoanWidget() {
  const { data: activeLoans = [] } = useQuery({
    queryKey: ["tool-loans-active"],
    queryFn: () => base44.entities.ToolLoan.filter({ status: "dipinjam" }, "-loan_date", 200),
    staleTime: 60 * 1000,
  });

  if (activeLoans.length === 0) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const over7 = activeLoans.filter((l) => {
    if (!l.loan_date) return false;
    const d = new Date(l.loan_date);
    if (isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    const days = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    return days > 7;
  }).length;

  return (
    <Link
      to="/alat-kerja"
      className={`block rounded-xl p-3 transition-colors ${
        over7 > 0 ? "bg-amber-50 border border-amber-300 hover:bg-amber-100" : "bg-card border border-border hover:shadow-md"
      }`}
    >
      <p className="text-sm font-bold flex items-center gap-1.5">
        <Wrench className="w-4 h-4" />
        🔧 Alat belum kembali: {activeLoans.length}
        {over7 > 0 && <span className="text-xs text-amber-600 font-semibold">({over7} {" >7 "}hari)</span>}
      </p>
    </Link>
  );
}