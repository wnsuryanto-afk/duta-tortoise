import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Package, Leaf, Clock } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { hitungSisaHari, gabungRiwayatPemakaian, AMBANG_GAWAT_HARI } from "@/lib/urgensiStok";

function urgencyLabel(days) {
  if (days === null || days === Infinity) return { label: "—", color: "text-muted-foreground bg-muted border-border", icon: null };
  if (days < 0) return { label: "Stok Habis!", color: "text-red-700 bg-red-100 border-red-200", icon: "🚨" };
  if (days <= AMBANG_GAWAT_HARI) return { label: `${Math.round(days)} hari — Segera Restock!`, color: "text-red-700 bg-red-100 border-red-200", icon: "🔴" };
  if (days < 7) return { label: `${Math.round(days)} hari — Perlu Dipesan`, color: "text-amber-700 bg-amber-100 border-amber-200", icon: "🟠" };
  if (days < 14) return { label: `${Math.round(days)} hari — Perhatian`, color: "text-amber-700 bg-amber-100 border-amber-200", icon: "🟡" };
  return { label: `${Math.round(days)} hari — Aman`, color: "text-green-700 bg-green-100 border-green-200", icon: "🟢" };
}

function StockCard({ item, estimatedDays }) {
  const u = urgencyLabel(estimatedDays);

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{item.name}</h3>
            {item.category && (
              <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 capitalize flex-shrink-0">
                {item.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span>Stok: <strong className="text-foreground">{item.current_stock} {item.unit}</strong></span>
            <span>Min: {item.minimum_stock} {item.unit}</span>
          </div>
        </div>
        <span className={`text-[11px] font-medium border rounded-full px-2.5 py-1 flex-shrink-0 flex items-center gap-1 ${u.color}`}>
          {u.icon && <span>{u.icon}</span>}
          {u.label}
        </span>
      </div>
      {item.supplier && (
        <p className="text-[11px] text-muted-foreground mt-2">Supplier: {item.supplier}</p>
      )}
    </div>
  );
}

export default function StockPredictionPage() {
  const { role } = useCurrentUser();

  const { data: warehouseItems = [], isLoading: wLoading } = useQuery({
    queryKey: ["warehouse-items", "-name", 500],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 500),
  });

  const { data: feedStockItems = [], isLoading: fLoading } = useQuery({
    queryKey: ["feedstocks", "-name", 300],
    queryFn: () => base44.entities.FeedStock.list("-name", 300),
  });

  const { data: transactions = [], isLoading: tLoading } = useQuery({
    queryKey: ["warehouse-transactions"],
    queryFn: () => base44.entities.WarehouseTransaction.list("-created_date", 300),
  });

  // StockMovement adalah buku pergerakan stok yang sebenarnya — delapan layar
  // menulis ke sana, sementara WarehouseTransaction hanya ditulis satu layar
  // gudang. Perkiraan pemakaian dulu membaca yang kedua saja.
  const { data: pergerakan = [] } = useQuery({
    queryKey: ["stock-movements", "-date", 500],
    queryFn: () => base44.entities.StockMovement.list("-date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const riwayatPakai = useMemo(
    () => gabungRiwayatPemakaian(pergerakan, transactions),
    [pergerakan, transactions]
  );

  const warehouseWithDays = useMemo(() =>
    warehouseItems.map(i => ({ ...i, estimatedDays: hitungSisaHari(i, riwayatPakai) }))
      .sort((a, b) => {
        const da = a.estimatedDays === Infinity ? 9999 : a.estimatedDays;
        const db = b.estimatedDays === Infinity ? 9999 : b.estimatedDays;
        return da - db;
      }),
    [warehouseItems, riwayatPakai]
  );

  const feedWithDays = useMemo(() =>
    feedStockItems.map(i => {
      const daily = i.daily_ideal || 0;
      const days = daily > 0 ? i.current_stock / daily : Infinity;
      return { ...i, estimatedDays: i.current_stock <= 0 ? -1 : days };
    }).sort((a, b) => {
      const da = a.estimatedDays === Infinity ? 9999 : a.estimatedDays;
      const db = b.estimatedDays === Infinity ? 9999 : b.estimatedDays;
      return da - db;
    }),
    [feedStockItems]
  );

  if (!canAccess(role, "warehouse")) return <AccessDenied />;

  const criticalWarehouse = warehouseWithDays.filter(i => i.estimatedDays < 7);
  const criticalFeed = feedWithDays.filter(i => i.estimatedDays < 7);

  const isLoading = wLoading || fLoading || tLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" /> Prediksi Stok
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Estimasi waktu habisnya stok berdasarkan pola konsumsi</p>
      </div>

      {/* Critical alert */}
      {(criticalWarehouse.length > 0 || criticalFeed.length > 0) && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="font-semibold text-red-800">
              {criticalWarehouse.length + criticalFeed.length} item kritis (stok &lt; 7 hari)!
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...criticalWarehouse, ...criticalFeed].map(i => (
              <span key={i.id} className="text-xs bg-red-100 text-red-700 border border-red-200 rounded-full px-2.5 py-0.5 font-medium">
                🔴 {i.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { label: "🟢 Aman (>14 hari)", color: "text-green-700 bg-green-50 border-green-200" },
          { label: "🟡 Perhatian (7–14 hari)", color: "text-amber-700 bg-amber-50 border-amber-200" },
          { label: "🔴 Kritis (<7 hari)", color: "text-red-700 bg-red-50 border-red-200" },
        ].map(l => (
          <span key={l.label} className={`px-3 py-1 rounded-full border font-medium ${l.color}`}>{l.label}</span>
        ))}
      </div>

      <Tabs defaultValue="gudang">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gudang" className="gap-1.5">
            <Package className="w-4 h-4" /> Gudang ({warehouseWithDays.length})
          </TabsTrigger>
          <TabsTrigger value="pakan" className="gap-1.5">
            <Leaf className="w-4 h-4" /> Pakan ({feedWithDays.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gudang" className="mt-4 space-y-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />)
          ) : warehouseWithDays.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Belum ada item gudang</p>
            </div>
          ) : (
            warehouseWithDays.map(i => (
              <StockCard key={i.id} item={i} estimatedDays={i.estimatedDays} type="warehouse" />
            ))
          )}
        </TabsContent>

        <TabsContent value="pakan" className="mt-4 space-y-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />)
          ) : feedWithDays.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Leaf className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Belum ada data pakan</p>
            </div>
          ) : (
            feedWithDays.map(i => (
              <StockCard key={i.id} item={i} estimatedDays={i.estimatedDays} type="feed" />
            ))
          )}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center">
        💡 Estimasi gudang dihitung dari transaksi keluar 30 hari terakhir. Pakan dihitung dari field "Konsumsi Harian Ideal".
      </p>
    </div>
  );
}