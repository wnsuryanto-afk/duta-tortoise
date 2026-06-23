import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Search, MessageCircle, MapPin, Phone, Shell, RefreshCw } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { useCurrentUser } from "@/lib/useCurrentUser";
import BuyerForm from "@/components/crm/BuyerForm";
import AccessDenied from "@/components/common/AccessDenied";
import SaleWizard from "@/components/sales/SaleWizard";

const formatRp = n => `Rp ${(n || 0).toLocaleString("id-ID")}`;
const formatDate = d => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

export default function CRMPage() {
  const { role } = useCurrentUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState(null);
  const [riwayatBuyer, setRiwayatBuyer] = useState(null); // { buyer, sales[] }
  const [jualKeBuyer, setJualKeBuyer] = useState(null); // pre-select buyer in SaleWizard

  const [syncingId, setSyncingId] = useState(null);
  const cmCanAccess = ["owner", "admin", "manajer"].includes(role);
  const canEdit = ["owner", "admin"].includes(role);

  const handleSyncBuyer = async (buyer) => {
    setSyncingId(buyer.id);
    await base44.functions.invoke("recalculateBuyerProfiles", { buyer_profile_id: buyer.id });
    await queryClient.invalidateQueries({ queryKey: ["buyer-profiles"] });
    setSyncingId(null);
  };

  const { data: buyersRaw = [], isLoading } = useQuery({
    queryKey: ["buyer-profiles"],
    queryFn: () => base44.entities.BuyerProfile.list("-last_purchase_date", 500),
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ["sales-all-crm"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 1000),
  });

  // Index sales by buyer_profile_id for quick lookup
  const salesByBuyer = useMemo(() => {
    const map = {};
    allSales.forEach(s => {
      if (s.buyer_profile_id) {
        if (!map[s.buyer_profile_id]) map[s.buyer_profile_id] = [];
        map[s.buyer_profile_id].push(s);
      }
    });
    return map;
  }, [allSales]);

  const buyers = buyersRaw.filter(b => !b.is_blacklist);

  // Stats
  const repeatBuyers = buyers.filter(b => b.is_repeat_buyer);
  const new30Days = buyers.filter(b => b.first_purchase_date && differenceInDays(new Date(), parseISO(b.first_purchase_date)) <= 30);
  const totalPembeli = buyers.length;

  const filtered = buyers.filter(b => {
    if (!search) return true;
    return b.name?.toLowerCase().includes(search.toLowerCase()) || (b.hp_whatsapp || "").includes(search);
  });

  // ── Riwayat Detail Dialog ──
  const buyerSales = riwayatBuyer ? (salesByBuyer[riwayatBuyer.id] || []) : [];
  const totalRiwayat = buyerSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  const waNumber = (phone) => (phone || "").replace(/\D/g, "").replace(/^0/, "62");

  if (!cmCanAccess) return <AccessDenied />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-xl"><Users className="w-6 h-6 text-yellow-700" /></div>
          <div>
            <h1 className="text-2xl font-bold">CRM — Daftar Pembeli</h1>
            <p className="text-sm text-muted-foreground">{totalPembeli} pembeli terdaftar</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Pembeli
          </Button>
        )}
      </div>

      {/* Stats mini */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Pembeli", value: totalPembeli, icon: "👥" },
          { label: "Baru (30 Hari)", value: new30Days.length, icon: "🌱" },
          { label: "Repeat Buyer", value: repeatBuyers.length, icon: "🔄" },
          { label: "Total Belanja", value: formatRp(buyers.reduce((s, b) => s + (b.total_spent || 0), 0)), icon: "💰", isString: true },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`${s.isString ? "text-sm" : "text-xl"} font-bold`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari nama atau nomor HP..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Memuat data pembeli...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Belum ada pembeli terdaftar</p>
          <p className="text-sm">Data pembeli otomatis terisi dari pencatatan penjualan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(b => {
            const buyerSalesList = salesByBuyer[b.id] || [];
            const totalBelanja = b.total_spent || 0;
            return (
              <Card key={b.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl">👤</span>
                        <span className="font-semibold">{b.name}</span>
                      </div>
                      {b.hp_whatsapp && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="w-3 h-3" /> {b.hp_whatsapp}
                        </div>
                      )}
                      {b.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {b.city}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {b.is_repeat_buyer && <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">⭐ Pembeli Setia</Badge>}
                      <a href={`https://wa.me/${waNumber(b.hp_whatsapp)}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700 border-green-300">
                          <MessageCircle className="w-3 h-3" /> WA
                        </Button>
                      </a>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 rounded-lg p-2.5">
                    <div>
                      <span className="text-muted-foreground">Total pembelian:</span>
                      <span className="font-semibold ml-1">{b.total_purchases || 0} ekor</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total belanja:</span>
                      <span className="font-semibold ml-1">{formatRp(totalBelanja)}</span>
                    </div>
                    {b.last_purchase_date && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Terakhir beli:</span>
                        <span className="ml-1">{formatDate(b.last_purchase_date)}</span>
                      </div>
                    )}
                    {b.last_purchased_tortoise && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Kura terakhir:</span>
                        <span className="ml-1 font-medium">{b.last_purchased_tortoise}</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-8"
                      onClick={() => setRiwayatBuyer(b)}
                    >
                      Lihat Riwayat
                    </Button>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 px-2"
                        onClick={() => setEditingBuyer(b)}
                      >
                        ✏️
                      </Button>
                    )}
                  </div>

                  {canEdit && (
                    <Button
                      size="sm"
                      className="w-full gap-1 bg-green-700 hover:bg-green-800 h-8 text-xs"
                      onClick={() => setJualKeBuyer(b)}
                    >
                      🛒 Jual Lagi ke Pembeli Ini
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Tambah/Edit Buyer ── */}
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tambah Profil Pembeli</DialogTitle></DialogHeader>
          <BuyerForm onSave={() => { queryClient.invalidateQueries({ queryKey: ["buyer-profiles"] }); setShowForm(false); }} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {editingBuyer && (
        <Dialog open onOpenChange={() => setEditingBuyer(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit: {editingBuyer.name}</DialogTitle></DialogHeader>
            <BuyerForm data={editingBuyer} onSave={() => { queryClient.invalidateQueries({ queryKey: ["buyer-profiles"] }); setEditingBuyer(null); }} onClose={() => setEditingBuyer(null)} />
          </DialogContent>
        </Dialog>
      )}

      {/* ── Riwayat Pembelian ── */}
      {riwayatBuyer && (
        <Dialog open onOpenChange={() => setRiwayatBuyer(null)}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Riwayat Pembelian — {riwayatBuyer.name}
                {riwayatBuyer.is_repeat_buyer && <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">⭐ Setia</Badge>}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-3 bg-muted/40 rounded-xl flex gap-4 text-sm">
                <div><span className="text-muted-foreground">Total:</span> <strong>{buyerSales.length} transaksi</strong></div>
                <div><span className="text-muted-foreground">Nilai:</span> <strong>{formatRp(totalRiwayat)}</strong></div>
              </div>

              {buyerSales.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada riwayat penjualan terhubung</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {buyerSales.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Shell className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{s.tortoise_name || "-"} {s.tortoise_code && <span className="font-mono text-xs text-muted-foreground">({s.tortoise_code})</span>}</p>
                        <p className="text-xs text-muted-foreground">{s.sale_date} · {formatRp(s.price)}</p>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${s.payment_status === "lunas" ? "bg-green-50 text-green-700 border-green-200" : s.payment_status === "dp" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                        {{ lunas: "Lunas", dp: "DP", belum_bayar: "Belum" }[s.payment_status] || s.payment_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="outline"
                    className="gap-1.5 text-xs"
                    disabled={syncingId === riwayatBuyer.id}
                    onClick={() => handleSyncBuyer(riwayatBuyer)}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingId === riwayatBuyer.id ? "animate-spin" : ""}`} />
                    Sinkronkan Ulang
                  </Button>
                )}
                <Button
                  className="flex-1 gap-2 bg-green-700 hover:bg-green-800"
                  onClick={() => { setRiwayatBuyer(null); setJualKeBuyer(riwayatBuyer); }}
                >
                  🛒 Jual Lagi ke {riwayatBuyer.name}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── SaleWizard dengan pembeli terpilih ── */}
      {jualKeBuyer && (
        <SaleWizard
          open={!!jualKeBuyer}
          onClose={() => setJualKeBuyer(null)}
          preselectedBuyer={jualKeBuyer}
        />
      )}
    </div>
  );
}