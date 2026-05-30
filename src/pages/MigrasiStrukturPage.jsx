import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { base44 } from "@/api/base44Client";
import AccessDenied from "@/components/common/AccessDenied";
import { CheckCircle2, AlertTriangle, RefreshCw, ArrowRight, Database, Layers } from "lucide-react";

function StatusBadge({ status }) {
  if (!status) return null;
  if (status.startsWith("✅")) return <Badge className="bg-green-100 text-green-700 border-green-200">{status}</Badge>;
  if (status.startsWith("⚠️")) return <Badge className="bg-orange-100 text-orange-700 border-orange-200">{status}</Badge>;
  if (status.startsWith("⏳")) return <Badge className="bg-blue-100 text-blue-700 border-blue-200">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function ResultBox({ result }) {
  if (!result) return null;
  return (
    <pre className="mt-3 p-3 bg-slate-900 text-slate-100 text-xs rounded-lg overflow-auto max-h-60 whitespace-pre-wrap">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

export default function MigrasiStrukturPage() {
  const { role } = useCurrentUser();
  const [loading, setLoading] = useState(null);
  const [results, setResults] = useState({});
  const [statusData, setStatusData] = useState(null);

  if (!["admin", "owner"].includes(role)) return <AccessDenied />;

  const invoke = async (action, key) => {
    setLoading(key);
    const res = await base44.functions.invoke("migrasiStrukturStok", { action });
    setResults(prev => ({ ...prev, [key]: res.data }));
    setLoading(null);
  };

  const loadStatus = async () => {
    setLoading("status");
    const res = await base44.functions.invoke("migrasiStrukturStok", { action: "status_migrasi" });
    setStatusData(res.data);
    setLoading(null);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Database className="w-6 h-6" /> Migrasi Struktur Data Stok
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Jalankan migrasi satu per satu, mulai dari A → B → C. Semua proses aman & bisa diulang.
        </p>
      </div>

      {/* Status Overview */}
      <Card className="p-4 border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><Layers className="w-4 h-4" /> Status Keseluruhan</h2>
          <Button size="sm" variant="outline" onClick={loadStatus} disabled={loading === "status"}>
            {loading === "status" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh Status
          </Button>
        </div>
        {statusData ? (
          <div className="space-y-3">
            {Object.entries(statusData).map(([key, val]) => (
              <div key={key} className="flex items-start justify-between gap-3 py-2 border-b last:border-b-0">
                <div>
                  <p className="text-sm font-medium">{key.replace(/_/g, " ")}</p>
                  {Object.entries(val).filter(([k]) => k !== "status").map(([k, v]) => (
                    <p key={k} className="text-xs text-muted-foreground">{k}: <strong>{String(v)}</strong></p>
                  ))}
                </div>
                <StatusBadge status={val.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Klik "Refresh Status" untuk melihat kondisi saat ini.</p>
        )}
      </Card>

      {/* A: Code → SKU */}
      <Card className="p-5 border-l-4 border-l-blue-400">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg font-bold text-blue-600">A</span>
          <h2 className="font-semibold">Migrasi Field "code" → "sku" (WarehouseItem)</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Field <code className="bg-muted px-1 rounded">code</code> sudah digantikan oleh <code className="bg-muted px-1 rounded">sku</code>.
          Migrasi ini menyalin <code>code</code> ke <code>sku</code> jika sku kosong, atau menyimpan ke notes jika sudah punya sku.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => invoke("preview_code_sku", "preview_code")} disabled={!!loading}>
            {loading === "preview_code" ? "Memuat..." : "🔍 Preview Dulu"}
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => {
            if (confirm("Jalankan migrasi code→sku? Proses ini aman dan bisa diulang.")) invoke("migrasi_code_ke_sku", "migrasi_code");
          }} disabled={!!loading}>
            {loading === "migrasi_code" ? "Memproses..." : <>Jalankan Migrasi A <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </div>
        <ResultBox result={results.preview_code || results.migrasi_code} />
      </Card>

      {/* B: Hapus pakan dari Warehouse */}
      <Card className="p-5 border-l-4 border-l-orange-400">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg font-bold text-orange-600">B</span>
          <h2 className="font-semibold">Hapus Kategori "pakan" dari Gudang</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          Temukan WarehouseItem yang masih berkategori <code className="bg-muted px-1 rounded">pakan</code>.
          Pindahkan manual melalui halaman <strong>Migrasi Kategori</strong>, lalu schema sudah diperbarui (enum pakan sudah dihapus).
        </p>
        <div className="flex gap-2 flex-wrap items-center">
          <Button variant="outline" size="sm" onClick={() => invoke("preview_pakan", "preview_pakan")} disabled={!!loading}>
            {loading === "preview_pakan" ? "Memuat..." : "🔍 Cek Item Pakan di Gudang"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/migrasi-kategori">Ke Halaman Migrasi Kategori →</a>
          </Button>
        </div>
        {results.preview_pakan && (
          <div className="mt-3">
            {results.preview_pakan.count === 0 ? (
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Tidak ada item pakan di gudang. ✅
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-orange-700 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> {results.preview_pakan.count} item pakan masih di gudang:
                </p>
                {results.preview_pakan.items?.map(i => (
                  <p key={i.id} className="text-xs text-muted-foreground pl-5">• {i.name} — stok: {i.current_stock} {i.unit}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* C: ItemUsage → StockMovement + ItemBorrow */}
      <Card className="p-5 border-l-4 border-l-green-400">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg font-bold text-green-600">C</span>
          <h2 className="font-semibold">Migrasi ItemUsage → StockMovement + ItemBorrow</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Semua record <code className="bg-muted px-1 rounded">ItemUsage</code> akan dipindah ke entitas baru.
          Record yang punya <code>borrower_email</code> → <strong>ItemBorrow</strong>. Sisanya → <strong>StockMovement</strong>.
          ItemUsage lama <em>tidak dihapus</em>, hanya dihentikan penggunaannya di UI.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {
            if (confirm("Jalankan migrasi ItemUsage? Semua record akan disalin ke StockMovement/ItemBorrow. Proses ini aman.")) {
              invoke("migrasi_itemusage", "migrasi_usage");
            }
          }} disabled={!!loading}>
            {loading === "migrasi_usage" ? "Memproses..." : <>Jalankan Migrasi C <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </div>
        {results.migrasi_usage && (
          <ResultBox result={results.migrasi_usage} />
        )}
        {results.migrasi_usage?.success && (
          <div className="mt-2 flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Berhasil: {results.migrasi_usage.moved_to_stock_movement} movement + {results.migrasi_usage.moved_to_item_borrow} borrow
          </div>
        )}
      </Card>

      {/* Notes */}
      <Card className="p-4 bg-slate-50 border-slate-200">
        <h3 className="font-semibold text-sm mb-2">📌 Catatan Penting</h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Schema WarehouseItem sudah diperbarui: field <code>code</code> dihapus, kategori <code>pakan</code> dihapus dari enum.</li>
          <li>Transaksi stok baru sudah otomatis masuk ke <strong>StockMovement</strong> (bukan ItemUsage).</li>
          <li>ItemUsage lama belum dihapus — data historis tetap ada.</li>
          <li>Entitas baru <strong>StockMovement</strong> dan <strong>ItemBorrow</strong> sudah tersedia.</li>
        </ul>
      </Card>
    </div>
  );
}