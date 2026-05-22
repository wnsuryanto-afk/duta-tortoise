import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BuyerForm({ data, onSave, onClose }) {
  const [form, setForm] = useState(data || {
    name: "", phone: "", whatsapp: "", email: "", city: "",
    platform_asal: "", favorite_morph: "", budget_range: "", notes: "",
    total_purchases: 0, total_spent: 0,
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "Nama pembeli wajib diisi";
    if (!form.phone?.trim()) e.phone = "Nomor telepon wajib diisi";
    if (!form.platform_asal) e.platform_asal = "Platform asal wajib dipilih";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (data?.id) await base44.entities.BuyerProfile.update(data.id, form);
    else await base44.entities.BuyerProfile.create(form);
    onSave();
  };

  const isValid = form.name?.trim() && form.phone?.trim() && form.platform_asal;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Nama <span className="text-red-500">*</span></Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} className={errors.name ? "border-red-500" : ""} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div>
          <Label>Telepon <span className="text-red-500">*</span></Label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="08xxx" className={errors.phone ? "border-red-500" : ""} />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input value={form.whatsapp || ""} onChange={e => set("whatsapp", e.target.value)} placeholder="628xxx" />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} />
        </div>
        <div>
          <Label>Kota</Label>
          <Input value={form.city || ""} onChange={e => set("city", e.target.value)} />
        </div>
        <div>
          <Label>Platform Asal <span className="text-red-500">*</span></Label>
          <Select value={form.platform_asal || ""} onValueChange={v => set("platform_asal", v)}>
            <SelectTrigger className={errors.platform_asal ? "border-red-500" : ""}><SelectValue placeholder="Pilih..." /></SelectTrigger>
            <SelectContent>
              {["Instagram","Tokopedia","Shopee","WhatsApp","Referral","Langsung","Lainnya"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.platform_asal && <p className="text-xs text-red-500 mt-1">{errors.platform_asal}</p>}
        </div>
        <div>
          <Label>Budget Range</Label>
          <Select value={form.budget_range || ""} onValueChange={v => set("budget_range", v)}>
            <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
            <SelectContent>
              {["<500rb","500rb-1jt","1jt-5jt","5jt-10jt",">10jt"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Morph Favorit</Label>
          <Input value={form.favorite_morph || ""} onChange={e => set("favorite_morph", e.target.value)} placeholder="normal, albino, dll" />
        </div>
      </div>
      <div>
        <Label>Catatan</Label>
        <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={!isValid}>Simpan</Button>
      </div>
    </form>
  );
}