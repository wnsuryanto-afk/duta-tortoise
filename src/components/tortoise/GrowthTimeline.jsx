import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Camera, TrendingUp, Ruler } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function AddPhotoForm({ tortoise, onClose, onSaved }) {
  const [form, setForm] = useState({
    tortoise_id: tortoise.id,
    tortoise_name: tortoise.name,
    date: new Date().toISOString().split("T")[0],
    photo_url: "",
    weight_grams: "",
    shell_length_cm: "",
    age_months: "",
    taken_by: "",
    notes: "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const mutation = useMutation({
    mutationFn: () => base44.entities.GrowthPhoto.create(form),
    onSuccess: onSaved,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Tambah Foto Perkembangan</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>URL Foto *</Label>
            <Input value={form.photo_url} onChange={e => set("photo_url", e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1">
            <Label>Tanggal *</Label>
            <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Usia (bulan)</Label>
            <Input type="number" value={form.age_months} onChange={e => set("age_months", parseFloat(e.target.value) || "")} />
          </div>
          <div className="space-y-1">
            <Label>Berat (gram)</Label>
            <Input type="number" value={form.weight_grams} onChange={e => set("weight_grams", parseFloat(e.target.value) || "")} />
          </div>
          <div className="space-y-1">
            <Label>Panjang Cangkang (cm)</Label>
            <Input type="number" value={form.shell_length_cm} onChange={e => set("shell_length_cm", parseFloat(e.target.value) || "")} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Difoto oleh</Label>
            <Input value={form.taken_by} onChange={e => set("taken_by", e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.photo_url || mutation.isPending}>
            {mutation.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GrowthTimeline({ tortoise }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: photos = [] } = useQuery({
    queryKey: ["growth-photos", tortoise.id],
    queryFn: () => base44.entities.GrowthPhoto.filter({ tortoise_id: tortoise.id }),
  });

  const sorted = [...photos].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Camera className="w-4 h-4 text-primary" />
          Timeline Foto Perkembangan
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />Tambah
        </Button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Belum ada foto perkembangan</p>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-4">
            {sorted.map((photo, idx) => (
              <div key={photo.id} className="relative flex gap-4 pl-12">
                <div className="absolute left-3.5 top-2 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {format(new Date(photo.date), "d MMMM yyyy", { locale: id })}
                    </p>
                    {photo.age_months && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {photo.age_months} bulan
                      </span>
                    )}
                  </div>
                  <div className="rounded-xl overflow-hidden border mb-2 max-w-xs">
                    <img src={photo.photo_url} alt={`Foto ${idx + 1}`} className="w-full object-cover max-h-48" />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {photo.weight_grams && (
                      <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                        <TrendingUp className="w-3 h-3" />{photo.weight_grams}g
                      </span>
                    )}
                    {photo.shell_length_cm && (
                      <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                        <Ruler className="w-3 h-3" />{photo.shell_length_cm}cm
                      </span>
                    )}
                    {photo.taken_by && (
                      <span className="text-muted-foreground">Oleh: {photo.taken_by}</span>
                    )}
                  </div>
                  {photo.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{photo.notes}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <AddPhotoForm
          tortoise={tortoise}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["growth-photos", tortoise.id] }); }}
        />
      )}
    </div>
  );
}