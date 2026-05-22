import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const CATEGORIES = [
  { value: "perawatan_harian", label: "Perawatan Harian" },
  { value: "penanganan_sakit", label: "Penanganan Sakit" },
  { value: "breeding", label: "Breeding" },
  { value: "karantina", label: "Karantina" },
  { value: "penjualan", label: "Penjualan" },
  { value: "administrasi", label: "Administrasi" },
  { value: "lainnya", label: "Lainnya" },
];

export default function SOPDocumentForm({ data, onSave, onClose, user }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState(data || {
    title: "",
    category: "perawatan_harian",
    content: "",
    version: "v1.0",
    video_url: "",
    is_active: true,
    created_by: user?.full_name || user?.email || "",
    last_updated: today,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, last_updated: today };
    if (data?.id) await base44.entities.SOPDocument.update(data.id, payload);
    else await base44.entities.SOPDocument.create(payload);
    onSave();
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Judul SOP *</Label>
        <Input required value={form.title} onChange={e => set("title", e.target.value)} placeholder="Contoh: Prosedur Pemberian Pakan Harian" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Kategori</Label>
          <Select value={form.category} onValueChange={v => set("category", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Versi</Label>
          <Input value={form.version || ""} onChange={e => set("version", e.target.value)} placeholder="v1.0" />
        </div>
      </div>
      <div>
        <Label>Isi SOP (Markdown didukung)</Label>
        <Textarea
          value={form.content || ""}
          onChange={e => set("content", e.target.value)}
          rows={10}
          placeholder={`## Tujuan\nJelaskan tujuan SOP ini.\n\n## Prosedur\n1. Langkah pertama\n2. Langkah kedua\n\n## Catatan Penting\n- Hal yang perlu diperhatikan`}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">Gunakan format Markdown untuk heading (##), list (-), bold (**teks**)</p>
      </div>
      <div>
        <Label>URL Video Panduan (opsional)</Label>
        <Input value={form.video_url || ""} onChange={e => set("video_url", e.target.value)} placeholder="https://youtube.com/..." />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label>Dibuat oleh</Label>
          <Input value={form.created_by || ""} onChange={e => set("created_by", e.target.value)} />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch checked={form.is_active} onCheckedChange={v => set("is_active", v)} />
          <Label>Aktif</Label>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan SOP"}</Button>
      </div>
    </form>
  );
}