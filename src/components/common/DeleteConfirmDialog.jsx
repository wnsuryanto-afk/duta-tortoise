import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { petaKura, dariClutch } from "@/lib/silsilah";

export default function DeleteConfirmDialog({ entityType, entityId, entityName, open, onOpenChange, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [relatedData, setRelatedData] = useState(null);

  const checkRelatedData = async () => {
    if (!entityId || !entityType) return;
    
    setLoading(true);
    try {
      if (entityType === "Tortoise") {
        const [health, measurements, sales, breeding] = await Promise.all([
          base44.entities.HealthRecord.filter({ tortoise_id: entityId }),
          base44.entities.MeasurementHistory?.filter({ tortoise_id: entityId }) || [],
          base44.entities.Sale.filter({ tortoise_id: entityId }),
          base44.entities.Breeding.filter({ 
            $or: [{ male_id: entityId }, { female_id: entityId }]
          }),
        ]);
        
        setRelatedData({
          health: health.length,
          measurements: measurements.length,
          sales: sales.length,
          breeding: breeding.length,
        });
      } else if (entityType === "Breeding") {
        // Pengaman ini dulu mencari induk lewat NAMA saja. Bayi yang dicatat
        // dari dialog "Catat Hasil Menetas" menyimpan ID induknya, jadi
        // clutch-nya bisa dihapus tanpa satu pun peringatan bahwa bayinya
        // masih ada. Sekarang seluruh kura diperiksa lewat rujukan apa pun
        // bentuknya — id, kode, maupun nama.
        const semua = await base44.entities.Tortoise.list("-created_date", 1000);
        const peta = petaKura(semua);
        const babies = semua.filter((t) => dariClutch(t, entityName, peta));
        setRelatedData({ babies: babies.length });
      } else if (entityType === "Enclosure") {
        const tortoises = await base44.entities.Tortoise.filter({ enclosure: entityId });
        const activeTortoises = tortoises.filter(t => 
          ['aktif', 'baby', 'sakit', 'breeding', 'karantina'].includes(t.status)
        );
        setRelatedData({ occupants: activeTortoises.length });
      }
    } catch (error) {
      console.error("Error checking related data:", error);
    }
    setLoading(false);
  };

  useState(() => {
    if (open) {
      checkRelatedData();
    } else {
      setRelatedData(null);
    }
  });

  const handleArchive = async () => {
    setLoading(true);
    try {
      await base44.entities[entityType].update(entityId, { is_archived: true });
      toast.success("Data diarsipkan");
      onSuccess?.();
    } catch (error) {
      toast.error("Gagal mengarsip: " + error.message);
    }
    setLoading(false);
    onOpenChange(false);
  };

  const handleDeletePermanent = async () => {
    setLoading(true);
    try {
      await base44.entities[entityType].delete(entityId);
      toast.success("Data dihapus permanen");
      onSuccess?.();
    } catch (error) {
      toast.error("Gagal menghapus: " + error.message);
    }
    setLoading(false);
    onOpenChange(false);
  };

  const handleSimpleDelete = async () => {
    setLoading(true);
    try {
      await base44.entities[entityType].delete(entityId);
      toast.success("Data dihapus");
      onSuccess?.();
    } catch (error) {
      toast.error("Gagal menghapus: " + error.message);
    }
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Konfirmasi Hapus
          </AlertDialogTitle>
          <AlertDialogDescription>
            {entityType === "Enclosure" && relatedData?.occupants > 0 && (
              <div className="space-y-3">
                <p className="text-red-600 font-semibold">
                  ⚠️ Kandang ini masih berisi {relatedData.occupants} kura-kura.
                </p>
                <p>Pindahkan kura-kura terlebih dahulu sebelum hapus kandang.</p>
              </div>
            )}
            
            {entityType === "Tortoise" && relatedData && (
              <div className="space-y-3">
                <p className="font-semibold">Kura-kura ini memiliki data terkait:</p>
                <ul className="text-sm space-y-1">
                  {relatedData.health > 0 && <li>• {relatedData.health} Rekam Medis</li>}
                  {relatedData.measurements > 0 && <li>• {relatedData.measurements} Riwayat Penimbangan</li>}
                  {relatedData.sales > 0 && <li>• {relatedData.sales} Transaksi Penjualan</li>}
                  {relatedData.breeding > 0 && <li>• Menjadi induk untuk {relatedData.breeding} baby</li>}
                </ul>
              </div>
            )}

            {entityType === "Breeding" && relatedData?.babies > 0 && (
              <div className="space-y-3">
                <p className="text-amber-600 font-semibold">
                  ⚠️ Breeding ini sudah menghasilkan {relatedData.babies} baby tortoise.
                </p>
                <p>Hapus breeding akan memutus referensi induk pada baby tersebut.</p>
              </div>
            )}

            {!relatedData && loading && (
              <p>Memeriksa data terkait...</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          
          {entityType === "Enclosure" && relatedData?.occupants > 0 ? (
            <AlertDialogAction onClick={() => onOpenChange(false)}>
              Tutup
            </AlertDialogAction>
          ) : entityType === "Tortoise" && relatedData ? (
            <>
              <AlertDialogAction onClick={handleArchive} disabled={loading}>
                Arsipkan Saja
              </AlertDialogAction>
              <AlertDialogAction onClick={handleDeletePermanent} disabled={loading}>
                Hapus Permanen
              </AlertDialogAction>
            </>
          ) : entityType === "Breeding" && relatedData?.babies > 0 ? (
            <>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePermanent} disabled={loading}>
                Tetap Hapus
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction onClick={handleSimpleDelete} disabled={loading}>
              Hapus
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}