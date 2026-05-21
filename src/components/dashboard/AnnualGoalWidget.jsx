import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Target, Pencil, Egg, Timer, TrendingUp } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function AnnualGoalWidget({ breedings = [] }) {
  const { role } = useCurrentUser();
  const qc = useQueryClient();
  const canEdit = ["owner", "admin", "manajer"].includes(role);
  const currentYear = new Date().getFullYear();
  const [showForm, setShowForm] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [revenueInput, setRevenueInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: goals = [] } = useQuery({
    queryKey: ["annual-goals"],
    queryFn: () => base44.entities.AnnualGoal.list("-year", 5),
  });

  const currentGoal = goals.find(g => g.year === currentYear);

  // Hitung total telur tahun ini dari breeding
  const { data: salesToday = [] } = useQuery({
    queryKey: ["sales-for-goal"],
    queryFn: () => base44.entities.Sale.filter({}),
  });
  const currentYearRevenue = salesToday
    .filter(s => s.sale_date && s.sale_date.startsWith(String(currentYear)))
    .reduce((sum, s) => sum + (s.price || 0), 0);

  const currentYearEggs = breedings
    .filter(b => b.egg_laying_date && b.egg_laying_date.startsWith(String(currentYear)))
    .reduce((sum, b) => sum + (b.egg_count || 0), 0);

  const target = currentGoal?.egg_production_target || 0;
  const revenueTarget = currentGoal?.revenue_target || 0;
  const progress = target > 0 ? Math.min(100, Math.round((currentYearEggs / target) * 100)) : 0;
  const revenueProgress = revenueTarget > 0 ? Math.min(100, Math.round((currentYearRevenue / revenueTarget) * 100)) : 0;

  // Countdown ke akhir tahun
  const endOfYear = new Date(currentYear, 11, 31);
  const today = new Date();
  const diffMs = endOfYear - today;
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const openForm = () => {
    setGoalInput(currentGoal?.egg_production_target || "");
    setRevenueInput(currentGoal?.revenue_target || "");
    setNotesInput(currentGoal?.notes || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!goalInput) return;
    setSaving(true);
    const data = {
      year: currentYear,
      egg_production_target: Number(goalInput),
      revenue_target: Number(revenueInput) || 0,
      notes: notesInput,
      set_by: role,
    };
    if (currentGoal?.id) {
      await base44.entities.AnnualGoal.update(currentGoal.id, data);
    } else {
      await base44.entities.AnnualGoal.create(data);
    }
    qc.invalidateQueries({ queryKey: ["annual-goals"] });
    setSaving(false);
    setShowForm(false);
  };

  return (
    <>
      <Card className="p-5 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Target Tahunan {currentYear}</h2>
              <p className="text-xs text-muted-foreground">Produksi Telur</p>
            </div>
          </div>
          {canEdit && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openForm}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {!currentGoal ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Belum ada target untuk tahun ini</p>
            {canEdit && (
              <Button size="sm" className="mt-3" onClick={openForm}>
                <Target className="w-3.5 h-3.5 mr-1.5" />
                Set Target
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Numbers */}
            <div className="flex items-end gap-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <Egg className="w-4 h-4 text-accent" />
                  <span className="text-3xl font-bold">{currentYearEggs}</span>
                  <span className="text-lg text-muted-foreground">/ {target.toLocaleString("id-ID")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">telur terproduksi dari target</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{progress}% tercapai</span>
                <span className={`font-semibold ${progress >= 100 ? "text-green-600" : "text-primary"}`}>
                  {progress >= 100 ? "🎉 Target Tercapai!" : `Kurang ${(target - currentYearEggs).toLocaleString("id-ID")} telur`}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Target Revenue */}
            {revenueTarget > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground"><TrendingUp className="w-3 h-3" /> Pendapatan {currentYear}</span>
                  <span className={`font-semibold ${revenueProgress >= 100 ? "text-green-600" : "text-accent"}`}>
                    {revenueProgress}% — Rp {currentYearRevenue.toLocaleString("id-ID")} / Rp {revenueTarget.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${revenueProgress >= 100 ? "bg-green-500" : "bg-accent"}`}
                    style={{ width: `${revenueProgress}%` }} />
                </div>
              </div>
            )}

            {/* Countdown */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-background/70">
              <Timer className="w-4 h-4 text-accent flex-shrink-0" />
              <div>
                <span className="text-2xl font-bold text-accent">{daysLeft}</span>
                <span className="text-sm text-muted-foreground ml-1">hari tersisa di {currentYear}</span>
              </div>
              {currentGoal.notes && (
                <p className="text-xs text-muted-foreground ml-auto italic truncate max-w-[120px]">"{currentGoal.notes}"</p>
              )}
            </div>
          </div>
        )}
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Target Tahunan {currentYear}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium mb-1 block">Target Produksi Telur *</label>
              <Input type="number" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="Contoh: 500" min={1} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Target Pendapatan (Rp)</label>
              <Input type="number" value={revenueInput} onChange={(e) => setRevenueInput(e.target.value)} placeholder="Contoh: 50000000" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Catatan / Motivasi</label>
              <Input value={notesInput} onChange={(e) => setNotesInput(e.target.value)} placeholder="Opsional..." />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !goalInput}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}