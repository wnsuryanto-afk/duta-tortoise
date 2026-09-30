/**
 * CatatanUpahTab — dua catatan yang MENAMBAH gaji: lembur dan rempesan.
 *
 * Keduanya digabung dalam satu tab karena peran keduanya sama persis: ini
 * yang diisi SEPANJANG bulan supaya slip di akhir bulan benar. Dulu keduanya
 * jadi tab terpisah ("Log Lembur", "Log Sayur") di halaman lain daripada
 * layar yang menerbitkan slip.
 *
 * ── Dialog rempesan yang tidak pernah bisa dibuka ────────────────────
 *
 * `VegetableDialog` sudah lama ada di PayrollPage: 77 baris lengkap, menulis
 * ke RempesanLog — sumber yang benar, yang memang dibayar slip. Tetapi tidak
 * ada satu pun tombol, state, atau baris JSX yang merendernya. Ia
 * didefinisikan lalu tidak pernah dipakai.
 *
 * Akibatnya pemilik tidak punya cara mencatatkan trip atas nama karyawan
 * sama sekali. Satu-satunya jalur yang hidup adalah keeper mengisi sendiri
 * lewat /rempesan lalu disetujui — dan RempesanLog berisi NOL catatan.
 *
 * Komentar di hitungGaji.js menyimpulkan "bukan kode yang salah — formulirnya
 * tidak diisi". Kesimpulan itu keliru: untuk pemilik, formulirnya tidak bisa
 * DIBUKA. Sekarang dialognya punya tombolnya.
 */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTestMode } from "@/lib/useTestMode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Clock, Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { sudahAdaRempesan, tripSah } from "@/lib/rempesan";

