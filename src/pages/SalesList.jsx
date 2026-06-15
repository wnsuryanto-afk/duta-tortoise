import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import ExportButton from "@/components/common/ExportButton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, DollarSign, Printer, CreditCard } from "lucide-react";
import ExcludeToggle from "@/components/owner/ExcludeToggle";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import SaleForm from "@/components/sales/SaleForm";
import SalePrintModal from "@/components/sales/SalePrintModal";
import PaymentProofsSection from "@/components/sales/PaymentProofsSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, getPerms, canDelete as canDeleteGlobal } from "@/lib/permissions";
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
  const { user, role } = useCurrentUser();
  const isOwner = role === "owner";
  const perms = getPerms(role, "sales");
  const ownerCanDelete = canDeleteGlobal(role);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [printSale, setPrintSale] = useState(null);
  const [proofSale, setProofSale] = useState(null);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 200),
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-for-sale"],
    queryFn: () => base44.entities.Tortoise.list("name", 500),
  });

  if (!canAccess(role, "sales")) return <AccessDenied />;

  const totalRevenue = sales.filter(s => !s.excluded_from_reports).reduce((sum, s) => sum + (s.price || 0), 0);

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

        <div className="flex gap-2 flex-wrap">
          <ExportButton
            data={sales}
            filename={`penjualan-${new Date().toISOString().split("T")[0]}`}
            title="Data Penjualan"
            columns={[
              {key:"sale_date",label:"Tgl"},{key:"tortoise_name",label:"Kura-kura"},
              {key:"buyer_name",label:"Pembeli"},{key:"hp_whatsapp",label:"HP/WA"},
              {key:"price",label:"Harga"},{key:"payment_status",label:"Pembayaran"},
              {key:"shipping_method",label:"Pengiriman"},{key:"platform",label:"Platform"},
            ]}
          />
          {perms.canCreate && (
            <Button onClick={() => { setEditData(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Penjualan
            </Button>
          )}
        </div>
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
            <Card key={s.id} className={`p-4 hover:shadow-md transition-shadow group ${s.excluded_from_reports ? "opacity-60 border-dashed" : ""}`}>
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
                      {s.buyer_name} {(s.hp_whatsapp || s.buyer_phone) ? `• ${s.hp_whatsapp || s.buyer_phone}` : ""}
                    </p>
                    {/* DP progress bar */}
                    {s.payment_status === "dp" && s.price > 0 && (
                      <div className="mt-2">
                        {(() => {
                          const paid = s.total_paid || s.dp_amount || 0;
                          const pct = Math.min(100, Math.round((paid / s.price) * 100));
                          return (
                            <div>
                              <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                                <span>{pct}% lunas (Rp {paid.toLocaleString("id-ID")} dari Rp {s.price.toLocaleString("id-ID")})</span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
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
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {isOwner && (
                    <ExcludeToggle record={s} entityName="Sale" queryKey={["sales"]} />
                  )}
                  {perms.canEdit && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Bukti Bayar" onClick={() => setProofSale(s)}>
                      <CreditCard className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Cetak" onClick={() => setPrintSale(s)}>
                    <Printer className="w-3.5 h-3.5" />
                  </Button>
                  {perms.canEdit && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditData(s); setShowForm(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {ownerCanDelete && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(s)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <SaleForm open={showForm} onClose={() => setShowForm(false)} editData={editData} />
      )}

      <SalePrintModal
        open={!!printSale}
        onClose={() => setPrintSale(null)}
        sale={printSale}
        tortoise={tortoises.find(t => t.id === printSale?.tortoise_id)}
      />

      {/* Payment proofs dialog */}
      <Dialog open={!!proofSale} onOpenChange={o => !o && setProofSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Bukti Pembayaran — {proofSale?.tortoise_name}
            </DialogTitle>
          </DialogHeader>
          {proofSale && (
            <PaymentProofsSection
              sale={sales.find(s => s.id === proofSale.id) || proofSale}
              onUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ["sales"] });
                setProofSale(prev => sales.find(s => s.id === prev?.id) || prev);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}