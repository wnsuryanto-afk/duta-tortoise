import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, ChevronRight, ChevronLeft, Shell, User, DollarSign, CheckCircle2, TrendingUp, TrendingDown, Search, Info } from "lucide-react";
import { useTestMode } from "@/lib/useTestMode";
import { useCostPerTortoise, calcCareCost } from "@/hooks/useCostPerTortoise";
import { format, differenceInMonths } from "date-fns";

const STEPS = ["Pilih Kura", "Data Pembeli", "Detail Penjualan", "Review & Simpan"];

const speciesLabel = { sulcata:"Sulcata", red_foot:"Red Foot", leopard:"Leopard", aldabra:"Aldabra", russian:"Russian", hermann:"Hermann", greek:"Greek", indian_star:"Indian Star", lainnya:"Lainnya" };
const genderLabel = { jantan:"♂ Jantan", betina:"♀ Betina", belum_diketahui:"?" };
const morphLabel = { normal:"Normal", het_albino:"Het Albino", albino:"Albino", ivory:"Ivory", hypo:"Hypo", caramel_albino:"Caramel Albino", high_yellow:"High Yellow", unknown:"Unknown" };

// Hitung umur biologis (display only)
function calcAgeMonths(birthDate) {
  if (!birthDate) return null;
  return differenceInMonths(new Date(), new Date(birthDate));
}

// Hitung bulan di farm — prioritas: purchase_date → created_date → birth_date (hasil_sendiri)
function calcFarmMonths(tortoise, endDate) {
  if (!tortoise) return 0;
  const end = endDate ? new Date(endDate) : new Date();
  // Kura hasil sendiri: pakai birth_date (lahir di farm)
  if (tortoise.source === "hasil_sendiri" && tortoise.birth_date) {
    return Math.max(0, differenceInMonths(end, new Date(tortoise.birth_date)));
  }
  // Prioritas: purchase_date → created_date
  const entryDate = tortoise.purchase_date || tortoise.created_date;
  if (entryDate) {
    return Math.max(0, differenceInMonths(end, new Date(entryDate)));
  }
  return 0;
}

function fmt(n) { return (n || 0).toLocaleString("id-ID"); }

