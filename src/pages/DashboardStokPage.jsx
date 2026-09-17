import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { periksaKedaluwarsa } from "@/lib/kedaluwarsa";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingDown, Calendar, Wallet, Leaf } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { formatRp } from "@/lib/skuUtils";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import { WarehouseArt } from "@/components/common/Illustration";

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

  // Pemakaian pakan dibaca dari StockMovement, bukan FeedingLog.
  //
  // FeedingLog adalah entitas mati: tidak ada satu pun kode di seluruh aplikasi
  // — peramban maupun server — yang pernah menulisnya. Layar ini satu-satunya
  // yang membacanya, jadi panel "Pemakaian vs Ideal" selalu menunjukkan nol
  // pemakaian, dan setiap pakan tampak kekurangan 100% selamanya.
  //
  // Pencatatan pemakaian yang sesungguhnya ada di StockMovement, ditulis oleh
  // potongStokPakan dengan keperluan pemberian pakan.
  const { data: pergerakanStok = [] } = useQuery({
    queryKey: ["stock-movements-pakan"],
    queryFn: () => base44.entities.StockMovement.list("-date", 500),
  });

  const { data: financeTx = [] } = useQuery({
    queryKey: ["finance-transactions"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 1000),
  });

  if (!canAccess(role, "warehouse")) return <AccessDenied />;

  // ─── A. Stok Kritis ────────────────────────────────────
  const criticalFeed = feedstocks.filter(f => f.current_stock <= f.minimum_stock);
  const criticalWarehouse = warehouseItems.filter(i => i.current_stock <= i.minimum_stock);
  const allCritical = [
    ...criticalFeed.map(f => ({ ...f, _type: "pakan", _cat: f.category })),
    ...criticalWarehouse.map(i => ({ ...i, _type: "gudang", _cat: i.category })),
  ].sort((a, b) => (a.current_stock / (a.minimum_stock || 1)) - (b.current_stock / (b.minimum_stock || 1)));

  // ─── B. Akan Kadaluarsa ───────────────────────────────
  // Botol multi-dosis yang sudah dibuka ikut dihitung: masa pakainya sering
  // habis jauh sebelum tanggal pada kemasan.
  const expiringSoon = warehouseItems
    .map((i) => ({ i, k: periksaKedaluwarsa(i, today) }))
    .filter(({ k }) => k.tingkat === "segera_pakai" || k.tingkat === "lewat")
    .map(({ i, k }) => ({ ...i, _daysLeft: k.sisa, _sebab: k.sebab }))
    .sort((a, b) => a._daysLeft - b._daysLeft);

  // ─── C. Pemakaian Pakan vs Ideal bulan ini ───────────
  const KEPERLUAN_PAKAN = ["pemberian_pakan", "pakan_pagi", "pakan_siang", "pakan_iguana", "pakan_baby"];
  const feedUsageMap = {};
  pergerakanStok.forEach((m) => {
    if (m.item_type !== "feedstock" || m.type !== "keluar") return;
    if (!String(m.date || "").startsWith(currentMonth)) return;
    if (m.is_test_data || m.excluded_from_reports) return;
    if (m.keperluan && !KEPERLUAN_PAKAN.includes(m.keperluan)) return;
    feedUsageMap[m.item_id] = (feedUsageMap[m.item_id] || 0) + Number(m.quantity || 0);
  });

  // Pakan yang belum pernah tercatat keluar sama sekali dibedakan dari pakan
  // yang tercatat sedikit. Nol pemakaian pada pakan yang jelas dipakai setiap
  // hari berarti pencatatannya yang belum jalan, bukan kuranya yang tidak
  // makan — dan dua hal itu tidak boleh terlihat sama di layar.
  const feedComparison = feedstocks
    .filter(f => f.daily_ideal > 0)
    .map(f => {
      const used = feedUsageMap[f.id] || 0;
      const ideal = f.daily_ideal * daysInMonth;
      return {
        ...f,
        used,
        ideal,
        belumTercatat: used === 0,
        pct: ideal > 0 ? Math.min(100, Math.round((used / ideal) * 100)) : 0,
      };
    })
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
      {/* Empat angka ini dulunya empat Card dalam `grid-cols-2 sm:grid-cols-4`
          dengan satu kartu `col-span-2`. Di ponsel susunannya jadi 1 + 2 + 1:
          kartu "Pengeluaran Stok Bulan Ini" berdiri sendirian setengah lebar
          dengan keterangannya melipat tiga baris, dan 210px harus digulir
          sebelum daftar stok kritis terlihat. Sebagai chip, keempatnya
          mengalir rapi dan angkanya sampai lebih dulu. */}
      <PageHeader
        title="Dashboard Stok"
        subtitle="Pakan dan gudang dalam satu layar"
        icon={Package}
        art={<WarehouseArt size="md" />}
        chips={[
          { key: "nilai", icon: Wallet, label: "Nilai stok", value: formatRp(totalStockValue) },
          {
            key: "kritis",
            icon: AlertTriangle,
            label: "Kritis",
            value: allCritical.length,
            tone: allCritical.length > 0 ? "bad" : "good",
            title: `Pakan ${formatRp(totalFeedValue)} · Gudang ${formatRp(totalWarehouseValue)}`,
          },
          {
            key: "kadaluarsa",
            icon: Calendar,
            label: "Kedaluwarsa <30 hari",
            value: expiringSoon.length,
            tone: expiringSoon.length > 0 ? "warn" : "good",
          },
          {
            key: "belanja",
            icon: TrendingDown,
            label: "Keluar bulan ini",
            value: formatRp(monthExpense),
          },
        ]}
      />

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
                    <p className="text-xs text-muted-foreground">
                      {item._sebab === "botol_terbuka"
                        ? `Botol terbuka sejak ${item.tanggal_botol_dibuka || "?"}`
                        : item.expired_date
                          ? `Exp: ${format(parseISO(item.expired_date), "d MMM yyyy", { locale: id })}`
                          : "Tanggal kemasan belum diisi"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${textColor}`}>
                      {item._daysLeft < 0 ? `Lewat ${Math.abs(item._daysLeft)} hari` : `${item._daysLeft} hari lagi`}
                    </p>
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
                    {f.belumTercatat
                      ? `belum ada pemakaian tercatat · ideal ${f.ideal.toFixed(1)} ${f.unit}`
                      : `${f.used} / ${f.ideal.toFixed(1)} ${f.unit} (${f.pct}%)`}
                  </p>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${f.belumTercatat ? "bg-muted-foreground/30" : f.pct >= 90 ? "bg-green-500" : f.pct >= 60 ? "bg-yellow-400" : "bg-red-400"}`}
                    style={{ width: f.belumTercatat ? "100%" : `${f.pct}%` }}
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