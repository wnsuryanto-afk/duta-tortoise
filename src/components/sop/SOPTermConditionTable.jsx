/**
 * SOPTermConditionTable — Tab 1 "SOP Harian" di halaman Term & Condition.
 * Tabel master inline-edit untuk entity SOPTask. Sumber: sama dengan yang
 * dibaca checklist keeper. Mengedit field langsung di SOPTask.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { JENIS_CARRYOVER_OPTIONS, WAJIB_ROLE_OPTIONS } from "@/lib/sopTermCondition";

const CATEGORIES = ["pakan", "kebersihan", "pemeriksaan", "breeding", "administrasi", "suplemen", "perawatan", "lainnya"];
const FREQUENCIES = ["harian", "mingguan", "bulanan"];

export default function SOPTermConditionTable() {
  const qc = useQueryClient();
  const [filterFreq, setFilterFreq] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [savingId, setSavingId] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["sop-tasks-all"],
    queryFn: () => base44.entities.SOPTask.list("-created_date", 300),
  });

  const filtered = tasks.filter(
    (t) =>
      (filterFreq === "all" || t.frequency === filterFreq) &&
      (filterCat === "all" || t.category === filterCat)
  );

  const updateField = async (task, field, value) => {
    setSavingId(task.id);
    try {
      await base44.entities.SOPTask.update(task.id, { [field]: value });
      qc.invalidateQueries({ queryKey: ["sop-tasks-all"] });
      qc.invalidateQueries({ queryKey: ["sop-tasks"] });
    } catch (e) {
      toast.error("Gagal simpan: " + (e.message || e));
    }
    setSavingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium">Frekuensi:</span>
        <Select value={filterFreq} onValueChange={setFilterFreq}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            {FREQUENCIES.map((f) => (
              <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs font-medium ml-2">Kategori:</span>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {savingId ? "Menyimpan…" : `${filtered.length} task`}
        </span>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Task</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Wajib Foto</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Boleh Carry-over</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Jenis Carry-over</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Butuh Bahan Gudang</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Poin</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Wajib untuk Role</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    Tidak ada task SOP.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <p className="font-medium">{t.title}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{t.frequency} · {t.category}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Switch checked={!!t.require_photo} onCheckedChange={(v) => updateField(t, "require_photo", v)} />
                    </td>
                    <td className="px-3 py-2">
                      <Switch checked={!!t.boleh_carryover} onCheckedChange={(v) => updateField(t, "boleh_carryover", v)} />
                    </td>
                    <td className="px-3 py-2">
                      <Select value={t.jenis_carryover || "1hari"} onValueChange={(v) => updateField(t, "jenis_carryover", v)}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {JENIS_CARRYOVER_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Switch checked={!!t.butuh_bahan_gudang} onCheckedChange={(v) => updateField(t, "butuh_bahan_gudang", v)} />
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
        Panel ini hanya mengatur nilai field. Logika carry-over belum dijalankan di sini — alur checklist keeper tidak berubah.
      </p>
    </div>
  );
}