import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shell, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

function fmt(n) { return (n || 0).toLocaleString("id-ID"); }

const speciesLabel = { sulcata:"Sulcata", red_foot:"Red Foot", leopard:"Leopard", aldabra:"Aldabra", russian:"Russian", lainnya:"Lainnya" };
const morphLabel = { normal:"Normal", het_albino:"Het Albino", albino:"Albino", ivory:"Ivory", hypo:"Hypo", unknown:"Unknown" };

export default function TortoiseTerjualTab({ tortoises, isOwner }) {
  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 300),
  });

  const terjual = useMemo(() => {
    return tortoises
      .filter(t => t.status === "terjual")
      .map(t => {
        const sale = sales.find(s => s.tortoise_id === t.id);
        const primaryPhoto = t.photos?.find(p => p.is_primary)?.url || t.photos?.[0]?.url || null;
        return { ...t, _sale: sale, _photo: primaryPhoto };
      })
      .sort((a, b) => (b._sale?.sale_date || "").localeCompare(a._sale?.sale_date || ""));
  }, [tortoises, sales]);

  const handleWA = (t) => {
    const sale = t._sale;
    if (!sale?.hp_whatsapp) return;
    const phone = sale.hp_whatsapp.replace(/\D/g, "").replace(/^0/, "62");
    const msg = encodeURIComponent(`Halo ${sale.buyer_name}, selamat ya ${t.name} sudah sampai 🐢`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  if (terjual.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Shell className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-lg font-medium">Belum Ada Kura Terjual</p>
        <p className="text-sm mt-1">Kura yang berhasil dijual akan muncul di sini</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{terjual.length} kura-kura terjual</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {terjual.map(t => {
          const sale = t._sale;
          const laba = sale ? (sale.price || 0) - (sale.hpp || 0) : null;
          const margin = sale?.price > 0 && sale?.hpp > 0 ? Math.round((laba / sale.price) * 100) : null;

          return (
            <Card key={t.id} className="overflow-hidden border-green-200">
              <div className="flex items-start gap-3 p-4">
                {/* Photo */}
                <div className="flex-shrink-0">
                  {t._photo ? (
                    <img src={t._photo} alt={t.name} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-green-50 flex items-center justify-center">
                      <Shell className="w-7 h-7 text-green-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{t.name}</h3>
                    {t.code && <Badge variant="outline" className="text-[10px] font-mono">{t.code}</Badge>}
                    <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">✓ TERJUAL</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {speciesLabel[t.species] || t.species} · {morphLabel[t.morph] || t.morph}
                  </p>

                  {sale ? (
                    <div className="mt-2 space-y-0.5 text-xs">
                      <p className="text-muted-foreground">
                        📅 {sale.sale_date ? format(new Date(sale.sale_date), "d MMM yyyy", { locale: localeId }) : "-"}
                      </p>
                      <p className="font-medium">
                        👤 {sale.buyer_name}
                        {sale.buyer_city ? ` (${sale.buyer_city})` : ""}
                      </p>
                      <p className="font-semibold text-primary">Rp {fmt(sale.price)}</p>
                      {laba !== null && (
                        <p className={`font-medium ${laba >= 0 ? "text-green-600" : "text-red-600"}`}>
                          Laba: Rp {fmt(laba)}{margin !== null ? ` (${margin}%)` : ""}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 mt-2">Data penjualan tidak ditemukan</p>
                  )}
                </div>
              </div>

              {sale && (
                <div className="px-4 pb-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50"
                    onClick={() => handleWA(t)}
                    disabled={!sale.hp_whatsapp}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WA Pembeli
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}