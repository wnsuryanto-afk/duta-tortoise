import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { logActivity } from "@/lib/logActivity";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function EnclosureForm({ enclosure, onClose, onSaved }) {
  const isEdit = !!enclosure;
  const [form, setForm] = useState(enclosure || {
    name: "", type: "indoor", is_active: true, ronda_harian: true,
    size_m2: "", max_capacity: "", current_count: 0,
    ideal_temp_min: "", ideal_temp_max: "", ideal_humidity: "",
    location: "", photo_url: "", notes: ""
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        const result = await base44.entities.Enclosure.update(enclosure.id, form);
        await logActivity({
          action: "update",
          entity_type: "Enclosure",
          entity_id: enclosure.id,
          entity_name: form.name,
          before: enclosure,
          after: form,
        });
        return result;
      } else {
        const result = await base44.entities.Enclosure.create(form);
        await logActivity({
          action: "create",
          entity_type: "Enclosure",
          entity_id: result?.id,
          entity_name: form.name,
          notes: "Kandang baru ditambahkan",
        });
        return result;
      }
    },
    onSuccess: onSaved,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Kandang" : "Tambah Kandang"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Nama Kandang *</Label>
              <Input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="cth: Kandang A1" />
            </div>
            <div className="space-y-1">
              <Label>Tipe</Label>
              <Select value={form.type} onValueChange={v=>set("type",v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indoor">Indoor</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="greenhouse">Greenhouse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Luas (m²)</Label>
              <Input type="number" value={form.size_m2} onChange={e=>set("size_m2",parseFloat(e.target.value)||"")} />
            </div>
            <div className="space-y-1">
              <Label>Kapasitas Maks.</Label>
              <Input type="number" value={form.max_capacity} onChange={e=>set("max_capacity",parseInt(e.target.value)||"")} />
            </div>
            <div className="space-y-1">
              <Label>Isi Saat Ini</Label>
              <Input type="number" value={form.current_count} onChange={e=>set("current_count",parseInt(e.target.value)||0)} />
            </div>
            <div className="space-y-1">
              <Label>Suhu Min (°C)</Label>
              <Input type="number" value={form.ideal_temp_min} onChange={e=>set("ideal_temp_min",parseFloat(e.target.value)||"")} />
            </div>
            <div className="space-y-1">
              <Label>Suhu Maks (°C)</Label>
              <Input type="number" value={form.ideal_temp_max} onChange={e=>set("ideal_temp_max",parseFloat(e.target.value)||"")} />
            </div>
            <div className="space-y-1">
              <Label>Kelembapan Ideal (%)</Label>
              <Input type="number" value={form.ideal_humidity} onChange={e=>set("ideal_humidity",parseFloat(e.target.value)||"")} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Lokasi di Area Farm</Label>
              <Input value={form.location} onChange={e=>set("location",e.target.value)} placeholder="cth: Zona Belakang Kiri" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>URL Foto</Label>
              <Input value={form.photo_url} onChange={e=>set("photo_url",e.target.value)} placeholder="https://..." />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Catatan</Label>
              <Textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2} />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v=>set("is_active",v)} />
              <Label>Kandang Aktif</Label>
            </div>
            {/* Sebelum sakelar ini ada, daftar kandang ronda ditulis mati di
                src/lib/kandang.js. Menggabungkan N1-N3 menjadi N karena itu
                membuat 28 kura hilang dari ronda harian kiper sampai kodenya
                diubah dan aplikasinya dibangun ulang — ubinnya tidak muncul,
                dan pakan serta kebersihannya tidak punya jalur pencatatan. */}
            <div className="col-span-2 flex items-start gap-3">
              <Switch
                checked={form.ronda_harian !== false}
                onCheckedChange={v=>set("ronda_harian",v)}
                className="mt-0.5"
              />
              <div className="min-w-0">
                <Label>Masuk ronda harian kiper</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Muncul sebagai ubin di layar Hari Ini, dengan poin pakan + cek kesehatan
                  dan pembersihan. Matikan untuk kandang Baby dan Bonsai yang tidak
                  dikunjungi tiap hari.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={()=>mutation.mutate()} disabled={!form.name||mutation.isPending}>
              {mutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}