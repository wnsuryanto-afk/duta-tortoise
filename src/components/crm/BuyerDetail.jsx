import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, MessageCircle, Loader2, ExternalLink } from "lucide-react";
import BuyerForm from "./BuyerForm";

const TIER_CONFIG = {
  vip: { color: "bg-yellow-100 text-yellow-800", label: "VIP 👑" },
  reguler: { color: "bg-blue-100 text-blue-800", label: "Reguler ⭐" },
  baru: { color: "bg-green-100 text-green-800", label: "Baru 🌱" },
};
const formatRp = n => `Rp ${(n || 0).toLocaleString("id-ID")}`;

export default function BuyerDetail({ buyer, calcTier, onClose, onUpdate, canEdit }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [waMsg, setWaMsg] = useState("");

  const { data: sales = [] } = useQuery({
    queryKey: ["buyer-sales", buyer.id],
    queryFn: () => base44.entities.Sale.list("-sale_date", 50),
    select: (data) => data.filter(s => s.buyer_phone === buyer.phone || s.buyer_name === buyer.name),
  });

  const tier = calcTier(buyer);
  const cfg = TIER_CONFIG[tier];

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

  const waNumber = (buyer.phone || "").replace(/\D/g, "").replace(/^0/, "62");

  if (editing) return (
    <Dialog open onOpenChange={() => setEditing(false)}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Pembeli: {buyer.name}</DialogTitle></DialogHeader>
        <BuyerForm data={buyer} onSave={() => { onUpdate(); setEditing(false); }} onClose={() => setEditing(false)} />
      </DialogContent>
    </Dialog>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {buyer.name}
            <Badge className={`${cfg.color} border-0 text-xs`}>{cfg.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 mb-2">
            {waNumber && (
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
                  💬 WhatsApp
                </Button>
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">No. HP/WA: </span>{buyer.phone}</div>
            {buyer.city && <div><span className="text-muted-foreground">Kota: </span>{buyer.city}</div>}
            {buyer.platform_asal && <div><span className="text-muted-foreground">Dari: </span>{buyer.platform_asal}</div>}
            {buyer.favorite_morph && <div><span className="text-muted-foreground">Favorit: </span>{buyer.favorite_morph}</div>}
            {buyer.budget_range && <div><span className="text-muted-foreground">Budget: </span>{buyer.budget_range}</div>}
            <div><span className="text-muted-foreground">Transaksi: </span>{buyer.total_purchases || 0}x</div>
            <div className="col-span-2"><span className="text-muted-foreground">Total Belanja: </span><span className="font-bold text-primary">{formatRp(buyer.total_spent)}</span></div>
          </div>

          {buyer.notes && <div className="p-3 bg-muted/40 rounded-xl text-sm">{buyer.notes}</div>}

          {/* Sales history */}
          {sales.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Riwayat Transaksi ({sales.length})</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sales.slice(0, 10).map((s, i) => (
                  <div key={i} className="flex justify-between text-xs p-2 bg-muted/30 rounded-lg">
                    <span>{s.tortoise_name} · {s.sale_date}</span>
                    <span className="font-medium">{formatRp(s.price)}</span>
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
                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`}
                  target="_blank" rel="noopener noreferrer"
                >
                  <Button size="sm" className="w-full gap-2">
                    <MessageCircle className="w-4 h-4" /> Buka WhatsApp <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </>
            )}
          </div>

          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="w-full gap-2">
              <Pencil className="w-4 h-4" /> Edit Profil
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}