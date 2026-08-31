import { dilacak, perluDiperhatikan, stokHabis } from "@/lib/stokMenipis";
// Halaman /dashboard-stok digabungkan ke sini sebagai tab. Isinya ringkasan
// atas persediaan yang sama yang didaftar tab Inventaris — nilai stok, yang
// akan kadaluarsa, pemakaian pakan, dan pengeluaran bulan ini. Berdiri
// sendiri, ia punya saringan stok kritisnya sendiri dan menyebut angka lain.
import DashboardStokPage from "@/pages/DashboardStokPage";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Package, ArrowUpDown, HandCoins, FlaskConical, TrendingDown, LayoutDashboard } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { formatRp } from "@/lib/skuUtils";
import StokInventoryTab from "@/components/stok/StokInventoryTab";
import StokPergerakanTab from "@/components/stok/StokPergerakanTab";
import StokPeminjamanTab from "@/components/stok/StokPeminjamanTab";
import StokResepTab from "@/components/stok/StokResepTab";

function StatCard({ label, value, sub, color = "text-foreground", icon: Icon }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        {Icon && <Icon className={`w-5 h-5 mt-0.5 opacity-40 ${color}`} />}
      </div>
    </Card>
  );
}

export default function UnifiedStokPage() {
  const { role } = useCurrentUser();
  const [tab, setTab] = useState("inventory");
  const [inventoryFilter, setInventoryFilter] = useState(null); // for external filter trigger

  const { data: feedstocks = [] } = useQuery({
    queryKey: ["feedstocks", "-created_date", 300],
    queryFn: () => base44.entities.FeedStock.list("-created_date", 300),
  });
  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["warehouse-items", "-created_date", 300],
    queryFn: () => base44.entities.WarehouseItem.list("-created_date", 300),
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: () => base44.entities.StockMovement.list("-date", 500),
  });
  const { data: borrows = [] } = useQuery({
    queryKey: ["item-borrows"],
    queryFn: () => base44.entities.ItemBorrow.list("-borrow_date", 200),
  });

  if (!canAccess(role, "stock-gudang") && !canAccess(role, "warehouse") && !canAccess(role, "feed-stock")) {
    return <AccessDenied />;
  }

  // ── Summary stats ────────────────────────────────────────────────
  const allItems = [
    // Bahan pakan yang tidak dilacak tidak ikut hitungan kritis maupun nilai
    // persediaan: angkanya nol karena memang tidak dicatat, bukan karena habis.
    ...feedstocks.filter(dilacak).map(f => ({ ...f, _src: "feed", _price: f.price_per_unit || 0 })),
    ...warehouseItems.filter(dilacak).map(w => ({ ...w, _src: "warehouse", _price: w.purchase_price || 0 })),
  ];

  const totalNilai = allItems.reduce((s, i) => s + (i._price * (i.current_stock || 0)), 0);

  // Aturan bersama lib/stokMenipis — bukan `< minimum_stock`, yang menganggap
  // setiap barang bermininum 0 selalu aman dan setiap barang berstok 0
  // bermininum 0 tidak pernah muncul.
  const criticalCount = allItems.filter(perluDiperhatikan).length;
  const mandatoryEmptyCount = allItems.filter(stokHabis).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMovements = movements.filter(m => m.date === todayStr);
  const todayMasuk = todayMovements.filter(m => m.type === "masuk").reduce((s, m) => s + (m.quantity || 0), 0);
  const todayKeluar = todayMovements.filter(m => m.type === "keluar").reduce((s, m) => s + (m.quantity || 0), 0);

  const lostOrDamaged = borrows.filter(b => b.return_condition === "hilang" || b.return_condition === "rusak").length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold">Stok & Gudang</h1>
        <p className="text-muted-foreground text-sm">Inventaris pakan, obat, alat & pergerakan stok terpusat</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Nilai Stok"
          value={formatRp(totalNilai)}
          sub="Pakan + Gudang"
          color="text-primary"
          icon={Package}
        />
        <StatCard
          label="Stok Kritis"
          value={criticalCount}
          sub="item di bawah minimum"
          color={criticalCount > 0 ? "text-red-600" : "text-green-600"}
          icon={AlertTriangle}
        />
        <StatCard
          label="Pergerakan Hari Ini"
          value={`+${todayMasuk} / -${todayKeluar}`}
          sub="masuk / keluar (unit)"
          color="text-blue-600"
          icon={ArrowUpDown}
        />
        <div onClick={() => { if (mandatoryEmptyCount > 0) setTab("inventory"); }} className={mandatoryEmptyCount > 0 ? "cursor-pointer" : ""}>
          <StatCard
            label="Item Wajib Habis"
            value={mandatoryEmptyCount}
            sub={mandatoryEmptyCount > 0 ? "⚠️ Klik untuk lihat" : "Semua aman"}
            color={mandatoryEmptyCount > 0 ? "text-red-600" : "text-green-600"}
            icon={TrendingDown}
          />
        </div>
      </div>

      {/* Main tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="inventory" className="gap-1.5">
            <Package className="w-3.5 h-3.5" /> Inventaris
          </TabsTrigger>
          <TabsTrigger value="pergerakan" className="gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5" /> Pergerakan Stok
          </TabsTrigger>
          <TabsTrigger value="peminjaman" className="gap-1.5">
            <HandCoins className="w-3.5 h-3.5" /> Peminjaman
          </TabsTrigger>
          <TabsTrigger value="resep" className="gap-1.5">
            <FlaskConical className="w-3.5 h-3.5" /> Resep & Produksi
          </TabsTrigger>
          <TabsTrigger value="ringkasan" className="gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" /> Ringkasan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4">
          <StokInventoryTab feedstocks={feedstocks} warehouseItems={warehouseItems} role={role} />
        </TabsContent>
        <TabsContent value="pergerakan" className="mt-4">
          <StokPergerakanTab movements={movements} feedstocks={feedstocks} warehouseItems={warehouseItems} role={role} />
        </TabsContent>
        <TabsContent value="peminjaman" className="mt-4">
          <StokPeminjamanTab borrows={borrows} warehouseItems={warehouseItems} feedstocks={feedstocks} role={role} />
        </TabsContent>
        <TabsContent value="resep" className="mt-4">
          <StokResepTab role={role} />
        </TabsContent>
        <TabsContent value="ringkasan" className="mt-4">
          <DashboardStokPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}