import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { periksaKedaluwarsa } from "@/lib/kedaluwarsa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function ExpiredItemAlert() {
  const { data: items = [] } = useQuery({
    queryKey: ["warehouse-items", "-name", 500],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 500),
  });

  // Dua umur diperiksa sekaligus: tanggal pada kemasan, DAN masa pakai botol
  // multi-dosis yang sudah ditusuk. Yang kedua sering habis lebih dulu, dan
  // dulu tidak pernah dilihat sama sekali.
  const today = new Date();
  const expiring = items
    .map((item) => ({ item, k: periksaKedaluwarsa(item, today) }))
    .filter(({ k }) => k.tingkat === "lewat" || k.tingkat === "segera_pakai")
    .sort((a, b) => a.k.sisa - b.k.sisa)
    .map(({ item, k }) => ({ ...item, _sisa: k.sisa, _sebab: k.sebab }));

  if (expiring.length === 0) return null;

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-4 h-4" />
          Perhatian: Item Kadaluarsa ({expiring.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {expiring.map(item => {
          const diff = item._sisa;
          const isExpired = diff < 0;
          // Barang bisa masuk daftar ini karena BOTOLNYA yang sudah terbuka,
          // tanpa punya tanggal kemasan sama sekali. Merender expired_date
          // tanpa memeriksanya menghasilkan "Invalid Date" di layar pemilik.
          const sebabTeks =
            item._sebab === "botol_terbuka"
              ? `Botol terbuka sejak ${item.tanggal_botol_dibuka || "?"}`
              : item.expired_date
                ? format(new Date(item.expired_date), "d MMM yyyy", { locale: id })
                : "";
          return (
            <div key={item.id} className="flex items-center justify-between gap-2 py-1 border-b border-red-100 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Stok: {item.current_stock} {item.unit}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <Badge className={isExpired ? "bg-red-600 text-white" : "bg-amber-100 text-amber-700"}>
                  {isExpired ? `Kadaluarsa ${Math.abs(diff)}h lalu` : `${diff} hari lagi`}
                </Badge>
                {sebabTeks && (
                  <p className="text-xs text-muted-foreground mt-0.5">{sebabTeks}</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}