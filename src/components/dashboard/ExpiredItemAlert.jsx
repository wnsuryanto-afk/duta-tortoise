import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { id } from "date-fns/locale";

export default function ExpiredItemAlert() {
  const { data: items = [] } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: () => base44.entities.WarehouseItem.list(),
  });

  const today = new Date();
  const expiring = items.filter(item => {
    if (!item.expired_date) return false;
    const diff = differenceInDays(new Date(item.expired_date), today);
    return diff <= 30;
  }).sort((a, b) => new Date(a.expired_date) - new Date(b.expired_date));

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
          const diff = differenceInDays(new Date(item.expired_date), today);
          const isExpired = diff < 0;
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
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(item.expired_date), "d MMM yyyy", { locale: id })}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}