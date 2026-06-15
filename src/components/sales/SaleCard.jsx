import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shell, MessageCircle, Eye, Printer } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const paymentColors = {
  lunas: "bg-green-100 text-green-800 border-green-300",
  dp: "bg-amber-100 text-amber-800 border-amber-300",
  belum_bayar: "bg-red-100 text-red-800 border-red-300",
};
const paymentLabels = { lunas: "Lunas", dp: "DP", belum_bayar: "Belum Bayar" };
const platformColors = {
  Instagram: "bg-pink-100 text-pink-800",
  Tokopedia: "bg-green-100 text-green-800",
  Shopee: "bg-orange-100 text-orange-800",
  WhatsApp: "bg-teal-100 text-teal-800",
  Facebook: "bg-blue-100 text-blue-800",
};

function fmt(n) { return (n || 0).toLocaleString("id-ID"); }

export default function SaleCard({ sale, onDetail, onPrint }) {
  const laba = (sale.price || 0) - (sale.hpp || 0);
  const margin = sale.price > 0 && sale.hpp > 0 ? Math.round((laba / sale.price) * 100) : null;

  const handleWA = () => {
    const phone = (sale.hp_whatsapp || "").replace(/\D/g, "").replace(/^0/, "62");
    const msg = encodeURIComponent(`Halo ${sale.buyer_name}, terima kasih telah membeli kura-kura ${sale.tortoise_name} dari kami 🐢`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const photoUrl = sale._tortoise_photo;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Photo */}
        <div className="flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={sale.tortoise_name} className="w-14 h-14 rounded-lg object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
              <Shell className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">{sale.tortoise_name}</h3>
                <Badge variant="outline" className={`text-[11px] ${paymentColors[sale.payment_status]}`}>
                  {paymentLabels[sale.payment_status] || sale.payment_status}
                </Badge>
                {sale.platform && (
                  <Badge variant="outline" className={`text-[11px] ${platformColors[sale.platform] || "bg-slate-100 text-slate-700"}`}>
                    {sale.platform}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sale.sale_date ? format(new Date(sale.sale_date), "d MMM yyyy", { locale: localeId }) : "-"}
                {" · "}
                <span className="font-medium text-foreground">{sale.buyer_name}</span>
                {sale.buyer_city ? ` (${sale.buyer_city})` : ""}
              </p>
            </div>

            {/* Price & profit */}
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-primary text-sm">Rp {fmt(sale.price)}</p>
              {sale.hpp > 0 && (
                <p className="text-xs text-muted-foreground">HPP: Rp {fmt(sale.hpp)}</p>
              )}
              {sale.hpp > 0 && (
                <p className={`text-xs font-semibold ${laba >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {laba >= 0 ? "+" : ""}Rp {fmt(laba)}
                  {margin !== null && <span className="ml-1 opacity-75">({margin}%)</span>}
                </p>
              )}
            </div>
          </div>

          {/* DP progress */}
          {sale.payment_status === "dp" && sale.price > 0 && (
            <div className="mt-2">
              {(() => {
                const paid = sale.total_paid || sale.dp_amount || 0;
                const pct = Math.min(100, Math.round((paid / sale.price) * 100));
                return (
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                      <span>{pct}% lunas (Rp {fmt(paid)} / Rp {fmt(sale.price)})</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            {onDetail && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onDetail(sale)}>
                <Eye className="w-3.5 h-3.5" /> Detail
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50" onClick={handleWA}>
              <MessageCircle className="w-3.5 h-3.5" /> WA Pembeli
            </Button>
            {onPrint && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onPrint(sale)}>
                <Printer className="w-3.5 h-3.5" /> Cetak
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}