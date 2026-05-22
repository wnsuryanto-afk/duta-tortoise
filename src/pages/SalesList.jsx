import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import SaleForm from "@/components/sales/SaleForm";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, getPerms } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import IncompleteBadge from "@/components/common/IncompleteBadge";
import { getMissingFields } from "@/lib/incompleteChecks";
import PageTooltip from "@/components/tutorial/PageTooltip";

const paymentColors = {
  lunas: "bg-primary/10 text-primary",
  dp: "bg-accent/10 text-accent",
  belum_bayar: "bg-destructive/10 text-destructive",
};

const paymentLabels = { lunas: "Lunas", dp: "DP", belum_bayar: "Belum Bayar" };
const shippingLabels = { ambil_sendiri: "Ambil Sendiri", kirim_kurir: "Kurir", cargo: "Cargo" };

export default function SalesList() {
  const queryClient = useQueryClient();
  const { role } = useCurrentUser();
  const perms = getPerms(role, "sales");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 200),
  });

  if (!canAccess(role, "sales")) return <AccessDenied />;

  const totalRevenue = sales.reduce((sum, s) => sum + (s.price || 0), 0);

  const handleDelete = async (sale) => {
    if (confirm("Hapus data penjualan ini?")) {
      await base44.entities.Sale.delete(sale.id);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-heading font-bold">Penjualan</h1>
            <PageTooltip page="sales" />
          </div>
          <p className="text-muted-foreground mt-1">
            Total: Rp {totalRevenue.toLocaleString("id-ID")} dari {sales.length} transaksi
          </p>
        </div>

        {perms.canCreate && (
          <Button onClick={() => { setEditData(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Penjualan
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : sales.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">Belum ada data penjualan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map((s) => (
            <Card key={s.id} className="p-4 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="text-center flex-shrink-0 w-14">
                    <p className="text-2xl font-heading font-bold">{s.sale_date ? format(new Date(s.sale_date), "d") : "-"}</p>
                    <p className="text-[11px] text-muted-foreground uppercase">{s.sale_date ? format(new Date(s.sale_date), "MMM yy", { locale: id }) : ""}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{s.tortoise_name}</h3>
                      <Badge className={`text-[11px] ${paymentColors[s.payment_status] || ""}`}>
                        {paymentLabels[s.payment_status] || s.payment_status}
                      </Badge>
                      <IncompleteBadge missingFields={getMissingFields("sale", s)} onEdit={perms.canEdit ? () => { setEditData(s); setShowForm(true); } : undefined} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.buyer_name} {s.buyer_phone ? `• ${s.buyer_phone}` : ""}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{shippingLabels[s.shipping_method] || s.shipping_method}</span>
                      {s.buyer_address && <span className="truncate max-w-[200px]">📍 {s.buyer_address}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-primary">Rp {s.price?.toLocaleString("id-ID")}</p>
                    {s.hpp > 0 && (
                      <p className={`text-xs font-medium ${(s.price - s.hpp) >= 0 ? "text-green-600" : "text-destructive"}`}>
                        Profit: Rp {(s.price - s.hpp).toLocaleString("id-ID")}
                      </p>
                    )}
                  </div>
                </div>
                {(perms.canEdit || perms.canDelete) && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {perms.canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditData(s); setShowForm(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {perms.canDelete && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(s)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <SaleForm open={showForm} onClose={() => setShowForm(false)} editData={editData} />
      )}
    </div>
  );
}