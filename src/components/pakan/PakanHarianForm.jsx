import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Camera, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTestMode } from "@/lib/useTestMode";

const SOURCES = [
  { value: "rumput", label: "Rumput" },
  { value: "sayur_pasar", label: "Sayur Pasar" },
  { value: "campur", label: "Campur" },
  { value: "lainnya", label: "Lainnya" },
];

const SOURCE_BADGE = {
  rumput: "bg-green-100 text-green-700",
  sayur_pasar: "bg-orange-100 text-orange-700",
  campur: "bg-blue-100 text-blue-700",
  lainnya: "bg-muted text-foreground",
};

const EMPTY = {
  log_date: format(new Date(), "yyyy-MM-dd"),
  feed_source: "rumput",
  feed_type_detail: "",
  basket_count: "",
  notes: "",
  trip_cost_solar: "",
  trip_cost_rokok: "",
};

export default function PakanHarianForm({ open, onClose, user, onSaved }) {
  const { testModeTag } = useTestMode();
  const [form, setForm] = useState(EMPTY);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addToStock, setAddToStock] = useState(true);
  const qc = useQueryClient();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (file) => {
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSave = async () => {
    if (!form.log_date || !form.basket_count) {
      toast.error("Lengkapi tanggal & jumlah keranjang");
      return;
    }
    if (!photoFile && !photoPreview) {
      toast.error("Foto bukti wajib diunggah");
      return;
    }
    setSaving(true);
    try {
      let photo_url = photoPreview;
      if (photoFile) {
        const res = await base44.integrations.Core.UploadFile({ file: photoFile });
        photo_url = res.file_url;
      }

      const solar = Number(form.trip_cost_solar) || 0;
      const rokok = Number(form.trip_cost_rokok) || 0;
      const hasTrip = form.feed_source === "sayur_pasar" && (solar > 0 || rokok > 0);

      let trip_finance_tx_id = "";
      if (hasTrip) {
        const tx = await base44.entities.FinanceTransaction.create({
          type: "pengeluaran",
          category: "pakan",
          amount: solar + rokok,
          date: form.log_date,
          description: `Biaya ambil sayur pasar (solar Rp${solar.toLocaleString("id-ID")} + rokok Rp${rokok.toLocaleString("id-ID")}) - ${form.log_date}`,
          ...testModeTag,
        });
        trip_finance_tx_id = tx.id;
      }

      const pakanHarian = await base44.entities.PakanHarian.create({
        log_date: form.log_date,
        session: "pagi",
        feed_source: form.feed_source,
        feed_type_detail: form.feed_type_detail,
        basket_count: Number(form.basket_count),
        photo_url,
        notes: form.notes,
        recorded_by_name: user?.full_name || user?.email,
        recorded_by_email: user?.email,
        trip_cost_solar: solar,
        trip_cost_rokok: rokok,
        trip_finance_tx_id,
      });

      // ── INTEGRASI STOK PAKAN (anti-dobel via linked_pakan_harian_id) ──
      if (addToStock && pakanHarian?.id) {
        try {
          const existingMove = await base44.entities.StockMovement.filter({
            linked_pakan_harian_id: pakanHarian.id,
          });
          if (existingMove.length === 0) {
            const SOURCE_MAP = {
              rumput: { name: "Rumput", category: "rumput", feed_source: "kebun_sendiri" },
              sayur_pasar: { name: "Sayur Pasar", category: "sayuran", feed_source: "beli_pasar" },
              campur: { name: "Pakan Campur", category: "lainnya", feed_source: "beli_pasar" },
              lainnya: { name: "Pakan Lainnya", category: "lainnya", feed_source: "lainnya" },
            };
            const mapping = SOURCE_MAP[form.feed_source] || SOURCE_MAP.lainnya;

            const allFeed = await base44.entities.FeedStock.list("-created_date", 200);
            let feedItem = allFeed.find(s =>
              s.name?.toLowerCase() === mapping.name.toLowerCase() && s.unit === "keranjang"
            );
            if (!feedItem) {
              feedItem = await base44.entities.FeedStock.create({
                name: mapping.name,
                category: mapping.category,
                unit: "keranjang",
                current_stock: 0,
                minimum_stock: 1,
                price_per_unit: 0,
                notes: "Auto-created dari Pakan Harian",
                last_edited_by: user?.email || "",
                last_edited_at: new Date().toISOString(),
              });
            }

            const qtyKeranjang = Number(form.basket_count) || 0;
            const newStock = (feedItem.current_stock || 0) + qtyKeranjang;

            await base44.entities.StockMovement.create({
              item_id: feedItem.id,
              item_type: "feedstock",
              item_name: feedItem.name,
              item_sku: feedItem.sku || "",
              type: "masuk",
              quantity: qtyKeranjang,
              unit: "keranjang",
              stock_after: newStock,
              feed_source: mapping.feed_source,
              by_email: user?.email || "",
              by_name: user?.full_name || user?.email || "",
              notes: `Auto dari Pakan Harian (${form.feed_source})${form.feed_type_detail ? ` - ${form.feed_type_detail}` : ""}`,
              date: form.log_date,
              status: "selesai",
              photo_urls: photo_url ? [photo_url] : [],
              linked_pakan_harian_id: pakanHarian.id,
            });

            await base44.entities.FeedStock.update(feedItem.id, {
              current_stock: newStock,
              last_restocked_date: form.log_date,
              last_restocked_qty: qtyKeranjang,
              last_edited_by: user?.email || "",
              last_edited_at: new Date().toISOString(),
            });

            qc.invalidateQueries({ queryKey: ["feedstocks"] });
            qc.invalidateQueries({ queryKey: ["feed-movements"] });
          }
        } catch (e) {
          console.error("Stock integration error:", e);
        }
      }

      toast.success("Pengambilan pakan tercatat" + (addToStock ? " & stok diperbarui" : ""));
      onSaved?.();
      setForm(EMPTY);
      clearPhoto();
      onClose();
    } catch (e) {
      toast.error("Gagal menyimpan: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catat Pengambilan Pakan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tanggal *</Label>
              <Input type="date" value={form.log_date} onChange={e => set("log_date", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Sumber *</Label>
              <Select value={form.feed_source} onValueChange={v => set("feed_source", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Detail jenis (opsional)</Label>
            <Input value={form.feed_type_detail} onChange={e => set("feed_type_detail", e.target.value)} className="mt-1" placeholder="cth: kangkung, sawi, rumput gajah" />
          </div>

          <div>
            <Label className="text-xs">Jumlah keranjang *</Label>
            <Input type="number" min={0} value={form.basket_count} onChange={e => set("basket_count", e.target.value)} className="mt-1" placeholder="5" />
          </div>

          <div>
            <Label className="text-xs">Foto bukti ambilan *</Label>
            {photoPreview ? (
              <div className="relative mt-1">
                <img src={photoPreview} alt="Bukti" className="w-full h-40 object-cover rounded-lg border" />
                <button type="button" onClick={clearPhoto} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="mt-1 flex flex-col items-center justify-center gap-1 h-28 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 text-muted-foreground">
                <Camera className="w-6 h-6" />
                <span className="text-xs">Buka kamera / pilih foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])} />
              </label>
            )}
          </div>

          {form.feed_source === "sayur_pasar" && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-orange-800">Biaya Trip ke Pasar</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-orange-700">Biaya Solar (Rp)</Label>
                  <Input type="number" min={0} value={form.trip_cost_solar} onChange={e => set("trip_cost_solar", e.target.value)} className="mt-0.5" placeholder="50000" />
                </div>
                <div>
                  <Label className="text-[11px] text-orange-700">Biaya Rokok (Rp)</Label>
                  <Input type="number" min={0} value={form.trip_cost_rokok} onChange={e => set("trip_cost_rokok", e.target.value)} className="mt-0.5" placeholder="25000" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Upah anak tidak dicatat di sini — sudah masuk gaji harian</p>
            </div>
          )}

          <div>
            <Label className="text-xs">Catatan (opsional)</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1" rows={2} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={addToStock}
              onChange={e => setAddToStock(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-xs">Masukkan ke stok pakan? (otomatis tercatat sebagai Pakan Masuk)</span>
          </label>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Batal</Button>
            <Button type="button" className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { SOURCES, SOURCE_BADGE };