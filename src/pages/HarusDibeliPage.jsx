import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { isManagerLevel } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart, PackageX, Loader2, CheckCircle2,
} from "lucide-react";
import BoughtItemDialog from "@/components/pettycash/BoughtItemDialog";
import { perluDiperhatikan } from "@/lib/stokMenipis";

const fmtRp = (n) => "Rp " + Math.round(Number(n || 0)).toLocaleString("id-ID");

export default function HarusDibeliPage() {
  const { role } = useCurrentUser();
  const qc = useQueryClient();
  const [boughtItem, setBoughtItem] = useState(null);

  const { data: warehouse = [], isLoading: wLoading } = useQuery({
    queryKey: ["owner-warehouse"],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 200),
    staleTime: 2 * 60 * 1000,
  });
  const { data: sopTasks = [], isLoading: tLoading } = useQuery({
    queryKey: ["sop-tasks"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
    staleTime: 2 * 60 * 1000,
  });
  const { data: shoppingList = [], isLoading: sLoading } = useQuery({
    queryKey: ["shopping-list-belum"],
    queryFn: () => base44.entities.ShoppingList.filter({ status: "belum_dibeli" }, "-priority", 200),
    staleTime: 60 * 1000,
  });
  const { data: toolRequests = [] } = useQuery({
    queryKey: ["tool-requests-approved"],
    queryFn: () => base44.entities.ToolRequest.filter({ status: "disetujui" }, "-request_date", 200),
    staleTime: 60 * 1000,
  });

  const skuMap = useMemo(() => {
    const m = {};
    warehouse.forEach((w) => { if (w.sku) m[w.sku] = w; });
    return m;
  }, [warehouse]);

  // ── Source b: SOP terganggu (prioritas tertinggi) ──
  const sopTerganggu = useMemo(() => {
    const skuToTasks = {};
    sopTasks.forEach((task) => {
      (task.required_skus || []).forEach((sku) => {
        if (!skuToTasks[sku]) skuToTasks[sku] = [];
        skuToTasks[sku].push(task.title);
      });
    });
    const items = [];
    Object.entries(skuToTasks).forEach(([sku, titles]) => {
      const w = skuMap[sku];
      if (!w || (w.current_stock || 0) <= 0) {
        items.push({
          type: "warehouse",
          item_id: w?.id,
          name: w?.name || `SKU: ${sku}`,
          sku,
          current_stock: w?.current_stock || 0,
          minimum_stock: w?.minimum_stock || 0,
          unit: w?.unit || "",
          category: w?.category,
          source: "sop_terganggu",
          source_label: "SOP terganggu",
          task_titles: titles,
          not_found: !w,
        });
      }
    });
    return items;
  }, [sopTasks, skuMap]);

  // ── Source: Barang rusak (needs_replacement) ──
  const barangRusak = useMemo(() => {
    return warehouse
      .filter((w) => w.needs_replacement === true)
      .map((w) => ({
        type: "warehouse",
        item_id: w.id,
        name: w.name,
        sku: w.sku,
        current_stock: w.current_stock || 0,
        minimum_stock: w.minimum_stock || 0,
        unit: w.unit,
        category: w.category,
        source: "barang_rusak",
        source_label: "Barang rusak",
        not_found: false,
      }));
  }, [warehouse]);

  // ── Source a1: Obat menipis (obat/vitamin/suplemen, current <= minimum) ──
  const obatMenipis = useMemo(() => {
    const sopIds = new Set(sopTerganggu.map((i) => i.item_id).filter(Boolean));
    const rusakIds = new Set(barangRusak.map((i) => i.item_id).filter(Boolean));
    return warehouse
      .filter((w) =>
        ["obat", "vitamin", "suplemen"].includes(w.category) &&
        // Aturan yang sama dengan seluruh aplikasi (lib/stokMenipis).
        //
        // Saringan lama `current_stock <= minimum_stock` meloloskan setiap
        // barang yang minimumnya 0 lewat 0 <= 0 — termasuk obat resep dokter
        // yang memang sengaja tidak distok, dan barang bertanda
        // [DUPLIKAT - ABAIKAN]. Halaman ini karena itu menampilkan daftar beli
        // yang isinya sebagian besar barang yang tidak perlu dibeli.
        perluDiperhatikan(w) &&
        !sopIds.has(w.id) &&
        !rusakIds.has(w.id)
      )
      .map((w) => ({
        type: "warehouse",
        item_id: w.id,
        name: w.name,
        sku: w.sku,
        current_stock: w.current_stock || 0,
        minimum_stock: w.minimum_stock || 0,
        unit: w.unit,
        category: w.category,
        source: "obat_menipis",
        source_label: "Obat menipis",
        not_found: false,
      }));
  }, [warehouse, sopTerganggu]);

  // ── Source a2: Stok menipis (non-medical, current < minimum) ──
  const stokMenipis = useMemo(() => {
    const sopIds = new Set(sopTerganggu.map((i) => i.item_id).filter(Boolean));
    const obatIds = new Set(obatMenipis.map((i) => i.item_id).filter(Boolean));
    const rusakIds = new Set(barangRusak.map((i) => i.item_id).filter(Boolean));
    return warehouse
      .filter((w) =>
        perluDiperhatikan(w) &&
        !sopIds.has(w.id) &&
        !obatIds.has(w.id) &&
        !rusakIds.has(w.id)
      )
      .map((w) => ({
        type: "warehouse",
        item_id: w.id,
        name: w.name,
        sku: w.sku,
        current_stock: w.current_stock || 0,
        minimum_stock: w.minimum_stock || 0,
        unit: w.unit,
        category: w.category,
        source: "stok_menipis",
        source_label: "Stok menipis",
        not_found: false,
      }));
  }, [warehouse, sopTerganggu, obatMenipis]);

  // ── Source c: Tugas menunggu (ShoppingList belum_dibeli) ──
  const tugasMenunggu = useMemo(() => {
    return shoppingList.map((s) => ({
      type: "shopping",
      shopping_list_id: s.id,
      // Record ShoppingList lama memakai item_name/qty_needed/unit —
      // tanpa fallback ini barangnya tampil tanpa nama.
      name: s.nama_barang || s.item_name || "(nama belum diisi)",
      jumlah: s.jumlah ?? s.qty_needed ?? 0,
      satuan: s.satuan || s.unit || "",
      priority: s.priority,
      harga_est: s.total_est || s.harga_est_per_unit || 0,
      source: "tugas_menunggu",
      source_label: "Tugas menunggu",
      not_found: false,
    }));
  }, [shoppingList]);

  // ── Source d: Pengajuan karyawan (ToolRequest disetujui) ──
  const pengajuanKaryawan = useMemo(() => {
    return toolRequests.map((r) => ({
      type: "tool_request",
      tool_request_id: r.id,
      name: r.tool_name,
      jumlah: r.quantity || 1,
      reason: r.reason,
      requester: r.requester_name,
      photo_url: r.photo_url,
      source: "pengajuan_karyawan",
      source_label: "Pengajuan karyawan",
      not_found: false,
    }));
  }, [toolRequests]);

  // ── Combined: SOP terganggu → Obat menipis → Stok menipis → Tugas menunggu → Pengajuan karyawan ──
  const allItems = [...sopTerganggu, ...barangRusak, ...obatMenipis, ...stokMenipis, ...tugasMenunggu, ...pengajuanKaryawan];
  const sopCount = sopTerganggu.length;
  const obatCount = obatMenipis.length;
  const pengajuanCount = pengajuanKaryawan.length;
  const rusakCount = barangRusak.length;

  if (!isManagerLevel(role)) return <AccessDenied />;

  const loading = wLoading || tLoading || sLoading;

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold font-heading">🛒 Harus Dibeli</h1>
            <p className="text-xs text-muted-foreground">
              {allItems.length} barang perlu dibeli
              {sopCount > 0 && ` · ${sopCount} mengganggu SOP`}
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        {sopCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-center min-w-[80px]">
            <p className="text-2xl font-bold text-red-600 leading-none">{sopCount}</p>
            <p className="text-[10px] text-red-700 mt-1">🔴 SOP terganggu</p>
          </div>
        )}
        {obatCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 text-center min-w-[80px]">
            <p className="text-2xl font-bold text-orange-600 leading-none">{obatCount}</p>
            <p className="text-[10px] text-orange-700 mt-1">💊 Obat menipis</p>
          </div>
        )}
        {stokMenipis.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center min-w-[80px]">
            <p className="text-2xl font-bold text-amber-600 leading-none">{stokMenipis.length}</p>
            <p className="text-[10px] text-amber-700 mt-1">⚠️ Stok menipis</p>
          </div>
        )}
        {tugasMenunggu.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-center min-w-[80px]">
            <p className="text-2xl font-bold text-blue-600 leading-none">{tugasMenunggu.length}</p>
            <p className="text-[10px] text-blue-700 mt-1">📋 Tugas menunggu</p>
          </div>
        )}
        {pengajuanCount > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 text-center min-w-[80px]">
            <p className="text-2xl font-bold text-indigo-600 leading-none">{pengajuanCount}</p>
            <p className="text-[10px] text-indigo-700 mt-1">🛠️ Pengajuan</p>
          </div>
        )}
        {rusakCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-center min-w-[80px]">
            <p className="text-2xl font-bold text-red-600 leading-none">{rusakCount}</p>
            <p className="text-[10px] text-red-700 mt-1">🔴 Barang rusak</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
      ) : allItems.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p className="font-semibold text-green-700">Semua aman!</p>
          <p className="text-sm text-muted-foreground mt-1">Tidak ada barang yang perlu dibeli sekarang.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {allItems.map((item, idx) => (
            <HarusDibeliRow key={idx} item={item} onBought={() => setBoughtItem(item)} />
          ))}
        </div>
      )}

      {/* Bought Item Dialog */}
      <Dialog open={!!boughtItem} onOpenChange={(v) => !v && setBoughtItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> Sudah Dibeli
            </DialogTitle>
          </DialogHeader>
          {boughtItem && (
            <BoughtItemDialog
              item={boughtItem}
              onClose={() => setBoughtItem(null)}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["owner-warehouse"] });
                qc.invalidateQueries({ queryKey: ["sop-tasks"] });
                qc.invalidateQueries({ queryKey: ["shopping-list-belum"] });
                qc.invalidateQueries({ queryKey: ["tool-requests-approved"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HarusDibeliRow({ item, onBought }) {
  const isSopGangguan = item.source === "sop_terganggu";
  const isBarangRusak = item.source === "barang_rusak";
  const isObatMenipis = item.source === "obat_menipis";
  const isStokMenipis = item.source === "stok_menipis";
  const isPengajuan = item.source === "pengajuan_karyawan";
  const isNotFound = item.not_found;

  return (
    <Card className={`p-3 ${isSopGangguan ? "border-red-300 bg-red-50/50" : isBarangRusak ? "border-red-300 bg-red-50/30" : isObatMenipis ? "border-orange-300 bg-orange-50/50" : isStokMenipis ? "border-amber-200 bg-amber-50/30" : isPengajuan ? "border-indigo-200 bg-indigo-50/30" : "border-blue-200 bg-blue-50/30"}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm">{item.name}</span>
            <Badge variant="outline" className={`text-[10px] ${
              isSopGangguan ? "bg-red-100 text-red-700 border-red-300" :
              isBarangRusak ? "bg-red-100 text-red-700 border-red-300" :
              isObatMenipis ? "bg-orange-100 text-orange-700 border-orange-300" :
              isStokMenipis ? "bg-amber-100 text-amber-700 border-amber-300" :
              isPengajuan ? "bg-indigo-100 text-indigo-700 border-indigo-300" :
              "bg-blue-100 text-blue-700 border-blue-300"
            }`}>
              {isSopGangguan && "🔴 "}{isBarangRusak && "🔴 "}{isObatMenipis && "💊 "}{item.source_label}
            </Badge>
          </div>

          {item.type === "warehouse" ? (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>
                Stok: <span className={isNotFound ? "text-red-600 font-semibold" : "text-red-600 font-semibold"}>
                  {isNotFound ? "SKU tidak ditemukan" : `${item.current_stock} ${item.unit}`}
                </span>
                {(isStokMenipis || isObatMenipis) && ` / Min: ${item.minimum_stock} ${item.unit}`}
              </p>
              {isNotFound && (
                <p className="text-amber-600">⚠️ Buat item ini di gudang dengan SKU {item.sku}</p>
              )}
              {isSopGangguan && item.task_titles && (
                <div className="mt-1">
                  <p className="text-red-600 font-medium">Dibutuhkan task:</p>
                  {item.task_titles.map((t, i) => (
                    <p key={i} className="text-[11px] text-red-700 ml-2">• {t}</p>
                  ))}
                </div>
              )}
            </div>
          ) : item.type === "tool_request" ? (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Jumlah: {item.jumlah} pcs</p>
              <p>Alasan: {item.reason}</p>
              <p>Diajukan oleh: {item.requester}</p>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Jumlah: {item.jumlah} {item.satuan}</p>
              {item.priority && (
                <p className={item.priority === "segera" ? "text-red-600 font-medium" : ""}>
                  Prioritas: {item.priority}
                </p>
              )}
              {/*
                ShoppingList menyimpan `total_est` (estimasi seluruh jumlah) dan
                `harga_est_per_unit`. Tidak ada field bernama `harga_est`, jadi
                baris estimasi harga ini tidak pernah tampil sama sekali —
                termasuk untuk baris yang dibuat otomatis oleh A7, yang memang
                mengisi kedua field itu.
              */}
              {(item.total_est > 0 || item.harga_est_per_unit > 0) && (
                <p>
                  Estimasi: {fmtRp(item.total_est || (item.harga_est_per_unit || 0) * (item.jumlah || 1))}
                  {item.harga_est_per_unit > 0 && item.jumlah > 1 && (
                    <span className="text-muted-foreground"> ({fmtRp(item.harga_est_per_unit)}/{item.satuan || "unit"})</span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Checkbox "Sudah dibeli" */}
        <div className="flex flex-col items-center gap-1">
          {isNotFound ? (
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={onBought}>
              <PackageX className="w-3.5 h-3.5" /> Buat
            </Button>
          ) : (
            <label className="flex flex-col items-center gap-1 cursor-pointer">
              <Checkbox
                checked={false}
                onCheckedChange={(v) => v && onBought()}
              />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Sudah<br />dibeli
              </span>
            </label>
          )}
        </div>
      </div>
    </Card>
  );
}