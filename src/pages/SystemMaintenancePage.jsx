import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Database, Home, Egg, Users, CheckCircle2, AlertTriangle } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { toast } from "sonner";

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