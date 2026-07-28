import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Database, Home, Users, CheckCircle2, AlertTriangle, Baby, FlaskConical } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { toast } from "sonner";
import TargetPoinSettings from "@/components/settings/TargetPoinSettings";
import TestModeSettings from "@/components/owner/TestModeSettings";
import AISaranToggle from "@/components/settings/AISaranToggle";

export default function SystemMaintenancePage() {
  const { role } = useCurrentUser();
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});

  if (role !== "owner") {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-lg font-medium">🔒 Akses Terbatas</p>
        <p className="text-sm mt-1">Halaman ini hanya dapat diakses oleh Owner</p>
        <p className="text-xs mt-2 text-muted-foreground/60">Hubungi Owner jika Anda memerlukan akses</p>
      </div>
    );
  }

  const handleRecalculate = async (type, functionName) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const response = await base44.functions.invoke(functionName, {});
      setResults(prev => ({ ...prev, [type]: response.data }));
      toast.success(`✅ ${getSuccessMessage(type)}`);
    } catch (error) {
      console.error("Recalculation error:", error);
      toast.error(`❌ Gagal: ${error.message}`);
      setResults(prev => ({ ...prev, [type]: { error: error.message } }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const getSuccessMessage = (type) => {
    const messages = {
      enclosures: "Enclosure count berhasil disinkronkan",
      incubators: "Telur inkubator berhasil disinkronkan",
      buyers: "Buyer profile berhasil disinkronkan",
      babyMigrate: "Migrasi status 'baby' berhasil",
      all: "Semua data berhasil disinkronkan",
    };
    return messages[type] || "Sinkronisasi berhasil";
  };

  const lastRun = results.enclosures?.timestamp || null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Pemeliharaan Sistem</h1>
        <p className="text-muted-foreground text-sm mt-1">Sinkronisasi dan recalculate data untuk menjaga integritas</p>
      </div>

      {/* Mode Testing */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Mode Testing</h2>
        <TestModeSettings />
      </div>

      {/* Target & Poin */}
      <TargetPoinSettings />

      {/* Saran AI untuk Keeper */}
      <AISaranToggle />

      {lastRun && (
        <Alert className="bg-blue-50 border-blue-200">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Terakhir disinkronkan: {new Date(lastRun).toLocaleString('id-ID')}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Enclosure Recalculation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-green-600" />
              Recalculate Kandang
            </CardTitle>
            <CardDescription>
              Hitung ulang current_count semua kandang berdasarkan tortoise aktif
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => handleRecalculate("enclosures", "recalculateAllEnclosures")}
              disabled={loading.enclosures}
              className="w-full gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading.enclosures ? 'animate-spin' : ''}`} />
              {loading.enclosures ? "Menghitung..." : "Recalculate Semua Kandang"}
            </Button>
            {results.enclosures && !results.enclosures.error && (
              <div className="text-sm text-green-700 bg-green-50 p-2 rounded-lg">
                ✓ {results.enclosures.message}
              </div>
            )}
            {results.enclosures?.error && (
              <div className="text-sm text-red-700 bg-red-50 p-2 rounded-lg">
                ✗ {results.enclosures.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buyer Profile Recalculation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Recalculate Buyer Profile
            </CardTitle>
            <CardDescription>
              Hitung ulang total_purchases, total_spent, dan tier dari semua penjualan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => handleRecalculate("buyers", "recalculateBuyerProfiles")}
              disabled={loading.buyers}
              className="w-full gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading.buyers ? 'animate-spin' : ''}`} />
              {loading.buyers ? "Menghitung..." : "Recalculate Buyer Profile"}
            </Button>
            {results.buyers && !results.buyers.error && (
              <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded-lg">
                ✓ {results.buyers.message}
                {results.buyers.details && (
                  <div className="text-xs mt-1">
                    Sales processed: {results.buyers.details.total_sales_processed} | 
                    Profiles updated: {results.buyers.details.profiles_updated}
                  </div>
                )}
              </div>
            )}
            {results.buyers?.error && (
              <div className="text-sm text-red-700 bg-red-50 p-2 rounded-lg">
                ✗ {results.buyers.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Migrasi Status Baby */}
        <Card className="md:col-span-2 border border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Baby className="w-5 h-5 text-amber-600" />
              Migrasi Status "Baby" → "Aktif" (Sekali Pakai)
            </CardTitle>
            <CardDescription className="text-amber-700">
              Mengubah semua kura-kura dengan status <code className="bg-amber-100 px-1 rounded">baby</code> menjadi <code className="bg-amber-100 px-1 rounded">aktif</code>, 
              dengan mempertahankan <code className="bg-amber-100 px-1 rounded">age_category=baby</code>. 
              Aman dijalankan berulang (idempotent).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              onClick={() => handleRecalculate("babyMigrate", "migrateBabyStatus")}
              disabled={loading.babyMigrate}
              className="w-full gap-2 border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading.babyMigrate ? 'animate-spin' : ''}`} />
              {loading.babyMigrate ? "Migrasi..." : "Jalankan Migrasi Status Baby"}
            </Button>
            {results.babyMigrate && !results.babyMigrate.error && (
              <div className="text-sm text-amber-800 bg-amber-100 p-2 rounded-lg">
                ✓ {results.babyMigrate.migrated} kura berhasil dimigrasi
                {results.babyMigrate.names?.length > 0 && (
                  <p className="text-xs mt-1 text-amber-700">Nama: {results.babyMigrate.names.join(", ")}</p>
                )}
                {results.babyMigrate.migrated === 0 && <p className="text-xs mt-1">Tidak ada kura dengan status "baby" yang perlu dimigrasi.</p>}
              </div>
            )}
            {results.babyMigrate?.error && (
              <div className="text-sm text-red-700 bg-red-50 p-2 rounded-lg">✗ {results.babyMigrate.error}</div>
            )}
          </CardContent>
        </Card>

        {/* Tag Data Test Lama */}
        <Card className="md:col-span-2 border border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <FlaskConical className="w-5 h-5 text-purple-600" />
              Tandai Data Test Lama (Sekali Pakai)
            </CardTitle>
            <CardDescription className="text-purple-700">
              Tandai DailyChecklist dari "Iwan Suryanto" & "Diana Susantio" sebelum 2026-06-02, dan Attendance dengan durasi &lt;5 menit sebagai <code className="bg-purple-100 px-1 rounded">is_test_data=true</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              onClick={() => handleRecalculate("tagLegacy", "tagLegacyTestData")}
              disabled={loading.tagLegacy}
              className="w-full gap-2 border-purple-300 text-purple-800 hover:bg-purple-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading.tagLegacy ? 'animate-spin' : ''}`} />
              {loading.tagLegacy ? "Memproses..." : "Jalankan Tagging Data Test Lama"}
            </Button>
            {results.tagLegacy && !results.tagLegacy.error && (
              <div className="text-sm text-purple-800 bg-purple-100 p-2 rounded-lg">
                ✓ {results.tagLegacy.message}
              </div>
            )}
            {results.tagLegacy?.error && (
              <div className="text-sm text-red-700 bg-red-50 p-2 rounded-lg">✗ {results.tagLegacy.error}</div>
            )}
          </CardContent>
        </Card>

        {/* Migrasi Struktur Stok */}
        <Card className="md:col-span-2 border border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Database className="w-5 h-5 text-blue-600" />
              Migrasi Struktur Data Stok
            </CardTitle>
            <CardDescription className="text-blue-700">
              Migrasi field <code className="bg-blue-100 px-1 rounded">code→sku</code>, hapus kategori pakan dari gudang, 
              dan pisahkan ItemUsage lama menjadi StockMovement + ItemBorrow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full gap-2 border-blue-300 text-blue-800 hover:bg-blue-100" asChild>
              <a href="/migrasi-struktur">
                <Database className="w-4 h-4" /> Buka Halaman Migrasi Struktur →
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Recalculate All */}
        <Card className="md:col-span-2 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Recalculate Semua Data
            </CardTitle>
            <CardDescription>
              Jalankan semua recalculation sekaligus (enclosure, buyer profile, dll)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={async () => {
                await handleRecalculate("enclosures", "recalculateAllEnclosures");
                await handleRecalculate("buyers", "recalculateBuyerProfiles");
              }}
              disabled={loading.all || loading.enclosures || loading.buyers}
              className="w-full gap-2 bg-primary"
            >
              <RefreshCw className={`w-4 h-4 ${loading.all ? 'animate-spin' : ''}`} />
              {loading.all || loading.enclosures || loading.buyers ? "Menghitung Semua..." : "Recalculate Semua Data"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">ℹ️ Informasi</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Recalculation otomatis berjalan saat data diubah (create/update/delete)</p>
          <p>• Gunakan fitur ini untuk sinkronisasi manual jika ditemukan ketidaksesuaian data</p>
          <p>• Proses ini aman dan tidak akan menghapus data apapun</p>
          <p>• Waktu proses tergantung jumlah data (biasanya &lt; 10 detik)</p>
        </CardContent>
      </Card>
    </div>
  );
}