function OvertimeDialog({ open, onClose, employees }) {
  const { testModeTag } = useTestMode();
  const qc = useQueryClient();
  const [form, setForm] = useState({ employee_email: "", date: format(new Date(), "yyyy-MM-dd"), hours: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const emp = employees.find(e => e.email === form.employee_email);
    setSaving(true);
    await base44.entities.OvertimeLog.create({
      ...form,
      hours: Number(form.hours),
      employee_id: emp?.id || "",
      employee_name: emp?.full_name || emp?.email || "",
      ...testModeTag,
    });
    qc.invalidateQueries({ queryKey: ["overtime-logs"] });
    setSaving(false);
    onClose();
    setForm({ employee_email: "", date: format(new Date(), "yyyy-MM-dd"), hours: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Catat Lembur</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Karyawan *</Label>
            <Select value={form.employee_email} onValueChange={v => set("employee_email", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.email}>{e.full_name || e.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div><Label>Jam Lembur</Label><Input type="number" step="0.5" value={form.hours} onChange={e => set("hours", e.target.value)} placeholder="2.5" /></div>
          </div>
          <div><Label>Catatan</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !form.employee_email || !form.hours}>{saving ? "..." : "Simpan"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Pemilik mencatatkan trip ambil sayur atas nama karyawan.
 *
 * Dulu menulis `VegetablePickup` — entitas yang tidak dibaca oleh satu pun
 * layar yang menerbitkan slip, jadi trip yang dicatat di sini tidak pernah
 * sampai ke gaji siapa pun. Sekarang menulis `RempesanLog`, sumber yang sama
 * dengan slip mingguan dan bulanan.
 *
 * Langsung berstatus `approved`: yang mencatat adalah pemilik, dan pemilik
 * adalah yang menyetujui — meminta dia menyetujui catatannya sendiri hanya
 * menambah satu ketukan tanpa menambah pengawasan apa pun.
 *
 * Kolom "Jumlah Trip" dihapus. Ia dulu boleh diisi lebih dari satu dan
 * dijumlahkan tanpa membuang tanggal kembar, padahal slip mingguan, halaman
 * Rempesan, dan formulir keeper semuanya sepakat maksimal satu trip per hari.
 */
function VegetableDialog({ open, onClose, employees }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ employee_email: "", date: format(new Date(), "yyyy-MM-dd"), weight_kg: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [galat, setGalat] = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const emp = employees.find(e => e.email === form.employee_email);
    setSaving(true);
    setGalat("");
    try {
      // Dibaca ulang dari server tepat sebelum membuat — penjaga yang sama
      // dipakai formulir keeper. Satu trip per hari berlaku untuk siapa pun
      // yang mencatatnya, termasuk pemilik.
      const adaDulu = await base44.entities.RempesanLog.filter({
        employee_email: form.employee_email,
        date: form.date,
      });
      if (sudahAdaRempesan(adaDulu, form.employee_email, form.date)) {
        setGalat("Tanggal ini sudah punya catatan rempesan — satu trip per hari.");
        setSaving(false);
        return;
      }
      await base44.entities.RempesanLog.create({
        employee_email: form.employee_email,
        employee_name: emp?.full_name || emp?.email || "",
        employee_id: emp?.id || "",
        date: form.date,
        weight_kg: Number(form.weight_kg) || 0,
        notes: form.notes || "",
        status: "approved",
        approved_by: "Dicatat pemilik di Hitung Gaji",
        approved_date: format(new Date(), "yyyy-MM-dd"),
        recorded_by_name: "Pemilik",
      });
      qc.invalidateQueries({ queryKey: ["rempesan-logs"] });
      setSaving(false);
      onClose();
      setForm({ employee_email: "", date: format(new Date(), "yyyy-MM-dd"), weight_kg: "", notes: "" });
    } catch (e) {
      setGalat(e?.message || "Gagal menyimpan.");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Catat Pengambilan Sayur</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Karyawan *</Label>
            <Select value={form.employee_email} onValueChange={v => set("employee_email", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.email}>{e.full_name || e.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div><Label>Berat (kg)</Label><Input type="number" step="0.1" min="0" value={form.weight_kg} onChange={e => set("weight_kg", e.target.value)} placeholder="opsional" /></div>
          </div>
          <div><Label>Catatan</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">
            Tercatat langsung sebagai <b>disetujui</b> — satu trip per hari, masuk slip periode itu.
          </p>
          {galat && <p className="text-xs text-destructive">{galat}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !form.employee_email}>{saving ? "..." : "Simpan"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CatatanUpahTab({ bulan, karyawan = [], users = [], bolehCatat }) {
  const [showOvertime, setShowOvertime] = useState(false);
  const [showRempesan, setShowRempesan] = useState(false);

  const awal = `${bulan}-01`;
  const akhir = `${bulan}-32`;   // semua tanggal bulan itu berawalan "YYYY-MM-"

  const { data: overtimeLogs = [] } = useQuery({
    queryKey: ["overtime-logs"],
    queryFn: () => base44.entities.OvertimeLog.list("-date", 300),
  });
  const { data: rempesanLogs = [] } = useQuery({
    queryKey: ["rempesan-logs"],
    queryFn: () => base44.entities.RempesanLog.list("-date", 300),
  });

  const lembur = overtimeLogs.filter((o) => o.date >= awal && o.date <= akhir);

  /*
   * Ringkasan trip per orang. `rempesanLogs` adalah DAFTAR catatan, bukan
   * peta per email — versi sebelumnya di PayrollPage memanggil
   * Object.entries() atasnya dan membaca `.trips`/`.dates` yang tidak ada
   * pada sebuah catatan. Hari ini RempesanLog kosong, jadi layarnya
   * menjawab "belum ada trip" karena kebetulan benar; satu catatan saja
   * sudah cukup untuk membuat tiap baris bernama "0", "1", "2".
   *
   * Yang ditampilkan adalah yang DIBAYAR: `tripSah` menyaring ke yang
   * disetujui dan membuang tanggal kembar — aturan yang sama dengan slipnya.
   * Yang masih menunggu disebut terpisah, karena pemilik membuka layar ini
   * justru saat ia peduli ada yang perlu disetujui.
   */
  const ringkasTrip = useMemo(() => {
    const dalamBulan = rempesanLogs.filter((r) => r.date >= awal && r.date <= akhir);
    const peta = new Map();
    const ambil = (email) => {
      if (!peta.has(email)) peta.set(email, { email, trips: 0, dates: [], menunggu: 0 });
      return peta.get(email);
    };
    for (const r of tripSah(dalamBulan)) {
      const b = ambil(r.employee_email || r.email || "");
      b.trips += 1;
      b.dates.push(r.date);
    }
    for (const r of dalamBulan) {
      if (r.status && r.status !== "approved") ambil(r.employee_email || r.email || "").menunggu += 1;
    }
    return [...peta.values()].sort((a, b) => b.trips - a.trips);
  }, [rempesanLogs, awal, akhir]);

  const namaBulan = format(new Date(`${bulan}-01`), "MMMM yyyy", { locale: id });

  return (
    <div className="space-y-6">
      {/* ── Lembur ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Lembur — {namaBulan}
          </h3>
          {bolehCatat && (
            <Button size="sm" onClick={() => setShowOvertime(true)}>
              <Plus className="w-4 h-4 mr-1.5" />Catat Lembur
            </Button>
          )}
        </div>
        {lembur.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Belum ada lembur bulan ini</Card>
        ) : (
          <div className="space-y-2">
            {lembur.map((o) => (
              <Card key={o.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{o.employee_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(o.date), "d MMM yyyy", { locale: id })} · {o.notes || "–"}
                  </p>
                </div>
                <span className="font-semibold text-blue-700 tabular-nums flex-shrink-0">{o.hours} jam</span>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Rempesan ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Leaf className="w-4 h-4 text-lime-600" /> Rempesan — {namaBulan}
          </h3>
          {bolehCatat && (
            <Button size="sm" variant="outline" onClick={() => setShowRempesan(true)}>
              <Plus className="w-4 h-4 mr-1.5" />Catat Rempesan
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Dari catatan yang sudah disetujui, maksimal satu trip per orang per hari.
        </p>
        {ringkasTrip.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Belum ada trip rempesan bulan ini</Card>
        ) : (
          <div className="space-y-2">
            {ringkasTrip.map((r) => {
              const emp = users.find((u) => u.email === r.email);
              return (
                <Card key={r.email} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{emp?.full_name || r.email}</p>
                    <p className="text-xs text-muted-foreground break-words">
                      {r.dates.map((d) => format(new Date(d), "d MMM", { locale: id })).join(" · ") || "–"}
                    </p>
                    {r.menunggu > 0 && (
                      <Link to="/rempesan" className="text-xs text-amber-600 hover:underline">
                        {r.menunggu} lagi menunggu persetujuan — belum dibayar
                      </Link>
                    )}
                  </div>
                  <span className="font-semibold text-lime-700 tabular-nums flex-shrink-0">{r.trips} trip</span>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {showOvertime && (
        <OvertimeDialog open={showOvertime} onClose={() => setShowOvertime(false)} employees={karyawan} />
      )}
      {showRempesan && (
        <VegetableDialog open={showRempesan} onClose={() => setShowRempesan(false)} employees={karyawan} />
      )}
    </div>
  );
}
