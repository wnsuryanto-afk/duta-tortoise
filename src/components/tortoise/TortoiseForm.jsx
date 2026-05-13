import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function TortoiseForm({ open, onClose, editData }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(editData || {
    name: "", code: "", gender: "belum_diketahui", birth_date: "",
    weight_grams: "", shell_length_cm: "", status: "aktif",
    enclosure: "", notes: "",
  });

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      weight_grams: form.weight_grams ? Number(form.weight_grams) : undefined,
      shell_length_cm: form.shell_length_cm ? Number(form.shell_length_cm) : undefined,
    };
    if (editData?.id) {
      await base44.entities.Tortoise.update(editData.id, data);
    } else {
      await base44.entities.Tortoise.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["tortoises"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editData?.id ? "Edit Tortoise" : "Tambah Tortoise"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nama *</Label>
              <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Kode</Label>
              <Input value={form.code} onChange={(e) => handleChange("code", e.target.value)} placeholder="ST-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Jenis Kelamin</Label>
              <Select value={form.gender} onValueChange={(v) => handleChange("gender", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="jantan">Jantan</SelectItem>
                  <SelectItem value="betina">Betina</SelectItem>
                  <SelectItem value="belum_diketahui">Belum Diketahui</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="breeding">Breeding</SelectItem>
                  <SelectItem value="terjual">Terjual</SelectItem>
                  <SelectItem value="mati">Mati</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tanggal Lahir</Label>
              <Input type="date" value={form.birth_date} onChange={(e) => handleChange("birth_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Kandang</Label>
              <Input value={form.enclosure} onChange={(e) => handleChange("enclosure", e.target.value)} placeholder="Kandang A" />
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