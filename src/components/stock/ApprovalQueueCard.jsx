import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatRp } from "@/lib/skuUtils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState } from "react";

/**
 * Shows pending approval items; only for admin/owner.
 * user: current user object
 */
export default function ApprovalQueueCard({ user }) {
  const qc = useQueryClient();
  const [processing, setProcessing] = useState(null);

  const { data: pending = [] } = useQuery({
    queryKey: ["item-usage-pending"],
    queryFn: () => base44.entities.ItemUsage.filter({ status: "menunggu_approval" }),
    refetchInterval: 30000,
  });

  if (pending.length === 0) return null;

  const handleApprove = async (usage) => {
    setProcessing(usage.id);
    // Update stock
    const Entity = usage.item_type === "feedstock"
      ? base44.entities.FeedStock
      : base44.entities.WarehouseItem;

    const itemList = await Entity.filter({ id: usage.item_id });
    if (itemList[0]) {
      const newStock = Math.max(0, (itemList[0].current_stock || 0) - usage.quantity);
      await Entity.update(usage.item_id, { current_stock: newStock });
    }
    await base44.entities.ItemUsage.update(usage.id, {
      status: "disetujui",
      approved_by: user?.email || "",
      approved_at: new Date().toISOString(),
    });
    qc.invalidateQueries({ queryKey: ["item-usage-pending"] });
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    setProcessing(null);
  };

  const handleReject = async (usage, reason = "Ditolak oleh admin") => {
    setProcessing(usage.id);
    await base44.entities.ItemUsage.update(usage.id, {
      status: "ditolak",
      approved_by: user?.email || "",
      approved_at: new Date().toISOString(),
      rejected_reason: reason,
    });
    qc.invalidateQueries({ queryKey: ["item-usage-pending"] });
    setProcessing(null);
  };

  return (
    <Card className="border-orange-200 bg-orange-50/40">
      <div className="p-4 border-b border-orange-200 flex items-center gap-2">
        <Clock className="w-4 h-4 text-orange-600" />
        <h3 className="font-semibold text-sm text-orange-800">Menunggu Approval ({pending.length})</h3>
      </div>
      <div className="divide-y divide-orange-100">
        {pending.map((u) => (
          <div key={u.id} className="p-3 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{u.item_name}</p>
              <p className="text-xs text-muted-foreground">
                Keluar {u.quantity} {u.unit} · {formatRp(u.total_value)} · oleh {u.by_name || u.by_email}
              </p>
              {u.date && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(u.date), "d MMM yyyy", { locale: id })}
                </p>
              )}
              {u.notes && <p className="text-xs italic text-muted-foreground">{u.notes}</p>}
            </div>
            <Badge className="bg-orange-100 text-orange-700 text-xs border-orange-200">Menunggu</Badge>
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                disabled={processing === u.id}
                onClick={() => handleApprove(u)}>
                <CheckCircle2 className="w-3 h-3" /> Setujui
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-300 text-red-600"
                disabled={processing === u.id}
                onClick={() => handleReject(u)}>
                <XCircle className="w-3 h-3" /> Tolak
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}