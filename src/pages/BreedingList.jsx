import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Egg } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import BreedingForm from "@/components/breeding/BreedingForm";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, getPerms } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Induk Bertelur</h1>
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
          {breedings.map((b) => (
            <Card key={b.id} className="p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{b.male_name} × {b.female_name}</h3>
                  <Badge variant="outline" className={`mt-2 text-[11px] capitalize ${statusColors[b.status] || ""}`}>
                    {b.status}
                  </Badge>
                </div>
                {(perms.canEdit || perms.canDelete) && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs">
                {b.mating_date && (
                  <div>
                    <p className="text-muted-foreground">Kawin</p>
                    <p className="font-medium">{format(new Date(b.mating_date), "d MMM yyyy", { locale: id })}</p>
                  </div>
                )}
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
                {b.fertile_count > 0 && (
                  <div>
                    <p className="text-muted-foreground">Fertil</p>
                    <p className="font-medium">{b.fertile_count} butir</p>
                  </div>
                )}
                {b.hatched_count > 0 && (
                  <div>
                    <p className="text-muted-foreground">Menetas</p>
                    <p className="font-medium">{b.hatched_count} ekor</p>
                  </div>
                )}
                {b.incubation_temp > 0 && (
                  <div>
                    <p className="text-muted-foreground">Suhu</p>
                    <p className="font-medium">{b.incubation_temp}°C</p>
                  </div>
                )}
              </div>
              {b.notes && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{b.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      {showForm && perms.canCreate && (
        <BreedingForm open={showForm} onClose={() => setShowForm(false)} editData={editData} />
      )}
    </div>
  );
}