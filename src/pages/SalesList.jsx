import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, TrendingUp, ShoppingBag, Clock, CreditCard, Pencil, Trash2, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExportButton from "@/components/common/ExportButton";
import ExcludeToggle from "@/components/owner/ExcludeToggle";
import SaleWizard from "@/components/sales/SaleWizard";
import SaleForm from "@/components/sales/SaleForm";
import SaleCard from "@/components/sales/SaleCard";
import SalePrintModal from "@/components/sales/SalePrintModal";
import PaymentProofsSection from "@/components/sales/PaymentProofsSection";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, getPerms, canDelete as canDeleteGlobal } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import PageTooltip from "@/components/tutorial/PageTooltip";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import { WalletArt } from "@/components/common/Illustration";

function fmt(n) { return (n || 0).toLocaleString("id-ID"); }

export default function SalesList() {
  const queryClient = useQueryClient();
  const { user, role } = useCurrentUser();
  const isOwner = role === "owner";
  const perms = getPerms(role, "sales");
  const ownerCanDelete = canDeleteGlobal(role);

  const [showWizard, setShowWizard] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [printSale, setPrintSale] = useState(null);
  const [proofSale, setProofSale] = useState(null);
  const [activeTab, setActiveTab] = useState("semua");
  const [cancelSale, setCancelSale] = useState(null);
  const [cancelEnclosure, setCancelEnclosure] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Filters
  const [filterMonth, setFilterMonth] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("semua");
  const [sortBy, setSortBy] = useState("terbaru");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 300),
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("name", 500),
  });

  // Enrich sales dengan tortoise photo
  const enrichedSales = useMemo(() => sales.map(s => {
    const t = tortoises.find(t2 => t2.id === s.tortoise_id);
    const primaryPhoto = t?.photos?.find(p => p.is_primary)?.url || t?.photos?.[0]?.url || null;
    return { ...s, _tortoise_photo: primaryPhoto };
  }), [sales, tortoises]);

  // Split tabs
  const salesAktif = enrichedSales.filter(s => s.payment_status === "dp" || s.payment_status === "belum_bayar");
  const salesRiwayat = enrichedSales.filter(s => s.payment_status === "lunas");
  const salesSemua = enrichedSales;

  // Filter & sort helper
  const applyFilters = (list) => {
    let result = [...list];
    if (filterMonth) result = result.filter(s => s.sale_date?.startsWith(filterMonth));
    if (filterPlatform !== "semua") result = result.filter(s => s.platform === filterPlatform);
    if (sortBy === "terbaru") result.sort((a, b) => (b.sale_date || "").localeCompare(a.sale_date || ""));
    else if (sortBy === "harga") result.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sortBy === "laba") result.sort((a, b) => ((b.price || 0) - (b.hpp || 0)) - ((a.price || 0) - (a.hpp || 0)));
    return result;
  };

  const filteredAktif = applyFilters(salesAktif);
  const filteredRiwayat = applyFilters(salesRiwayat);
  const filteredSemua = applyFilters(salesSemua);

  const totalRevenue = enrichedSales.filter(s => !s.excluded_from_reports).reduce((sum, s) => sum + (s.price || 0), 0);
  const totalLaba = enrichedSales.filter(s => !s.excluded_from_reports && s.hpp > 0).reduce((sum, s) => sum + (s.price - s.hpp), 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const salesThisMonth = enrichedSales.filter(s => s.sale_date?.startsWith(currentMonth) && !s.excluded_from_reports);
  const revenueThisMonth = salesThisMonth.reduce((sum, s) => sum + (s.price || 0), 0);
  const labaThisMonth = salesThisMonth.filter(s => s.hpp > 0).reduce((sum, s) => sum + (s.price - s.hpp), 0);
  const avgMargin = enrichedSales.filter(s => s.hpp > 0 && s.price > 0).length > 0
    ? Math.round(enrichedSales.filter(s => s.hpp > 0 && s.price > 0).reduce((sum, s) => sum + ((s.price - s.hpp) / s.price * 100), 0) / enrichedSales.filter(s => s.hpp > 0 && s.price > 0).length)
    : 0;

  const handleDelete = async (sale) => {
    if (confirm("Hapus data penjualan ini?")) {
      await base44.entities.Sale.delete(sale.id);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    }
  };

  const handleCancel = async () => {
    if (!cancelSale) return;
    setCancelling(true);
    try {
      // Kembalikan status kura
      await base44.entities.Tortoise.update(cancelSale.tortoise_id, {
        status: cancelSale._prev_status || "aktif",
        enclosure: cancelEnclosure || "",
        last_status_change: new Date().toISOString().split("T")[0],
      });
      // Hapus finance tx terkait
      if (cancelSale.finance_tx_id) {
        await base44.entities.FinanceTransaction.delete(cancelSale.finance_tx_id);
      }
      // Soft cancel sale
      await base44.entities.Sale.update(cancelSale.id, { excluded_from_reports: true, notes: (cancelSale.notes || "") + " [DIBATALKAN]" });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["tortoises"] });
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      setCancelSale(null);
      setCancelEnclosure("");
    } finally {
      setCancelling(false);
    }
  };

  const FilterBar = () => (
    <div className="flex flex-wrap gap-2">
      <Input
        type="month"
        value={filterMonth}
        onChange={e => setFilterMonth(e.target.value)}
        className="w-40 h-9 text-xs"
        placeholder="Filter bulan"
      />
      <Select value={filterPlatform} onValueChange={setFilterPlatform}>
        <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="semua">Semua Platform</SelectItem>
          {["Instagram","Tokopedia","Shopee","WhatsApp","Facebook","Referral","Langsung","Lainnya"].map(p => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Urutan" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="terbaru">Terbaru</SelectItem>
          <SelectItem value="harga">Harga Tertinggi</SelectItem>
          <SelectItem value="laba">Laba Terbesar</SelectItem>
        </SelectContent>
      </Select>
      {(filterMonth || filterPlatform !== "semua") && (
        <button onClick={() => { setFilterMonth(""); setFilterPlatform("semua"); }} className="px-3 h-9 text-xs rounded-lg border border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors">
          ✕ Reset
        </button>
      )}
    </div>
  );

  const SaleListSection = ({ list, showCancel }) => {
    if (list.length === 0) return (
      <div className="text-center py-16 text-muted-foreground">
        <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>Tidak ada data penjualan</p>
      </div>
    );
    return (
      <div className="space-y-3">
        {list.map(s => (
          <div key={s.id} className="group relative">
            <SaleCard sale={s} onDetail={null} onPrint={() => setPrintSale(s)} />
            {/* Admin actions overlay */}
            <div className="absolute top-3 right-3 flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity">
              {isOwner && <ExcludeToggle record={s} entityName="Sale" queryKey={["sales"]} />}
              {perms.canEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Bukti Bayar" onClick={() => setProofSale(s)}>
                  <CreditCard className="w-3.5 h-3.5" />
                </Button>
              )}
              {perms.canEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditData(s); setShowEditForm(true); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
              {isOwner && showCancel && s.tortoise_id && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Batalkan Penjualan"
                  onClick={() => setCancelSale({ ...s, _prev_status: "aktif" })}>
                  <span className="text-xs">↩</span>
                </Button>
              )}
              {ownerCanDelete && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const isInvestor = role === "investor";
  if (!canAccess(role, "sales")) return <AccessDenied />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Penjualan"
        subtitle={`${enrichedSales.length} transaksi · Total Rp ${fmt(totalRevenue)}`}
        icon={DollarSign}
        art={<WalletArt size="md" />}
        chips={[
          { key: "bulan", icon: ShoppingBag, label: "Bulan ini", value: `${salesThisMonth.length} ekor` },
          { key: "omzet", icon: DollarSign, label: "Omzet bulan ini", value: `Rp ${fmt(revenueThisMonth)}` },
          { key: "followup", icon: Clock, label: "Perlu follow-up", value: salesAktif.length,
            tone: salesAktif.length > 0 ? "warn" : "good" },
        ]}
        actions={
          <>
            <PageTooltip page="sales" />
            <ExportButton
              data={sales}
              filename={`penjualan-${new Date().toISOString().split("T")[0]}`}
              title="Data Penjualan"
              columns={[
                {key:"sale_date",label:"Tgl"},{key:"tortoise_name",label:"Kura-kura"},
                {key:"buyer_name",label:"Pembeli"},{key:"hp_whatsapp",label:"HP/WA"},
                {key:"price",label:"Harga"},{key:"hpp",label:"HPP"},{key:"payment_status",label:"Pembayaran"},
                {key:"shipping_method",label:"Pengiriman"},{key:"platform",label:"Platform"},
              ]}
            />
            {perms.canCreate && !isInvestor && (
              <Button onClick={() => setShowWizard(true)} className="hover-lift">
                <Plus className="w-4 h-4 mr-2" /> Catat Penjualan
              </Button>
            )}
          </>
        }
      />

      {/* Summary widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <StatCard label="Bulan Ini" value={`${salesThisMonth.length} ekor`}
          icon={ShoppingBag} color="bg-primary/15 text-primary"
          sub={`Rp ${fmt(revenueThisMonth)}`} />
        <StatCard label="Laba Bulan Ini" value={`Rp ${fmt(labaThisMonth)}`}
          icon={TrendingUp}
          color={labaThisMonth >= 0 ? "bg-accent/15 text-accent" : "bg-red-100 text-red-600"}
          sub={`Margin rata-rata ${avgMargin}%`}
          hint="Hanya penjualan yang HPP-nya sudah diisi yang ikut dihitung. Penjualan tanpa HPP tidak bisa dihitung labanya." />
        <StatCard label="Menunggu Follow-up" value={salesAktif.length}
          icon={Clock} color="bg-amber-100 text-amber-700"
          sub="DP / belum bayar" />
        <StatCard label="Total Terjual" value={enrichedSales.length}
          icon={DollarSign} color="bg-primary/15 text-primary"
          sub={`Rp ${fmt(totalRevenue)}`} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="semua" className="gap-1.5">
            <DollarSign className="w-4 h-4" /> Semua
            <Badge variant="secondary" className="text-[10px] ml-1">{salesSemua.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="aktif" className="gap-1.5">
            <Clock className="w-4 h-4" /> Belum Lunas
            {salesAktif.length > 0 && <Badge className="bg-amber-500 text-white text-[10px] ml-1">{salesAktif.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="gap-1.5">
            <ShoppingBag className="w-4 h-4" /> Lunas
            <Badge variant="secondary" className="text-[10px] ml-1">{salesRiwayat.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="semua" className="mt-4 space-y-4">
          <FilterBar />
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <SaleListSection list={filteredSemua} showCancel={isOwner} />
          )}
        </TabsContent>

        <TabsContent value="aktif" className="mt-4 space-y-4">
          <FilterBar />
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <SaleListSection list={filteredAktif} showCancel={isOwner} />
          )}
        </TabsContent>

        <TabsContent value="riwayat" className="mt-4 space-y-4">
          <FilterBar />
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <SaleListSection list={filteredRiwayat} showCancel={isOwner} />
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showWizard && (
        <SaleWizard open={showWizard} onClose={(success) => {
          setShowWizard(false);
          if (success) queryClient.invalidateQueries({ queryKey: ["sales"] });
        }} />
      )}

      {showEditForm && editData && (
        <SaleForm open={showEditForm} onClose={() => { setShowEditForm(false); setEditData(null); }} editData={editData} />
      )}

      <SalePrintModal
        open={!!printSale}
        onClose={() => setPrintSale(null)}
        sale={printSale}
        tortoise={tortoises.find(t => t.id === printSale?.tortoise_id)}
      />

      {/* Dialog Pembatalan */}
      <Dialog open={!!cancelSale} onOpenChange={o => !o && setCancelSale(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Undo2 className="w-5 h-5" /> Batalkan Penjualan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Yakin batalkan penjualan <strong>{cancelSale?.tortoise_name}</strong> ke <strong>{cancelSale?.buyer_name}</strong>?
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
              ⚠️ Kura akan dikembalikan ke status aktif dan FinanceTransaction terkait akan dihapus.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kembalikan ke Kandang</label>
              <Input
                value={cancelEnclosure}
                onChange={e => setCancelEnclosure(e.target.value)}
                placeholder="cth: W1 (opsional)"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCancelSale(null)} disabled={cancelling}>Batal</Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Membatalkan..." : "✓ Ya, Batalkan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!proofSale} onOpenChange={o => !o && setProofSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Bukti Pembayaran — {proofSale?.tortoise_name}
            </DialogTitle>
          </DialogHeader>
          {proofSale && (
            <PaymentProofsSection
              sale={sales.find(s => s.id === proofSale.id) || proofSale}
              onUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ["sales"] });
                setProofSale(prev => sales.find(s => s.id === prev?.id) || prev);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}