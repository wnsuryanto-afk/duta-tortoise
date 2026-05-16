import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp } from "lucide-react";

export default function SaleForm({ open, onClose, editData }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 300),
  });

  const available = tortoises.filter((t) => t.status === "aktif" || t.status === "breeding");

  const [form, setForm] = useState(editData || {
    tortoise_name: "", tortoise_id: "", buyer_name: "", buyer_phone: "",
    buyer_address: "", sale_date: new Date().toISOString().split("T")[0],
    price: "", hpp: "", payment_status: "lunas", shipping_method: "ambil_sendiri", notes: "",
  });

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleTortoiseSelect = (id) => {
    const t = tortoises.find((t) => t.id === id);
    setForm((prev) => ({ ...prev, tortoise_id: id, tortoise_name: t?.name || "" }));
  };

  const profit = (Number(form.price) || 0) - (Number(form.hpp) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      price: form.price ? Number(form.price) : 0,
      hpp: form.hpp ? Number(form.hpp) : 0,
    };
    if (editData?.id) {
      await base44.entities.Sale.update(editData.id, data);
    } else {
      await base44.entities.Sale.create(data);
      // Update tortoise status to terjual and remove from enclosure
      if (data.tortoise_id) {
        await base44.entities.Tortoise.update(data.tortoise_id, {
          status: "terjual",
          enclosure: "",
        });
        queryClient.invalidateQueries({ queryKey: ["tortoises"] });
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
              <Label>Tortoise *</Label>
              {available.length > 0 && !editData?.id ? (
                <Select value={form.tortoise_id} onValueChange={handleTortoiseSelect}>
                  <SelectTrigger><SelectValue placeholder="Pilih tortoise" /></SelectTrigger>
                  <SelectContent>
                    {available.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.code ? `(${t.code})` : ""} {t.enclosure ? `— ${t.enclosure}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.tortoise_name} onChange={(e) => handleChange("tortoise_name", e.target.value)} required />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Jual *</Label>
              <Input type="date" value={form.sale_date} onChange={(e) => handleChange("sale_date", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nama Pembeli *</Label>
              <Input value={form.buyer_name} onChange={(e) => handleChange("buyer_name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>No. Telepon</Label>
              <Input value={form.buyer_phone} onChange={(e) => handleChange("buyer_phone", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Alamat Pembeli</Label>
            <Textarea value={form.buyer_address} onChange={(e) => handleChange("buyer_address", e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Harga Jual (Rp) *</Label>
              <Input type="number" value={form.price} onChange={(e) => handleChange("price", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>HPP / Modal (Rp)</Label>
              <Input type="number" value={form.hpp} onChange={(e) => handleChange("hpp", e.target.value)} placeholder="0" />
            </div>
          </div>
          {/* Profit preview */}
          {(form.price || form.hpp) && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${profit >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Profit: Rp {profit.toLocaleString("id-ID")}</strong>
                {Number(form.hpp) > 0 && Number(form.price) > 0 && (
                  <span className="ml-2 text-xs opacity-80">
                    ({Math.round((profit / Number(form.price)) * 100)}% margin)
                  </span>
                )}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Pembayaran</Label>
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
              <Label>Pengiriman</Label>
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