// ── STEP 1: Pilih Kura ──
function StepPilihKura({ tortoises, allSales, selectedId, onSelect }) {
  const [search, setSearch] = useState("");

  // Section 1: Active/Breeding/Baby
  const activeTortoises = tortoises.filter(t =>
    t.status === "aktif" || t.status === "breeding" || t.status === "baby"
  );

  // Section 2: Terjual but no Sale record
  const saleTortoiseIds = new Set(allSales.map(s => s.tortoise_id).filter(Boolean));
  const terjualNoSale = tortoises.filter(t =>
    t.status === "terjual" && !saleTortoiseIds.has(t.id)
  );

  const filteredActive = activeTortoises.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.code?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredTerjualNoSale = terjualNoSale.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.code?.toLowerCase().includes(search.toLowerCase())
  );

  const selected = tortoises.find(t => t.id === selectedId);

  const primaryPhoto = (t) => {
    const primary = t.photos?.find(p => p.is_primary);
    return primary?.url || t.photos?.[0]?.url || null;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Cari nama atau kode kura..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {selected && (
        <div className="p-4 bg-green-50 border-2 border-green-400 rounded-xl">
          <div className="flex gap-4 items-start">
            {primaryPhoto(selected) ? (
              <img src={primaryPhoto(selected)} alt={selected.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Shell className="w-7 h-7 text-green-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-green-900">{selected.name}</h3>
                {selected.code && <Badge variant="outline" className="text-xs font-mono">{selected.code}</Badge>}
                <Badge className="bg-green-100 text-green-800 text-xs">✓ Dipilih</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                <span><span className="text-muted-foreground">Spesies:</span> {speciesLabel[selected.species] || selected.species || "-"}</span>
                <span><span className="text-muted-foreground">Gender:</span> {genderLabel[selected.gender] || selected.gender || "-"}</span>
                <span><span className="text-muted-foreground">Morph:</span> {morphLabel[selected.morph] || selected.morph || "-"}</span>
                <span><span className="text-muted-foreground">Kandang:</span> {selected.enclosure || "-"}</span>
                <span><span className="text-muted-foreground">Berat:</span> {selected.weight_grams ? `${selected.weight_grams.toLocaleString("id-ID")} g` : "-"}</span>
                <span><span className="text-muted-foreground">Karapas:</span> {selected.shell_length_cm ? `${selected.shell_length_cm} cm` : "-"}</span>
                {selected.birth_date && (
                  <span><span className="text-muted-foreground">Umur:</span> {calcAgeMonths(selected.birth_date)} bulan</span>
                )}
                <span><span className="text-muted-foreground">Harga Beli:</span> {selected.purchase_price ? `Rp ${fmt(selected.purchase_price)}` : "Tidak tercatat"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-4 pr-1">
        {/* Section 1: Aktif */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
            🟢 Kura Aktif ({filteredActive.length})
          </p>
          {filteredActive.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 px-1">Tidak ada kura aktif</p>
          ) : (
            filteredActive.map(t => {
              const isSelected = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors mb-1.5 ${isSelected ? "border-green-500 bg-green-50" : "border-border hover:bg-muted"}`}
                >
                  {primaryPhoto(t) ? (
                    <img src={primaryPhoto(t)} alt={t.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Shell className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{t.name} {t.code && <span className="font-mono text-xs text-muted-foreground">({t.code})</span>}</p>
                    <p className="text-xs text-muted-foreground">{speciesLabel[t.species] || t.species} · {t.gender} · {t.enclosure || "Tanpa Kandang"}</p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {/* Section 2: Terjual — Belum Ada Data */}
        {terjualNoSale.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1.5 px-1">
              ⚠️ Terjual — Belum Ada Data Penjualan ({terjualNoSale.length})
            </p>
            <p className="text-xs text-amber-600 mb-2 px-1">
              Kura ini sudah berstatus terjual tapi belum tercatat penjualannya. Isi data penjualan di sini.
            </p>
            {filteredTerjualNoSale.length === 0 && search ? (
              <p className="text-sm text-muted-foreground py-2 px-1">Tidak ada yang cocok dengan pencarian</p>
            ) : (
              filteredTerjualNoSale.map(t => {
                const isSelected = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelect(t.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors mb-1.5 ${isSelected ? "border-amber-500 bg-amber-50" : "border-amber-200 bg-amber-50/50 hover:bg-amber-100"}`}
                  >
                    {primaryPhoto(t) ? (
                      <img src={primaryPhoto(t)} alt={t.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Shell className="w-5 h-5 text-amber-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{t.name} {t.code && <span className="font-mono text-xs text-muted-foreground">({t.code})</span>}</p>
                      <p className="text-xs text-amber-600">Status terjual — belum ada data penjualan</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        )}

        {filteredActive.length === 0 && terjualNoSale.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Tidak ada kura yang bisa dijual</p>
        )}
      </div>
    </div>
  );
}

// ── STEP 2: Data Pembeli ──
function StepDataPembeli({ form, onChange, errors }) {
  const { data: buyers = [] } = useQuery({
    queryKey: ["buyer-profiles"],
    queryFn: () => base44.entities.BuyerProfile.list("-last_purchase_date", 200),
  });

  const [buyerSearch, setBuyerSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = buyers.filter(b =>
    buyerSearch && (b.name?.toLowerCase().includes(buyerSearch.toLowerCase()) || b.hp_whatsapp?.includes(buyerSearch))
  );

  const selectBuyer = (b) => {
    onChange("buyer_name", b.name || "");
    onChange("hp_whatsapp", b.hp_whatsapp || "");
    onChange("buyer_city", b.city || "");
    onChange("buyer_address", b.buyer_address || "");
    onChange("buyer_profile_id", b.id || "");
    setBuyerSearch(b.name || "");
    setShowSuggestions(false);
  };

  const selectedBuyer = form.buyer_profile_id ? buyers.find(b => b.id === form.buyer_profile_id) : null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 relative">
        <Label>Cari Pembeli Lama</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Ketik nama pembeli untuk cari..."
            value={buyerSearch}
            onChange={e => { setBuyerSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            className="pl-9"
          />
        </div>
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute z-50 w-full bg-card border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
            {filtered.map(b => (
              <button key={b.id} type="button" onClick={() => selectBuyer(b)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors">
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.hp_whatsapp}{b.city ? ` · ${b.city}` : ""}</p>
                </div>
                {b.is_repeat_buyer && <Badge className="ml-auto bg-amber-100 text-amber-700 text-[10px]">⭐ Setia</Badge>}
              </button>
            ))}
          </div>
        )}
        {showSuggestions && buyerSearch && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">Tidak ditemukan — isi form di bawah untuk pembeli baru</p>
        )}
      </div>

      {/* Repeat buyer info */}
      {selectedBuyer && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          {selectedBuyer.is_repeat_buyer ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-100 text-amber-800 text-xs border-0">⭐ Pelanggan Setia</Badge>
              <span className="text-blue-800">
                Sudah beli <strong>{selectedBuyer.total_purchases || 0} ekor</strong>
                {selectedBuyer.last_purchased_tortoise ? ` — terakhir: ${selectedBuyer.last_purchased_tortoise}` : ""}
                {selectedBuyer.last_purchase_date ? ` (${selectedBuyer.last_purchase_date})` : ""}
              </span>
            </div>
          ) : (
            <span className="text-blue-800">Pembeli baru — transaksi pertama</span>
          )}
        </div>
      )}

      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Data Pembeli</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nama Pembeli <span className="text-red-500">*</span></Label>
              <Input value={form.buyer_name} onChange={e => onChange("buyer_name", e.target.value)} className={errors.buyer_name ? "border-red-500" : ""} />
              {errors.buyer_name && <p className="text-xs text-red-500">{errors.buyer_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>No. HP / WhatsApp <span className="text-red-500">*</span></Label>
              <Input value={form.hp_whatsapp} onChange={e => onChange("hp_whatsapp", e.target.value)} placeholder="08123456789" className={errors.hp_whatsapp ? "border-red-500" : ""} />
              {errors.hp_whatsapp && <p className="text-xs text-red-500">{errors.hp_whatsapp}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Alamat</Label>
            <Textarea value={form.buyer_address} onChange={e => onChange("buyer_address", e.target.value)} rows={2} placeholder="Alamat lengkap pembeli" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kota</Label>
              <Input value={form.buyer_city || ""} onChange={e => onChange("buyer_city", e.target.value)} placeholder="cth: Surabaya" />
            </div>
            <div className="space-y-1.5">
              <Label>Platform Asal</Label>
              <Select value={form.platform || ""} onValueChange={v => onChange("platform", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  {["Instagram","Tokopedia","Shopee","WhatsApp","Facebook","Referral","Langsung","Lainnya"].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── STEP 3: Detail Penjualan ──
function StepDetailPenjualan({ form, onChange, errors }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Harga Jual (Rp) <span className="text-red-500">*</span></Label>
          <Input type="number" min="0" value={form.price} onChange={e => onChange("price", e.target.value)} className={errors.price ? "border-red-500" : ""} placeholder="0" />
          {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Ongkos Kirim (Rp)</Label>
          <Input type="number" min="0" value={form.shipping_cost} onChange={e => onChange("shipping_cost", e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Metode Pengiriman <span className="text-red-500">*</span></Label>
          <Select value={form.shipping_method} onValueChange={v => onChange("shipping_method", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ambil_sendiri">Ambil Sendiri</SelectItem>
              <SelectItem value="kirim_kurir">Kirim Kurir</SelectItem>
              <SelectItem value="cargo">Cargo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status Pembayaran <span className="text-red-500">*</span></Label>
          <Select value={form.payment_status} onValueChange={v => onChange("payment_status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lunas">Lunas</SelectItem>
              <SelectItem value="dp">DP</SelectItem>
              <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {form.payment_status === "dp" && (
        <div className="space-y-1.5">
          <Label>Jumlah DP (Rp)</Label>
          <Input type="number" min="0" value={form.dp_amount || ""} onChange={e => onChange("dp_amount", e.target.value)} placeholder="0" />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Tanggal Penjualan <span className="text-red-500">*</span></Label>
        <Input type="date" value={form.sale_date} onChange={e => onChange("sale_date", e.target.value)} className={errors.sale_date ? "border-red-500" : ""} />
        {errors.sale_date && <p className="text-xs text-red-500">{errors.sale_date}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Catatan</Label>
        <Textarea value={form.notes} onChange={e => onChange("notes", e.target.value)} rows={2} placeholder="Opsional" />
      </div>
    </div>
  );
}

// ── STEP 4: Review HPP & Laba ──
function StepReview({ form, tortoise, costData }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const biayaPerBulan = costData?.biayaPerEkor || 100000;
  const isDataAktual = costData?.isDataAktual;
  const farmMonths = calcFarmMonths(tortoise, form.sale_date);

  // Determine purchase price: use form input > tortoise data > 0
  const isHasilSendiri = tortoise?.source === "hasil_sendiri" || tortoise?.code?.startsWith?.("BB-");
  const purchasePrice = isHasilSendiri ? 0 :
    form.purchase_price_input !== "" ? Number(form.purchase_price_input) || 0 :
    tortoise?.purchase_price || 0;
  const purchasePriceEmpty = !isHasilSendiri && purchasePrice === 0;

  const estimasiPerawatan = farmMonths * biayaPerBulan;
  const shippingCost = Number(form.shipping_cost) || 0;
  const totalHpp = purchasePrice + estimasiPerawatan + shippingCost;
  const price = Number(form.price) || 0;
  const laba = price - totalHpp;
  const margin = price > 0 ? Math.round((laba / price) * 100) : 0;

  // Tentukan tanggal masuk farm untuk display
  const entryDateRaw = isHasilSendiri ? tortoise?.birth_date : (tortoise?.purchase_date || tortoise?.created_date);
  const entryLabel = isHasilSendiri ? "Lahir di farm" : "Masuk farm";
  const monthNames = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
  const entryDisplay = entryDateRaw ? (() => {
    const [y, m, d] = entryDateRaw.split("-");
    return `${parseInt(d)} ${monthNames[parseInt(m)-1]} ${y}`;
  })() : null;

  const Row = ({ label, value, bold, className = "", sub }) => (
    <div className={`${bold ? "font-semibold" : ""} ${className}`}>
      <div className="flex justify-between items-center py-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm ${bold ? "text-foreground" : ""}`}>{value}</span>
      </div>
      {sub && <p className="text-[10px] text-muted-foreground ml-0 -mt-1 mb-1">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* HPP Breakdown */}
      <div className="bg-muted/40 rounded-xl p-4 space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">📊 Perhitungan HPP</p>

        {/* Purchase price row */}
        {isHasilSendiri ? (
          <Row label="Harga Beli / Kulakan" value="Rp 0"
            sub="🐣 Hasil penetasan sendiri — harga beli Rp 0" />
        ) : purchasePriceEmpty ? (
          <Row label="Harga Beli / Kulakan" value="Rp 0"
            sub="ℹ️ Harga beli tidak diisi — HPP hanya dari biaya perawatan + ongkir" />
        ) : (
          <Row label="Harga Beli / Kulakan" value={`Rp ${fmt(purchasePrice)}`} />
        )}

        <Row
          label={
            <span className="inline-flex items-center gap-1">
              Biaya Perawatan
              <button type="button" onClick={() => setShowTooltip(!showTooltip)} className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 text-[10px] font-bold text-muted-foreground leading-none">?</button>
            </span>
          }
          value={`Rp ${fmt(estimasiPerawatan)}`}
          sub={<>{farmMonths} bulan × Rp {fmt(biayaPerBulan)}/bln · {entryLabel}: {entryDisplay || "tidak diketahui"} · <span className={isDataAktual ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>{isDataAktual ? "Data aktual" : "Estimasi default"}</span></>}
        />

        {showTooltip && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800 space-y-0.5">
            <p className="font-semibold">Estimasi Rp 150.000/bulan mencakup:</p>
            <p>• Pakan (sayur, pelet, hay): ~Rp 75.000</p>
            <p>• Vitamin & suplemen: ~Rp 25.000</p>
            <p>• Obat preventif: ~Rp 15.000</p>
            <p>• Listrik/air pro-rata: ~Rp 25.000</p>
            <p>• Substrat/pasir: ~Rp 10.000</p>
            <p className="text-[10px] mt-1 italic">Catatan: ini estimasi rata-rata, bukan kumulatif aktual.</p>
          </div>
        )}

        <Row label="Ongkos Kirim" value={`Rp ${fmt(shippingCost)}`} />
        <div className="border-t mt-2 pt-2">
          <Row label="TOTAL HPP" value={`Rp ${fmt(totalHpp)}`} bold />
        </div>
        {farmMonths === 0 && !isHasilSendiri && (
          <p className="text-[11px] text-amber-600 mt-1">⚠️ Tanggal masuk farm tidak diketahui, estimasi perawatan = Rp 0</p>
        )}
      </div>

      {/* Laba */}
      <div className={`rounded-xl p-4 ${laba >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        <div className="flex items-center gap-2 mb-3">
          {laba >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Laba Penjualan</p>
        </div>
        <div className="space-y-1">
          <Row label="Harga Jual" value={`Rp ${fmt(price)}`} />
          <Row label="HPP" value={`-Rp ${fmt(totalHpp)}`} />
          <div className="border-t mt-2 pt-2">
            <div className="flex justify-between items-center">
              <span className="font-bold">💰 LABA BERSIH</span>
              <span className={`text-xl font-bold ${laba >= 0 ? "text-green-700" : "text-red-700"}`}>
                Rp {fmt(laba)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-muted-foreground">📈 Margin</span>
              <span className={`text-sm font-semibold ${laba >= 0 ? "text-green-600" : "text-red-600"}`}>
                {margin}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Ringkasan Transaksi</p>
        <Row label="Kura-kura" value={`${tortoise?.name} (${tortoise?.code || "-"})`} />
        <Row label="Pembeli" value={form.buyer_name} />
        <Row label="HP/WA" value={form.hp_whatsapp} />
        <Row label="Tanggal" value={form.sale_date} />
        <Row label="Pembayaran" value={{ lunas: "Lunas", dp: "DP", belum_bayar: "Belum Bayar" }[form.payment_status]} />
        <Row label="Pengiriman" value={{ ambil_sendiri: "Ambil Sendiri", kirim_kurir: "Kurir", cargo: "Cargo" }[form.shipping_method]} />
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        {tortoise?.status === "terjual"
          ? "⚠️ Kura ini sudah berstatus Terjual sebelumnya. Hanya data penjualan yang akan tercatat (status tidak berubah)."
          : "⚠️ Setelah simpan: status kura otomatis berubah ke Terjual, dilepas dari kandang, dan transaksi keuangan dibuat otomatis."}
      </div>
    </div>
  );
}

// ── MAIN WIZARD ──
export default function SaleWizard({ open, onClose, preSelectedTortoiseId, preselectedBuyer }) {
  const queryClient = useQueryClient();
  const { testModeTag } = useTestMode();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [initialized, setInitialized] = useState(false);

  const [form, setForm] = useState({
    tortoise_id: "", tortoise_name: "",
    buyer_name: "", hp_whatsapp: "", buyer_address: "", buyer_city: "", buyer_profile_id: "",
    price: "", shipping_cost: 0, payment_status: "lunas", shipping_method: "ambil_sendiri",
    platform: "", sale_date: new Date().toISOString().split("T")[0], notes: "", dp_amount: "",
    purchase_price_input: "",
  });
  const [errors, setErrors] = useState({});

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-sale"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 2000),
  });

  // Fetch sales to check which terjual tortoises have no Sale record
  const { data: allSales = [] } = useQuery({
    queryKey: ["sales-all"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 500),
  });

  // Fetch buyers for repeat-buyer tracking & handleSave
  const { data: buyers = [] } = useQuery({
    queryKey: ["buyer-profiles"],
    queryFn: () => base44.entities.BuyerProfile.list("-last_purchase_date", 200),
  });

  // Auto-select preSelectedTortoiseId on mount
  useEffect(() => {
    if (preSelectedTortoiseId && tortoises.length > 0 && !initialized) {
      const t = tortoises.find(t2 => t2.id === preSelectedTortoiseId);
      if (t) {
        onChange("tortoise_id", t.id);
        onChange("tortoise_name", t.name || "");
        setInitialized(true);
      }
    }
  }, [preSelectedTortoiseId, tortoises, initialized]);

  // Auto-fill buyer data from preselectedBuyer
  useEffect(() => {
    if (preselectedBuyer && !initialized) {
      onChange("buyer_name", preselectedBuyer.name || "");
      onChange("hp_whatsapp", preselectedBuyer.hp_whatsapp || "");
      onChange("buyer_city", preselectedBuyer.city || "");
      onChange("buyer_address", preselectedBuyer.buyer_address || "");
      onChange("buyer_profile_id", preselectedBuyer.id || "");
      onChange("platform", preselectedBuyer.platform_asal || "");
      // Jump to step 1 (Data Pembeli) so user can review then proceed
      setStep(1);
      setInitialized(true);
    }
  }, [preselectedBuyer, initialized]);

  const selectedTortoise = tortoises.find(t => t.id === form.tortoise_id);

  // Fetch actual cost data
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const costData = useCostPerTortoise(currentPeriod);

  const onChange = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    setErrors(p => ({ ...p, [field]: "" }));
  };

  const validateStep = () => {
    const e = {};
    if (step === 0 && !form.tortoise_id) e.tortoise_id = "Pilih kura dulu";
    if (step === 1) {
      if (!form.buyer_name?.trim()) e.buyer_name = "Wajib diisi";
      if (!form.hp_whatsapp?.trim()) e.hp_whatsapp = "Wajib diisi";
    }
    if (step === 2) {
      if (!form.price) e.price = "Wajib diisi";
      if (!form.sale_date) e.sale_date = "Wajib diisi";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  const calcHpp = () => {
    const isHasilSendiri = selectedTortoise?.source === "hasil_sendiri" || selectedTortoise?.code?.startsWith?.("BB-");
    // Use form input if filled, else fallback to tortoise.purchase_price, hasil_sendiri always 0
    const purchasePrice = isHasilSendiri ? 0 :
      form.purchase_price_input !== "" ? Number(form.purchase_price_input) || 0 :
      selectedTortoise?.purchase_price || 0;
    const biayaPerBulan = costData?.biayaPerEkor || 100000;
    const farmMonths = calcFarmMonths(selectedTortoise, form.sale_date);
    const estimasiPerawatan = farmMonths * biayaPerBulan;
    const shippingCost = Number(form.shipping_cost) || 0;
    return purchasePrice + estimasiPerawatan + shippingCost;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const hpp = calcHpp();
      const price = Number(form.price);
      const today = new Date().toISOString().split("T")[0];

      // B) Create Sale record
      const saleData = {
        ...form,
        price,
        shipping_cost: Number(form.shipping_cost) || 0,
        hpp,
        dp_amount: form.payment_status === "dp" ? (Number(form.dp_amount) || 0) : 0,
        ...testModeTag,
      };
      const newSale = await base44.entities.Sale.create(saleData);

      // A) Update Tortoise status (skip if already terjual — fallback case)
      const prevTortoise = selectedTortoise;
      const isAlreadyTerjual = prevTortoise?.status === "terjual";
      if (!isAlreadyTerjual) {
        await base44.entities.Tortoise.update(form.tortoise_id, {
          status: "terjual",
          previous_status: prevTortoise?.status || "aktif",
          enclosure: "",
          last_status_change: today,
        });
      }

      // C) Create FinanceTransaction
      const laba = price - hpp;
      const marginPct = price > 0 ? Math.round((laba / price) * 100) : 0;
      const finTx = await base44.entities.FinanceTransaction.create({
        type: "pemasukan",
        category: "penjualan_tortoise",
        amount: price,
        date: form.sale_date,
        description: `Penjualan ${selectedTortoise?.code || selectedTortoise?.name} ke ${form.buyer_name} — Laba Rp ${fmt(laba)}`,
        reference_id: newSale.id,
        ...(testModeTag || {}),
      });
      // Determine the actual purchase price used
      const isHasilSendiriForSave = selectedTortoise?.source === "hasil_sendiri" || selectedTortoise?.code?.startsWith?.("BB-");
      const actualPurchasePrice = isHasilSendiriForSave ? 0 :
        form.purchase_price_input !== "" ? Number(form.purchase_price_input) || 0 :
        selectedTortoise?.purchase_price || 0;

      // Update Sale with additional fields & finance_tx_id
      await base44.entities.Sale.update(newSale.id, {
        tortoise_code: selectedTortoise?.code || "",
        tortoise_species: selectedTortoise?.species || "",
        tortoise_weight: selectedTortoise?.weight_grams || 0,
        profit: laba,
        margin_percent: marginPct,
        purchase_price_original: actualPurchasePrice,
        care_cost_estimate: calcFarmMonths(selectedTortoise, form.sale_date) * (costData?.biayaPerEkor || 100000),
        finance_tx_id: finTx?.id || "",
      });

      // Persist purchase price to Tortoise if user filled it and tortoise didn't have one
      if (!isHasilSendiriForSave && actualPurchasePrice > 0 && (!selectedTortoise?.purchase_price || selectedTortoise.purchase_price === 0)) {
        try {
          await base44.entities.Tortoise.update(form.tortoise_id, { purchase_price: actualPurchasePrice });
        } catch (_) { /* non-critical */ }
      }
      // D) Update / Create BuyerProfile
      const tortoiseCode = selectedTortoise?.code || "";
      try {
        if (form.buyer_profile_id) {
          // Existing buyer — increment stats
          const existingBuyer = buyers.find(b => b.id === form.buyer_profile_id) || {};
          await base44.entities.BuyerProfile.update(form.buyer_profile_id, {
            total_purchases: (existingBuyer.total_purchases || 0) + 1,
            total_spent: (existingBuyer.total_spent || 0) + price,
            last_purchase_date: form.sale_date,
            last_purchased_tortoise: tortoiseCode,
            is_repeat_buyer: (existingBuyer.total_purchases || 0) + 1 > 1,
            // Update address/city if changed
            buyer_address: form.buyer_address || existingBuyer.buyer_address || "",
            city: form.buyer_city || existingBuyer.city || "",
            hp_whatsapp: form.hp_whatsapp || existingBuyer.hp_whatsapp || "",
            platform_asal: form.platform || existingBuyer.platform_asal || "Langsung",
          });
        } else {
          // New buyer — create profile
          const newBuyer = await base44.entities.BuyerProfile.create({
            name: form.buyer_name,
            hp_whatsapp: form.hp_whatsapp,
            buyer_address: form.buyer_address || "",
            city: form.buyer_city || "",
            platform_asal: form.platform || "Langsung",
            total_purchases: 1,
            total_spent: price,
            first_purchase_date: form.sale_date,
            last_purchase_date: form.sale_date,
            last_purchased_tortoise: tortoiseCode,
            is_repeat_buyer: false,
          });
          // Link sale to new buyer profile
          await base44.entities.Sale.update(newSale.id, {
            buyer_profile_id: newBuyer?.id || "",
          });
        }
      } catch (_) { /* non-critical */ }

      queryClient.invalidateQueries({ queryKey: ["buyer-profiles"] });

      // D) Update enclosure counter — invalidate and backend will recalculate
      if (prevTortoise?.enclosure) {
        // Trigger recalculation via query invalidation
        queryClient.invalidateQueries({ queryKey: ["enclosures"] });
      }

      // E) Notify Owner & Admin — try best effort
      try {
        const laba = price - hpp;
        await base44.integrations.Core.SendEmail({
          to: "dutatortoise@gmail.com",
          subject: `🎉 Penjualan: ${selectedTortoise?.code || selectedTortoise?.name}`,
          body: `Kura ${selectedTortoise?.code || selectedTortoise?.name} terjual Rp ${fmt(price)} ke ${form.buyer_name}. Laba: Rp ${fmt(laba)}.`,
        });
      } catch (_) { /* non-critical */ }

      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["tortoises"] });
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });

      onClose(true); // true = success, trigger refresh
    } catch (err) {
      setSaveError("Gagal menyimpan: " + (err?.message || "Terjadi kesalahan"));
      setSaving(false);
    }
  };

  const stepIcons = [Shell, User, DollarSign, CheckCircle2];

  return (
    <Dialog open={open} onOpenChange={() => !saving && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Catat Penjualan Kura</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((label, i) => {
            const Icon = stepIcons[i];
            return (
              <div key={i} className="flex items-center flex-1">
                <div className={`flex items-center gap-1.5 flex-1 ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/15 border-2 border-primary" : "bg-muted"}`}>
                    {i < step ? "✓" : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[11px] font-medium hidden sm:block truncate">{label}</span>
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mx-1 flex-shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-48">
          {step === 0 && (
            <StepPilihKura
              tortoises={tortoises}
              allSales={allSales}
              selectedId={form.tortoise_id}
              onSelect={id => {
                const t = tortoises.find(t => t.id === id);
                onChange("tortoise_id", id);
                onChange("tortoise_name", t?.name || "");
                // Auto-fill purchase price
                const isHasilSendiri = t?.source === "hasil_sendiri" || t?.code?.startsWith?.("BB-");
                if (isHasilSendiri) {
                  onChange("purchase_price_input", "0");
                } else if (t?.purchase_price && t.purchase_price > 0) {
                  onChange("purchase_price_input", String(t.purchase_price));
                } else {
                  onChange("purchase_price_input", "");
                }
              }}
            />
          )}

          {/* Harga Beli — muncul setelah kura dipilih */}
          {step === 0 && form.tortoise_id && selectedTortoise && (() => {
            const isHasilSendiri = selectedTortoise.source === "hasil_sendiri" || selectedTortoise.code?.startsWith?.("BB-");
            const isMissingPrice = !isHasilSendiri && (!selectedTortoise.purchase_price || selectedTortoise.purchase_price === 0);
            const currentVal = form.purchase_price_input;
            return (
              <div className={`p-4 rounded-xl border mt-4 ${isHasilSendiri ? "bg-blue-50 border-blue-200" : isMissingPrice && !currentVal ? "bg-yellow-50 border-yellow-300" : "bg-green-50 border-green-200"}`}>
                <Label className="text-sm font-semibold mb-1 block">
                  Harga Beli / Kulakan (Rp)
                  {isHasilSendiri && <span className="ml-2 text-xs font-normal text-blue-600">— Hasil Penetasan Sendiri</span>}
                </Label>
                {isHasilSendiri ? (
                  <div>
                    <Input type="number" min="0" value="0" disabled className="max-w-xs bg-blue-100/50" />
                    <p className="text-[11px] text-blue-600 mt-1">🐣 Hasil penetasan sendiri — harga beli Rp 0</p>
                  </div>
                ) : (
                  <div>
                    <Input
                      type="number"
                      min="0"
                      value={currentVal}
                      onChange={e => onChange("purchase_price_input", e.target.value)}
                      placeholder={selectedTortoise.purchase_price ? `Rp ${fmt(selectedTortoise.purchase_price)} (dari data kura)` : "Isi harga beli..."}
                      className={`max-w-xs ${!currentVal && isMissingPrice ? "border-yellow-400 bg-yellow-50" : ""}`}
                    />
                    {!currentVal && isMissingPrice && (
                      <p className="text-[11px] text-yellow-700 mt-1 flex items-center gap-1">
                        <span>⚠️</span> Harga beli belum tercatat. Isi untuk perhitungan HPP yang akurat.
                      </p>
                    )}
                    {currentVal && Number(currentVal) > 0 && (
                      <p className="text-[11px] text-green-700 mt-1">✓ Harga beli diisi manual: Rp {fmt(Number(currentVal))}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Tidak wajib — jika kosong, HPP dihitung tanpa harga beli
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
          {step === 1 && <StepDataPembeli form={form} onChange={onChange} errors={errors} />}
          {step === 2 && <StepDetailPenjualan form={form} onChange={onChange} errors={errors} />}
          {step === 3 && <StepReview form={form} tortoise={selectedTortoise} costData={costData} formData={form} />}
        </div>

        {errors.tortoise_id && step === 0 && (
          <p className="text-xs text-red-500 text-center">{errors.tortoise_id}</p>
        )}

        {saveError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>
        )}

        {/* Navigation */}
        <div className="flex justify-between gap-3 pt-2 border-t">
          <Button type="button" variant="outline" onClick={step === 0 ? onClose : back} disabled={saving}>
            {step === 0 ? "Batal" : <><ChevronLeft className="w-4 h-4 mr-1" /> Kembali</>}
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={next}>
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSave} disabled={saving} className="bg-green-700 hover:bg-green-800">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : "✅ Simpan & Proses"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}