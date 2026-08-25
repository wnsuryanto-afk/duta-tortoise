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
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";

function formatRp(n) { return "Rp " + Number(n || 0).toLocaleString("id-ID"); }

function RecipeForm({ recipe, feedItems, warehouseItems, onClose, onSaved }) {
  const allItems = [
    ...feedItems.map(i => ({ ...i, source: "feed" })),
    ...warehouseItems.map(i => ({ ...i, source: "warehouse" })),
  ];

  const [form, setForm] = useState(recipe || {
    name: "", yield_kg: "", preparation_steps: "", preparation_time_minutes: "", shelf_life_days: 30, notes: "", ingredients: [],
  });
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
    if (recipe?.id) {
      await base44.entities.PelletRecipe.update(recipe.id, data);
    } else {
      await base44.entities.PelletRecipe.create({ ...data, is_active: true });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Nama Resep *</Label>
          <Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Hasil (kg) *</Label>
          <Input type="number" value={form.yield_kg} onChange={e => setForm(f=>({...f,yield_kg:e.target.value}))} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Daya Tahan (hari)</Label>
          <Input type="number" value={form.shelf_life_days} onChange={e => setForm(f=>({...f,shelf_life_days:e.target.value}))} className="mt-1" />
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
              <select
                className="w-full border border-input rounded-md px-2 py-1.5 text-xs bg-background"
                value={ing.item_id}
                onChange={e => updateIngredient(i, "item_id", e.target.value)}
              >
                <option value="">Pilih item...</option>
                <optgroup label="Pakan">
                  {feedItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </optgroup>
                <optgroup label="Gudang">
                  {warehouseItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </optgroup>
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
        <Textarea value={form.preparation_steps || ""} onChange={e => setForm(f=>({...f,preparation_steps:e.target.value}))} className="mt-1 resize-none h-20" />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name || !form.yield_kg}>{saving ? "Menyimpan..." : "Simpan"}</Button>
      </div>
    </div>
  );
}

function ProductionDialog({ recipe, feedItems, warehouseItems, onClose, onSaved, userName }) {
  const [qty, setQty] = useState(recipe?.yield_kg || "");
  const [producing, setProducing] = useState(false);

  // Check stock for each ingredient
  const checkStocks = () => {
    const issues = [];
    (recipe?.ingredients || []).forEach(ing => {
      const allItems = [...feedItems, ...warehouseItems];
      const item = allItems.find(i => i.id === ing.item_id);
      if (!item) { issues.push(`${ing.item_name}: item tidak ditemukan`); return; }
      const scaleFactor = Number(qty) / (recipe?.yield_kg || 1);
      const needed = (Number(ing.quantity_kg) || 0) * scaleFactor;
      if (item.current_stock < needed) {
        issues.push(`${ing.item_name}: butuh ${needed.toFixed(2)} ${ing.unit}, stok hanya ${item.current_stock} ${ing.unit}`);
      }
    });
    return issues;
  };

  const stockIssues = checkStocks();

  const handleProduce = async () => {
    if (stockIssues.length > 0 || !qty) return;
    setProducing(true);
    const scaleFactor = Number(qty) / (recipe?.yield_kg || 1);
    const today = new Date().toISOString().split("T")[0];
    const batchNo = `BATCH-${Date.now().toString(36).toUpperCase()}`;
    const allItems = [...feedItems, ...warehouseItems];

    // Reduce ingredient stocks
    for (const ing of (recipe?.ingredients || [])) {
      const item = allItems.find(i => i.id === ing.item_id);
      if (!item) continue;
      const used = (Number(ing.quantity_kg) || 0) * scaleFactor;
      if (feedItems.find(f => f.id === item.id)) {
        await base44.entities.FeedStock.update(item.id, { current_stock: Math.max(0, item.current_stock - used) });
      } else {
        await base44.entities.WarehouseItem.update(item.id, { current_stock: Math.max(0, item.current_stock - used) });
      }
    }

    // Create production record
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (recipe?.shelf_life_days || 30));

    await base44.entities.PelletProduction.create({
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      production_date: today,
      produced_quantity_kg: Number(qty),
      produced_by: userName,
      batch_number: batchNo,
      expiry_date: expiry.toISOString().split("T")[0],
    });

    // Add pelet to FeedStock
    const existing = feedItems.find(f => f.name === recipe.name);
    if (existing) {
      await base44.entities.FeedStock.update(existing.id, { current_stock: (existing.current_stock || 0) + Number(qty) });
    } else {
      await base44.entities.FeedStock.create({
        name: recipe.name, category: "suplemen", unit: "kg",
        current_stock: Number(qty), minimum_stock: 1, price_per_unit: 0,
      });
    }

    setProducing(false);
    onSaved();
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-xl p-3 space-y-1">
        <p className="text-sm font-semibold">{recipe?.name}</p>
        <p className="text-xs text-muted-foreground">Resep dasar: {recipe?.yield_kg} kg · {(recipe?.ingredients||[]).length} bahan</p>
      </div>

      <div>
        <Label className="text-xs">Jumlah yang diproduksi (kg) *</Label>
        <Input type="number" value={qty} onChange={e => setQty(e.target.value)} className="mt-1" placeholder={recipe?.yield_kg} />
      </div>

      {qty && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Kebutuhan bahan:</p>
          {(recipe?.ingredients || []).map((ing, i) => {
            const allItems = [...feedItems, ...warehouseItems];
            const item = allItems.find(x => x.id === ing.item_id);
            const scaleFactor = Number(qty) / (recipe?.yield_kg || 1);
            const needed = (Number(ing.quantity_kg) || 0) * scaleFactor;
            const sufficient = item && item.current_stock >= needed;
            return (
              <div key={i} className={`flex items-center justify-between text-xs p-2 rounded-lg ${sufficient ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                <span>{ing.item_name}</span>
                <span className="font-medium">{needed.toFixed(2)} {ing.unit} {sufficient ? <CheckCircle2 className="w-3 h-3 inline" /> : <AlertTriangle className="w-3 h-3 inline" />}</span>
              </div>
            );
          })}
        </div>
      )}

      {stockIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Stok tidak mencukupi:</p>
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

export default function PelletRecipePage() {
  const qc = useQueryClient();
  const { role, user } = useCurrentUser();

  const canEdit = ["owner", "manajer", "admin", "kepala_feeder"].includes(role);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["pellet-recipes"],
    queryFn: () => base44.entities.PelletRecipe.list("-created_date"),
  });
  const { data: productions = [] } = useQuery({
    queryKey: ["pellet-productions"],
    queryFn: () => base44.entities.PelletProduction.list("-production_date", 100),
  });
  const { data: feedItems = [] } = useQuery({
    queryKey: ["feed-stock"],
    queryFn: () => base44.entities.FeedStock.list(),
  });
  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: () => base44.entities.WarehouseItem.list("-created_date", 300),
  });

  const [showForm, setShowForm] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);
  const [produceRecipe, setProduceRecipe] = useState(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pellet-recipes"] });
    qc.invalidateQueries({ queryKey: ["pellet-productions"] });
    qc.invalidateQueries({ queryKey: ["feed-stock"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
  };

  const handleDelete = async (r) => {
    if (confirm(`Hapus resep "${r.name}"?`)) {
      await base44.entities.PelletRecipe.delete(r.id);
      invalidate();
    }
  };

  if (!canAccess(role, "pellet-recipe")) return <AccessDenied />;
  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-primary" /> Resep & Produksi Pelet
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola formulasi pakan pelet dan riwayat produksi</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditRecipe(null); setShowForm(true); }} className="gap-2">
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
            <Card className="py-16 text-center text-muted-foreground">
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
                        <span>⚖️ {r.yield_kg} kg per batch</span>
                        <span>📦 {(r.ingredients||[]).length} bahan</span>
                        {r.shelf_life_days && <span>⏱ {r.shelf_life_days} hari</span>}
                      </div>
                      {(r.ingredients||[]).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {r.ingredients.slice(0,4).map((ing, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{ing.item_name}</span>
                          ))}
                          {r.ingredients.length > 4 && <span className="text-[10px] text-muted-foreground">+{r.ingredients.length-4} lagi</span>}
                        </div>
                      )}
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
                    {p.production_date && <span>📅 {format(new Date(p.production_date), "d MMM yyyy", { locale: id })}</span>}
                  </div>
                </div>
                {p.expiry_date && (
                  <Badge variant="outline" className="text-xs">
                    Kadaluarsa: {format(new Date(p.expiry_date), "d MMM yyyy", { locale: id })}
                  </Badge>
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
            <ProductionDialog
              recipe={produceRecipe}
              feedItems={feedItems}
              warehouseItems={warehouseItems}
              onClose={() => setProduceRecipe(null)}
              onSaved={invalidate}
              userName={user?.full_name || user?.email}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}