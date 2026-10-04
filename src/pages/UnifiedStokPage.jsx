import { dilacak, perluDiperhatikan, stokHabis } from "@/lib/stokMenipis";
import { rupiah } from "@/lib/rupiah";
// Halaman /dashboard-stok digabungkan ke sini sebagai tab. Isinya ringkasan
// atas persediaan yang sama yang didaftar tab Inventaris — nilai stok, yang
// akan kadaluarsa, pemakaian pakan, dan pengeluaran bulan ini. Berdiri
// sendiri, ia punya saringan stok kritisnya sendiri dan menyebut angka lain.
import DashboardStokPage from "@/pages/DashboardStokPage";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Package, ArrowUpDown, FlaskConical, TrendingDown, LayoutDashboard } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import RingkasanAngka from "@/components/common/RingkasanAngka";
import StokInventoryTab from "@/components/stok/StokInventoryTab";
import StokPergerakanTab from "@/components/stok/StokPergerakanTab";
import StokResepTab from "@/components/stok/StokResepTab";
// Sisi "barang keluar" yang selama ini kosong. Ditaruh di kepala halaman,
// bukan di dalam tab, karena inilah satu-satunya hal yang dilakukan feeder di
// depan rak — sementara tab-tab di bawah untuk pengelola.
import AmbilBarangScan from "@/components/stok/AmbilBarangScan";
import BatchLabelModal from "@/components/warehouse/BatchLabelModal";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnifiedStokPage() {
  const { role } = useCurrentUser();
  const [tab, setTab] = useState("inventory");
  const [labelBatchOpen, setLabelBatchOpen] = useState(false);

  const { data: batchSemua = [] } = useQuery({
    queryKey: ["batch-barang"],
    queryFn: () => base44.entities.BatchBarang.list("-tanggal_terima", 500),
  });

  // Batch yang labelnya belum pernah dicetak DAN isinya masih ada. Batch habis
  // tidak perlu label — tidak ada botol yang bisa ditempeli.
  const batchBelumBerlabel = useMemo(
    () => batchSemua.filter((b) => !b.label_dicetak && (Number(b.jumlah_sisa) || 0) > 0),
    [batchSemua]
  );
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

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Kepala halaman memakai PageHeader, bukan <h1> sendiri: judul dan
          angka ringkasannya jadi sebentuk dengan halaman lain, dan angkanya
          punya tempat yang sudah tahu cara mengurutkan yang mendesak. */}
      <PageHeader
        title="Stok & Gudang"
        subtitle="Inventaris pakan, obat, alat & pergerakan stok terpusat"
        icon={Package}
        actions={<>
          <AmbilBarangScan />
          {/*
            Label batch dicetak setelah barang datang, sekali, untuk batch yang
            labelnya belum pernah dibuat. Tombolnya menyebut jumlahnya supaya
            tidak perlu dibuka dulu untuk tahu ada kerjaan atau tidak.
          */}
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={batchBelumBerlabel.length === 0}
            onClick={() => setLabelBatchOpen(true)}
          >
            <Printer className="w-4 h-4" />
            Label Batch{batchBelumBerlabel.length > 0 ? ` (${batchBelumBerlabel.length})` : ""}
          </Button>
        </>}
      >
        {/*
          Empat angka yang sama, tetapi besarnya kini mengikuti ISI-nya.
          "Stok kritis 0" adalah kabar baik dan mengecil sendiri; "Stok
          kritis 7" melebar dan berwarna. Sebelumnya keempatnya selalu
          sebesar kartu yang sama, jadi nol dan tujuh terbaca setara.
        */}
        <RingkasanAngka ubin={[
          {
            kunci: "kritis",
            ikon: AlertTriangle,
            label: "Stok kritis",
            nilai: criticalCount,
            sub: criticalCount > 0 ? "di bawah minimum — belanja" : "✓ semua di atas minimum",
            ke: "/pembelian",
            nada: criticalCount > 0 ? "bahaya" : "tenang",
            tingkat: criticalCount > 0 ? "mendesak" : "tenang",
          },
          {
            kunci: "habis",
            ikon: TrendingDown,
            label: "Barang wajib habis",
            nilai: mandatoryEmptyCount,
            sub: mandatoryEmptyCount > 0 ? "lihat daftarnya" : "✓ semua ada",
            onKlik: mandatoryEmptyCount > 0 ? () => setTab("inventory") : undefined,
            nada: mandatoryEmptyCount > 0 ? "bahaya" : "tenang",
            tingkat: mandatoryEmptyCount > 0 ? "mendesak" : "tenang",
          },
          {
            kunci: "nilai",
            ikon: Package,
            label: "Nilai stok",
            nilai: rupiah(totalNilai),
            sub: "pakan + gudang",
            ke: "/dashboard-stok",
            tingkat: "biasa",
          },
          {
            kunci: "gerak",
            ikon: ArrowUpDown,
            label: "Pergerakan hari ini",
            nilai: `+${todayMasuk} / -${todayKeluar}`,
            sub: "masuk / keluar (unit)",
            onKlik: () => setTab("pergerakan"),
            tingkat: "biasa",
          },
        ]} />
      </PageHeader>

      <BatchLabelModal
        open={labelBatchOpen}
        batches={batchBelumBerlabel}
        onClose={() => setLabelBatchOpen(false)}
      />

      {/* Main tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="inventory" className="gap-1.5">
            <Package className="w-3.5 h-3.5" /> Inventaris
          </TabsTrigger>
          <TabsTrigger value="pergerakan" className="gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5" /> Pergerakan Stok
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
          <StokPergerakanTab movements={movements} feedstocks={feedstocks} warehouseItems={warehouseItems} batches={batchSemua} role={role} />
        </TabsContent>
        {/*
          Tab "Peminjaman" DIBUANG pada 30-09-2026.

          Ia layar peminjaman KEDUA di atas tabel ToolLoan yang sama dengan
          halaman Alat Kerja — dua pintu, satu fungsi, dan keduanya masih
          nol baris. Yang dipertahankan halaman Alat Kerja, karena kiper
          punya hak "alat-kerja" tetapi tidak punya "stock-gudang": tab ini
          tidak pernah bisa mereka buka, halaman itu bisa.

          Sebelum tab ini dibuang, pemilih barang di halaman Alat Kerja
          dilebarkan dari "hanya kategori alat_kerja" menjadi seluruh barang
          gudang, supaya tidak ada yang bisa dipinjam lewat tab ini tapi
          tidak lewat sana.
        */}
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