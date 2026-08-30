import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Home, Trees, Thermometer, Droplets, Users, Edit, Trash2, Shell, AlertTriangle, RefreshCw } from "lucide-react";
import EnclosureForm from "@/components/enclosure/EnclosureForm";
import { useEffect } from "react";
import { toast } from "sonner";
import { diPeternakan } from "@/lib/populasiKura";
import { cariKandang } from "@/lib/kandang";

export default function EnclosurePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedEnclosure, setSelectedEnclosure] = useState(null);

  const [syncing, setSyncing] = useState(false);

  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.list("-created_date"),
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Enclosure.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["enclosures"] }); setDeleteTarget(null); },
  });

  // Hitung current_count dari data Tortoise aktual.
  //
  // Dihitung per NOMOR kandang, bukan nama: nama lepas begitu kandang diganti
  // nama, dan kura di dalamnya berhenti terhitung tanpa peringatan. Daftar
  // status yang ditulis tangan juga diganti aturan bersama — versi lamanya
  // melewatkan kura karantina, yang tetap menempati kandangnya.
  const countByEnclosure = tortoises.reduce((acc, t) => {
    if (!diPeternakan(t)) return acc;
    const id = cariKandang(t, enclosures).kandang?.id;
    if (id) acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  // Gunakan live count dari tortoises (bukan field tersimpan)
  const getCount = (enc) => countByEnclosure[enc.id] ?? (enc.current_count ?? 0);

  // Sinkronkan semua current_count ke database
  const handleSyncAll = async () => {
    setSyncing(true);
    let updated = 0;
    for (const enc of enclosures) {
      const liveCount = countByEnclosure[enc.id] ?? 0;
      if ((enc.current_count ?? 0) !== liveCount) {
        await base44.entities.Enclosure.update(enc.id, { current_count: liveCount });
        updated++;
      }
    }
    qc.invalidateQueries({ queryKey: ["enclosures"] });
    setSyncing(false);
    toast.success(updated > 0 ? `${updated} kandang berhasil disinkronkan` : "Semua kandang sudah sinkron");
  };

  // Auto-sinkron saat tortoises & enclosures sudah dimuat.
  //
  // Penulisan ini menimpa current_count seluruh kandang dari hitungan di layar,
  // jadi ia hanya boleh berjalan bila hitungannya memang lengkap. Kegagalan
  // sengaja ditelan supaya membuka halaman tidak pernah gagal karenanya —
  // tombol "Sinkronkan" di atas yang melaporkan hasilnya dengan jujur.
  useEffect(() => {
    if (enclosures.length === 0 || tortoises.length === 0) return;
    for (const enc of enclosures) {
      const liveCount = countByEnclosure[enc.id] ?? 0;
      if ((enc.current_count ?? 0) !== liveCount) {
        base44.entities.Enclosure.update(enc.id, { current_count: liveCount }).catch(() => {});
      }
    }
     
  }, [enclosures.length, tortoises.length]);

  const typeLabel = { indoor: "Indoor", outdoor: "Outdoor", greenhouse: "Greenhouse" };
  const typeIcon = { indoor: Home, outdoor: Trees, greenhouse: Thermometer };

  function getStatus(enc) {
    const cnt = getCount(enc);
    if (!enc.max_capacity) return "normal";
    if (cnt > enc.max_capacity) return "overcrowded";
    // Isi yang PAS kapasitas dulu ikut disebut "Hampir Penuh" — padahal tidak
    // ada tempat tersisa sama sekali, dan itu justru yang perlu diketahui saat
    // memilih kandang tujuan.
    if (cnt === enc.max_capacity) return "penuh";
    if (cnt >= enc.max_capacity * 0.8) return "warning";
    return "normal";
  }

  const statusStyle = {
    overcrowded: "border-red-400 bg-red-50",
    warning: "border-amber-400 bg-amber-50",
    normal: "border-border bg-card",
  };

  const statusBadge = {
    overcrowded: <Badge className="bg-red-100 text-red-700 border-red-300">Overcrowding!</Badge>,
    penuh: <Badge className="bg-orange-100 text-orange-700 border-orange-300">Penuh</Badge>,
    warning: <Badge className="bg-amber-100 text-amber-700 border-amber-300">Hampir Penuh</Badge>,
    normal: <Badge className="bg-green-100 text-green-700 border-green-300">Normal</Badge>,
  };

  const encTortoises = selectedEnclosure
    ? tortoises.filter(t => t.enclosure === selectedEnclosure.name && t.status !== "terjual" && t.status !== "mati")
    : [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Kandang</h1>
          <p className="text-sm text-muted-foreground">{enclosures.length} kandang terdaftar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncAll} disabled={syncing} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> Sinkronkan Jumlah
          </Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-primary gap-2">
            <Plus className="w-4 h-4" /> Tambah Kandang
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          // `is_active` tidak pernah bisa diubah dari mana pun di aplikasi — tidak ada
          // satu pun layar yang menulisnya. Catatan lama yang dibuat sebelum field
          // ini ada bernilai undefined, jatuh ke falsy, dan diam-diam hilang dari
          // hitungan ini padahal kepala halaman di atas menghitungnya. Yang
          // dikecualikan sekarang hanya yang tegas ditandai tidak aktif.
          { label: "Total Kandang", val: enclosures.filter(e=>e.is_active !== false).length, color: "text-primary" },
          { label: "Overcrowding", val: enclosures.filter(e=>getStatus(e)==="overcrowded").length, color: "text-red-600" },
          { label: "Penuh / Hampir", val: enclosures.filter(e=>["penuh","warning"].includes(getStatus(e))).length, color: "text-amber-600" },
          { label: "Total Kapasitas", val: enclosures.reduce((s,e)=>s+(e.max_capacity||0),0), color: "text-primary" },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{item.val}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grid kandang */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {enclosures.map(enc => {
          const status = getStatus(enc);
          const Icon = typeIcon[enc.type] || Home;
          return (
            <Card
              key={enc.id}
              className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${statusStyle[status]}`}
              onClick={() => setSelectedEnclosure(enc)}
            >
              {enc.photo_url && (
                <div className="h-32 overflow-hidden rounded-t-xl">
                  <img src={enc.photo_url} alt={enc.name} className="w-full h-full object-cover" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">{enc.name}</CardTitle>
                  </div>
                  {statusBadge[status]}
                </div>
                <Badge variant="outline" className="w-fit text-xs">{typeLabel[enc.type]}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>Isi / Kapasitas</span>
                </div>
                <span className={`font-semibold ${getStatus(enc) === "overcrowded" ? "text-red-600" : ""}`}>
                  {getCount(enc)}
                  {enc.max_capacity ? ` / ${enc.max_capacity}` : ""}
                </span>
                </div>
                {status === "overcrowded" && (
                  <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Kapasitas melebihi batas!
                  </div>
                )}
                {enc.ideal_temp_min && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Thermometer className="w-3.5 h-3.5" />
                    <span>{enc.ideal_temp_min}°–{enc.ideal_temp_max}°C</span>
                    {enc.ideal_humidity && (
                      <>
                        <Droplets className="w-3.5 h-3.5 ml-1" />
                        <span>{enc.ideal_humidity}%</span>
                      </>
                    )}
                  </div>
                )}
                {enc.location && <p className="text-xs text-muted-foreground truncate">{enc.location}</p>}
                <div className="flex justify-end gap-2 pt-1" onClick={e=>e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={()=>{setEditing(enc);setShowForm(true);}}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={()=>setDeleteTarget(enc)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Form dialog */}
      {showForm && (
        <EnclosureForm
          enclosure={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["enclosures"] }); }}
        />
      )}

      {/* Detail Kandang Modal */}
      <Dialog open={!!selectedEnclosure} onOpenChange={()=>setSelectedEnclosure(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shell className="w-5 h-5 text-primary" />
              Kandang: {selectedEnclosure?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{encTortoises.length} kura-kura aktif di kandang ini</p>
            {encTortoises.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Tidak ada kura-kura di kandang ini</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {encTortoises.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    {t.photo_url ? (
                      <img src={t.photo_url} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shell className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.morph} · {t.gender}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{t.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={()=>setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kandang?</AlertDialogTitle>
            <AlertDialogDescription>Kandang <b>{deleteTarget?.name}</b> akan dihapus permanen. Data kura-kura tidak akan ikut terhapus.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={()=>deleteMutation.mutate(deleteTarget.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}