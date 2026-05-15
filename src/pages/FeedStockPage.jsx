import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  PackageOpen,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  MinusCircle,
  PlusCircle,
} from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canPerformAction } from "@/lib/permissions";

const CATEGORIES = [
  { value: "sayuran", label: "🥬 Sayuran" },
  { value: "buah", label: "🍎 Buah" },
  { value: "rumput", label: "🌿 Rumput" },
  { value: "suplemen", label: "💊 Suplemen" },
  { value: "lainnya", label: "📦 Lainnya" },
];

const UNITS = ["kg", "gram", "ikat", "buah", "liter"];

const EMPTY_FORM = {
  name: "",
  category: "sayuran",
  unit: "kg",
  current_stock: 0,
  minimum_stock: 1,
  notes: "",
};

function StockStatusBadge({ stock }) {
  if (stock.current_stock === 0)
    return <Badge variant="destructive" className="text-xs">Habis</Badge>;
  if (stock.current_stock <= stock.minimum_stock)
    return <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">Stok Rendah</Badge>;
  return <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Aman</Badge>;
}

export default function FeedStockPage() {
  const { role } = useCurrentUser();
  const canEdit = canPerformAction(role, "feedstock", "edit");
  const canCreate = canPerformAction(role, "feedstock", "create");
  const canDelete = canPerformAction(role, "feedstock", "delete");

  const qc = useQueryClient();
  const { data: stocks = [], isLoading } = useQuery({
    queryKey: ["feedstocks"],
    queryFn: () => base44.entities.FeedStock.list(),
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adjustDialog, setAdjustDialog] = useState(null); // { stock, delta }
  const [adjustAmount, setAdjustAmount] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["feedstocks"] });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing
        ? base44.entities.FeedStock.update(editing.id, data)
        : base44.entities.FeedStock.create(data),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FeedStock.delete(id),
    onSuccess: invalidate,
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, newStock }) =>
      base44.entities.FeedStock.update(id, { current_stock: newStock }),
    onSuccess: () => {
      invalidate();
      setAdjustDialog(null);
      setAdjustAmount("");
    },
  });

  const handleEdit = (stock) => {
    setEditing(stock);
    setForm({ ...stock });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      ...form,
      current_stock: Number(form.current_stock),
      minimum_stock: Number(form.minimum_stock),
    });
  };

  const handleAdjust = (direction) => {
    const delta = Number(adjustAmount);
    if (!delta || delta <= 0) return;
    const newStock = Math.max(
      0,
      adjustDialog.current_stock + (direction === "add" ? delta : -delta)
    );
    adjustMutation.mutate({ id: adjustDialog.id, newStock });
  };

  const lowCount = stocks.filter((s) => s.current_stock <= s.minimum_stock).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Stok Pakan</h1>
          <p className="text-muted-foreground mt-1">
            Kelola persediaan pakan kura-kura
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditing(null);
              setForm(EMPTY_FORM);
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Tambah Pakan
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <PackageOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stocks.length}</p>
            <p className="text-xs text-muted-foreground">Total Item Pakan</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-100">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-700">{lowCount}</p>
            <p className="text-xs text-muted-foreground">Stok Perlu Diisi</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-100">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-700">
              {stocks.length - lowCount}
            </p>
            <p className="text-xs text-muted-foreground">Stok Aman</p>
          </div>
        </Card>
      </div>

      {/* Stock List */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Memuat...</div>
      ) : stocks.length === 0 ? (
        <Card className="py-16 text-center text-muted-foreground">
          <PackageOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Belum ada data stok pakan</p>
          {canCreate && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4" /> Tambah Pakan Pertama
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {stocks.map((s) => {
            const isLow = s.current_stock <= s.minimum_stock;
            return (
              <Card
                key={s.id}
                className={`p-4 group hover:shadow-md transition-shadow ${
                  isLow ? "border-orange-300 bg-orange-50/30" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {CATEGORIES.find((c) => c.value === s.category)?.label || s.category}
                    </p>
                  </div>
                  <StockStatusBadge stock={s} />
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p
                      className={`text-3xl font-bold ${
                        isLow ? "text-orange-700" : "text-foreground"
                      }`}
                    >
                      {s.current_stock}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {s.unit}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Min: {s.minimum_stock} {s.unit}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(canEdit || role === "keeper" || role === "manajer") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setAdjustDialog(s);
                          setAdjustAmount("");
                        }}
                      >
                        Update Stok
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(s)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMutation.mutate(s.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        s.current_stock === 0
                          ? "bg-destructive"
                          : isLow
                          ? "bg-orange-400"
                          : "bg-primary"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (s.current_stock / (s.minimum_stock * 3 || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                {s.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    {s.notes}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pakan" : "Tambah Pakan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs mb-1 block">Nama Pakan *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth: Kubis, Wortel, Rumput Sudan"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Satuan</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Stok Saat Ini</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.current_stock}
                  onChange={(e) => setForm({ ...form, current_stock: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Stok Minimum</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.minimum_stock}
                  onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Catatan (opsional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="cth: beli dari Pak Budi"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Batal
              </Button>
              <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjustDialog} onOpenChange={(o) => { if (!o) setAdjustDialog(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Update Stok — {adjustDialog?.name}</DialogTitle>
          </DialogHeader>
          {adjustDialog && (
            <div className="space-y-4 pt-2">
              <p className="text-center text-3xl font-bold">
                {adjustDialog.current_stock}
                <span className="text-sm font-normal text-muted-foreground ml-1">{adjustDialog.unit}</span>
              </p>
              <div>
                <Label className="text-xs mb-1 block">Jumlah</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="0"
                  className="text-center text-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30"
                  onClick={() => handleAdjust("subtract")}
                  disabled={adjustMutation.isPending}
                >
                  <MinusCircle className="w-4 h-4" /> Kurangi
                </Button>
                <Button
                  onClick={() => handleAdjust("add")}
                  disabled={adjustMutation.isPending}
                >
                  <PlusCircle className="w-4 h-4" /> Tambah
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}