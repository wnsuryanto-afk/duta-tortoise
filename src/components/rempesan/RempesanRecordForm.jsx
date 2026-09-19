import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Camera, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useImageCompression } from "@/lib/useImageCompression";
import { sudahAdaRempesan, tarifTrip } from "@/lib/rempesan";

/**
 * Form pencatatan rempesan oleh keeper.
 * Wajib isi: tanggal, berat hasil (kg), dan foto.
 *
 * `tanggalAwal`, `fotoAwal`, dan `catatanAwal` dipakai saat formulir ini
 * dibuka dari jejak absensi "cari rumput": tanggal dan fotonya sudah ada,
 * jadi yang tersisa diketik orangnya hanyalah beratnya. Lihat lib/rempesan.js
 * untuk alasan kenapa barisnya tidak dibuat otomatis saja.
 */
export default function RempesanRecordForm({
  onClose, onSaved, tanggalAwal, fotoAwal, catatanAwal, konfigTarif,
}) {
  const { user } = useCurrentUser();
  const [date, setDate] = useState(tanggalAwal || format(new Date(), "yyyy-MM-dd"));
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState(catatanAwal || "");
  const [photoUrl, setPhotoUrl] = useState(fotoAwal || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { compressImage } = useImageCompression();
  const { tarif, dariSetelan } = tarifTrip(konfigTarif);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await compressImage(file, { maxWidthOrHeight: 1280, quality: 0.8 });
      if (!result?.file) { toast.error("Gagal kompres foto"); setUploading(false); return; }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: result.file });
      setPhotoUrl(file_url);
      toast.success("Foto terunggah");
    } catch (err) {
      toast.error("Gagal upload foto: " + (err?.message || "kesalahan"));
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const w = Number(weight);
    if (!date) { toast.error("Tanggal wajib diisi"); return; }
    if (!w || w <= 0) { toast.error("Berat hasil (kg) wajib diisi"); return; }
    if (!photoUrl) { toast.error("Foto wajib diunggah"); return; }
    setSaving(true);
    try {
      // Dibaca ulang dari server TEPAT sebelum membuat, bukan dari cache.
      // Upah rempesan dibayar per TRIP, dan slip mingguan hanya menghitung satu
      // trip per tanggal — jadi catatan kedua di tanggal yang sama tidak
      // menambah upah, ia hanya membuat halaman Rempesan menampilkan
      // "Rp 30.000" dua kali untuk uang yang dibayarkan sekali. Penyakit yang
      // sama persis pernah melahirkan hari absensi kembar.
      const adaDulu = await base44.entities.RempesanLog.filter({
        employee_email: user.email,
        date,
      });
      if (sudahAdaRempesan(adaDulu, user.email, date)) {
        toast.error("Rempesan tanggal ini sudah pernah dicatat — satu trip per hari.");
        setSaving(false);
        return;
      }

      await base44.entities.RempesanLog.create({
        employee_email: user.email,
        employee_name: user?.full_name || user?.email,
        employee_id: user?.id,
        date,
        weight_kg: w,
        photo_url: photoUrl,
        notes: notes || "",
        status: "pending",
        recorded_by_name: user?.full_name || user?.email,
      });
      toast.success("Rempesan tercatat — menunggu persetujuan");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Gagal menyimpan: " + (err?.message || "kesalahan"));
    }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Rempesan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Kalimat ini dulu berbunyi "Rp 30.000 (menurut pengaturan)".
              `rempesan_rate_per_trip` kosong di keempat baris SalaryConfig,
              jadi angka itu sebenarnya nilai cadangan `?? 30000` di dalam kode
              — bukan setelan yang pernah disimpan. Sekarang dikatakan apa
              adanya, supaya tidak ada yang mengira tarifnya sudah ditentukan. */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            Rempesan = ambil sayur/rumput. Satu trip per hari, dihitung{" "}
            <b>Rp {tarif.toLocaleString("id-ID")}</b> setelah disetujui dan otomatis masuk
            slip gaji minggu itu.
            {!dariSetelan && (
              <> Tarif ini masih angka bawaan aplikasi — belum pernah disimpan di
              Pengaturan Tarif Mingguan.</>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Tanggal *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Berat Hasil (kg) *</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Contoh: 50"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Foto Hasil Timbangan *</Label>
            {photoUrl ? (
              <div className="space-y-1.5">
                <img src={photoUrl} alt="Rempesan" className="w-full h-32 object-cover rounded-lg border" />
                {/* Sebelumnya foto yang sudah terunggah tidak bisa diganti sama
                    sekali. Itu jadi masalah nyata begitu formulir ini bisa
                    dibuka dari absensi: yang terbawa adalah foto RUMPUTNYA,
                    sedangkan yang diminta di sini foto TIMBANGANNYA. */}
                <button
                  type="button"
                  onClick={() => setPhotoUrl("")}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-3 h-3" /> Ganti foto
                </button>
                {fotoAwal && photoUrl === fotoAwal && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-500">
                    Ini foto rumput dari absensi pagi tadi. Kalau sudah ditimbang,
                    ganti dengan foto timbangannya.
                  </p>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/40">
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Klik untuk ambil/pilih foto</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
              </label>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Catatan (opsional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Mis. jenis sayur, lokasi ambil..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving || uploading} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}