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

export default function HealthForm({ open, onClose, editData }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 200),
  });

  const [form, setForm] = useState(editData || {
    tortoise_name: "", tortoise_id: "", date: new Date().toISOString().split("T")[0],
    type: "checkup", weight_grams: "", shell_length_cm: "",
    description: "", treatment: "", vet_name: "",
  });

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleTortoiseSelect = (id) => {
    const t = tortoises.find((t) => t.id === id);
    setForm((prev) => ({ ...prev, tortoise_id: id, tortoise_name: t?.name || "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      weight_grams: form.weight_grams ? Number(form.weight_grams) : undefined,
      shell_length_cm: form.shell_length_cm ? Number(form.shell_length_cm) : undefined,
    };
    if (editData?.id) {
      await base44.entities.HealthRecord.update(editData.id, data);
    } else {
      await base44.entities.HealthRecord.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["health"] });
    setSaving(false);
    onClose();
  };

  const typeLabels = {
    checkup: "Checkup", sakit: "Sakit", obat: "Obat",
    vaksin: "Vaksin", timbang: "Timbang", lainnya: "Lainnya",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editData?.id ? "Edit Catatan" : "Tambah Catatan Kesehatan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tortoise *</Label>
              {tortoises.length > 0 ? (
                <Select value={form.tortoise_id} onValueChange={handleTortoiseSelect}>
                  <SelectTrigger><SelectValue placeholder="Pilih tortoise" /></SelectTrigger>
                  <SelectContent>
                    {tortoises.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.tortoise_name} onChange={(e) => handleChange("tortoise_name", e.target.value)} required />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal *</Label>
              <Input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Jenis *</Label>
              <Select value={form.type} onValueChange={(v) => handleChange("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dokter Hewan</Label>
              <Input value={form.vet_name} onChange={(e) => handleChange("vet_name", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Berat (gram)</Label>
              <Input type="number" value={form.weight_grams} onChange={(e) => handleChange("weight_grams", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Panjang Cangkang (cm)</Label>
              <Input type="number" step="0.1" value={form.shell_length_cm} onChange={(e) => handleChange("shell_length_cm", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Penanganan / Obat</Label>
            <Textarea value={form.treatment} onChange={(e) => handleChange("treatment", e.target.value)} rows={2} />
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