import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ruler, Plus, Weight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function SizeHistoryPanel({ tortoiseId, tortoiseName }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    weight_grams: "",
    shell_length_cm: "",
    notes: "",
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["measurement-history", tortoiseId],
    queryFn: () => base44.entities.MeasurementHistory.filter({ tortoise_id: tortoiseId }, "-date", 30),
    enabled: !!tortoiseId,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.MeasurementHistory.create({
      tortoise_id: tortoiseId,
      tortoise_name: tortoiseName,
      date: form.date,
      weight_grams: form.weight_grams ? Number(form.weight_grams) : undefined,
      shell_length_cm: form.shell_length_cm ? Number(form.shell_length_cm) : undefined,
      measured_by: user?.full_name || user?.email || "",
      notes: form.notes,
    });
    qc.invalidateQueries({ queryKey: ["measurement-history", tortoiseId] });
    setShowForm(false);
    setForm({ date: format(new Date(), "yyyy-MM-dd"), weight_grams: "", shell_length_cm: "", notes: "" });
    setSaving(false);
  };

  const latest = history[0];

  return (
    <div className="space-y-3">
      {latest && (
        <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
          <p className="text-xs font-semibold text-primary mb-1.5">Pengukuran Terakhir</p>
          <div className="flex gap-4 text-sm">
            {latest.weight_grams && (
              <div className="flex items-center gap-1.5">
                <Weight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-bold">{latest.weight_grams}g</span>
              </div>
            )}
            {latest.shell_length_cm && (
              <div className="flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-bold">{latest.shell_length_cm}cm</span>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {format(new Date(latest.date), "d MMM yyyy", { locale: id })}
            {latest.measured_by && <span> · oleh {latest.measured_by}</span>}
          </div>
        </div>
      )}

      {!showForm ? (
        <Button size="sm" variant="outline" className="w-full gap-2 text-xs" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" /> Catat Pengukuran Baru
        </Button>
      ) : (
        <form onSubmit={handleSave} className="space-y-2 border rounded-xl p-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Berat (gram)</Label>
              <Input type="number" min={0} step="0.1" value={form.weight_grams}
                onChange={(e) => setForm(p => ({ ...p, weight_grams: e.target.value }))}
                placeholder="0" className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Panjang (cm)</Label>
              <Input type="number" min={0} step="0.01" value={form.shell_length_cm}
                onChange={(e) => setForm(p => ({ ...p, shell_length_cm: e.target.value }))}
                placeholder="0" className="mt-1 h-8 text-xs" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Tanggal</Label>
            <Input type="date" value={form.date}
              onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
              className="mt-1 h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Catatan</Label>
            <Input value={form.notes}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Opsional..." className="mt-1 h-8 text-xs" />
          </div>
          <p className="text-xs text-muted-foreground">Dicatat oleh: {user?.full_name || user?.email}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setShowForm(false)}>Batal</Button>
            <Button type="submit" size="sm" className="flex-1 h-7 text-xs" disabled={saving}>Simpan</Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Memuat riwayat...</p>
      ) : history.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Belum ada riwayat pengukuran.</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Riwayat</p>
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-xs border rounded-lg px-3 py-2 bg-card">
              <div>
                <span className="font-medium">
                  {h.weight_grams ? `${h.weight_grams}g` : ""}
                  {h.weight_grams && h.shell_length_cm ? " · " : ""}
                  {h.shell_length_cm ? `${h.shell_length_cm}cm` : ""}
                </span>
                {h.measured_by && <span className="text-muted-foreground ml-2">oleh {h.measured_by}</span>}
              </div>
              <span className="text-muted-foreground">{format(new Date(h.date), "d MMM yy", { locale: id })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}