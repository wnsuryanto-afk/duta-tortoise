import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, ExternalLink, Star, Package, Search } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { isManagerLevel } from "@/lib/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalizePhone } from "@/lib/normalizePhone";
import TombolWhatsApp from "@/components/common/TombolWhatsApp";
import LeadsSupplierTab from "@/components/supplier/LeadsSupplierTab";

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`w-3 h-3 ${s <= (rating||0) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function SupplierForm({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState(supplier || { name: "", contact_person: "", hp_whatsapp: "", address: "", city: "", specialty: "", rating: 5, is_preferred: false, notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name || !normalizePhone(form.hp_whatsapp).isValid) return;
    setSaving(true);
    if (supplier?.id) {
      await base44.entities.Supplier.update(supplier.id, form);
    } else {
      await base44.entities.Supplier.create(form);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  const f = (key, label, type = "text", placeholder = "") => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={form[key] || ""} onChange={e => setForm(p => ({...p,[key]:e.target.value}))} placeholder={placeholder} className="mt-1" />
    </div>
  );

  return (
    <div className="space-y-3">
      {f("name", "Nama Supplier *")}
      <div className="grid grid-cols-2 gap-3">
        {f("contact_person", "Nama Kontak")}
        {f("hp_whatsapp", "Nomor WhatsApp *", "tel")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {f("address", "Alamat")}
        {f("city", "Kota")}
      </div>
      {f("specialty", "Spesialisasi", "text", "Pakan & Vitamin, Alat Kerja...")}
      <div>
        <Label className="text-xs">Rating (1-5)</Label>
        <Input type="number" min={1} max={5} value={form.rating || 5} onChange={e => setForm(p=>({...p,rating:Number(e.target.value)}))} className="mt-1 w-24" />
      </div>
      <div>
        <Label className="text-xs">Catatan</Label>
        <Textarea value={form.notes || ""} onChange={e => setForm(p=>({...p,notes:e.target.value}))} className="mt-1 resize-none h-16" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name || !normalizePhone(form.hp_whatsapp).isValid}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </div>
  );
}

function SupplierItemForm({ supplierId, supplierName, item, onClose, onSaved }) {
  const [form, setForm] = useState(item || { item_name: "", item_category: "", price: "", unit: "pcs", marketplace_link: "", notes: "", is_active: true });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.item_name || !form.price) return;
    setSaving(true);
    const data = { ...form, supplier_id: supplierId, supplier_name: supplierName, price: Number(form.price), last_updated: new Date().toISOString().split("T")[0] };
    if (item?.id) {
      await base44.entities.SupplierItem.update(item.id, data);
    } else {
      await base44.entities.SupplierItem.create(data);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Nama Item *</Label>
        <Input value={form.item_name} onChange={e => setForm(p=>({...p,item_name:e.target.value}))} className="mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Harga (Rp) *</Label>
          <Input type="number" value={form.price} onChange={e => setForm(p=>({...p,price:e.target.value}))} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Satuan</Label>
          <Input value={form.unit} onChange={e => setForm(p=>({...p,unit:e.target.value}))} className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Link Marketplace</Label>
        <Input value={form.marketplace_link || ""} onChange={e => setForm(p=>({...p,marketplace_link:e.target.value}))} placeholder="https://tokopedia.com/..." className="mt-1" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !form.item_name || !form.price}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </div>
  );
}

export default function SupplierPage() {
  const qc = useQueryClient();
  const { role } = useCurrentUser();
  const canEdit = isManagerLevel(role);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date"),
  });
  const { data: supplierItems = [] } = useQuery({
    queryKey: ["supplier-items"],
    queryFn: () => base44.entities.SupplierItem.list("-created_date", 500),
  });

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("supplier");
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["suppliers"] });
    qc.invalidateQueries({ queryKey: ["supplier-items"] });
  };

  const filtered = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.specialty||"").toLowerCase().includes(search.toLowerCase()) || (s.city||"").toLowerCase().includes(search.toLowerCase())
  );

  const selectedItems = supplierItems.filter(i => i.supplier_id === selectedSupplier?.id && i.is_active !== false);

  const handleDeleteSupplier = async (s) => {
    if (confirm(`Hapus supplier "${s.name}"?`)) {
      await base44.entities.Supplier.delete(s.id);
      invalidate();
      if (selectedSupplier?.id === s.id) setSelectedSupplier(null);
    }
  };

  const handleDeleteItem = async (item) => {
    if (confirm(`Hapus item "${item.item_name}"?`)) {
      await base44.entities.SupplierItem.delete(item.id);
      invalidate();
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Supplier
          </h1>
            <p className="text-muted-foreground text-sm mt-1">Supplier aktif, daftar harga, dan calon supplier dari Facebook</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditSupplier(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Supplier
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="supplier">Supplier</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="supplier" className="mt-4 space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Cari supplier, spesialisasi, kota..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card className="py-12 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Belum ada supplier</p>
            </Card>
          ) : filtered.map(s => (
            <Card
              key={s.id}
              className={`p-4 cursor-pointer border-2 transition-all hover:border-primary/40 ${selectedSupplier?.id === s.id ? "border-primary" : "border-border"}`}
              onClick={() => setSelectedSupplier(s)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{s.name}</span>
                    {s.is_preferred && <Badge className="bg-amber-100 text-amber-700 text-[10px]">⭐ Preferred</Badge>}
                  </div>
                  {s.specialty && <p className="text-xs text-muted-foreground mt-0.5">{s.specialty}</p>}
                  <div className="flex items-center gap-3 mt-1.5">
                    <StarRating rating={s.rating} />
                    {s.city && <span className="text-xs text-muted-foreground">📍 {s.city}</span>}
                    {/* Dulu membaca s.phone — kolom yang TIDAK ADA di skema
                        Supplier, jadi nomornya tidak pernah tampil sekali pun.
                        Yang sah adalah hp_whatsapp. */}
                    <span onClick={e => e.stopPropagation()}>
                      <TombolWhatsApp
                        nomor={s.hp_whatsapp}
                        pesan={`Halo ${s.name}, saya dari peternakan kura Duta Tortoise.`}
                        label={normalizePhone(s.hp_whatsapp).display || "WhatsApp"}
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                      />
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditSupplier(s); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); handleDeleteSupplier(s); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Supplier items */}
        <div>
          {selectedSupplier ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Daftar Item — {selectedSupplier.name}</h3>
                {canEdit && (
                  <Button size="sm" onClick={() => { setEditItem(null); setShowItemForm(true); }} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Tambah Item
                  </Button>
                )}
              </div>
              {selectedItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Belum ada item untuk supplier ini</div>
              ) : selectedItems.map(item => (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.item_name}</p>
                      <p className="text-primary font-bold text-sm mt-0.5">
                        Rp {Number(item.price).toLocaleString("id-ID")} / {item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.marketplace_link && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" asChild>
                          <a href={item.marketplace_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(item); setShowItemForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Pilih supplier untuk melihat daftar item</p>
            </div>
          )}
        </div>
      </div>

      {/* Supplier Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editSupplier ? "Edit Supplier" : "Tambah Supplier"}</DialogTitle>
          </DialogHeader>
          <SupplierForm supplier={editSupplier} onClose={() => setShowForm(false)} onSaved={invalidate} />
        </DialogContent>
      </Dialog>

      {/* Item Form */}
      <Dialog open={showItemForm} onOpenChange={setShowItemForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Tambah Item"}</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <SupplierItemForm
              supplierId={selectedSupplier.id}
              supplierName={selectedSupplier.name}
              item={editItem}
              onClose={() => setShowItemForm(false)}
              onSaved={invalidate}
            />
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          {/* Lead disimpan di tabel sendiri (SupplierLead). Alasannya ada di
              base44/entities/SupplierLead.jsonc: daftar supplier harus berisi
              pihak yang benar-benar dipakai, bukan calon yang belum dihubungi. */}
          <LeadsSupplierTab onJadiSupplier={() => { invalidate(); setTab("supplier"); }} />
        </TabsContent>
      </Tabs>

    </div>
  );
}