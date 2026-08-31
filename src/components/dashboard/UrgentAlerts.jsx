import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Egg, Package, Home, FileWarning } from "lucide-react";
import { formatDateIndonesian } from "@/lib/formatIndonesian";
import { perluDiperhatikan } from "@/lib/stokMenipis";

export default function UrgentAlerts() {
  // Telur dalam masa penetasan
  const { data: breedings = [] } = useQuery({
    queryKey: ["breedings-alerts"],
    queryFn: () => base44.entities.Breeding.filter({ status: 'inkubasi' }),
  });
  const hatchingSoon = breedings.filter(b => {
    if (!b.estimated_hatch_date) return false;
    const hatchDate = new Date(b.estimated_hatch_date);
    const today = new Date();
    const diffDays = Math.ceil((hatchDate - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // Obat kadaluarsa
  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["warehouse-alerts"],
    queryFn: () => base44.entities.WarehouseItem.filter({ is_active: true }),
  });
  const expiredMeds = warehouseItems.filter(item => {
    if (!item.expired_date || item.category !== 'obat') return false;
    const expDate = new Date(item.expired_date);
    const today = new Date();
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  });

  // Stok yang perlu diperhatikan — aturan dari lib/stokMenipis.
  //
  // Saringan lama `current_stock <= minimum_stock` menghasilkan 46 barang dari
  // 46 barang berstok nol. Dua sebabnya: barang yang minimumnya 0 dan memang
  // sengaja tidak distok (obat resep dokter, misalnya) lolos lewat 0 <= 0, dan
  // barang yang sudah dinonaktifkan tetap ikut. Peringatan yang selalu menyala
  // untuk semua barang sama saja dengan tidak ada peringatan.
  const lowStock = warehouseItems.filter(perluDiperhatikan);
  const lowFeed = lowStock.filter(item => item.category === 'pakan' || item.category === 'sayuran');

  // Kandang overcrowding
  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures-alerts"],
    queryFn: () => base44.entities.Enclosure.filter({ is_active: true }),
  });
  const overcrowded = enclosures.filter(e => e.current_count > e.max_capacity);

  // Data tidak lengkap
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-incomplete"],
    queryFn: () => base44.entities.Tortoise.list(),
  });
  const incomplete = tortoises.filter(t => {
    return !t.birth_date || !t.weight_grams || !t.shell_length_cm || !t.gender;
  });

  const hasAlerts = hatchingSoon.length > 0 || expiredMeds.length > 0 || lowStock.length > 0 || overcrowded.length > 0 || incomplete.length > 0;

  if (!hasAlerts) {
    return (
      <Card className="bg-green-50 border-green-200 mb-6">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">✅ Semua dalam kondisi baik</p>
            <p className="text-sm text-green-700">Tidak ada alert urgent yang perlu perhatian</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-orange-50 border-orange-200 mb-6">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-6 h-6 text-orange-600 animate-pulse" />
          <h2 className="font-semibold text-orange-800">⚠️ Alert Urgent</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {hatchingSoon.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Egg className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-red-800 text-sm">Telur Menetas</span>
              </div>
              <p className="text-xs text-red-700">{hatchingSoon.length} telur dalam 7 hari</p>
              {hatchingSoon.slice(0, 2).map((b, i) => (
                <p key={i} className="text-xs text-red-600 mt-1">
                  {b.female_name} - {b.estimated_hatch_date ? formatDateIndonesian(b.estimated_hatch_date) : '?'}
                </p>
              ))}
            </div>
          )}

          {expiredMeds.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-red-800 text-sm">Obat Kadaluarsa</span>
              </div>
              <p className="text-xs text-red-700">{expiredMeds.length} obat ≤ 30 hari</p>
              {expiredMeds.slice(0, 2).map((item, i) => (
                <p key={i} className="text-xs text-red-600 mt-1">
                  {item.name} - {formatDateIndonesian(item.expired_date)}
                </p>
              ))}
            </div>
          )}

          {lowStock.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-amber-800 text-sm">Stok Menipis</span>
              </div>
              <p className="text-xs text-amber-700">{lowStock.length} item di bawah minimum</p>
              {lowFeed.slice(0, 2).map((item, i) => (
                <p key={i} className="text-xs text-amber-600 mt-1">
                  {item.name}: {item.current_stock} {item.unit}
                </p>
              ))}
            </div>
          )}

          {overcrowded.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Home className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-red-800 text-sm">Overcrowding</span>
              </div>
              <p className="text-xs text-red-700">{overcrowded.length} kandang kelebihan</p>
              {overcrowded.slice(0, 2).map((e, i) => (
                <p key={i} className="text-xs text-red-600 mt-1">
                  {e.name}: {e.current_count}/{e.max_capacity}
                </p>
              ))}
            </div>
          )}

          {incomplete.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileWarning className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-orange-800 text-sm">Data Tidak Lengkap</span>
              </div>
              <p className="text-xs text-orange-700">{incomplete.length} kura-kura data belum lengkap</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}