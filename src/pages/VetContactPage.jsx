import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Phone, MessageCircle, Mail, Star, MapPin, Clock, 
  AlertCircle, Search, Calendar, Edit2, Navigation
} from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { formatDateIndonesian, formatCurrency } from "@/lib/formatIndonesian";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";

const WA_TEMPLATE = (name) =>
  `Halo dr. ${name}, saya dari peternakan Duta Tortoise. Ingin konsultasi tentang kura-kura sulcata kami...`;

const AREA_LABELS = {
  kraksaan: "Kraksaan", probolinggo_kota: "Probolinggo Kota",
  dringu: "Dringu", paiton: "Paiton", besuk: "Besuk",
  gending: "Gending", pajarakan: "Pajarakan", tongas: "Tongas",
  lumbang: "Lumbang", surabaya: "Surabaya", malang: "Malang",
  pasuruan: "Pasuruan", situbondo: "Situbondo", jember: "Jember",
  banyuwangi: "Banyuwangi", lainnya: "Lainnya",
};

const SPEC_OPTIONS = ["Umum", "Reptil", "Eksotik", "Bedah", "Lainnya"];

function StarRating({ value, max = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < value ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

function formatWANumber(num) {
  if (!num) return "";
  const digits = num.replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  return digits;
}

function VetForm({ vet, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: vet?.name || "",
    clinic_name: vet?.clinic_name || "",
    hp_whatsapp: vet?.hp_whatsapp || "",
    email: vet?.email || "",
    address: vet?.address || "",
    area: vet?.area || "probolinggo_kota",
    specialization: vet?.specialization || "Umum",
    availability: vet?.availability || "",
    emergency_available: vet?.emergency_available || false,
    consultation_fee: vet?.consultation_fee || "",
    rating: vet?.rating || 5,
    is_preferred: vet?.is_preferred || false,
    notes: vet?.notes || "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      consultation_fee: form.consultation_fee ? Number(form.consultation_fee) : undefined,
      rating: Number(form.rating),
    };
    if (vet?.id) {
      await base44.entities.VetContact.update(vet.id, data);
    } else {
      await base44.entities.VetContact.create(data);
    }
    qc.invalidateQueries({ queryKey: ["vets"] });
    setSaving(false);
    toast.success(vet?.id ? "Data dokter diupdate" : "Dokter hewan ditambahkan");
    onSaved?.();
    onClose();
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nama Dokter *</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} required className="mt-0.5" />
        </div>
        <div>
          <Label className="text-xs">Nama Klinik</Label>
          <Input value={form.clinic_name} onChange={e => set("clinic_name", e.target.value)} className="mt-0.5" />
        </div>
        <div>
          <Label className="text-xs">No. HP/WhatsApp *</Label>
          <Input value={form.hp_whatsapp} onChange={e => set("hp_whatsapp", e.target.value)} required placeholder="08xxx" className="mt-0.5" />
        </div>
        <div>
          <Label className="text-xs">Wilayah *</Label>
          <Select value={form.area} onValueChange={v => set("area", v)}>
            <SelectTrigger className="mt-0.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(AREA_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Spesialisasi</Label>
          <Select value={form.specialization} onValueChange={v => set("specialization", v)}>
            <SelectTrigger className="mt-0.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPEC_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Jam Operasional</Label>
          <Input value={form.availability} onChange={e => set("availability", e.target.value)} placeholder="08:00-20:00" className="mt-0.5" />
        </div>
        <div>
          <Label className="text-xs">Rating (1-5)</Label>
          <Select value={String(form.rating)} onValueChange={v => set("rating", Number(v))}>
            <SelectTrigger className="mt-0.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5,4,3,2,1].map(n => <SelectItem key={n} value={String(n)}>{"⭐".repeat(n)} ({n})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Biaya Konsultasi (Rp)</Label>
          <Input type="number" value={form.consultation_fee} onChange={e => set("consultation_fee", e.target.value)} className="mt-0.5" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Alamat Lengkap</Label>
          <Input value={form.address} onChange={e => set("address", e.target.value)} className="mt-0.5" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="mt-0.5" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Catatan</Label>
          <Input value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-0.5" />
        </div>
        <div className="col-span-2 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Switch checked={form.emergency_available} onCheckedChange={v => set("emergency_available", v)} />
            <Label className="text-sm cursor-pointer">Bisa dipanggil darurat 🚨</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_preferred} onCheckedChange={v => set("is_preferred", v)} />
            <Label className="text-sm cursor-pointer">Dokter Andalan ⭐</Label>
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button type="submit" className="flex-1" disabled={saving || !form.name || !form.hp_whatsapp}>
          {saving ? "Menyimpan..." : vet?.id ? "Update" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

export default function VetContactPage() {
  const [showForm, setShowForm] = useState(false);
  const [editVet, setEditVet] = useState(null);
  const [selectedVet, setSelectedVet] = useState(null);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("semua");
  const [specFilter, setSpecFilter] = useState("semua");
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [sortBy, setSortBy] = useState("rating");

  const { user } = useCurrentUser();
  const role = user?.role;
  const canEdit = ["owner", "manajer", "admin"].includes(role);
  const isInvestor = role === "investor";
  const qc = useQueryClient();

  const { data: vets = [], isLoading } = useQuery({
    queryKey: ["vets"],
    queryFn: () => base44.entities.VetContact.list(),
  });

  const recordConsultation = useMutation({
    mutationFn: ({ id, total }) => base44.entities.VetContact.update(id, {
      last_consulted: new Date().toISOString().split("T")[0],
      total_consultations: (total || 0) + 1,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vets"] }); toast.success("Konsultasi dicatat"); },
  });

  const filteredVets = useMemo(() => {
    let list = vets.filter(v => {
      const matchSearch = !search ||
        v.name?.toLowerCase().includes(search.toLowerCase()) ||
        v.clinic_name?.toLowerCase().includes(search.toLowerCase());
      const matchArea = areaFilter === "semua" || v.area === areaFilter;
      // Kolom specialization adalah teks bebas ("Umum & Pet Shop", "Reptil &
      // Eksotik - Special interest kura-kura"), bukan enum. Dulu hanya pilihan
      // "reptil" yang mencocokkan sebagian kata; "Umum" dan "Bedah" memakai
      // sama-dengan persis. Akibatnya "Umum & Pet Shop" tidak pernah ikut
      // terpilih di "Umum", dan "Bedah" tidak pernah cocok dengan satu pun
      // dokter — pilihan yang hasilnya selalu nol.
      // Sekarang ketiganya sama-sama mencocokkan sebagian kata.
      const matchSpec = specFilter === "semua" || cocokSpesialisasi(v.specialization, specFilter);
      const matchEmergency = !emergencyOnly || v.emergency_available;
      return matchSearch && matchArea && matchSpec && matchEmergency;
    });

    list.sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "consulted") {
        if (!a.last_consulted && !b.last_consulted) return 0;
        if (!a.last_consulted) return 1;
        if (!b.last_consulted) return -1;
        return b.last_consulted.localeCompare(a.last_consulted);
      }
      return 0;
    });
    return list;
  }, [vets, search, areaFilter, specFilter, emergencyOnly, sortBy]);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dokter Hewan</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Kontak dokter hewan dan klinik rekanan ({vets.length} dokter)</p>
        </div>
        {canEdit && (
          <Button className="gap-2" onClick={() => { setEditVet(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Tambah Dokter
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Cari dokter atau klinik..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Semua Wilayah" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Wilayah</SelectItem>
            {Object.entries(AREA_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={specFilter} onValueChange={setSpecFilter}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Spesialisasi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Spesialisasi</SelectItem>
            {/* Hanya spesialisasi yang benar-benar ada pada daftar dokter yang
                ditampilkan. Pilihan yang hasilnya pasti nol tidak membantu
                siapa pun — ia hanya mengajari orang bahwa penyaring ini tidak
                bisa dipercaya. Kalau nanti ada dokter bedah dicatat,
                pilihannya muncul sendiri. */}
            {SPESIALISASI.filter(s => vets.some(v => cocokSpesialisasi(v.specialization, s.nilai)))
              .map(s => (
                <SelectItem key={s.nilai} value={s.nilai}>{s.label}</SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-44 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">⭐ Rating Tertinggi</SelectItem>
            <SelectItem value="name">A-Z Nama</SelectItem>
            <SelectItem value="consulted">Terakhir Dikonsultasi</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => setEmergencyOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${emergencyOnly ? "bg-red-100 border-red-400 text-red-800" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}
        >
          🚨 Darurat Only
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filteredVets.length === 0 ? (
        <EmptyState title="Belum Ada Dokter" description="Tambahkan kontak dokter hewan" icon={AlertCircle} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVets.map(vet => (
            <Card key={vet.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedVet(vet)}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-1.5 text-base flex-wrap">
                      {vet.name}
                      {vet.is_preferred && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-xs">{vet.clinic_name || "Dokter Hewan"}</CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end flex-shrink-0">
                    {vet.emergency_available && <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">🚨 Darurat</Badge>}
                    {vet.is_preferred && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px]">⭐ Andalan</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Rating */}
                {vet.rating > 0 && <StarRating value={vet.rating} />}

                {/* Badges */}
                <div className="flex flex-wrap gap-1">
                  {vet.specialization && (
                    <Badge variant="outline" className="text-[10px]">{vet.specialization}</Badge>
                  )}
                  {vet.area && (
                    <Badge variant="secondary" className="text-[10px]">📍 {AREA_LABELS[vet.area] || vet.area}</Badge>
                  )}
                </div>

                {/* Info */}
                <div className="text-xs text-muted-foreground space-y-1">
                  {vet.hp_whatsapp && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {vet.hp_whatsapp}</p>}
                  {vet.availability && <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> {vet.availability}</p>}
                  {vet.total_consultations > 0 && <p className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {vet.total_consultations} konsultasi</p>}
                </div>

                {/* Action Buttons */}
                {!isInvestor && (
                  <div className="flex gap-1.5 pt-1 flex-wrap" onClick={e => e.stopPropagation()}>
                    {vet.hp_whatsapp && (
                      <a href={`tel:${vet.hp_whatsapp}`}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors">
                        <Phone className="w-3 h-3" /> Telepon
                      </a>
                    )}
                    {vet.hp_whatsapp && (
                      <a href={`https://wa.me/${formatWANumber(vet.hp_whatsapp)}?text=${encodeURIComponent(WA_TEMPLATE(vet.name))}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 transition-colors">
                        <MessageCircle className="w-3 h-3" /> WA
                      </a>
                    )}
                    {vet.address && (
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(vet.address)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors">
                        <Navigation className="w-3 h-3" /> Maps
                      </a>
                    )}
                    {canEdit && (
                      <button onClick={() => { setEditVet(vet); setShowForm(true); }}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      {selectedVet && (
        <Dialog open={!!selectedVet} onOpenChange={() => setSelectedVet(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                {selectedVet.name}
                {selectedVet.is_preferred && <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />}
                {selectedVet.emergency_available && <Badge className="bg-red-100 text-red-800">🚨 Darurat</Badge>}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedVet.rating > 0 && <StarRating value={selectedVet.rating} />}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Klinik</p><p className="font-medium">{selectedVet.clinic_name || "-"}</p></div>
                <div><p className="text-xs text-muted-foreground">Spesialisasi</p><p>{selectedVet.specialization || "Umum"}</p></div>
                <div><p className="text-xs text-muted-foreground">Wilayah</p><p>{AREA_LABELS[selectedVet.area] || selectedVet.area || "-"}</p></div>
                <div><p className="text-xs text-muted-foreground">Jam Operasional</p><p className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedVet.availability || "-"}</p></div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Alamat</p>
                  <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedVet.address || "-"}</p>
                </div>
              </div>

              {/* Contact buttons */}
              {!isInvestor && (
                <div className="flex gap-2 flex-wrap">
                  {selectedVet.hp_whatsapp && (
                    <>
                      <a href={`tel:${selectedVet.hp_whatsapp}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted text-sm">
                        <Phone className="w-4 h-4" /> {selectedVet.hp_whatsapp}
                      </a>
                      <a href={`https://wa.me/${formatWANumber(selectedVet.hp_whatsapp)}?text=${encodeURIComponent(WA_TEMPLATE(selectedVet.name))}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 text-sm">
                        <MessageCircle className="w-4 h-4" /> Chat WhatsApp
                      </a>
                    </>
                  )}
                  {selectedVet.address && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(selectedVet.address)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 text-sm">
                      <Navigation className="w-4 h-4" /> Google Maps
                    </a>
                  )}
                  {selectedVet.email && (
                    <a href={`mailto:${selectedVet.email}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted text-sm">
                      <Mail className="w-4 h-4" /> {selectedVet.email}
                    </a>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Total Konsultasi</p><p className="font-semibold">{selectedVet.total_consultations || 0}</p></div>
                <div><p className="text-xs text-muted-foreground">Terakhir Konsultasi</p><p>{selectedVet.last_consulted ? formatDateIndonesian(selectedVet.last_consulted) : "Belum pernah"}</p></div>
                {selectedVet.consultation_fee > 0 && (
                  <div><p className="text-xs text-muted-foreground">Biaya Konsultasi</p><p>{formatCurrency(selectedVet.consultation_fee)}</p></div>
                )}
              </div>

              {selectedVet.notes && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">{selectedVet.notes}</div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" className="flex-1 gap-2"
                  onClick={() => { recordConsultation.mutate({ id: selectedVet.id, total: selectedVet.total_consultations }); setSelectedVet(null); }}>
                  <Calendar className="w-4 h-4" /> Catat Konsultasi
                </Button>
                {canEdit && (
                  <Button variant="outline" className="gap-2"
                    onClick={() => { setEditVet(selectedVet); setShowForm(true); setSelectedVet(null); }}>
                    <Edit2 className="w-4 h-4" /> Edit
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditVet(null); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editVet?.id ? "Edit Dokter Hewan" : "Tambah Dokter Hewan"}</DialogTitle>
          </DialogHeader>
          <VetForm vet={editVet} onClose={() => { setShowForm(false); setEditVet(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}