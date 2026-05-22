import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Calendar, Clock, CheckCircle, AlertCircle, 
  Utensils, Search, Filter, SprayCan
} from "lucide-react";
import { formatIndonesian } from "@/lib/formatIndonesian";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";

const FEED_TIMES = {
  pagi: "Pagi",
  siang: "Siang",
  sore: "Sore"
};

const CLEANING_TYPES = {
  harian_ringan: "Harian (Ringan)",
  mingguan_sedang: "Mingguan (Sedang)",
  bulanan_besar: "Bulanan (Besar)"
};

const DAYS = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"];

export default function OperationalSchedulePage() {
  const [activeTab, setActiveTab] = useState("feed");
  const [showFeedForm, setShowFeedForm] = useState(false);
  const [showCleaningForm, setShowCleaningForm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const queryClient = useQueryClient();

  const { data: feedSchedules } = useQuery({
    queryKey: ['feed-schedules'],
    queryFn: () => base44.entities.FeedSchedule.filter({ is_active: true }),
    initialData: [],
  });

  const { data: cleaningSchedules } = useQuery({
    queryKey: ['cleaning-schedules'],
    queryFn: () => base44.entities.CleaningSchedule.filter({ is_active: true }),
    initialData: [],
  });

  const { data: enclosures } = useQuery({
    queryKey: ['enclosures'],
    queryFn: () => base44.entities.Enclosure.filter({ is_active: true }),
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const createFeedMutation = useMutation({
    mutationFn: (data) => base44.entities.FeedSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-schedules'] });
      setShowFeedForm(false);
      toast.success("Jadwal pakan berhasil ditambahkan");
    },
  });

  const createCleaningMutation = useMutation({
    mutationFn: (data) => base44.entities.CleaningSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      setShowCleaningForm(false);
      toast.success("Jadwal pembersihan berhasil ditambahkan");
    },
  });

  const markFedMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.FeedSchedule.update(id, { last_fed: new Date().toISOString().split('T')[0] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-schedules'] });
      toast.success("Pakan sudah diberikan");
    },
  });

  const markCleanedMutation = useMutation({
    mutationFn: async ({ id, cleaned_by }) => {
      const schedule = cleaningSchedules.find(s => s.id === id);
      await base44.entities.CleaningLog.create({
        schedule_id: id,
        enclosure_name: schedule.enclosure_name,
        cleaning_date: new Date().toISOString().split('T')[0],
        cleaned_by,
        tasks_completed: schedule.tasks || [],
        notes: "Pembersihan rutin"
      });
      await base44.entities.CleaningSchedule.update(id, {
        last_cleaned: new Date().toISOString().split('T')[0],
        next_cleaning_date: new Date(Date.now() + schedule.frequency_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-logs'] });
      toast.success("Pembersihan berhasil dicatat");
    },
  });

  const handleMarkFed = (id) => {
    markFedMutation.mutate(id);
  };

  const handleMarkCleaned = (id) => {
    const user = users.find(u => u.email === user?.email);
    markCleanedMutation.mutate({ id, cleaned_by: user?.full_name || user?.email });
  };

  const getCleaningStatus = (schedule) => {
    if (!schedule.last_cleaned) return "overdue";
    const last = new Date(schedule.last_cleaned);
    const now = new Date();
    const daysSince = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    
    if (daysSince > schedule.frequency_days) return "overdue";
    if (daysSince > schedule.frequency_days * 0.8) return "due-soon";
    return "ok";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ok": return <Badge className="bg-green-100 text-green-800">✓ Tepat Waktu</Badge>;
      case "due-soon": return <Badge className="bg-yellow-100 text-yellow-800">⚠ Segera</Badge>;
      case "overdue": return <Badge className="bg-red-100 text-red-800">⚠ Terlewat</Badge>;
      default: return null;
    }
  };

  const filteredFeedSchedules = feedSchedules.filter(s => 
    s.enclosure_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCleaningSchedules = cleaningSchedules.filter(s => 
    s.enclosure_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Jadwal Operasional</h1>
          <p className="text-muted-foreground">Jadwal pemberian pakan dan pembersihan kandang</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showFeedForm} onOpenChange={setShowFeedForm}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Utensils className="w-4 h-4" />
                Jadwal Pakan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Tambah Jadwal Pakan</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                createFeedMutation.mutate({
                  enclosure_id: formData.get('enclosure_id'),
                  enclosure_name: formData.get('enclosure_name'),
                  feed_time: formData.get('feed_time'),
                  feed_time_hour: formData.get('feed_time_hour'),
                  feed_type: formData.get('feed_type'),
                  feed_quantity: formData.get('feed_quantity'),
                  days_active: formData.getAll('days_active'),
                  assigned_to: formData.get('assigned_to'),
                  is_active: true
                });
              }} className="space-y-4">
                <div>
                  <Label>Kandang</Label>
                  <select name="enclosure_id" className="w-full p-2 border rounded" required onChange={(e) => {
                    const enclosure = enclosures.find(en => en.id === e.target.value);
                    document.querySelector('[name="enclosure_name"]').value = enclosure?.name || '';
                  }}>
                    <option value="">Pilih kandang</option>
                    {enclosures.map(en => (
                      <option key={en.id} value={en.id}>{en.name}</option>
                    ))}
                  </select>
                  <Input name="enclosure_name" className="hidden" />
                </div>
                <div>
                  <Label>Waktu Pemberian</Label>
                  <select name="feed_time" className="w-full p-2 border rounded" required>
                    {Object.entries(FEED_TIMES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Jam (opsional)</Label>
                  <Input name="feed_time_hour" type="time" />
                </div>
                <div>
                  <Label>Jenis Pakan</Label>
                  <Input name="feed_type" placeholder="e.g., rumput segar, pellet" required />
                </div>
                <div>
                  <Label>Jumlah/Porsi</Label>
                  <Input name="feed_quantity" placeholder="e.g., 2 ikat, 200 gram" required />
                </div>
                <div>
                  <Label>Hari Aktif</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {DAYS.map(day => (
                      <label key={day} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="days_active" value={day} defaultChecked className="w-4 h-4" />
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Petugas</Label>
                  <select name="assigned_to" className="w-full p-2 border rounded">
                    <option value="">Semua petugas</option>
                    {users.map(u => (
                      <option key={u.id} value={u.full_name}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowFeedForm(false)}>Batal</Button>
                  <Button type="submit">Simpan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showCleaningForm} onOpenChange={setShowCleaningForm}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <SprayCan className="w-4 h-4" />
                Jadwal Bersih
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Tambah Jadwal Pembersihan</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                createCleaningMutation.mutate({
                  enclosure_id: formData.get('enclosure_id'),
                  enclosure_name: formData.get('enclosure_name'),
                  cleaning_type: formData.get('cleaning_type'),
                  frequency_days: parseInt(formData.get('frequency_days')),
                  assigned_to: formData.get('assigned_to'),
                  tasks: formData.get('tasks')?.split(',').map(t => t.trim()).filter(Boolean),
                  is_active: true
                });
              }} className="space-y-4">
                <div>
                  <Label>Kandang</Label>
                  <select name="enclosure_id" className="w-full p-2 border rounded" required onChange={(e) => {
                    const enclosure = enclosures.find(en => en.id === e.target.value);
                    document.querySelector('[name="enclosure_name"]').value = enclosure?.name || '';
                  }}>
                    <option value="">Pilih kandang</option>
                    {enclosures.map(en => (
                      <option key={en.id} value={en.id}>{en.name}</option>
                    ))}
                  </select>
                  <Input name="enclosure_name" className="hidden" />
                </div>
                <div>
                  <Label>Jenis Pembersihan</Label>
                  <select name="cleaning_type" className="w-full p-2 border rounded" required>
                    {Object.entries(CLEANING_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Frekuensi (hari)</Label>
                  <Input name="frequency_days" type="number" min={1} defaultValue={7} required />
                </div>
                <div>
                  <Label>Checklist Tugas (pisahkan dengan koma)</Label>
                  <Input name="tasks" placeholder="Ganti air, Sapu kotoran, Semprot disinfektan" />
                </div>
                <div>
                  <Label>Petugas</Label>
                  <select name="assigned_to" className="w-full p-2 border rounded">
                    <option value="">Semua petugas</option>
                    {users.map(u => (
                      <option key={u.id} value={u.full_name}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCleaningForm(false)}>Batal</Button>
                  <Button type="submit">Simpan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cari kandang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="feed" className="gap-2">
            <Utensils className="w-4 h-4" />
            Jadwal Pakan
          </TabsTrigger>
          <TabsTrigger value="cleaning" className="gap-2">
            <SprayCan className="w-4 h-4" />
            Jadwal Kebersihan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-6">
          {filteredFeedSchedules.length === 0 ? (
            <EmptyState
              title="Belum Ada Jadwal Pakan"
              description="Tambahkan jadwal pemberian pakan untuk setiap kandang"
              icon={Utensils}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredFeedSchedules.map(schedule => (
                <Card key={schedule.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span>{schedule.enclosure_name}</span>
                      <Badge variant="outline">{FEED_TIMES[schedule.feed_time]}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {schedule.feed_time_hour || "Setiap hari"}
                      </p>
                      <p>Jenis: {schedule.feed_type}</p>
                      <p>Porsi: {schedule.feed_quantity}</p>
                      {schedule.assigned_to && <p>Petugas: {schedule.assigned_to}</p>}
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <div className="text-xs text-muted-foreground">
                        {schedule.last_fed ? (
                          <span>Terakhir: {formatIndonesian.date(schedule.last_fed)}</span>
                        ) : (
                          <span className="text-orange-600">Belum diberi</span>
                        )}
                      </div>
                      <Button size="sm" onClick={() => handleMarkFed(schedule.id)}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Sudah Diberi
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cleaning" className="mt-6">
          {filteredCleaningSchedules.length === 0 ? (
            <EmptyState
              title="Belum Ada Jadwal Kebersihan"
              description="Tambahkan jadwal pembersihan untuk setiap kandang"
              icon={SprayCan}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCleaningSchedules.map(schedule => {
                const status = getCleaningStatus(schedule);
                return (
                  <Card key={schedule.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-start">
                        <span>{schedule.enclosure_name}</span>
                        {getStatusBadge(status)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium">{CLEANING_TYPES[schedule.cleaning_type]}</p>
                        <p>Frekuensi: setiap {schedule.frequency_days} hari</p>
                        {schedule.tasks?.length > 0 && (
                          <ul className="list-disc list-inside text-xs mt-2">
                            {schedule.tasks.map((task, idx) => (
                              <li key={idx}>{task}</li>
                            ))}
                          </ul>
                        )}
                        {schedule.assigned_to && <p className="mt-2">Petugas: {schedule.assigned_to}</p>}
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="text-xs text-muted-foreground">
                          {schedule.last_cleaned ? (
                            <span>Terakhir: {formatIndonesian.date(schedule.last_cleaned)}</span>
                          ) : (
                            <span className="text-orange-600">Belum dibersihkan</span>
                          )}
                        </div>
                        <Button size="sm" onClick={() => handleMarkCleaned(schedule.id)}>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Sudah Dibersihkan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}