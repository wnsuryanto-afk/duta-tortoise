import { perluDiperhatikan } from "@/lib/stokMenipis";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { adalahPemakaian } from "@/lib/urgensiStok";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, Calendar, Wallet, Leaf } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { formatRp } from "@/lib/skuUtils";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";

function SectionHeader({ icon: IconComp, title, count, color = "text-foreground" }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <IconComp className={`w-5 h-5 ${color}`} />
      <h2 className="font-semibold text-base">{title}</h2>
      {count !== undefined && (
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      )}
    </div>
  );
}

export default function DashboardStokPage() {
  const { role } = useCurrentUser();

  const today = new Date();
  const currentMonth = format(today, "yyyy-MM");
  const daysInMonth = today.getDate();

  const { data: feedstocks = [] } = useQuery({
    queryKey: ["feedstocks", "-name", 300],
    queryFn: () => base44.entities.FeedStock.list("-name", 300),
  });

  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["warehouse-items", "-name", 300],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 300),
  });

  // Panel ini dulu membaca FeedingLog — tabel yang TIDAK PERNAH ditulis oleh
  // berkas mana pun, jadi "Pemakaian Pakan vs Ideal" selalu kosong dan orang
  // menyimpulkan aplikasinya rusak. Pemakaian pakan yang sebenarnya tercatat
  // di StockMovement: layar Pakan Keluar dan pemotongan stok otomatis
  // menulisnya ke sana.
  const { data: pergerakan = [] } = useQuery({
    queryKey: ["stock-movements", "-date", 500],
    queryFn: () => base44.entities.StockMovement.list("-date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: financeTx = [] } = useQuery({
    queryKey: ["finance-transactions"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 1000),
  });

  if (!canAccess(role, "warehouse")) return <AccessDenied />;

  // ─── A. Stok Kritis ────────────────────────────────────
  // Bahan pakan yang tidak dilacak dikeluarkan: angkanya sengaja tidak
  // dipelihara, jadi "kritis" tidak berarti apa-apa untuknya.
  const criticalFeed = feedstocks.filter(perluDiperhatikan);
  const criticalWarehouse = warehouseItems.filter(perluDiperhatikan);
  const allCritical = [
    ...criticalFeed.map(f => ({ ...f, _type: "pakan", _cat: f.category })),
    ...criticalWarehouse.map(i => ({ ...i, _type: "gudang", _cat: i.category })),
  ].sort((a, b) => (a.current_stock / (a.minimum_stock || 1)) - (b.current_stock / (b.minimum_stock || 1)));

  // ─── B. Akan Kadaluarsa ───────────────────────────────
  const expiringSoon = warehouseItems
    .filter(i => i.expired_date)
    .map(i => ({ ...i, _daysLeft: Math.ceil((new Date(i.expired_date) - today) / 86400000) }))
    .filter(i => i._daysLeft <= 30 && i._daysLeft >= 0)
    .sort((a, b) => a._daysLeft - b._daysLeft);

  // ─── C. Pemakaian Pakan vs Ideal bulan ini ───────────
  const feedUsageMap = {};
  pergerakan.forEach((m) => {
    if (!adalahPemakaian(m)) return;
    if (m.item_type && m.item_type !== "feedstock") return;
    if (!String(m.date || "").startsWith(currentMonth)) return;
    feedUsageMap[m.item_id] = (feedUsageMap[m.item_id] || 0) + Math.abs(Number(m.quantity) || 0);
  });
  const feedComparison = feedstocks
    .filter(f => f.daily_ideal > 0)
    .map(f => ({
      ...f,
      used: feedUsageMap[f.id] || 0,
      ideal: f.daily_ideal * daysInMonth,
      pct: Math.min(100, Math.round(((feedUsageMap[f.id] || 0) / (f.daily_ideal * daysInMonth)) * 100)),
    }))
    .sort((a, b) => a.pct - b.pct);

  // ─── D. Total Nilai Stok ──────────────────────────────
  const totalFeedValue = feedstocks.reduce((s, f) => s + (f.price_per_unit || 0) * (f.current_stock || 0), 0);
  const totalWarehouseValue = warehouseItems.reduce((s, i) => s + (i.purchase_price || 0) * (i.current_stock || 0), 0);
  const totalStockValue = totalFeedValue + totalWarehouseValue;

  // ─── E. Pengeluaran Stok Bulan Ini ───────────────────
  const stockCategories = ["pakan", "obat_perawatan", "vitamin_suplemen"];
  const monthExpense = financeTx
    .filter(t => t.type === "pengeluaran" && t.date && t.date.startsWith(currentMonth) && stockCategories.includes(t.category))
    .reduce((s, t) => s + (t.amount || 0), 0);
  const expenseByCategory = {};
  financeTx
    .filter(t => t.type === "pengeluaran" && t.date && t.date.startsWith(currentMonth) && stockCategories.includes(t.category))
    .forEach(t => { expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + (t.amount || 0); });

  const EXPENSE_LABELS = { pakan: "Pakan", obat_perawatan: "Obat & Perawatan", vitamin_suplemen: "Vitamin & Suplemen" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Dashboard Stok</h1>
        <p className="text-muted-foreground text-sm">Ringkasan stok pakan & gudang secara terpusat</p>
      </div>

      {/* Nilai & Pengeluaran — summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Total Nilai Stok</p>
          <p className="text-xl font-bold text-primary">{formatRp(totalStockValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Pakan: {formatRp(totalFeedValue)} · Gudang: {formatRp(totalWarehouseValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Stok Kritis</p>
          <p className="text-xl font-bold text-red-600">{allCritical.length}</p>
          <p className="text-xs text-muted-foreground mt-1">item perlu diisi</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Kadaluarsa &lt;30 hari</p>
          <p className="text-xl font-bold text-orange-600">{expiringSoon.length}</p>
          <p className="text-xs text-muted-foreground mt-1">item di gudang</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Pengeluaran Stok Bulan Ini</p>
          <p className="text-xl font-bold text-red-700">{formatRp(monthExpense)}</p>
          <p className="text-xs text-muted-foreground mt-1">pakan + obat + vitamin</p>
        </Card>
      </div>

      {/* A. Stok Kritis */}
      <Card className="p-5">
        <SectionHeader icon={AlertTriangle} title="Stok Kritis" count={allCritical.length} color="text-red-500" />
        {allCritical.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">✅ Semua stok aman</p>
        ) : (
          <div className="space-y-2">
            {allCritical.map((item) => {
              const pct = Math.min(100, Math.round((item.current_stock / (item.minimum_stock || 1)) * 100));
              const isZero = item.current_stock === 0;
              return (
                <div key={item.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${isZero ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{item.name}</p>
                      <Badge className={`text-[10px] ${item._type === "pakan" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {item._type === "pakan" ? "🌿 Pakan" : "📦 Gudang"}
                      </Badge>
                      {item.is_mandatory && <Badge className="text-[10px] bg-red-500 text-white">WAJIB</Badge>}
                    </div>
                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-full max-w-xs">
                      <div className={`h-full rounded-full ${isZero ? "bg-red-500" : "bg-orange-400"}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${isZero ? "text-red-700" : "text-orange-700"}`}>
                      {item.current_stock} <span className="text-xs font-normal">{item.unit}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Min: {item.minimum_stock}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* B. Akan Kadaluarsa */}
      <Card className="p-5">
        <SectionHeader icon={Calendar} title="Akan Kadaluarsa (≤30 hari)" count={expiringSoon.length} color="text-orange-500" />
        {expiringSoon.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">✅ Tidak ada barang yang akan kadaluarsa</p>
        ) : (
          <div className="space-y-2">
            {expiringSoon.map((item) => {
              const urgency = item._daysLeft <= 7 ? "bg-red-50 border-red-300" : item._daysLeft <= 14 ? "bg-orange-50 border-orange-200" : "bg-yellow-50 border-yellow-200";
              const textColor = item._daysLeft <= 7 ? "text-red-700" : item._daysLeft <= 14 ? "text-orange-700" : "text-yellow-700";
              return (
                <div key={item.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${urgency}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Exp: {format(parseISO(item.expired_date), "d MMM yyyy", { locale: id })}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${textColor}`}>{item._daysLeft} hari lagi</p>
                    <p className="text-xs text-muted-foreground">Stok: {item.current_stock} {item.unit}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* C. Pemakaian Pakan vs Ideal */}
      <Card className="p-5">
        <SectionHeader icon={Leaf} title={`Pemakaian Pakan vs Ideal — ${format(today, "MMMM yyyy", { locale: id })}`} color="text-green-600" />
        {feedComparison.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Tidak ada pakan dengan daily_ideal yang terset</p>
        ) : (
          <div className="space-y-3">
            {feedComparison.map((f) => (
              <div key={f.id}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.used} / {f.ideal.toFixed(1)} {f.unit} ({f.pct}%)
                  </p>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${f.pct >= 90 ? "bg-green-500" : f.pct >= 60 ? "bg-yellow-400" : "bg-red-400"}`}
                    style={{ width: `${f.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* D+E. Nilai Stok & Pengeluaran bulan ini */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionHeader icon={Package} title="Komposisi Nilai Stok" color="text-primary" />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>🌿 Pakan</span><span className="font-semibold">{formatRp(totalFeedValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>📦 Gudang (obat/alat)</span><span className="font-semibold">{formatRp(totalWarehouseValue)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
              <span>Total</span><span className="text-primary">{formatRp(totalStockValue)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader icon={Wallet} title={`Pengeluaran Stok — ${format(today, "MMMM yyyy", { locale: id })}`} color="text-red-500" />
          <div className="space-y-2">
            {Object.entries(expenseByCategory).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada pengeluaran stok bulan ini</p>
            ) : (
              <>
                {Object.entries(expenseByCategory).map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span>{EXPENSE_LABELS[cat] || cat}</span>
                    <span className="font-semibold text-red-600">-{formatRp(amt)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                  <span>Total</span><span className="text-red-700">-{formatRp(monthExpense)}</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}