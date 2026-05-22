import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Egg } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import BreedingForm from "@/components/breeding/BreedingForm";
import HatchDialog from "@/components/breeding/HatchDialog";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, getPerms } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import IncompleteBadge from "@/components/common/IncompleteBadge";
import { getMissingFields } from "@/lib/incompleteChecks";
import PageTooltip from "@/components/tutorial/PageTooltip";

const statusColors = {
  kawin: "bg-accent/10 text-accent border-accent/20",
  bertelur: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  inkubasi: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  menetas: "bg-primary/10 text-primary border-primary/20",
  gagal: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function BreedingList() {
  const queryClient = useQueryClient();
  const { role } = useCurrentUser();
  const perms = getPerms(role, "breeding");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [hatchBreeding, setHatchBreeding] = useState(null);

  const { data: breedings = [], isLoading } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 200),
  });

  if (!canAccess(role, "breeding")) return <AccessDenied />;

  const handleDelete = async (breeding) => {
    if (confirm("Hapus data pembiakan ini?")) {
      await base44.entities.Breeding.delete(breeding.id);
      queryClient.invalidateQueries({ queryKey: ["breedings"] });
    }
  };

  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-heading font-bold">Induk Bertelur</h1>
            <PageTooltip page="breeding" />
          </div>
          <p className="text-muted-foreground mt-1">Kelola data breeding & induk yang sudah bertelur</p>
        </div>
        {perms.canCreate && (
          <Button onClick={() => { setEditData(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Data
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : breedings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Egg className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">Belum ada data pembiakan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {breedings.map((b) => {
            const daysToHatch = b.estimated_hatch_date && b.status !== "menetas" && b.status !== "gagal"
              ? differenceInDays(parseISO(b.estimated_hatch_date), today)
              : null;
            const isNearHatch = daysToHatch !== null && daysToHatch <= 10 && daysToHatch >= 0;

            const isOverdue = daysToHatch !== null && daysToHatch < 0;
            const isVeryNear = daysToHatch !== null && daysToHatch < 10 && daysToHatch >= 0;

            return (
              <Card key={b.id} className={`p-5 hover:shadow-md transition-shadow group ${isOverdue ? "border-red-400 bg-red-50" : isVeryNear ? "border-amber-300 bg-amber-50" : ""}`}>
                {/* Foto preview */}
                {b.photos?.length > 0 && (
                  <div className="flex gap-1.5 mb-3 overflow-x-auto">
                    {b.photos.slice(0, 4).map((p, i) => (
                      <img key={i} src={p.url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border" />
                    ))}
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{b.male_name} × {b.female_name}</h3>
                      <IncompleteBadge missingFields={getMissingFields("breeding", b)} onEdit={perms.canEdit ? () => { setEditData(b); setShowForm(true); } : undefined} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className={`text-[11px] capitalize ${statusColors[b.status] || ""}`}>
                        {b.status}
                      </Badge>
                      {daysToHatch !== null && daysToHatch < 0 && (
                        <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                          🔴 Terlambat {Math.abs(daysToHatch)} hari!
                        </span>
                      )}
                      {daysToHatch !== null && daysToHatch >= 0 && daysToHatch <= 10 && (
                        <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          🥚 {daysToHatch === 0 ? "Hari ini!" : `${daysToHatch} hari lagi`}
                        </span>
                      )}
                      {daysToHatch !== null && daysToHatch > 10 && (
                        <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          ⏳ {daysToHatch} hari lagi
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Tombol Tandai Menetas */}
                    {perms.canEdit && b.status !== "menetas" && b.status !== "gagal" && (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        title="Tandai Menetas"
                        onClick={() => setHatchBreeding(b)}
                      >
                        <Egg className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {perms.canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditData(b); setShowForm(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {perms.canDelete && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs">
                  {b.egg_laying_date && (
                    <div>
                      <p className="text-muted-foreground">Bertelur</p>
                      <p className="font-medium">{format(new Date(b.egg_laying_date), "d MMM yyyy", { locale: id })}</p>
                    </div>
                  )}
                  {b.egg_count > 0 && (
                    <div>
                      <p className="text-muted-foreground">Telur</p>
                      <p className="font-medium">{b.egg_count} butir</p>
                    </div>
                  )}
                  {b.estimated_hatch_date && (
                    <div>
                      <p className="text-muted-foreground">Perkiraan Menetas</p>
                      <p className={`font-medium ${isNearHatch ? "text-amber-600" : ""}`}>
                        {format(new Date(b.estimated_hatch_date), "d MMM yyyy", { locale: id })}
                      </p>
                    </div>
                  )}
                  {b.status === "menetas" && b.hatched_count > 0 && (
                    <div>
                      <p className="text-muted-foreground">Menetas</p>
                      <p className="font-medium text-primary">{b.hatched_count} ekor 🐢</p>
                    </div>
                  )}
                  {b.status === "menetas" && b.failed_count > 0 && (
                    <div>
                      <p className="text-muted-foreground">Gagal</p>
                      <p className="font-medium text-destructive">{b.failed_count} butir ❌</p>
                    </div>
                  )}
                  {b.incubation_temp > 0 && (
                    <div>
                      <p className="text-muted-foreground">Suhu</p>
                      <p className="font-medium">{b.incubation_temp}°C</p>
                    </div>
                  )}
                  {b.hatch_date && b.status === "menetas" && (
                    <div>
                      <p className="text-muted-foreground">Tgl Menetas</p>
                      <p className="font-medium">{format(new Date(b.hatch_date), "d MMM yyyy", { locale: id })}</p>
                    </div>
                  )}
                </div>
                {b.notes && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{b.notes}</p>}
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <BreedingForm open={showForm} onClose={() => setShowForm(false)} editData={editData} />
      )}
      <HatchDialog
        open={!!hatchBreeding}
        onClose={() => setHatchBreeding(null)}
        breeding={hatchBreeding}
      />
    </div>
  );
}