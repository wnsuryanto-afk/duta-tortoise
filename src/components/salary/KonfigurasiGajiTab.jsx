/**
 * KonfigurasiGajiTab — tarif per peran (harian, lembur, rempesan, poin).
 *
 * Dipindahkan dari halaman /payroll-gaji pada 30-09-2026, saat empat pintu
 * gaji dilebur jadi dua. Isinya tidak diubah; yang berubah hanya tempatnya
 * berdiri, dan sekarang ia berdiri di sebelah layar yang benar-benar memakai
 * angka-angka ini untuk menerbitkan slip.
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

// Owner & investor sengaja di luar daftar: keduanya tidak digaji aplikasi ini.
const ROLE_OPTIONS = [
  { value: "manajer", label: "Manajer" },
  { value: "admin", label: "Admin" },
  { value: "kepala_feeder", label: "Kepala Feeder" },
  { value: "keeper", label: "Keeper" },
];

function SalaryConfigDialog({ open, onClose, editData }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(editData || {
    role: "keeper", salary_type: "bulanan", payment_period: "bulanan",
    base_salary: "", overtime_rate_per_hour: "",
    vegetable_rate_per_trip: "", point_value: "", absent_deduction: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const isHarian = form.salary_type === "harian";

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      base_salary: Number(form.base_salary) || 0,
      overtime_rate_per_hour: Number(form.overtime_rate_per_hour) || 0,
      vegetable_rate_per_trip: Number(form.vegetable_rate_per_trip) || 0,
      point_value: Number(form.point_value) || 0,
      absent_deduction: isHarian ? 0 : (Number(form.absent_deduction) || 0),
    };
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

          {/* Bagian 3: Tipe Gaji */}
          <div>
            <Label>Tipe Gaji *</Label>
            <div className="flex gap-2 mt-1.5">
              {[
                { val: "bulanan", label: "📅 Bulanan (Rp/bulan)" },
                { val: "harian", label: "📆 Harian (Rp/hari)" },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => set("salary_type", opt.val)}
                  className={`flex-1 py-2 px-2 rounded-lg border-2 font-medium text-xs transition-all ${
                    form.salary_type === opt.val
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-muted bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {isHarian && (
              <div className="mt-2">
                <Label className="text-xs">Dibayar Setiap</Label>
                <div className="flex gap-2 mt-1">
                  {["mingguan", "bulanan"].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set("payment_period", p)}
                      className={`flex-1 py-1.5 px-2 rounded-lg border text-xs transition-all ${
                        form.payment_period === p ? "border-primary bg-primary/5 text-primary" : "border-muted bg-muted/30"
                      }`}
                    >
                      {p === "mingguan" ? "Minggu" : "Bulan"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>{isHarian ? "Gaji Pokok (Rp/hari)" : "Gaji Pokok (Rp/bulan)"}</Label>
              <Input type="number" value={form.base_salary} onChange={e => set("base_salary", e.target.value)} placeholder={isHarian ? "100000" : "3000000"} />
            </div>
            <div>
              <Label>Tarif Lembur (Rp/jam)</Label>
              <Input type="number" value={form.overtime_rate_per_hour} onChange={e => set("overtime_rate_per_hour", e.target.value)} placeholder="25000" />
            </div>
            <div>
              <Label>Tunjangan Sayur (Rp/trip)</Label>
              <Input type="number" value={form.vegetable_rate_per_trip} onChange={e => set("vegetable_rate_per_trip", e.target.value)} placeholder="15000" />
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
        {salaryConfigs.map((cfg) => (
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
                <span className="text-muted-foreground">Tipe Gaji</span>
                <Badge variant="outline" className="text-xs">{cfg.salary_type === "harian" ? "📆 Harian" : "📅 Bulanan"}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gaji {cfg.salary_type === "harian" ? "Harian" : "Pokok"}</span>
                <span className="font-medium">{rupiah(cfg.base_salary)}/{cfg.salary_type === "harian" ? "hari" : "bln"}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tarif Lembur</span><span className="font-medium">{rupiah(cfg.overtime_rate_per_hour)}/jam</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tarif Rempesan</span><span className="font-medium">{rupiah(cfg.rempesan_rate_per_trip ?? cfg.vegetable_rate_per_trip)}/trip</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nilai Poin KPI</span><span className="font-medium">{rupiah(cfg.point_value)}/poin</span></div>
              {cfg.salary_type !== "harian" && (
                <div className="flex justify-between"><span className="text-muted-foreground">Potongan Absen</span><span className="font-medium text-red-600">-{rupiah(cfg.absent_deduction)}/hari</span></div>
              )}
            </div>
          </Card>
        ))}
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
