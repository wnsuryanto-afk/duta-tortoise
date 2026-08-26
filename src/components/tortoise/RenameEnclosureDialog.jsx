import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PenLine, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { jalankanMassal, ringkasHasil } from "@/lib/tugasMassal";

/**
 * RenameEnclosureDialog — mengganti nama kandang.
 *
 * Kura menunjuk kandangnya lewat NAMA, bukan id. Versi sebelumnya hanya
 * memperbarui `Tortoise.enclosure` dan tidak menyentuh catatan Enclosure-nya,
 * sehingga setelah ganti nama seluruh kura menunjuk kandang yang tidak ada,
 * sementara kandang lamanya berdiri kosong. Sekarang kedua sisi diperbarui
 * dalam satu tindakan.
 *
 * Yang masih tertinggal disebutkan terus terang di layar: sembilan entitas lain
 * (riwayat kandang, jadwal kebersihan, catatan pakan, temuan foto, dan lainnya)
 * juga menyimpan nama kandang sebagai teks. Menulis ulang semuanya di sini
 * berisiko, dan diam-diam membiarkannya lebih buruk lagi.
 */
export default function RenameEnclosureDialog({ open, onClose, enclosureName, tortoiseIds }) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState(enclosureName);
  const [saving, setSaving] = useState(false);
  const [kemajuan, setKemajuan] = useState(null);

  // Catatan kandangnya sendiri — mungkin tidak ada bila nama ini hanya
  // diketik lepas di data kura tanpa pernah didaftarkan sebagai kandang.
  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.list(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const catatanKandang = enclosures.find((e) => e.name === enclosureName);

  const namaBersih = newName.trim();
  const bentrok = enclosures.some(
    (e) => e.name === namaBersih && e.name !== enclosureName
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (!namaBersih || namaBersih === enclosureName) { onClose(); return; }
    if (bentrok) return;

    setSaving(true);
    setKemajuan({ sudah: 0, total: tortoiseIds.length });

    // Catatan kandang diperbarui lebih dulu. Kalau langkah ini gagal, kura
    // tidak jadi dipindahkan — lebih baik tidak berubah sama sekali daripada
    // separuh menunjuk nama baru yang tidak punya kandang.
    if (catatanKandang) {
      try {
        await base44.entities.Enclosure.update(catatanKandang.id, { name: namaBersih });
      } catch (err) {
        toast.error("Gagal mengubah nama kandang: " + (err?.message || "coba lagi"));
        setSaving(false);
        setKemajuan(null);
        return;
      }
    }

    const hasil = await jalankanMassal(
      tortoiseIds,
      (id) => base44.entities.Tortoise.update(id, { enclosure: namaBersih }),
      { serentak: 4, onKemajuan: (sudah, total) => setKemajuan({ sudah, total }) }
    );

    qc.invalidateQueries({ queryKey: ["tortoises"] });
    qc.invalidateQueries({ queryKey: ["enclosures"] });
    setSaving(false);
    setKemajuan(null);

    const { nada, teks } = ringkasHasil(hasil, "kura");
    if (nada === "berhasil") {
      toast.success(`Kandang jadi "${namaBersih}" — ${teks}`);
      onClose();
    } else if (nada === "gagal") {
      // Kandang sudah berganti nama tapi kuranya belum: keadaan ini harus
      // terlihat, bukan ditutup diam-diam.
      toast.error(`Nama kandang berubah, tapi kura gagal dipindahkan — ${teks}`);
    } else {
      toast.warning(teks + " — buka lagi untuk mengulang sisanya.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-primary" />
            Ubah Nama Kandang
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nama Kandang Baru</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="cth: W1"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Memperbarui {tortoiseIds.length} kura
              {catatanKandang ? " dan catatan kandangnya" : ""}.
            </p>
            {bentrok && (
              <p className="text-xs text-destructive font-medium">
                Sudah ada kandang bernama &ldquo;{namaBersih}&rdquo;. Pakai nama lain.
              </p>
            )}
          </div>

          {/* Keterusterangan soal yang tidak ikut berubah */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Riwayat kandang, jadwal kebersihan, dan catatan lama tetap memakai nama
              &ldquo;{enclosureName}&rdquo;. Data lamanya tidak hilang, tapi tidak ikut
              berganti nama.
            </p>
          </div>

          {kemajuan && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bar-track h-2">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${kemajuan.total ? (kemajuan.sudah / kemajuan.total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground tabular">
                {kemajuan.sudah}/{kemajuan.total}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" className="flex-1" disabled={saving || !namaBersih || bentrok}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
