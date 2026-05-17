import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { addDays, format } from "date-fns";

export default function BreedingForm({ open, onClose, editData }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 200),
  });

  const males = tortoises.filter((t) => t.gender === "jantan" && (t.status === "aktif" || t.status === "breeding"));
  const females = tortoises.filter((t) => t.gender === "betina" && (t.status === "aktif" || t.status === "breeding"));

  const [form, setForm] = useState(editData || {
    male_name: "", female_name: "", male_id: "", female_id: "",
    egg_laying_date: "", egg_count: "",
    estimated_hatch_date: "",
    status: "bertelur", incubation_temp: "", notes: "",
  });

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleMaleSelect = (id) => {
    const male = tortoises.find((t) => t.id === id);
    setForm((prev) => ({ ...prev, male_id: id, male_name: male?.name || "" }));
  };

  const handleFemaleSelect = (id) => {
    const female = tortoises.find((t) => t.id === id);
    setForm((prev) => ({ ...prev, female_id: id, female_name: female?.name || "" }));
  };

  const handleEggLayingDate = (value) => {
    // Auto-hitung perkiraan menetas: 105 hari (tengah antara 90-120)
    let estimated = "";
    if (value) {
      estimated = format(addDays(new Date(value), 105), "yyyy-MM-dd");
    }
    setForm((prev) => ({ ...prev, egg_laying_date: value, estimated_hatch_date: estimated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      egg_count: form.egg_count ? Number(form.egg_count) : undefined,
      incubation_temp: form.incubation_temp ? Number(form.incubation_temp) : undefined,
    };
    if (editData?.id) {
      await base44.entities.Breeding.update(editData.id, data);
    } else {
      await base44.entities.Breeding.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["breedings"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editData?.id ? "Edit Pembiakan" : "Tambah Pembiakan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Jantan *</Label>
              {males.length > 0 ? (
                <Select value={form.male_id} onValueChange={handleMaleSelect}>
                  <SelectTrigger><SelectValue placeholder="Pilih jantan" /></SelectTrigger>
                  <SelectContent>
                    {males.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.male_name} onChange={(e) => handleChange("male_name", e.target.value)} placeholder="Nama jantan" required />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Betina *</Label>
              {females.length > 0 ? (
                <Select value={form.female_id} onValueChange={handleFemaleSelect}>
                  <SelectTrigger><SelectValue placeholder="Pilih betina" /></SelectTrigger>
                  <SelectContent>
                    {females.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.female_name} onChange={(e) => handleChange("female_name", e.target.value)} placeholder="Nama betina" required />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bertelur">Bertelur</SelectItem>
                  <SelectItem value="inkubasi">Inkubasi</SelectItem>
                  <SelectItem value="menetas">Menetas</SelectItem>
                  <SelectItem value="gagal">Gagal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Suhu Inkubasi (°C)</Label>
              <Input type="number" step="0.1" value={form.incubation_temp} onChange={(e) => handleChange("incubation_temp", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tanggal Bertelur</Label>
              <Input type="date" value={form.egg_laying_date} onChange={(e) => handleEggLayingDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah Telur</Label>
              <Input type="number" value={form.egg_count} onChange={(e) => handleChange("egg_count", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Perkiraan Tgl Menetas
              <span className="ml-1 text-[11px] text-muted-foreground font-normal">(otomatis ~105 hari dari bertelur, bisa diedit)</span>
            </Label>
            <Input type="date" value={form.estimated_hatch_date} onChange={(e) => handleChange("estimated_hatch_date", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editData?.id ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}