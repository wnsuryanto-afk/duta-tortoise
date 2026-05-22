import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Search, MessageCircle, AlertTriangle, Loader2 } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import useCurrentUser from "@/lib/useCurrentUser";
import BuyerForm from "@/components/crm/BuyerForm";
import BuyerDetail from "@/components/crm/BuyerDetail";
import AccessDenied from "@/components/common/AccessDenied";

const TIER_CONFIG = {
  vip: { color: "bg-yellow-100 text-yellow-800", label: "VIP 👑", border: "border-yellow-300" },
  reguler: { color: "bg-blue-100 text-blue-800", label: "Reguler ⭐", border: "border-blue-200" },
  baru: { color: "bg-green-100 text-green-800", label: "Baru 🌱", border: "border-green-200" },
};

function calcTier(buyer) {
  if ((buyer.total_spent || 0) >= 10000000) return "vip";
  if ((buyer.total_spent || 0) >= 2000000) return "reguler";
  return "baru";
}

const formatRp = n => `Rp ${(n || 0).toLocaleString("id-ID")}`;

export default function CRMPage() {
  const { role } = useCurrentUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("semua");
  const [filterPlatform, setFilterPlatform] = useState("semua");
  const [showForm, setShowForm] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState(null);

  const canEdit = ["owner", "admin"].includes(role);

  const { data: buyers = [], isLoading } = useQuery({
    queryKey: ["buyer-profiles"],
    queryFn: () => base44.entities.BuyerProfile.list("-last_purchase_date"),
  });

  const today = new Date();

  // VIP not buying > 60 days
  const vipAlerts = useMemo(() => buyers.filter(b => {
    const tier = calcTier(b);
    if (tier !== "vip") return false;
    if (!b.last_purchase_date) return true;
    return differenceInDays(today, parseISO(b.last_purchase_date)) > 60;
  }), [buyers]);

  // Stats
  const thisMonth = new Date(); thisMonth.setDate(1);
  const newThisMonth = buyers.filter(b => b.first_purchase_date && new Date(b.first_purchase_date) >= thisMonth).length;
  const repeatBuyers = buyers.filter(b => (b.total_purchases || 0) > 1).length;
  const repeatRate = buyers.length > 0 ? ((repeatBuyers / buyers.length) * 100).toFixed(0) : 0;
  const topBuyers = [...buyers].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0)).slice(0, 3);

  const filtered = buyers.filter(b => !b.is_blacklist).filter(b => {
    const matchSearch = !search || b.name?.toLowerCase().includes(search.toLowerCase()) || b.phone?.includes(search);
    const matchTier = filterTier === "semua" || calcTier(b) === filterTier;
    const matchPlatform = filterPlatform === "semua" || b.platform_asal === filterPlatform;
    return matchSearch && matchTier && matchPlatform;
  });

  if (!["owner", "admin", "manajer"].includes(role)) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-xl"><Users className="w-6 h-6 text-yellow-700" /></div>
          <div>
            <h1 className="text-2xl font-bold">CRM Pembeli</h1>
            <p className="text-sm text-muted-foreground">{buyers.length} profil pembeli</p>
          </div>
        </div>
        {canEdit && <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" /> Tambah Pembeli</Button>}
      </div>

      {/* Stats mini */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Pembeli", value: buyers.length, icon: "👥" },
          { label: "Baru Bulan Ini", value: newThisMonth, icon: "🌱" },
          { label: "Repeat Buyer", value: `${repeatRate}%`, icon: "🔄" },
          { label: "VIP", value: buyers.filter(b => calcTier(b) === "vip").length, icon: "👑" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* VIP Alerts */}
      {vipAlerts.length > 0 && (
        <div className="space-y-2">
          {vipAlerts.map(b => (
            <div key={b.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>VIP <strong>{b.name}</strong> tidak beli sejak {b.last_purchase_date ? `${differenceInDays(today, parseISO(b.last_purchase_date))} hari lalu` : "belum pernah"}.</span>
              <button className="ml-auto text-xs underline" onClick={() => setSelectedBuyer(b)}>Lihat Profil</button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama / telepon..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Semua Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Tier</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="reguler">Reguler</SelectItem>
            <SelectItem value="baru">Baru</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Semua Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Platform</SelectItem>
            {["Instagram","Tokopedia","Shopee","WhatsApp","Referral","Langsung","Lainnya"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Tidak ada pembeli ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(b => {
            const tier = calcTier(b);
            const cfg = TIER_CONFIG[tier];
            return (
              <Card key={b.id} className={`hover:shadow-md transition-shadow cursor-pointer border-l-4 ${cfg.border}`} onClick={() => setSelectedBuyer(b)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-semibold">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.phone}{b.city ? ` · ${b.city}` : ""}</div>
                    </div>
                    <Badge className={`${cfg.color} border-0 text-xs shrink-0`}>{cfg.label}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                    <div><span className="text-muted-foreground">Transaksi: </span><span className="font-medium">{b.total_purchases || 0}x</span></div>
                    <div><span className="text-muted-foreground">Total: </span><span className="font-medium">{formatRp(b.total_spent)}</span></div>
                    {b.favorite_morph && <div className="col-span-2"><span className="text-muted-foreground">Favorit: </span>{b.favorite_morph}</div>}
                    {b.platform_asal && <div className="col-span-2"><span className="text-muted-foreground">Dari: </span>{b.platform_asal}</div>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tambah Profil Pembeli</DialogTitle></DialogHeader>
          <BuyerForm onSave={() => { queryClient.invalidateQueries({ queryKey: ["buyer-profiles"] }); setShowForm(false); }} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {selectedBuyer && (
        <BuyerDetail
          buyer={selectedBuyer}
          calcTier={calcTier}
          onClose={() => setSelectedBuyer(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["buyer-profiles"] })}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}