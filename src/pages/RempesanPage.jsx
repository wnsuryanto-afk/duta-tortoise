import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Truck, Plus, CheckCircle2, XCircle, Loader2, ImageOff } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import RempesanRecordForm from "@/components/rempesan/RempesanRecordForm";
import PageHeader from "@/components/common/PageHeader";
import RumputBelumDicatat from "@/components/rempesan/RumputBelumDicatat";
import { tripKembar, tarifTrip } from "@/lib/rempesan";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const fmtKg = (n) => `${Number(n || 0).toLocaleString("id-ID")} kg`;

export default function RempesanPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [processing, setProcessing] = useState({});
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const isManager = ["owner", "manajer", "admin"].includes(role);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["rempesan-logs"],
    queryFn: () => base44.entities.RempesanLog.list("-date", 300),
  });
  const { data: users = [] } = useActiveUsers({ enabled: isManager });
  const { data: configs = [] } = useQuery({
    queryKey: ["salary-configs"],
    queryFn: () => base44.entities.SalaryConfig.list(),
  });

  // Resolve nama dari User berdasarkan email
  const nameByEmail = useMemo(() => {
    const m = {};
    users.forEach((u) => { if (u.email) m[u.email] = u.full_name || u.email; });
    return m;
  }, [users]);

  const { tarif: rate, dariSetelan: tarifTersimpan } = useMemo(
    () => tarifTrip(configs.find((x) => x.role === "keeper")),
    [configs],
  );

  const visible = useMemo(() => {
    let list = isManager ? logs : logs.filter((l) => l.employee_email === user?.email);
    if (filter === "pending") list = list.filter((l) => l.status === "pending");
    else if (filter === "approved") list = list.filter((l) => l.status === "approved");
    else if (filter === "rejected") list = list.filter((l) => l.status === "rejected");
    return list;
  }, [logs, user, isManager, filter]);

  const handleApprove = async (log) => {
    setProcessing((p) => ({ ...p, [log.id]: true }));
    try {
      await base44.entities.RempesanLog.update(log.id, {
        status: "approved",
        approved_by: user?.full_name || user?.email,
        approved_date: format(new Date(), "yyyy-MM-dd"),
        trip_value: rate,
      });
      qc.invalidateQueries({ queryKey: ["rempesan-logs"] });
      toast.success("Rempesan disetujui");
    } catch (e) {
      toast.error("Gagal: " + (e?.message || "kesalahan"));
    }
    setProcessing((p) => ({ ...p, [log.id]: false }));
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error("Alasan penolakan wajib diisi"); return; }
    setProcessing((p) => ({ ...p, [rejectTarget.id]: true }));
    try {
      await base44.entities.RempesanLog.update(rejectTarget.id, {
        status: "rejected",
        rejection_reason: rejectReason.trim(),
        approved_by: user?.full_name || user?.email,
      });
      qc.invalidateQueries({ queryKey: ["rempesan-logs"] });
      toast.success("Rempesan ditolak");
      setRejectTarget(null);
      setRejectReason("");
    } catch (e) {
      toast.error("Gagal: " + (e?.message || "kesalahan"));
    }
    setProcessing((p) => ({ ...p, [rejectTarget.id]: false }));
  };

  const pendingCount = logs.filter((l) => l.status === "pending").length;

  const statusBadge = (s) => {
    if (s === "approved") return <Badge className="bg-green-100 text-green-700">Disetujui</Badge>;
    if (s === "rejected") return <Badge className="bg-red-100 text-red-700">Ditolak</Badge>;
    return <Badge className="bg-amber-100 text-amber-700">Menunggu</Badge>;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Kalimat lamanya menampung tiga aturan sekaligus (apa yang dicatat,
          batas satu trip per hari, dan akibatnya pada gaji), dan spanduk
          "N menunggu persetujuan" di bawahnya adalah kartu tersendiri yang
          hanya membawa satu angka. Angkanya jadi chip; aturannya turun ke
          baris keterangan. */}
      <PageHeader
        title="Rempesan"
        subtitle="Catat ambil sayur/rumput"
        icon={Truck}
        description={
          `Trip yang disetujui masuk otomatis ke slip gaji minggu itu — maksimal satu trip per hari, Rp ${rate.toLocaleString("id-ID")} per trip.` +
          (tarifTersimpan
            ? ""
            : " Tarif itu masih angka bawaan aplikasi; simpan di Pengaturan Tarif Mingguan supaya jadi keputusan Anda.")
        }
        chips={
          pendingCount > 0 && isManager
            ? [{ key: "menunggu", label: "Menunggu persetujuan", value: pendingCount, tone: "warn" }]
            : []
        }
        actions={
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Catat Rempesan
          </Button>
        }
      />

      {/* Sambungan ke absensi: hari yang alasan check-in-nya "cari rumput"
          tetapi rempesannya belum pernah dicatat. Inilah yang membuat jejak
          foto di absensi menagih sesuatu, bukan cuma tersimpan. */}
      <RumputBelumDicatat
        email={isManager ? undefined : user?.email}
        milikSendiri={!isManager}
      />

      <div className="flex gap-2">
        {[
          ["all", "Semua"],
          ["pending", "Menunggu"],
          ["approved", "Disetujui"],
          ["rejected", "Ditolak"],
        ].map(([v, l]) => (
          <Button
            key={v}
            size="sm"
            variant={filter === v ? "default" : "outline"}
            onClick={() => setFilter(v)}
          >
            {l}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Belum ada catatan rempesan</p>
            </div>
          ) : (
            visible.map((log) => (
              <div key={log.id} className="p-4 flex gap-3">
                {log.photo_url ? (
                  <img src={log.photo_url} alt="Rempesan" className="w-16 h-16 object-cover rounded-lg border flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg border flex items-center justify-center flex-shrink-0 bg-muted/40">
                    <ImageOff className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">
                      {nameByEmail[log.employee_email] || log.employee_name || log.employee_email}
                    </span>
                    {statusBadge(log.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {log.date ? format(new Date(log.date), "EEEE, d MMMM yyyy", { locale: id }) : "—"} · {fmtKg(log.weight_kg)}
                  </p>
                  {log.notes && <p className="text-xs text-muted-foreground mt-0.5">"{log.notes}"</p>}
                  {/* Slip mingguan hanya membayar SATU trip per tanggal. Baris
                      kedua di tanggal yang sama pernah tetap berbunyi
                      "Nilai trip: Rp 30.000", sehingga dua baris terbaca
                      Rp 60.000 untuk uang yang dibayarkan sekali. */}
                  {log.status === "approved" && (
                    tripKembar(log, logs) ? (
                      <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                        Trip kembar di tanggal ini — tidak menambah upah, yang dibayar satu trip saja.
                      </p>
                    ) : (
                      <p className="text-xs text-green-700 mt-0.5">Nilai trip: {fmt(log.trip_value || rate)}</p>
                    )
                  )}
                  {log.status === "rejected" && log.rejection_reason && (
                    <p className="text-xs text-red-600 mt-0.5">Alasan: {log.rejection_reason}</p>
                  )}
                </div>
                {isManager && log.status === "pending" && (
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <Button size="sm" onClick={() => handleApprove(log)} disabled={processing[log.id]} className="gap-1">
                      {processing[log.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setRejectTarget(log); setRejectReason(""); }}
                      disabled={processing[log.id]}
                      className="gap-1 text-destructive border-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Tolak
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {showForm && (
        <RempesanRecordForm
          konfigTarif={configs.find((x) => x.role === "keeper")}
          onClose={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["rempesan-logs"] }); }}
        />
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRejectTarget(null)}>
          <div className="bg-background rounded-lg p-5 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">Tolak Rempesan</h3>
            <Input
              placeholder="Alasan penolakan (wajib)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)}>Batal</Button>
              <Button size="sm" variant="destructive" onClick={handleReject}>Tolak</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}