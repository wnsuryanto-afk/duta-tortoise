/**
 * KonfigurasiGajiTab — tarif per peran (harian, lembur, rempesan, poin).
 *
 * Dipindahkan dari halaman /payroll-gaji pada 30-09-2026, saat empat pintu
 * gaji dilebur jadi dua. Isinya tidak diubah; yang berubah hanya tempatnya
 * berdiri, dan sekarang ia berdiri di sebelah layar yang benar-benar memakai
 * angka-angka ini untuk menerbitkan slip.
 *
 * ── 02-10-2026: saklar "Tipe Gaji" yang tidak menyalakan apa pun ────
 *
 * Layar ini dulu punya dua tombol, "Bulanan" dan "Harian", yang menulis
 * `salary_type` ke SalaryConfig. Penggajian TIDAK PERNAH membaca kolom itu.
 * `hitungGaji()` menentukan harian atau bulanan dari PERAN, lewat
 * `adalahPeranHarian()` — satu-satunya pembacanya `salary_type` adalah layar
 * ini sendiri, untuk labelnya sendiri.
 *
 * Jadi saklarnya memang bergerak, tersimpan, dan mengubah tampilan — tetapi
 * tidak mengubah satu rupiah pun. Pemilik yang menyetel keeper jadi
 * "📅 Bulanan" akan melihat "Rp 70.000/bln" dan sebuah kolom Potongan Absen
 * terbuka, sementara slip tetap terbit sebagai hari-masuk x Rp 70.000.
 * Tidak ada error, dan tidak ada yang memberitahu bahwa pilihannya diabaikan.
 *
 * Bawaan untuk konfigurasi BARU bahkan "bulanan" — salah untuk keeper dan
 * kepala_feeder, dua-duanya satu-satunya peran yang benar-benar digaji di
 * sini.
 *
 * Sekarang jenis gaji DITURUNKAN dari peran dengan fungsi yang sama yang
 * dipakai penggajian, dan ditampilkan sebagai keterangan, bukan pilihan.
 * Bila kelak admin atau manajer memang mau digaji harian, yang diubah
 * adalah PERAN_HARIAN di hitungGaji.js — satu tempat, dan layar ini ikut
 * sendiri. `salary_type` berhenti ditulis sama sekali — alasannya ada di
 * dekat kode yang membuangnya, di handleSave.
 *
 * `payment_period` dihapus dari layar dengan alasan yang sama: tidak ada
 * yang membacanya, dan gaji dibayar BULANAN sejak 30-09-2026 — dijaga oleh
 * cek-gaji.mjs, bukan oleh dua tombol di sini.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Plus, Pencil } from "lucide-react";
import { rupiah } from "@/lib/rupiah";
import { adalahPeranHarian } from "@/lib/hitungGaji";
import { tarifTrip } from "@/lib/rempesan";

// Owner & investor sengaja di luar daftar: keduanya tidak digaji aplikasi ini.
const ROLE_OPTIONS = [
  { value: "manajer", label: "Manajer" },
  { value: "admin", label: "Admin" },
  { value: "kepala_feeder", label: "Kepala Feeder" },
  { value: "keeper", label: "Keeper" },
];

function SalaryConfigDialog({ open, onClose, editData }) {
  const qc = useQueryClient();
  /*
   * Tarif trip diisi dari tarifTrip(), bukan dari satu kolom mentah.
   * Ada DUA kolom untuk angka yang sama (`rempesan_rate_per_trip` yang
   * dibaca lebih dulu, dan `vegetable_rate_per_trip` jalur lama yang
   * berisi di data sekarang). Menampilkan kolom lamanya saja berarti
   * kotaknya bisa kosong padahal penggajian sedang memakai angka lain.
   */
  const tripAwal = editData ? tarifTrip(editData) : null;
  const [form, setForm] = useState(editData || {
    role: "keeper",
    base_salary: "", overtime_rate_per_hour: "",
    point_value: "", absent_deduction: "", notes: "",
  });
  const [tarifTripTeks, setTarifTripTeks] = useState(
    tripAwal?.dariSetelan ? String(tripAwal.tarif) : ""
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Sumber yang SAMA dengan hitungGaji(), bukan kolom tersimpan sendiri.
  const isHarian = adalahPeranHarian(form.role);

  const handleSave = async () => {
    setSaving(true);
    /*
     * `payment_period` sengaja tidak disentuh: ia ada di baris yang
     * tersimpan, tidak ada yang membacanya, dan menghapusnya bukan
     * perbaikan — jadi ia lewat apa adanya dari editData.
     */
    const data = {
      ...form,
      base_salary: Number(form.base_salary) || 0,
      overtime_rate_per_hour: Number(form.overtime_rate_per_hour) || 0,
      point_value: Number(form.point_value) || 0,
      absent_deduction: isHarian ? 0 : (Number(form.absent_deduction) || 0),
    };

    /*
     * Satu kotak, dua kolom — supaya yang dibaca lebih dulu dan
     * cadangannya tidak bisa berselisih.
     *
     * Kosong berarti "tidak diputuskan": `rempesan_rate_per_trip` TIDAK
     * ditulis sama sekali, karena tarifTrip() menerima 0 sebagai
     * keputusan yang sah (`>= 0`) dan menulis 0 ke sana akan membayar
     * trip Rp 0 — bukan jatuh ke cadangan.
     */
    /*
     * `salary_type` TIDAK ditulis lagi.
     *
     * Ia bukan kolom SalaryConfig (cek-kolom-hantu.mjs menolaknya), dan
     * sesudah perubahan ini tidak ada satu pun pembacanya: label layar ini
     * menurunkannya dari peran, dan penggajian selalu memakai
     * adalahPeranHarian(). Menyimpan nilai TURUNAN ke basis data justru
     * mengembalikan masalah yang baru dibereskan — sebuah kolom tersimpan
     * yang kelak bisa dipercaya melebihi peran, lalu berselisih dengannya.
     *
     * Nilai yang sudah ada di keempat baris tidak dihapus: ia lewat apa
     * adanya lewat `...form` saat baris lama disunting, dan hari ini
     * keempatnya memang sejalan dengan perannya.
     */
    delete data.salary_type;

    const tripAngka = tarifTripTeks.trim() === "" ? null : Number(tarifTripTeks) || 0;
    if (tripAngka === null) {
      data.vegetable_rate_per_trip = 0;
      delete data.rempesan_rate_per_trip;
    } else {
      data.vegetable_rate_per_trip = tripAngka;
      data.rempesan_rate_per_trip = tripAngka;
    }

    if (editData?.id) await base44.entities.SalaryConfig.update(editData.id, data);
    else await base44.entities.SalaryConfig.create(data);
    qc.invalidateQueries({ queryKey: ["salary-configs"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editData?.id ? "Edit Konfigurasi Gaji" : "Tambah Konfigurasi Gaji"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Role *</Label>
            <Select value={form.role} onValueChange={v => set("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Jenis gaji: keterangan, bukan pilihan — ikut peran di atas. */}
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Jenis Gaji</span>
              <Badge variant="outline" className="text-xs">
                {isHarian ? "📆 Harian" : "📅 Bulanan"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isHarian
                ? "Mengikuti peran: hari masuk x Rp/hari. Absen tidak dibayar, jadi tidak ada potongan absen."
                : "Mengikuti peran: dibayar flat per bulan, tidak dikalikan hari masuk."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>{isHarian ? "Gaji Pokok (Rp/hari)" : "Gaji Pokok (Rp/bulan)"}</Label>
              <Input type="number" value={form.base_salary} onChange={e => set("base_salary", e.target.value)} placeholder={isHarian ? "70000" : "3000000"} />
            </div>
            <div>
              <Label>Tarif Lembur (Rp/jam)</Label>
              <Input type="number" value={form.overtime_rate_per_hour} onChange={e => set("overtime_rate_per_hour", e.target.value)} placeholder="25000" />
            </div>
            <div>
              <Label>Tarif Rempesan (Rp/trip)</Label>
              <Input type="number" value={tarifTripTeks} onChange={e => setTarifTripTeks(e.target.value)} placeholder="30000" />
            </div>
            <div>
              <Label>Nilai Poin KPI (Rp/poin)</Label>
              <Input type="number" value={form.point_value} onChange={e => set("point_value", e.target.value)} placeholder="500" />
            </div>
            {!isHarian ? (
              <div>
                <Label>Potongan Absen (Rp/hari)</Label>
                <Input type="number" value={form.absent_deduction} onChange={e => set("absent_deduction", e.target.value)} placeholder="100000" />
              </div>
            ) : (
              <div className="flex items-end">
                <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                  💡 Gaji harian: hari masuk × Rp/hari (absen tidak dibayar)
                </p>
              </div>
            )}
          </div>
          <div>
            <Label>Catatan</Label>
            <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function KonfigurasiGajiTab({ bolehUbah }) {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editConfig, setEditConfig] = useState(null);
  const { data: salaryConfigs = [] } = useQuery({
    queryKey: ["salary-configs"],
    queryFn: () => base44.entities.SalaryConfig.list(),
  });

  if (!bolehUbah) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Hanya Owner, Manajer, atau Admin yang dapat mengelola konfigurasi gaji.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Besaran upah harian, lembur, rempesan, dan nilai poin per peran
        </p>
        <Button size="sm" onClick={() => { setEditConfig(null); setShowConfigForm(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Tambah Konfigurasi
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {salaryConfigs.map((cfg) => {
          const harian = adalahPeranHarian(cfg.role);
          const trip = tarifTrip(cfg);
          return (
          <Card key={cfg.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Badge className="capitalize">{cfg.role}</Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => { setEditConfig(cfg); setShowConfigForm(true); }}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jenis Gaji</span>
                <Badge variant="outline" className="text-xs">{harian ? "📆 Harian" : "📅 Bulanan"}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gaji {harian ? "Harian" : "Pokok"}</span>
                <span className="font-medium">{rupiah(cfg.base_salary)}/{harian ? "hari" : "bln"}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tarif Lembur</span><span className="font-medium">{rupiah(cfg.overtime_rate_per_hour)}/jam</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tarif Rempesan</span>
                <span className="font-medium">
                  {rupiah(trip.tarif)}/trip
                  {!trip.dariSetelan && <span className="text-xs text-muted-foreground font-normal"> (bawaan)</span>}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nilai Poin KPI</span><span className="font-medium">{rupiah(cfg.point_value)}/poin</span></div>
              {!harian && (
                <div className="flex justify-between"><span className="text-muted-foreground">Potongan Absen</span><span className="font-medium text-red-600">-{rupiah(cfg.absent_deduction)}/hari</span></div>
              )}
            </div>
          </Card>
          );
        })}
        {salaryConfigs.length === 0 && (
          <Card className="col-span-full p-8 text-center text-muted-foreground">
            <Settings className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Belum ada konfigurasi gaji. Tekan "Tambah Konfigurasi" untuk memulai.</p>
          </Card>
        )}
      </div>
      {showConfigForm && (
        <SalaryConfigDialog
          open={showConfigForm}
          onClose={() => { setShowConfigForm(false); setEditConfig(null); }}
          editData={editConfig}
        />
      )}
    </div>
  );
}
