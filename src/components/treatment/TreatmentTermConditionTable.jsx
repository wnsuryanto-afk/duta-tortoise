/**
 * TreatmentTermConditionTable — Tab 2 "Treatment / Pengobatan" di halaman
 * Term & Condition. Tabel + dialog target-kura untuk entity TreatmentSchedule.
 *
 * Field asli TreatmentSchedule yang diedit: title, mod_type, frequency, dose,
 * related_sku (terhubung ke WarehouseItem), target kura (apply_to_all,
 * gender_filter, age_filter, tortoise_names/ids), deadline_time. Plus field
 * pelengkap: require_photo, points, wajib_untuk_role.
 *
 * TIDAK mengubah sop_task_title, TreatmentLog, atau alur otomatis treatment→SOP.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { WAJIB_ROLE_OPTIONS } from "@/lib/sopTermCondition";

const MOD_TYPE_OPTIONS = ["obat", "vitamin", "perawatan_luka", "mandi", "checkup", "kebersihan", "lainnya"];
const FREQUENCY_OPTIONS = [
  { value: "harian", label: "Harian" },
  { value: "dua_harian", label: "Dua Harian" },
  { value: "mingguan", label: "Mingguan" },
  { value: "dua_mingguan", label: "Dua Mingguan" },
  { value: "bulanan", label: "Bulanan" },
  { value: "quarterly", label: "Quarterly" },
  { value: "tahunan", label: "Tahunan" },
  { value: "musiman", label: "Musiman" },
];
const GENDER_OPTIONS = [
  { value: "semua", label: "Semua Gender" },
  { value: "jantan", label: "Jantan" },
  { value: "betina", label: "Betina" },
];
const AGE_OPTIONS = [
  { value: "semua", label: "Semua Umur" },
  { value: "baby", label: "Baby" },
  { value: "dewasa", label: "Dewasa" },
];

function modLabel(m) {
  const map = { perawatan_luka: "Perawatan Luka", obat: "Obat", vitamin: "Vitamin", mandi: "Mandi", checkup: "Checkup", kebersihan: "Kebersihan", lainnya: "Lainnya" };
  return map[m] || m || "—";
}

function freqLabel(f) {
  const o = FREQUENCY_OPTIONS.find((x) => x.value === f);
  return o ? o.label : f || "—";
}

function ToggleChip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
    >
      {label}
    </button>
  );
}

export default function TreatmentTermConditionTable() {
  const qc = useQueryClient();
  const [savingId, setSavingId] = useState(null);
  const [targetTask, setTargetTask] = useState(null); // dialog target kura

  const { data: treatments = [], isLoading } = useQuery({
    queryKey: ["treatment-schedules-all"],
    queryFn: () => base44.entities.TreatmentSchedule.list("-created_date", 300),
  });

  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["warehouse-items-skus"],
    queryFn: () => base44.entities.WarehouseItem.list("-created_date", 300),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 300),
    staleTime: 10 * 60 * 1000,
  });

  const updateField = async (task, field, value) => {
    setSavingId(task.id);
    try {
      await base44.entities.TreatmentSchedule.update(task.id, { [field]: value });
      qc.invalidateQueries({ queryKey: ["treatment-schedules-all"] });
    } catch (e) {
      toast.error("Gagal simpan: " + (e.message || e));
    }
    setSavingId(null);
  };

  const activeSchedules = treatments.filter((t) => t.is_active !== false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activeSchedules.length} jadwal treatment terdaftar
          <span className="ml-2 text-xs">{savingId ? "· Menyimpan…" : ""}</span>
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Treatment</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Mod Type</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Frekuensi</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Dosis</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Bahan Gudang</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Target Kura</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Deadline</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Wajib Foto</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Poin</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Wajib Role</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : treatments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-muted-foreground">
                    Tidak ada jadwal treatment.
                  </td>
                </tr>
              ) : (
                treatments.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <p className="font-medium">{t.title}</p>
                      {t.sop_task_title && (
                        <p className="text-[11px] text-muted-foreground">→ SOP: {t.sop_task_title}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Select value={t.mod_type || "lainnya"} onValueChange={(v) => updateField(t, "mod_type", v)}>
                        <SelectTrigger className="w-36 h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MOD_TYPE_OPTIONS.map((m) => (
                            <SelectItem key={m} value={m} className="capitalize">{modLabel(m)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select value={t.frequency || "mingguan"} onValueChange={(v) => updateField(t, "frequency", v)}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        defaultValue={t.dose || ""}
                        placeholder="cth: 50mg/kg"
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v !== (t.dose || "")) updateField(t, "dose", v);
                        }}
                        className="h-8 w-28 text-xs px-2"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={t.related_sku || "__none__"}
                        onValueChange={(v) => updateField(t, "related_sku", v === "__none__" ? "" : v)}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Tidak ada —</SelectItem>
                          {warehouseItems.filter((w) => w.sku).map((w) => (
                            <SelectItem key={w.id} value={w.sku}>
                              {w.sku} · {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setTargetTask(t)}
                        className="flex items-center gap-1 text-xs text-left border rounded-lg px-2 py-1 hover:bg-muted"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                        {t.apply_to_all ? (
                          <span className="text-primary font-medium">Semua Kura</span>
                        ) : (
                          <span>
                            {(t.tortoise_names?.length || 0)} kura
                            {t.gender_filter && t.gender_filter !== "semua" && ` · ${t.gender_filter}`}
                            {t.age_filter && t.age_filter !== "semua" && ` · ${t.age_filter}`}
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="time"
                        defaultValue={t.deadline_time || ""}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v !== (t.deadline_time || "")) updateField(t, "deadline_time", v);
                        }}
                        className="h-8 w-28 text-xs px-2"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Switch checked={!!t.require_photo} onCheckedChange={(v) => updateField(t, "require_photo", v)} />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        defaultValue={t.points ?? 0}
                        onBlur={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (!isNaN(n) && n >= 0 && n !== t.points) updateField(t, "points", n);
                        }}
                        className="h-8 w-20 text-xs px-2"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select value={t.wajib_untuk_role || "semua"} onValueChange={(v) => updateField(t, "wajib_untuk_role", v)}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {WAJIB_ROLE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Panel ini hanya mengatur nilai field TreatmentSchedule. sop_task_title, TreatmentLog, dan alur otomatis treatment→SOP tidak diubah.
      </p>

      {targetTask && (
        <TargetKuraDialog
          task={targetTask}
          tortoises={tortoises}
          onClose={() => setTargetTask(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["treatment-schedules-all"] });
            setTargetTask(null);
          }}
        />
      )}
    </div>
  );
}

function TargetKuraDialog({ task, tortoises, onClose, onSaved }) {
  const qc = useQueryClient();
  const [applyToAll, setApplyToAll] = useState(!!task.apply_to_all);
  const [gender, setGender] = useState(task.gender_filter || "semua");
  const [age, setAge] = useState(task.age_filter || "semua");
  const [ids, setIds] = useState(task.tortoise_ids || []);
  const [names, setNames] = useState(task.tortoise_names || []);
  const [saving, setSaving] = useState(false);

  const toggleTortoise = (t) => {
    if (ids.includes(t.id)) {
      setIds(ids.filter((x) => x !== t.id));
      setNames(names.filter((n) => n !== t.name));
    } else {
      setIds([...ids, t.id]);
      setNames([...names, t.name]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.TreatmentSchedule.update(task.id, {
        apply_to_all: applyToAll,
        gender_filter: gender,
        age_filter: age,
        tortoise_ids: ids,
        tortoise_names: names,
      });
      qc.invalidateQueries({ queryKey: ["treatment-schedules-all"] });
      toast.success("Target kura diperbarui.");
      onSaved();
    } catch (e) {
      toast.error("Gagal simpan: " + (e.message || e));
    }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Target Kura — {task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <Switch checked={applyToAll} onCheckedChange={setApplyToAll} />
            Terapkan ke SEMUA kura-kura (abaikan pilihan di bawah)
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Filter Gender</label>
              <Select value={gender} onValueChange={setGender} disabled={applyToAll}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Filter Umur</label>
              <Select value={age} onValueChange={setAge} disabled={applyToAll}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-2 block">
              Pilih Kura-kura Spesifik {applyToAll && <span className="text-muted-foreground font-normal">(nonaktif — apply to all)</span>}
            </label>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
              <div className="flex flex-wrap gap-1.5">
                {tortoises.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum ada kura-kura terdaftar.</p>
                ) : (
                  tortoises.map((t) => (
                    <ToggleChip
                      key={t.id}
                      label={`🐢 ${t.name}${t.enclosure ? ` (${t.enclosure})` : ""}`}
                      selected={ids.includes(t.id)}
                      onClick={() => !applyToAll && toggleTortoise(t)}
                    />
                  ))
                )}
              </div>
            </div>
            {ids.length > 0 && !applyToAll && (
              <p className="text-xs text-primary mt-1">{ids.length} kura-kura dipilih</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Target"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}