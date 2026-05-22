import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserCheck, Plus, CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import OnboardingForm from "@/components/hr/OnboardingForm";
import OnboardingDetail from "@/components/hr/OnboardingDetail";

const PHASE_LABELS = { hari_1: "Hari Pertama", minggu_1: "Minggu Pertama", bulan_1: "Bulan Pertama" };
const PHASE_ORDER = ["hari_1", "minggu_1", "bulan_1"];

const STATUS_COLORS = {
  berjalan: "bg-blue-100 text-blue-800",
  selesai: "bg-green-100 text-green-800",
  terhenti: "bg-red-100 text-red-800",
};

export default function OnboardingPage() {
  const { role, user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const canManage = ["owner", "admin", "manajer"].includes(role);

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["onboarding-checklists"],
    queryFn: () => base44.entities.OnboardingChecklist.list("-created_date"),
  });

  const myChecklists = role === "keeper"
    ? checklists.filter(c => c.employee_email === user?.email)
    : checklists;

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["onboarding-checklists"] });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl"><UserCheck className="w-6 h-6 text-blue-700" /></div>
          <div>
            <h1 className="text-2xl font-bold">Onboarding Karyawan</h1>
            <p className="text-sm text-muted-foreground">{myChecklists.length} checklist onboarding</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" /> Buat Onboarding</Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Memuat...</div>
      ) : myChecklists.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Belum ada checklist onboarding</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myChecklists.map(c => {
            const total = c.tasks?.length || 0;
            const done = c.tasks?.filter(t => t.is_completed)?.length || 0;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(c)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="font-semibold">{c.employee_name}</div>
                      <div className="text-xs text-muted-foreground">{c.employee_email}</div>
                      {c.start_date && <div className="text-xs text-muted-foreground mt-0.5">Mulai: {c.start_date}</div>}
                    </div>
                    <Badge className={`${STATUS_COLORS[c.status] || ""} border-0 text-xs`}>{c.status?.replace("_", " ")}</Badge>
                  </div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{PHASE_LABELS[c.phase] || c.phase}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="mt-2 text-xs text-muted-foreground">{done}/{total} task selesai</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Buat Checklist Onboarding</DialogTitle></DialogHeader>
          <OnboardingForm onSave={handleSaved} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {selected && (
        <OnboardingDetail
          checklist={selected}
          currentRole={role}
          currentUser={user}
          onClose={() => setSelected(null)}
          onUpdate={() => { queryClient.invalidateQueries({ queryKey: ["onboarding-checklists"] }); }}
        />
      )}
    </div>
  );
}