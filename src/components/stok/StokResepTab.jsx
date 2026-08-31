// Wrapper tipis yang re-use PelletRecipePage content (tanpa header/breadcrumb)
// Ini re-render konten resep & produksi langsung di dalam tab
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, FlaskConical, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  rincianBahan, masalahBahan, bahanTanpaHarga, totalBiaya,
  hppHasil, jumlahHasil, cariBarangHasil,
} from "@/lib/produksiRacikan";

function RecipeForm({ recipe, feedItems, warehouseItems, onClose, onSaved }) {
  const allItems = [
    ...feedItems.map(i => ({ ...i, source: "feed" })),
    ...warehouseItems.map(i => ({ ...i, source: "warehouse" })),
  ];
  const [form, setForm] = useState(recipe || { name: "", yield_kg: "", preparation_steps: "", preparation_time_minutes: "", shelf_life_days: 30, notes: "", ingredients: [] });
  const [saving, setSaving] = useState(false);

  const addIngredient = () => setForm(f => ({ ...f, ingredients: [...(f.ingredients || []), { item_id: "", item_name: "", quantity_kg: "", unit: "kg" }] }));
  const removeIngredient = (i) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));
  const updateIngredient = (i, key, val) => setForm(f => {
    const ings = [...(f.ingredients || [])];
    ings[i] = { ...ings[i], [key]: val };
    if (key === "item_id") {
      const found = allItems.find(item => item.id === val);
      if (found) { ings[i].item_name = found.name; ings[i].unit = found.unit || "kg"; }
    }
    return { ...f, ingredients: ings };
  });

  const handleSave = async () => {
    if (!form.name || !form.yield_kg) return;
    setSaving(true);
    const data = { ...form, yield_kg: Number(form.yield_kg), preparation_time_minutes: Number(form.preparation_time_minutes) || 0, shelf_life_days: Number(form.shelf_life_days) || 30 };
    if (recipe?.id) await base44.entities.PelletRecipe.update(recipe.id, data);
    else await base44.entities.PelletRecipe.create({ ...data, is_active: true });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Nama Resep *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Hasil (kg) *</Label>
          <Input type="number" value={form.yield_kg} onChange={e => setForm(f => ({ ...f, yield_kg: e.target.value }))} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Daya Tahan (hari)</Label>
          <Input type="number" value={form.shelf_life_days} onChange={e => setForm(f => ({ ...f, shelf_life_days: e.target.value }))} className="mt-1" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">Bahan-bahan</Label>
          <Button size="sm" variant="outline" onClick={addIngredient} className="gap-1 h-7 text-xs"><Plus className="w-3 h-3" /> Tambah</Button>
        </div>
        {(form.ingredients || []).map((ing, i) => (
          <div key={i} className="flex gap-2 mb-2 items-end">
            <div className="flex-1">
              <select className="w-full border border-input rounded-md px-2 py-1.5 text-xs bg-background" value={ing.item_id} onChange={e => updateIngredient(i, "item_id", e.target.value)}>
                <option value="">Pilih item...</option>
                <optgroup label="Pakan">{feedItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>
                <optgroup label="Gudang">{warehouseItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>
              </select>
            </div>
            <Input className="w-20 text-xs h-8" type="number" placeholder="Jumlah" value={ing.quantity_kg} onChange={e => updateIngredient(i, "quantity_kg", e.target.value)} />
            <span className="text-xs text-muted-foreground pb-1">{ing.unit || "kg"}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeIngredient(i)}><X className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
      </div>
      <div>
        <Label className="text-xs">Langkah Pembuatan</Label>
        <Textarea value={form.preparation_steps || ""} onChange={e => setForm(f => ({ ...f, preparation_steps: e.target.value }))} className="mt-1 resize-none h-20" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name || !form.yield_kg}>{saving ? "Menyimpan..." : "Simpan"}</Button>
      </div>
    </div>
  );
}

function ProductionDialog({ recipe, feedItems, warehouseItems, onClose, onSaved, userName, userEmail }) {
  const [qty, setQty] = useState(recipe?.yield_kg || "");
  const [producing, setProducing] = useState(false);
  const [gagal, setGagal] = useState("");

  const semuaBarang = [...feedItems, ...warehouseItems];
  const rincian = rincianBahan(recipe, qty, semuaBarang);
  const stockIssues = masalahBahan(rincian);
  const tanpaHarga = bahanTanpaHarga(rincian);
  const biaya = totalBiaya(rincian);
  const tujuan = cariBarangHasil(recipe, warehouseItems, feedItems);
  const satuanHasil = tujuan.item?.unit || "kg";
  const hpp = hppHasil(biaya, qty, satuanHasil);
  const hasilDalamSatuan = jumlahHasil(qty, satuanHasil);

  const handleProduce = async () => {
    if (stockIssues.length > 0 || !qty) return;
    setProducing(true);
    setGagal("");
    try {
      const today = new Date().toISOString().split("T")[0];
      const batchNo = `BATCH-RACIK-${Date.now().toString(36).toUpperCase()}`;

      // ── Bahan keluar ──
      // Dikurangi memakai jumlah yang SUDAH dikonversi ke satuan barangnya,
      // dan tiap pemakaian menulis jejaknya sendiri. Tanpa jejak ini,
      // pemakaian terbesar di peternakan ini tidak terlihat oleh perkiraan
      // sisa hari maupun laporan mana pun.
      for (const r of rincian) {
        if (!r.item || r.butuh <= 0) continue;
        const sisa = Math.max(0, (Number(r.item.current_stock) || 0) - r.butuh);
        const diPakan = feedItems.some((f) => f.id === r.item.id);
        if (diPakan) {
          await base44.entities.FeedStock.update(r.item.id, { current_stock: sisa });
        } else {
          await base44.entities.WarehouseItem.update(r.item.id, { current_stock: sisa });
        }
        await base44.entities.StockMovement.create({
          item_id: r.item.id,
          item_type: diPakan ? "feedstock" : "warehouse",
          item_name: r.item.name,
          item_sku: r.item.sku || "",
          type: "keluar",
          quantity: r.butuh,
          unit: r.satuan,
          unit_price: r.hargaSatuan,
          total_value: r.biaya,
          stock_after: sisa,
          keperluan: "lainnya",
          date: today,
          status: "selesai",
          by_email: userEmail || "",
          by_name: userName || userEmail || "",
          notes: `Bahan racikan ${recipe.name} — batch ${batchNo}.`,
        });
      }

      const kedaluwarsa = new Date();
      kedaluwarsa.setDate(kedaluwarsa.getDate() + (Number(recipe?.shelf_life_days) || 30));
      const tglExp = kedaluwarsa.toISOString().split("T")[0];

      await base44.entities.PelletProduction.create({
        recipe_id: recipe.id, recipe_name: recipe.name, production_date: today,
        produced_quantity_kg: Number(qty), produced_by: userName,
        batch_number: batchNo, expiry_date: tglExp,
      });

      // ── Hasil masuk ──
      // Ke barang tujuan yang SUDAH ada (Duta Repro → VIT-REP00), bukan barang
      // baru bertarif Rp 0 di tabel lain. Harga pokoknya = biaya bahan dibagi
      // hasilnya, jadi harga per gram yang diisi di tiap bahan benar-benar
      // sampai ke racikan jadinya.
      let hasil = tujuan.item;
      let jenis = tujuan.jenis;
      if (!hasil) {
        hasil = await base44.entities.FeedStock.create({
          name: recipe.name, category: "suplemen", unit: "kg",
          current_stock: 0, minimum_stock: 1, price_per_unit: 0,
        });
        jenis = "feedstock";
      }
      const stokBaru = (Number(hasil.current_stock) || 0) + hasilDalamSatuan;
      if (jenis === "warehouse") {
        await base44.entities.WarehouseItem.update(hasil.id, {
          current_stock: stokBaru,
          purchase_price: hpp,
          last_restocked_date: today,
          expired_date: tglExp,
        });
        await base44.entities.BatchBarang.create({
          batch_code: batchNo,
          item_id: hasil.id,
          item_sku: hasil.sku || "",
          nama_barang: `${recipe.name} — racikan ${today}`,
          jumlah_awal: hasilDalamSatuan,
          jumlah_sisa: hasilDalamSatuan,
          satuan: satuanHasil,
          harga_satuan: hpp,
          tanggal_terima: today,
          tanggal_expired: tglExp,
          label_per_butir: false,
          label_dicetak: false,
          status: "aktif",
        });
      } else {
        await base44.entities.FeedStock.update(hasil.id, {
          current_stock: stokBaru,
          price_per_unit: hpp,
        });
      }

      await base44.entities.StockMovement.create({
        item_id: hasil.id,
        item_type: jenis,
        item_name: hasil.name,
        item_sku: hasil.sku || "",
        type: "masuk",
        quantity: hasilDalamSatuan,
        unit: satuanHasil,
        unit_price: hpp,
        total_value: biaya,
        stock_after: stokBaru,
        date: today,
        status: "selesai",
        by_email: userEmail || "",
        by_name: userName || userEmail || "",
        notes: `Hasil racikan ${recipe.name} — batch ${batchNo}. Biaya bahan ${Math.round(biaya).toLocaleString("id-ID")} rupiah.`,
      });

      onSaved();
      onClose();
    } catch (e) {
      setGagal(e?.message || "Gagal memproduksi.");
    }
    setProducing(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-xl p-3 space-y-1">
        <p className="text-sm font-semibold">{recipe?.name}</p>
        <p className="text-xs text-muted-foreground">Resep dasar: {recipe?.yield_kg} kg · {(recipe?.ingredients || []).length} bahan</p>
      </div>
      <div>
        <Label className="text-xs">Jumlah yang diproduksi (kg) *</Label>
        <Input type="number" value={qty} onChange={e => setQty(e.target.value)} className="mt-1" />
      </div>
      {qty && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">
            Kebutuhan bahan <span className="font-normal">— dalam satuan gudangnya, bukan satuan resep</span>
          </p>
          {rincian.map((r, i) => (
            <div key={i} className={`flex items-center justify-between gap-2 text-xs p-2 rounded-lg ${r.cukup ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              <span className="min-w-0 flex-1">{r.ing.item_name}</span>
              <span className="font-medium whitespace-nowrap">
                {r.butuh >= 100 ? Math.round(r.butuh).toLocaleString("id-ID") : r.butuh.toFixed(2)} {r.satuan}
                {r.adaHarga && <span className="opacity-70"> · Rp {r.biaya.toLocaleString("id-ID")}</span>}
                {" "}
                {r.cukup ? <CheckCircle2 className="w-3 h-3 inline" /> : <AlertTriangle className="w-3 h-3 inline" />}
              </span>
            </div>
          ))}

          <div className="rounded-lg border border-border p-2.5 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total biaya bahan</span>
              <span className="font-semibold font-mono">Rp {Math.round(biaya).toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Masuk ke</span>
              <span className="font-medium text-right">
                {tujuan.item ? tujuan.item.name : `${recipe?.name} (barang baru)`}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 mt-1">
              <span className="text-muted-foreground">Harga pokok hasil</span>
              <span className="font-semibold font-mono">
                Rp {hpp >= 1 ? Math.round(hpp).toLocaleString("id-ID") : hpp.toFixed(2)} / {satuanHasil}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-0.5">
              {hasilDalamSatuan >= 100 ? Math.round(hasilDalamSatuan).toLocaleString("id-ID") : hasilDalamSatuan} {satuanHasil} hasil produksi.
              Biaya bahannya menempel ke harga pokok racikan ini, jadi pemberiannya ke kura tidak lagi tercatat gratis.
            </p>
          </div>

          {tanpaHarga.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800">
              <strong>{tanpaHarga.length} bahan belum punya harga beli</strong>, jadi harga pokok di atas
              lebih murah dari kenyataan: {tanpaHarga.slice(0, 4).join(", ")}
              {tanpaHarga.length > 4 ? `, +${tanpaHarga.length - 4} lagi` : ""}.
              Harganya terisi sendiri saat pembelian bahan itu diterima.
            </div>
          )}
        </div>
      )}

      {gagal && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">{gagal}</div>
      )}
      {stockIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-red-700">⚠️ Stok tidak mencukupi:</p>
          {stockIssues.map((msg, i) => <p key={i} className="text-xs text-red-600 mt-1">• {msg}</p>)}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleProduce} disabled={producing || !qty || stockIssues.length > 0}>
          {producing ? "Memproduksi..." : "Konfirmasi Produksi"}
        </Button>
      </div>
    </div>
  );
}

export default function StokResepTab({ role }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const canEdit = ["owner", "manajer", "admin", "kepala_feeder"].includes(role);

  const { data: recipes = [], isLoading } = useQuery({ queryKey: ["pellet-recipes"], queryFn: () => base44.entities.PelletRecipe.list("-created_date") });
  const { data: productions = [] } = useQuery({ queryKey: ["pellet-productions"], queryFn: () => base44.entities.PelletProduction.list("-production_date", 100) });
  const { data: feedItems = [] } = useQuery({ queryKey: ["feedstocks", "-name", 300], queryFn: () => base44.entities.FeedStock.list("-name", 300) });
  const { data: warehouseItems = [] } = useQuery({ queryKey: ["warehouse-items", "-created_date", 300], queryFn: () => base44.entities.WarehouseItem.list("-created_date", 300) });

  const [showForm, setShowForm] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);
  const [produceRecipe, setProduceRecipe] = useState(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pellet-recipes"] });
    qc.invalidateQueries({ queryKey: ["pellet-productions"] });
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
  };

  const handleDelete = async (r) => {
    if (confirm(`Hapus resep "${r.name}"?`)) {
      await base44.entities.PelletRecipe.delete(r.id);
      invalidate();
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Kelola formulasi pakan pelet dan riwayat produksi</p>
        {canEdit && (
          <Button onClick={() => { setEditRecipe(null); setShowForm(true); }} className="gap-2 h-9 text-sm">
            <Plus className="w-4 h-4" /> Buat Resep Baru
          </Button>
        )}
      </div>

      <Tabs defaultValue="resep">
        <TabsList>
          <TabsTrigger value="resep">Daftar Resep ({recipes.length})</TabsTrigger>
          <TabsTrigger value="produksi">Riwayat Produksi ({productions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="resep" className="mt-4">
          {recipes.length === 0 ? (
            <Card className="py-12 text-center text-muted-foreground">
              <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Belum ada resep pelet</p>
              {canEdit && <Button className="mt-4 gap-2" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Buat Resep</Button>}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipes.map(r => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{r.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>⚖️ {r.yield_kg} kg/batch</span>
                        <span>📦 {(r.ingredients || []).length} bahan</span>
                        {r.shelf_life_days && <span>⏱ {r.shelf_life_days} hari</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {canEdit && (
                        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => setProduceRecipe(r)}>
                          <FlaskConical className="w-3.5 h-3.5" /> Buat Pelet
                        </Button>
                      )}
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditRecipe(r); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="produksi" className="mt-4 space-y-3">
          {productions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Belum ada riwayat produksi</div>
          ) : productions.map(p => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-sm">{p.recipe_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>⚖️ {p.produced_quantity_kg} kg</span>
                    <span>👤 {p.produced_by}</span>
                    {p.batch_number && <span className="font-mono">#{p.batch_number}</span>}
                    {p.production_date && <span>📅 {format(new Date(p.production_date), "d MMM yyyy", { locale: idLocale })}</span>}
                  </div>
                </div>
                {p.expiry_date && (
                  <Badge variant="outline" className="text-xs">Kadaluarsa: {format(new Date(p.expiry_date), "d MMM yyyy", { locale: idLocale })}</Badge>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FlaskConical className="w-5 h-5 text-primary" /> {editRecipe ? "Edit Resep" : "Buat Resep Baru"}</DialogTitle></DialogHeader>
          <RecipeForm recipe={editRecipe} feedItems={feedItems} warehouseItems={warehouseItems} onClose={() => setShowForm(false)} onSaved={invalidate} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!produceRecipe} onOpenChange={() => setProduceRecipe(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FlaskConical className="w-5 h-5 text-primary" /> Produksi Pelet</DialogTitle></DialogHeader>
          {produceRecipe && (
            <ProductionDialog recipe={produceRecipe} feedItems={feedItems} warehouseItems={warehouseItems} onClose={() => setProduceRecipe(null)} onSaved={invalidate} userName={user?.full_name || user?.email} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}