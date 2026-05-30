import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";

// Semua hooks dipanggil di atas tanpa kondisi
export default function MigrasiStrukturPage() {
  const { role } = useCurrentUser();
  const qc = useQueryClient();

  // ── Semua useState di atas ──────────────────────────────────────
  const [loadingStep, setLoadingStep] = useState(null);
  const [results, setResults] = useState({});
  const [logs, setLogs] = useState([]);

  // ── Semua useQuery di atas ──────────────────────────────────────
  const { data: warehouseItems = [], refetch: refetchWH } = useQuery({
    queryKey: ["warehouse-items-migrasi"],
    queryFn: () => base44.entities.WarehouseItem.list("-created_date", 500),
  });

  const { data: itemUsages = [], refetch: refetchUsage } = useQuery({
    queryKey: ["item-usages-migrasi"],
    queryFn: () => base44.entities.ItemUsage.list("-created_date", 500),
  });

  // Guard role — setelah semua hooks
  if (!["admin", "owner"].includes(role)) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-orange-400" />
        <p className="font-semibold">Akses Ditolak</p>
        <p className="text-sm">Hanya admin/owner yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  // ── Analisis data ───────────────────────────────────────────────
  const itemsWithCode = warehouseItems.filter(i => i.code && !i.sku);
  const itemsCodeAndSku = warehouseItems.filter(i => i.code && i.sku);
  const itemsPakan = warehouseItems.filter(i => i.category === "pakan");
  const usagesMasukKeluar = itemUsages.filter(i => i.type === "masuk" || i.type === "keluar");
  const usagesBorrow = itemUsages.filter(i => i.borrower_email || i.borrow_date);

  // Step A: Migrasi field code -> sku
  const handleMigrasiCode = async () => {
    setLoadingStep("code");
    const log = [];
    for (const item of [...itemsWithCode, ...itemsCodeAndSku]) {
      if (item.code && !item.sku) {
        // copy code ke sku
        await base44.entities.WarehouseItem.update(item.id, { sku: item.code });
        log.push(`✅ ${item.name}: code "${item.code}" → disalin ke SKU`);
      } else if (item.code && item.sku) {
        // pertahankan sku, simpan code ke notes
        const notesNew = `${item.notes ? item.notes + "\n" : ""}Kode lama: ${item.code}`;
        await base44.entities.WarehouseItem.update(item.id, { notes: notesNew });
        log.push(`📝 ${item.name}: SKU "${item.sku}" dipertahankan, code lama disimpan di notes`);
      }
    }
    setResults(r => ({ ...r, code: log.length }));
    setLogs(l => [...l, ...log]);
    await refetchWH();
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    setLoadingStep(null);
  };

  // Step B: Migrasi ItemUsage -> StockMovement / ItemBorrow
  const handleMigrasiUsage = async () => {
    setLoadingStep("usage");
    const log = [];
    for (const u of usagesMasukKeluar) {
      await base44.entities.StockMovement.create({
        item_id: u.item_id,
        item_type: u.item_type || "warehouse",
        item_name: u.item_name,
        item_sku: u.item_sku || "",
        type: u.type,
        quantity: u.quantity,
        unit: u.unit || "",
        unit_price: u.unit_price || 0,
        total_value: u.total_value || 0,
        by_email: u.by_email || "sistem",
        by_name: u.by_name || "",
        notes: u.notes || "",
        date: u.date || new Date().toISOString().split("T")[0],
        status: u.status || "selesai",
        approved_by: u.approved_by || "",
        approved_at: u.approved_at || "",
        rejected_reason: u.rejected_reason || "",
        photo_urls: u.photo_urls || [],
        source_type: "migrated_from_item_usage",
      });
      log.push(`✅ ItemUsage ${u.id} (${u.type}) → StockMovement`);
    }
    for (const u of usagesBorrow) {
      await base44.entities.ItemBorrow.create({
        item_id: u.item_id,
        item_type: u.item_type || "warehouse",
        item_name: u.item_name,
        item_sku: u.item_sku || "",
        borrower_email: u.borrower_email || "",
        borrower_name: u.borrower_name || "",
        borrow_date: u.borrow_date || new Date().toISOString(),
        return_date: u.return_date || "",
        purpose: u.purpose || "",
        return_condition: u.return_condition || "",
        approval_status: u.approval_status || "approved",
        approved_by: u.approved_by_legacy || u.approved_by || "",
        photo_urls: u.photo_urls || [],
        notes: u.notes || "",
      });
      log.push(`✅ ItemUsage ${u.id} (pinjam) → ItemBorrow`);
    }
    setResults(r => ({ ...r, usage: log.length }));
    setLogs(l => [...l, ...log]);
    await refetchUsage();
    setLoadingStep(null);
  };

  const steps = [
    {
      id: "code",
      title: "A. Migrasi Field 'code' → 'sku'",
      desc: `${itemsWithCode.length} item punya code tanpa SKU · ${itemsCodeAndSku.length} item punya keduanya`,
      count: itemsWithCode.length + itemsCodeAndSku.length,
      handler: handleMigrasiCode,
      result: results.code,
    },
    {
      id: "usage",
      title: "B. Migrasi ItemUsage → StockMovement / ItemBorrow",
      desc: `${usagesMasukKeluar.length} transaksi stok · ${usagesBorrow.length} peminjaman`,
      count: usagesMasukKeluar.length + usagesBorrow.length,
      handler: handleMigrasiUsage,
      result: results.usage,
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">Migrasi Struktur Data</h1>
          <p className="text-muted-foreground text-sm">Jalankan satu kali untuk membersihkan & memigrasikan data lama.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchWH(); refetchUsage(); }} className="gap-1">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="p-3 rounded-lg border border-orange-300 bg-orange-50 text-sm text-orange-800">
        ⚠️ <strong>Jalankan setiap step hanya sekali.</strong> Data yang sudah dimigrasi tidak akan duplikat secara otomatis — pastikan backup sudah ada.
      </div>

      <div className="space-y-4">
        {steps.map(step => (
          <Card key={step.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {step.result !== undefined && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> {step.result} selesai
                  </Badge>
                )}
                <Button
                  size="sm"
                  onClick={step.handler}
                  disabled={loadingStep !== null || step.count === 0}
                  className="gap-1"
                >
                  {loadingStep === step.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {step.count === 0 ? "Sudah Bersih ✅" : `Jalankan (${step.count})`}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {logs.length > 0 && (
        <div>
          <p className="font-semibold mb-2">Log Migrasi ({logs.length} baris)</p>
          <div className="bg-muted/50 rounded-lg border p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-0.5">
            {logs.map((l, i) => <p key={i}>{l}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}