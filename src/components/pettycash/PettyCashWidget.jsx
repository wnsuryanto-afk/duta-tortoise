import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Wallet } from "lucide-react";

export default function PettyCashWidget() {
  const { data: ledger = [] } = useQuery({
    queryKey: ["petty-cash-ledger"],
    queryFn: () => base44.entities.PettyCashLedger.list("-entry_date", 200),
    staleTime: 2 * 60 * 1000,
  });

  const saldo = ledger.length > 0 ? (ledger[0].balance_after || 0) : 0;
  const isNeg = saldo <= 0;

  return (
    <Link to="/petty-cash" className="block">
      <div className={`bg-card rounded-xl border p-4 hover:shadow-md transition-shadow ${isNeg ? "border-red-300" : "border-border"}`}>
        <div className="flex items-center gap-2 mb-1">
          <div className={`p-1.5 rounded-lg ${isNeg ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
            <Wallet className="w-4 h-4" />
          </div>
          <p className="text-xs text-muted-foreground">Kas Kecil</p>
        </div>
        <p className={`text-xl font-bold ${isNeg ? "text-red-600" : "text-green-700"}`}>
          Rp {Number(saldo).toLocaleString("id-ID")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">Saldo saat ini</p>
      </div>
    </Link>
  );
}