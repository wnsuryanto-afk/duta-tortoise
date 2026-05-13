import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Heart } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import HealthForm from "@/components/health/HealthForm";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getPerms } from "@/lib/permissions";

const typeColors = {
  checkup: "bg-primary/10 text-primary",
  sakit: "bg-destructive/10 text-destructive",
  obat: "bg-accent/10 text-accent",
  vaksin: "bg-chart-4/10 text-chart-4",
  timbang: "bg-chart-3/10 text-chart-3",
  lainnya: "bg-muted text-muted-foreground",
};

const typeLabels = {
  checkup: "Checkup", sakit: "Sakit", obat: "Obat",
  vaksin: "Vaksin", timbang: "Timbang", lainnya: "Lainnya",
};

export default function HealthList() {
  const queryClient = useQueryClient();
  const { role } = useCurrentUser();
  const perms = getPerms(role, "health");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 200),
  });

  const handleDelete = async (record) => {
    if (confirm("Hapus catatan kesehatan ini?")) {
      await base44.entities.HealthRecord.delete(record.id);
      queryClient.invalidateQueries({ queryKey: ["health"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Kesehatan</h1>
          <p className="text-muted-foreground mt-1">Catatan kesehatan & perawatan</p>
        </div>
        {perms.canCreate && (
          <Button onClick={() => { setEditData(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Catatan
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">Belum ada catatan kesehatan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <Card key={r.id} className="p-4 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="text-center flex-shrink-0 w-14">
                    <p className="text-2xl font-heading font-bold">{r.date ? format(new Date(r.date), "d") : "-"}</p>
                    <p className="text-[11px] text-muted-foreground uppercase">{r.date ? format(new Date(r.date), "MMM yy", { locale: id }) : ""}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{r.tortoise_name}</h3>
                      <Badge className={`text-[11px] ${typeColors[r.type] || ""}`}>{typeLabels[r.type] || r.type}</Badge>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {r.weight_grams && <span>Berat: {r.weight_grams}g</span>}
                      {r.shell_length_cm && <span>Cangkang: {r.shell_length_cm}cm</span>}
                      {r.vet_name && <span>Drh. {r.vet_name}</span>}
                    </div>
                    {r.treatment && <p className="text-xs mt-1 text-primary/80">💊 {r.treatment}</p>}
                  </div>
                </div>
                {(perms.canEdit || perms.canDelete) && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {perms.canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditData(r); setShowForm(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {perms.canDelete && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <HealthForm open={showForm} onClose={() => setShowForm(false)} editData={editData} />
      )}
    </div>
  );
}