import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, Phone, MessageCircle, Mail, Star, MapPin, Clock, 
  AlertCircle, Search, Filter, Calendar
} from "lucide-react";
import { formatDateIndonesian, formatCurrency } from "@/lib/formatIndonesian";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";

export default function VetContactPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedVet, setSelectedVet] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialization, setFilterSpecialization] = useState("");
  const [filterEmergency, setFilterEmergency] = useState(false);

  const queryClient = useQueryClient();

  const { data: vets, isLoading } = useQuery({
    queryKey: ['vets'],
    queryFn: () => base44.entities.VetContact.list(),
    initialData: [],
  });

  const { data: healthRecords } = useQuery({
    queryKey: ['health-records'],
    queryFn: () => base44.entities.HealthRecord.list(),
    initialData: [],
  });

  const createVetMutation = useMutation({
    mutationFn: (data) => base44.entities.VetContact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vets'] });
      setShowForm(false);
      toast.success("Dokter hewan berhasil ditambahkan");
    },
  });

  const updateVetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VetContact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vets'] });
      toast.success("Data dokter berhasil diupdate");
    },
  });

  const recordConsultationMutation = useMutation({
    mutationFn: async ({ vetId }) => {
      const vet = vets.find(v => v.id === vetId);
      await updateVetMutation.mutateAsync({
        id: vetId,
        data: {
          last_consulted: new Date().toISOString().split('T')[0],
          total_consultations: (vet.total_consultations || 0) + 1
        }
      });
    },
    onSuccess: () => {
      toast.success("Konsultasi berhasil dicatat");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createVetMutation.mutate({
      name: formData.get('name'),
      clinic_name: formData.get('clinic_name'),
      phone: formData.get('phone'),
      whatsapp: formData.get('whatsapp'),
      email: formData.get('email'),
      address: formData.get('address'),
      specialization: formData.get('specialization'),
      availability: formData.get('availability'),
      emergency_available: formData.get('emergency_available') === 'on',
      consultation_fee: parseFloat(formData.get('consultation_fee')) || 0,
      rating: parseInt(formData.get('rating')) || 0,
      is_preferred: formData.get('is_preferred') === 'on',
      notes: formData.get('notes')
    });
  };

  const handleRecordConsultation = (vetId) => {
    recordConsultationMutation.mutate({ vetId });
  };

  const filteredVets = vets.filter(vet => {
    const matchSearch = vet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       vet.clinic_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSpecialization = !filterSpecialization || vet.specialization === filterSpecialization;
    const matchEmergency = !filterEmergency || vet.emergency_available;
    return matchSearch && matchSpecialization && matchEmergency;
  });

  const specializations = [...new Set(vets.map(v => v.specialization).filter(Boolean))];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dokter Hewan</h1>
          <p className="text-muted-foreground">Kontak dokter hewan dan klinik rekanan</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Tambah Dokter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Dokter Hewan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Dokter *</Label>
                  <Input name="name" required />
                </div>
                <div>
                  <Label>Nama Klinik</Label>
                  <Input name="clinic_name" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telepon *</Label>
                  <Input name="phone" required />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input name="whatsapp" />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <Input name="email" type="email" />
              </div>

              <div>
                <Label>Alamat</Label>
                <Input name="address" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Spesialisasi</Label>
                  <select name="specialization" className="w-full p-2 border rounded">
                    <option value="">Umum</option>
                    <option value="Reptil">Reptil</option>
                    <option value="Eksotik">Eksotik</option>
                    <option value="Bedah">Bedah</option>
                  </select>
                </div>
                <div>
                  <Label>Jam Operasional</Label>
                  <Input name="availability" placeholder="e.g., 08:00-20:00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Biaya Konsultasi (Rp)</Label>
                  <Input name="consultation_fee" type="number" />
                </div>
                <div>
                  <Label>Rating (1-5)</Label>
                  <select name="rating" className="w-full p-2 border rounded">
                    <option value="0">Belum ada rating</option>
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="emergency_available" className="w-4 h-4" />
                  <span>Tersedia untuk darurat</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="is_preferred" className="w-4 h-4" />
                  <span>Dokter andalan (Preferred)</span>
                </label>
              </div>

              <div>
                <Label>Catatan</Label>
                <Input name="notes" />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  Simpan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cari dokter atau klinik..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          className="p-2 border rounded"
          value={filterSpecialization}
          onChange={(e) => setFilterSpecialization(e.target.value)}
        >
          <option value="">Semua Spesialisasi</option>
          {specializations.map(spec => (
            <option key={spec} value={spec}>{spec}</option>
          ))}
        </select>
        <Button
          variant={filterEmergency ? "default" : "outline"}
          onClick={() => setFilterEmergency(!filterEmergency)}
          className="gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          Darurat Only
        </Button>
      </div>

      {filteredVets.length === 0 ? (
        <EmptyState
          title="Belum Ada Dokter Hewan"
          description="Tambahkan kontak dokter hewan untuk memudahkan konsultasi"
          icon={AlertCircle}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVets.map(vet => (
            <Card key={vet.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedVet(vet)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {vet.name}
                      {vet.is_preferred && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
                    </CardTitle>
                    <CardDescription>{vet.clinic_name || "Dokter Hewan"}</CardDescription>
                  </div>
                  {vet.emergency_available && (
                    <Badge className="bg-red-100 text-red-800">Darurat</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {vet.specialization && (
                  <Badge variant="outline">{vet.specialization}</Badge>
                )}
                {vet.rating > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{vet.rating}/5</span>
                  </div>
                )}
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-center gap-2">
                    <Phone className="w-3 h-3" /> {vet.phone}
                  </p>
                  {vet.total_consultations > 0 && (
                    <p className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {vet.total_consultations} konsultasi
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedVet && (
        <Dialog open={!!selectedVet} onOpenChange={() => setSelectedVet(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedVet.name}
                {selectedVet.is_preferred && <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Klinik</p>
                  <p className="font-medium">{selectedVet.clinic_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Spesialisasi</p>
                  <p>{selectedVet.specialization || "Umum"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telepon</p>
                  <a href={`tel:${selectedVet.phone}`} className="text-primary hover:underline flex items-center gap-2">
                    <Phone className="w-4 h-4" /> {selectedVet.phone}
                  </a>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  {selectedVet.whatsapp ? (
                    <a href={`https://wa.me/${selectedVet.whatsapp}`} target="_blank" className="text-primary hover:underline flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" /> Chat
                    </a>
                  ) : "-"}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  {selectedVet.email ? (
                    <a href={`mailto:${selectedVet.email}`} className="text-primary hover:underline flex items-center gap-2">
                      <Mail className="w-4 h-4" /> {selectedVet.email}
                    </a>
                  ) : "-"}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Biaya Konsultasi</p>
                  <p>{selectedVet.consultation_fee ? formatCurrency(selectedVet.consultation_fee) : "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jam Operasional</p>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {selectedVet.availability || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alamat</p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {selectedVet.address || "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Konsultasi</p>
                  <p className="font-semibold">{selectedVet.total_consultations || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Konsultasi Terakhir</p>
                  <p>{selectedVet.last_consulted ? formatDateIndonesian(selectedVet.last_consulted) : "Belum pernah"}</p>
                </div>
              </div>

              {selectedVet.rating > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Rating</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star
                        key={n}
                        className={`w-5 h-5 ${n <= selectedVet.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedVet.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Catatan</p>
                  <p className="text-sm">{selectedVet.notes}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <Button 
                  onClick={() => handleRecordConsultation(selectedVet.id)}
                  className="w-full"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Catat Konsultasi
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}