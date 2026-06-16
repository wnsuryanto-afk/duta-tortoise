import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, MessageCircle, Loader2, ExternalLink, Shell, ShoppingBag, MapPin, Phone, Star } from "lucide-react";
import BuyerForm from "./BuyerForm";
import SaleWizard from "@/components/sales/SaleWizard";

const formatRp = n => `Rp ${(n || 0).toLocaleString("id-ID")}`;
const formatDate = d => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

export default function BuyerDetail({ buyer, onClose, canEdit }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [waMsg, setWaMsg] = useState("");
  const [showJualLagi, setShowJualLagi] = useState(false);

  const { data: allSales = [] } = useQuery({
    queryKey: ["sales-buyer", buyer.id],
    queryFn: () => base44.entities.Sale.list("-sale_date", 200),
  });

  // Filter sales by buyer_profile_id
  const sales = useMemo(() => allSales.filter(s => s.buyer_profile_id === buyer.id), [allSales, buyer.id]);
  const totalRiwayat = sales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  const waNumber = (buyer.hp_whatsapp || "").replace(/\D/g, "").replace(/^0/, "62");

  const handleGenWA = async () => {
    setGenLoading(true);
    setWaMsg("");
    const res = await base44.functions.invoke("claudeAI", {
      mode: "wa_offer",
      payload: { buyer, recentTortoises: "sulcata normal, sulcata ivory, sulcata albino" },
    });
    setWaMsg(res.data.answer || "");
    setGenLoading(false);
  };

  if (editing) return (
    <Dialog open onOpenChange={() => setEditing(false)}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit: {buyer.name}</DialogTitle></DialogHeader>
        <BuyerForm data={buyer} onSave={() => { queryClient.invalidateQueries({ queryKey: ["buyer-profiles"] }); setEditing(false); }} onClose={() => setEditing(false)} />
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">👤</span>
              {buyer.name}
              {buyer.is_repeat_buyer && <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">⭐ Pembeli Setia</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Contact info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {buyer.hp_whatsapp && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{buyer.hp_whatsapp}</span>
                </div>
              )}
              {buyer.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{buyer.city}</span>
                </div>
              )}
              <div><span className="text-muted-foreground">Platform: </span>{buyer.platform_asal || "-"}</div>
              {buyer.email && <div><span className="text-muted-foreground">Email: </span>{buyer.email}</div>}
              {buyer.favorite_morph && <div><span className="text-muted-foreground">Favorit: </span>{buyer.favorite_morph}</div>}
              {buyer.budget_range && <div><span className="text-muted-foreground">Budget: </span>{buyer.budget_range}</div>}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Total Pembelian</div>
                  <div className="text-lg font-bold">{buyer.total_purchases || 0} ekor</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Total Belanja</div>
                  <div className="text-lg font-bold text-primary">{formatRp(buyer.total_spent)}</div>
                </CardContent>
              </Card>
            </div>

            {buyer.last_purchase_date && (
              <div className="text-sm text-muted-foreground">
                📅 Terakhir beli: <strong>{formatDate(buyer.last_purchase_date)}</strong>
                {buyer.last_purchased_tortoise && <> — 🐢 <strong>{buyer.last_purchased_tortoise}</strong></>}
              </div>
            )}

            {buyer.buyer_address && (
              <div className="text-sm p-3 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground">Alamat: </span>{buyer.buyer_address}
              </div>
            )}

            {buyer.notes && <div className="p-3 bg-muted/40 rounded-xl text-sm">{buyer.notes}</div>}

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              {waNumber && (
                <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
                    💬 WhatsApp
                  </Button>
                </a>
              )}
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
              )}
              {canEdit && (
                <Button size="sm" className="gap-1.5 bg-green-700 hover:bg-green-800" onClick={() => { onClose(); setShowJualLagi(true); }}>
                  <ShoppingBag className="w-3.5 h-3.5" /> Jual Lagi
                </Button>
              )}
            </div>

            {/* Sales history */}
            {sales.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Riwayat Pembelian ({sales.length} transaksi · {formatRp(totalRiwayat)})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sales.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 border rounded-lg bg-card">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Shell className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{s.tortoise_name || "-"} {s.tortoise_code && <span className="font-mono text-[10px] text-muted-foreground">({s.tortoise_code})</span>}</p>
                        <p className="text-[10px] text-muted-foreground">{s.sale_date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold">{formatRp(s.price)}</p>
                        <Badge variant="outline" className={`text-[10px] ${s.payment_status === "lunas" ? "bg-green-50 text-green-700" : s.payment_status === "dp" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                          {{ lunas: "Lunas", dp: "DP", belum_bayar: "Belum" }[s.payment_status] || s.payment_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WA Offer Generator */}
            <div className="border rounded-xl p-3 space-y-2">
              <p className="text-sm font-medium">Kirim Penawaran via WhatsApp</p>
              <Button variant="outline" size="sm" onClick={handleGenWA} disabled={genLoading} className="w-full gap-2">
                {genLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat pesan AI...</> : "🪄 Generate Pesan AI"}
              </Button>
              {waMsg && (
                <>
                  <textarea className="w-full text-sm border rounded-lg p-2 resize-none bg-muted/30" rows={4} value={waMsg} onChange={e => setWaMsg(e.target.value)} />
                  <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="w-full gap-2">
                      <MessageCircle className="w-4 h-4" /> Buka WhatsApp <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SaleWizard for "Jual Lagi" */}
      {showJualLagi && (
        <SaleWizard
          open={showJualLagi}
          onClose={() => setShowJualLagi(false)}
          preselectedBuyer={buyer}
        />
      )}
    </>
  );
}