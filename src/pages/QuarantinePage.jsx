import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, Clock, CheckCircle, AlertCircle, Thermometer, Scale } from "lucide-react";
import { formatIndonesian } from "@/lib/formatIndonesian";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/useCurrentUser";

const QUARANTINE_REASONS = {
  pendatang_baru: "Pendatang Baru",
  sakit: "Sakit",
  cedera: "Cedera",
  observasi: "Observasi",
  sebelum_dijual: "Sebelum Dijual",
  pasca_breeding: "Pasca Breeding",
  lainnya: "Lainnya"
};

const APPETITE_OPTIONS = {
  normal: "Normal",
  kurang: "Kurang",
  tidak_mau: "Tidak Mau"
};

export default function QuarantinePage() {
  const { user } = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [selectedQuarantine, setSelectedQuarantine] = useState(null);
  const [observationForm, setObservationForm] = useState({
    temperature: "",
    weight: "",
    appetite: "normal",
    notes: ""
  });

  const queryClient = useQueryClient();

  const { data: quarantines, isLoading } = useQuery({
    queryKey: ['quarantines'],
    queryFn: () => base44.entities.QuarantineRecord.filter({ status: "aktif" }),
    initialData: [],
  });

  const { data: tortoises } = useQuery({
    queryKey: ['tortoises-active'],
    queryFn: () => base44.entities.Tortoise.filter({ status: "aktif" }),
    initialData: [],
  });

  const { data: enclosures } = useQuery({
    queryKey: ['enclosures'],
    queryFn: () => base44.entities.Enclosure.filter({ is_active: true }),
    initialData: [],
  });

  const createQuarantineMutation = useMutation({
    mutationFn: async (data) => {
      const quarantine = await base44.entities.QuarantineRecord.create(data);
      if (data.tortoise_id) {
        await base44.entities.Tortoise.update(data.tortoise_id, { status: "karantina", enclosure: data.quarantine_enclosure });
      }
      return quarantine;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarantines'] });
      queryClient.invalidateQueries({ queryKey: ['tortoises'] });
      setShowForm(false);
      toast.success("Karantina berhasil ditambahkan");
    },
  });

  const completeQuarantineMutation = useMutation({
    mutationFn: async ({ id, tortoise_id, new_enclosure }) => {
      await base44.entities.QuarantineRecord.update(id, { 
        status: "selesai", 
        result: "lulus",
        end_date: new Date().toISOString().split('T')[0]
      });
      if (tortoise_id) {
        await base44.entities.Tortoise.update(tortoise_id, { 
          status: "aktif", 
          enclosure: new_enclosure 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarantines'] });
      queryClient.invalidateQueries({ queryKey: ['tortoises'] });
      setSelectedQuarantine(null);
      toast.success("Kura-kura lulus karantina");
    },
  });

  const addObservationMutation = useMutation({
    mutationFn: async ({ id, observation }) => {
      const quarantine = quarantines.find(q => q.id === id);
      const observations = quarantine.daily_observations || [];
      observations.push({
        ...observation,
        date: new Date().toISOString().split('T')[0],
        observer: user?.email
      });
      await base44.entities.QuarantineRecord.update(id, { daily_observations: observations });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarantines'] });
      setObservationForm({ temperature: "", weight: "", appetite: "normal", notes: "" });
      toast.success("Observasi berhasil ditambahkan");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createQuarantineMutation.mutate({
      tortoise_id: formData.get('tortoise_id'),
      tortoise_name: formData.get('tortoise_name'),
      quarantine_reason: formData.get('quarantine_reason'),
      reason_detail: formData.get('reason_detail'),
      start_date: formData.get('start_date'),
      expected_duration_days: parseInt(formData.get('expected_duration_days')) || 14,
      quarantine_enclosure: formData.get('quarantine_enclosure'),
      status: "aktif"
    });
  };

  const handleAddObservation = () => {
    if (!observationForm.temperature || !observationForm.weight) {
      toast.error("Suhu dan berat harus diisi");
      return;
    }
    addObservationMutation.mutate({
      id: selectedQuarantine.id,
      observation: observationForm
    });
  };

  const handleComplete = (new_enclosure) => {
    completeQuarantineMutation.mutate({
      id: selectedQuarantine.id,
      tortoise_id: selectedQuarantine.tortoise_id,
      new_enclosure
    });
  };

  const getDaysInQuarantine = (startDate) => {
    const start = new Date(startDate);
    const now = new Date();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (days, expected) => {
    if (days >= expected) return "bg-green-100 text-green-800";
    if (days >= expected * 0.7) return "bg-yellow-100 text-yellow-800";
    return "bg-blue-100 text-blue-800";
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Karantina</h1>
          <p className="text-muted-foreground">Monitor kura-kura yang sedang dikarantina</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Tambah Karantina
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Karantina Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tortoise</Label>
                  <select name="tortoise_id" className="w-full p-2 border rounded" required onChange={(e) => {
                    const tortoise = tortoises.find(t => t.id === e.target.value);
                    document.querySelector('[name="tortoise_name"]').value = tortoise?.name || '';
                  }}>
                    <option value="">Pilih tortoise</option>
                    {tortoises.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Nama Tortoise</Label>
                  <Input name="tortoise_name" readOnly />
                </div>
              </div>

              <div>
                <Label>Alasan Karantina</Label>
                <select name="quarantine_reason" className="w-full p-2 border rounded" required>
                  <option value="">Pilih alasan</option>
                  {Object.entries(QUARANTINE_REASONS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Detail Alasan</Label>
                <Input name="reason_detail" placeholder="Jelaskan alasan karantina" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal Mulai</Label>
                  <Input name="start_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                </div>
                <div>
                  <Label>Durasi (hari)</Label>
                  <Input name="expected_duration_days" type="number" defaultValue={14} min={1} />
                </div>
              </div>

              <div>
                <Label>Kandang Karantina</Label>
                <select name="quarantine_enclosure" className="w-full p-2 border rounded" required>
                  <option value="">Pilih kandang</option>
                  {enclosures.map(e => (
                    <option key={e.id} value={e.name}>{e.name} (Kapasitas: {e.current_count}/{e.max_capacity})</option>
                  ))}
                </select>
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

      {quarantines.length === 0 ? (
        <EmptyState
          title="Belum Ada Karantina"
          description="Tidak ada kura-kura yang sedang dikarantina saat ini"
          icon={AlertCircle}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quarantines.map(q => {
            const days = getDaysInQuarantine(q.start_date);
            const progress = Math.min((days / q.expected_duration_days) * 100, 100);
            
            return (
              <Card key={q.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedQuarantine(q)}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{q.tortoise_name}</span>
                    <Badge className={getStatusColor(days, q.expected_duration_days)}>
                      Hari {days}/{q.expected_duration_days}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <p>Alasan: {QUARANTINE_REASONS[q.quarantine_reason]}</p>
                    <p>Mulai: {formatIndonesian.date(q.start_date)}</p>
                    <p>Kandang: {q.quarantine_enclosure}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  {q.daily_observations?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {q.daily_observations.length} observasi tercatat
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedQuarantine && (
        <Dialog open={!!selectedQuarantine} onOpenChange={() => setSelectedQuarantine(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detail Karantina - {selectedQuarantine.tortoise_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Alasan</p>
                  <p className="font-medium">{QUARANTINE_REASONS[selectedQuarantine.quarantine_reason]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Detail</p>
                  <p>{selectedQuarantine.reason_detail || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mulai</p>
                  <p>{formatIndonesian.date(selectedQuarantine.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durasi</p>
                  <p>{selectedQuarantine.expected_duration_days} hari</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kandang</p>
                  <p>{selectedQuarantine.quarantine_enclosure}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Treatment</p>
                  <p>{selectedQuarantine.treatment_given || "-"}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Observasi Harian</h3>
                {selectedQuarantine.daily_observations?.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedQuarantine.daily_observations.map((obs, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{formatIndonesian.date(obs.date)}</p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Thermometer className="w-3 h-3" /> {obs.temperature}°C
                              </span>
                              <span className="flex items-center gap-1">
                                <Scale className="w-3 h-3" /> {obs.weight}g
                              </span>
                              <span>
                                Nafsu: {APPETITE_OPTIONS[obs.appetite]}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline">{obs.observer}</Badge>
                        </div>
                        {obs.notes && <p className="text-xs mt-2 text-muted-foreground">{obs.notes}</p>}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada observasi</p>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Tambah Observasi</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Suhu (°C)</Label>
                    <Input 
                      type="number" 
                      value={observationForm.temperature}
                      onChange={(e) => setObservationForm({...observationForm, temperature: e.target.value})}
                      placeholder="e.g., 28"
                    />
                  </div>
                  <div>
                    <Label>Berat (gram)</Label>
                    <Input 
                      type="number"
                      value={observationForm.weight}
                      onChange={(e) => setObservationForm({...observationForm, weight: e.target.value})}
                      placeholder="e.g., 1500"
                    />
                  </div>
                  <div>
                    <Label>Nafsu Makan</Label>
                    <select 
                      className="w-full p-2 border rounded"
                      value={observationForm.appetite}
                      onChange={(e) => setObservationForm({...observationForm, appetite: e.target.value})}
                    >
                      {Object.entries(APPETITE_OPTIONS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Catatan</Label>
                    <Input 
                      value={observationForm.notes}
                      onChange={(e) => setObservationForm({...observationForm, notes: e.target.value})}
                      placeholder="Catatan tambahan"
                    />
                  </div>
                </div>
                <Button onClick={handleAddObservation} className="w-full">
                  Catat Observasi
                </Button>
              </div>

              {(() => {
                const days = getDaysInQuarantine(selectedQuarantine.start_date);
                return days >= selectedQuarantine.expected_duration_days && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2 text-green-600">✓ Siap Lulus Karantina</h3>
                  <p className="text-sm text-muted-foreground mb-2">Pilih kandang tujuan:</p>
                  <select className="w-full p-2 border rounded mb-2" id="new-enclosure">
                    <option value="">Pilih kandang</option>
                    {enclosures.map(e => (
                      <option key={e.id} value={e.name}>{e.name}</option>
                    ))}
                  </select>
                  <Button 
                    onClick={() => handleComplete(document.getElementById('new-enclosure').value)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Lulus Karantina
                  </Button>
                </div>
              );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}