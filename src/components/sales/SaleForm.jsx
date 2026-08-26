import { useState } from "react";
import { recalcEnclosureCounts } from "@/lib/enclosureCount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp } from "lucide-react";
import { useTestMode } from "@/lib/useTestMode";

export default function SaleForm({ open, onClose, editData }) {
  const queryClient = useQueryClient();
  const { testModeTag } = useTestMode();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 300),
  });

  const available = tortoises.filter((t) => t.status === "aktif" || t.status === "breeding");

  const [form, setForm] = useState(editData || {
    tortoise_name: "", tortoise_id: "", buyer_name: "", hp_whatsapp: "",
    buyer_address: "", sale_date: new Date().toISOString().split("T")[0],
    price: "", hpp: "", shipping_cost: 0, payment_status: "lunas", shipping_method: "ambil_sendiri", notes: "",
  });

  const handleChange = (field, value) => { setForm((prev) => ({ ...prev, [field]: value })); setErrors(e => ({ ...e, [field]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.tortoise_name?.trim()) e.tortoise_name = "Nama tortoise wajib diisi";
    if (!form.buyer_name?.trim()) e.buyer_name = "Nama pembeli wajib diisi";
    if (!form.hp_whatsapp?.trim()) e.hp_whatsapp = "No. HP / WhatsApp pembeli wajib diisi";
    if (!form.price) e.price = "Harga jual wajib diisi";
    if (!form.sale_date) e.sale_date = "Tanggal jual wajib diisi";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleTortoiseSelect = (id) => {
    const t = tortoises.find((t) => t.id === id);
    setForm((prev) => ({ ...prev, tortoise_id: id, tortoise_name: t?.name || "" }));
  };

  // HPP = modal + shipping_cost
  const totalHpp = (Number(form.hpp) || 0) + (Number(form.shipping_cost) || 0);
  const profit = (Number(form.price) || 0) - totalHpp;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const data = {
      ...form,
      price: form.price ? Number(form.price) : 0,
      shipping_cost: Number(form.shipping_cost) || 0,
      hpp: (Number(form.hpp) || 0) + (Number(form.shipping_cost) || 0),
    };
    if (editData?.id) {
      await base44.entities.Sale.update(editData.id, data);
      // FIX: Auto-sync hp_whatsapp ke BuyerProfile (newest number wins)
      if (form.hp_whatsapp && editData.buyer_profile_id) {
        try {
          const buyer = await base44.entities.BuyerProfile.get(editData.buyer_profile_id);
          if (buyer && (!buyer.hp_whatsapp || buyer.hp_whatsapp !== form.hp_whatsapp)) {
            await base44.entities.BuyerProfile.update(editData.buyer_profile_id, {
              hp_whatsapp: form.hp_whatsapp,
            });
            queryClient.invalidateQueries({ queryKey: ["buyer-profiles"] });
          }
        } catch (_) { /* non-critical */ }
      }
    } else {
      await base44.entities.Sale.create({ ...data, ...testModeTag });
      // Update tortoise status to terjual and remove from enclosure
      if (data.tortoise_id) {
        // Status asal disimpan dan tanggal perubahannya dicatat, sama seperti
        // yang dilakukan SaleWizard. Tanpa keduanya, pembatalan penjualan tidak
        // punya rujukan untuk mengembalikan kura ke statusnya semula.
        const kuraTerjual = tortoises.find(t => t.id === data.tortoise_id);
        await base44.entities.Tortoise.update(data.tortoise_id, {
          status: "terjual",
          is_currently_sick: false,
          previous_status: kuraTerjual?.status && kuraTerjual.status !== "terjual"
            ? kuraTerjual.status
            : kuraTerjual?.previous_status,
          last_status_change: new Date().toISOString().split("T")[0],
          enclosure: "",
          enclosure_id: "",
        });
        // Kandang lama kehilangan satu penghuni — hitung ulang agar tidak melar.
        try { await recalcEnclosureCounts(); } catch { /* penjualan tetap tersimpan */ }
        queryClient.invalidateQueries({ queryKey: ["tortoises"] });
        queryClient.invalidateQueries({ queryKey: ["enclosures"] });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editData?.id ? "Edit Penjualan" : "Tambah Penjualan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tortoise <span className="text-red-500">*</span></Label>
              {available.length > 0 && !editData?.id ? (
                <Select value={form.tortoise_id} onValueChange={handleTortoiseSelect}>
                  <SelectTrigger className={errors.tortoise_name ? "border-red-500" : ""}><SelectValue placeholder="Pilih tortoise" /></SelectTrigger>
                  <SelectContent>
                    {available.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.code ? `(${t.code})` : ""} {t.enclosure ? `— ${t.enclosure}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.tortoise_name} onChange={(e) => handleChange("tortoise_name", e.target.value)} className={errors.tortoise_name ? "border-red-500" : ""} />
              )}
              {errors.tortoise_name && <p className="text-xs text-red-500">{errors.tortoise_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Jual <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.sale_date} onChange={(e) => handleChange("sale_date", e.target.value)} className={errors.sale_date ? "border-red-500" : ""} />
              {errors.sale_date && <p className="text-xs text-red-500">{errors.sale_date}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nama Pembeli <span className="text-red-500">*</span></Label>
              <Input value={form.buyer_name} onChange={(e) => handleChange("buyer_name", e.target.value)} className={errors.buyer_name ? "border-red-500" : ""} />
              {errors.buyer_name && <p className="text-xs text-red-500">{errors.buyer_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>No. HP / WhatsApp <span className="text-red-500">*</span></Label>
              <Input value={form.hp_whatsapp} onChange={(e) => handleChange("hp_whatsapp", e.target.value)} className={errors.hp_whatsapp ? "border-red-500" : ""} placeholder="08123456789" />
              {errors.hp_whatsapp && <p className="text-xs text-red-500">{errors.hp_whatsapp}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Alamat Pembeli</Label>
            <Textarea value={form.buyer_address} onChange={(e) => handleChange("buyer_address", e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Harga Jual (Rp) <span className="text-red-500">*</span></Label>
              <Input type="number" min="0" value={form.price} onChange={(e) => handleChange("price", e.target.value)} className={errors.price ? "border-red-500" : ""} />
              {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>HPP / Modal (Rp)</Label>
              <Input type="number" min="0" value={form.hpp} onChange={(e) => handleChange("hpp", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Ongkos Kirim (Rp)</Label>
              <Input type="number" min="0" value={form.shipping_cost} onChange={(e) => handleChange("shipping_cost", e.target.value)} placeholder="0" />
            </div>
          </div>
          {/* Profit preview */}
          {(form.price || form.hpp) && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${profit >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Margin: Rp {profit.toLocaleString("id-ID")}</strong>
                {totalHpp > 0 && Number(form.price) > 0 && (
                  <span className="ml-2 text-xs opacity-80">
                    ({Math.round((profit / Number(form.price)) * 100)}% · HPP total Rp {totalHpp.toLocaleString("id-ID")})
                  </span>
                )}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Pembayaran <span className="text-red-500">*</span></Label>
              <Select value={form.payment_status} onValueChange={(v) => handleChange("payment_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lunas">Lunas</SelectItem>
                  <SelectItem value="dp">DP</SelectItem>
                  <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pengiriman <span className="text-red-500">*</span></Label>
              <Select value={form.shipping_method} onValueChange={(v) => handleChange("shipping_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambil_sendiri">Ambil Sendiri</SelectItem>
                  <SelectItem value="kirim_kurir">Kurir</SelectItem>
                  <SelectItem value="cargo">Cargo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} rows={2} />
          </div>
          {!editData?.id && (
            <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ Setelah disimpan, status tortoise akan otomatis berubah menjadi <strong>Terjual</strong> dan dilepas dari kandang.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving || !form.tortoise_name?.trim() || !form.buyer_name?.trim() || !form.hp_whatsapp?.trim() || !form.price || !form.sale_date}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editData?.id ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}