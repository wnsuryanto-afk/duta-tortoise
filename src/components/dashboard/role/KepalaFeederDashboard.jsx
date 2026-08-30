import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useState } from "react";
import {
  Users, CheckCircle, XCircle, AlertTriangle, Star, ChevronRight, Loader2, Package, Wallet
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import KeeperIncubatorWidget from "@/components/dashboard/KeeperIncubatorWidget";
import KeeperAttentionWidget from "@/components/dashboard/KeeperAttentionWidget";
import PakanHarianWidget from "@/components/pakan/PakanHarianWidget";
import MotivasiHarianCard from "@/components/dashboard/MotivasiHarianCard";
import PageHeader from "@/components/common/PageHeader";
import { TeamArt } from "@/components/common/Illustration";
import { saldoTerkini } from "@/lib/kasKecil";

export default function KepalaFeederDashboard({ user }) {
  const qc = useQueryClient();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const thisMonthKey = format(now, "yyyy-MM");
  const todayLabel = format(now, "EEEE, d MMMM yyyy", { locale: idLocale });

  const { data: allUsers = [] } = useActiveUsers();

  const { data: attendances = [] } = useQuery({
    queryKey: ["kf-attendance", today],
    queryFn: () => base44.entities.Attendance.filter({ date: today }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: dailyChecklists = [], refetch: refetchCL } = useQuery({
    queryKey: ["kf-checklists", today],
    queryFn: () => base44.entities.DailyChecklist.filter({ date: today }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: monthChecklists = [] } = useQuery({
    queryKey: ["kf-month-checklists", thisMonthKey],
    queryFn: () => base44.entities.DailyChecklist.list("-date", 300),
    staleTime: 5 * 60 * 1000,
  });

  const { data: companySettings = [] } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => base44.entities.CompanySettings.filter({ setting_key: "main" }),
    staleTime: 15 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["kf-warehouse"],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 100),
    staleTime: 5 * 60 * 1000,
  });

  const { data: feedStocks = [] } = useQuery({
    queryKey: ["kf-feedstocks"],
    queryFn: () => base44.entities.FeedStock.list("-name", 50),
    staleTime: 5 * 60 * 1000,
  });

  const { data: stockMovements = [] } = useQuery({
    queryKey: ["kf-stock-movements"],
    queryFn: () => base44.entities.StockMovement.list("-date", 500),
    staleTime: 10 * 60 * 1000,
  });

  // Saldo kas kecil ada di PettyCashLedger, bukan di entitas PettyCash.
  // PettyCash adalah sisa rancangan lama yang tidak pernah ditulis satu layar
  // pun, jadi membacanya selalu menghasilkan daftar kosong.
  const { data: pettyCashLedger = [] } = useQuery({
    queryKey: ["petty-cash-ledger"],
    queryFn: () => base44.entities.PettyCashLedger.list("-entry_date", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: pettyCashRequests = [] } = useQuery({
    queryKey: ["kf-petty-cash-requests"],
    queryFn: () => base44.entities.PettyCashRequest.filter({ status: "pending" }),
    staleTime: 3 * 60 * 1000,
  });

  const settings = companySettings[0] || {};

  // Stok kritis — memakai definisi bersama di lib/stokMenipis.js.
  //
  // Sebelumnya layar ini punya ambangnya sendiri (`current_stock <= minimum_stock`),
  // dan karena seluruh angka stok pakan bernilai nol dengan minimum nol, KESEMBILAN
  // item pakan tampil sebagai kritis setiap hari. Tidak satu pun bisa dihilangkan
  // dengan bekerja: angkanya memang sengaja dinolkan dan tidak dipelihara.
  //
  // Daftar yang isinya selalu sama, setiap hari, berhenti dibaca dalam seminggu —
  // dan yang ikut berhenti dibaca adalah item yang suatu hari benar-benar habis.
  const stokTerpantau = periksaStokTerpantau(warehouseItems, feedStocks, stockMovements);
  const criticalWarehouseStock = stokTerpantau.habis
    .concat(stokTerpantau.menipis)
    .filter((i) => i._sumber === "gudang");
  const criticalFeedStock = stokTerpantau.habis
    .concat(stokTerpantau.menipis)
    .filter((i) => i._sumber === "pakan");
  const stokBelumDicatat = stokTerpantau.takTerpantau.length;

  // Kas kecil saldo
  // Field-nya juga keliru: skema PettyCash menyebutnya `current_balance`,
  // bukan `balance`, jadi angka yang tampil selalu Rp 0 — di layar orang yang
  // justru memegang kas kecilnya.
  const pettyCashBalance = saldoTerkini(pettyCashLedger);
  const targetPoin = settings.min_poin_bulanan || 300;

  const keepers = allUsers.filter(u => u.role === "keeper");

  // Poin bulan ini per keeper
  const poinByKeeper = {};
  monthChecklists
    .filter(c => (c.date || "").startsWith(thisMonthKey) && c.status === "approved")
    .forEach(c => {
      poinByKeeper[c.employee_email] = (poinByKeeper[c.employee_email] || 0) + (c.approved_points || c.total_points_claimed || 0);
    });

  // Ringkasan tim untuk header — dihitung dari data yang sudah ada di layar ini
  const hadirHariIni = keepers.filter(k =>
    attendances.some(a => a.employee_email === k.email)
  ).length;
  const checklistMasuk = keepers.filter(k => {
    const cl = dailyChecklists.find(c => c.employee_email === k.email);
    return cl?.status === "submitted" || cl?.status === "approved";
  }).length;

  // Poin diri sendiri hari ini
  const myTodayCL = dailyChecklists.find(c => c.employee_email === user?.email);
  const myTodayPoin = myTodayCL?.total_points_claimed || 0;

  // Pending checklists
  const pendingChecklists = dailyChecklists.filter(c => c.status === "submitted");

  // Approve mutation
  const approveMut = useMutation({
    mutationFn: async ({ id, approved_points }) => {
      await base44.entities.DailyChecklist.update(id, {
        status: "approved",
        approved_by: user?.full_name || user?.email,
        approved_at: new Date().toISOString(),
        approved_points,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kf-checklists"] });
      qc.invalidateQueries({ queryKey: ["kf-month-checklists"] });
      toast.success("Checklist disetujui!");
    },
  });

  const rejectMut = useMutation({
    mutationFn: async (id) => {
      await base44.entities.DailyChecklist.update(id, {
        status: "rejected",
        approved_by: user?.full_name || user?.email,
        approved_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kf-checklists"] });
      toast.success("Checklist ditolak.");
    },
  });

  const [approveAllLoading, setApproveAllLoading] = useState(false);
  const handleApproveAll = async () => {
    if (!window.confirm(`Setujui semua ${pendingChecklists.length} checklist?`)) return;
    setApproveAllLoading(true);
    for (const c of pendingChecklists) {
      await base44.entities.DailyChecklist.update(c.id, {
        status: "approved",
        approved_by: user?.full_name || user?.email,
        approved_at: new Date().toISOString(),
        approved_points: c.total_points_claimed || 0,
      });
    }
    setApproveAllLoading(false);
    qc.invalidateQueries({ queryKey: ["kf-checklists"] });
    qc.invalidateQueries({ queryKey: ["kf-month-checklists"] });
    toast.success("Semua checklist disetujui!");
  };

  // Null guard setelah semua hooks — aman untuk React
  if (!user?.email) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 animate-fade-in">
      {/* ── HEADER ──
          Kepala feeder mengawasi tim, jadi angka kehadiran dan checklist
          diangkat ke atas — itu yang ditanyakan atasannya tiap pagi. */}
      <PageHeader
        title={`Halo, ${user?.full_name || "Kepala Feeder"}`}
        subtitle={todayLabel}
        art={<TeamArt size="md" />}
        chips={[
          { key: "hadir", icon: Users, label: "Keeper hadir",
            value: `${hadirHariIni}/${keepers.length}`,
            tone: keepers.length > 0 && hadirHariIni >= keepers.length ? "good" : "warn" },
          { key: "checklist", icon: CheckCircle, label: "Checklist masuk",
            value: `${checklistMasuk}/${keepers.length}`,
            tone: keepers.length > 0 && checklistMasuk >= keepers.length ? "good" : "warn" },
          { key: "poin", icon: Star, label: "Poin saya hari ini", value: myTodayPoin },
        ]}
      />

      {/* ── MOTIVASI HARIAN ── */}
      <MotivasiHarianCard />

      {/* ── SECTION 1: STATUS TIM ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-semibold text-sm mb-3 text-foreground">Tim Kamu — {todayLabel}</h2>
        {keepers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada keeper terdaftar</p>
        ) : (
          <>
            {/* Warning jika ada yang belum check-in > 08:00 */}
            {(() => {
              const hour = now.getHours() + 7; // approximate WIB from UTC
              const late = keepers.filter(k => {
                const att = attendances.find(a => a.employee_email === k.email);
                return !att && hour >= 8;
              });
              if (late.length > 0) return (
                <div className="flex items-center gap-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">{late.map(k => k.full_name).join(", ")} belum check in</p>
                </div>
              );
              return null;
            })()}
            <div className="space-y-2">
              {keepers.map(k => {
                const att = attendances.find(a => a.employee_email === k.email);
                const cl = dailyChecklists.find(c => c.employee_email === k.email);
                return (
                  <div key={k.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                        {(k.full_name || k.email)[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{k.full_name || k.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-center">
                        <p className="text-muted-foreground">Check-in</p>
                        {att ? (
                          <span className="text-green-600 font-medium">✓ {att.check_in}</span>
                        ) : (
                          <span className="text-red-500">✗ Belum</span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Checklist</p>
                        {cl?.status === "submitted" || cl?.status === "approved" ? (
                          <span className="text-green-600 font-medium">✓ Submit</span>
                        ) : (
                          <span className="text-muted-foreground">Belum</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── SECTION 2: PERLU APPROVAL ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-foreground">Perlu Approval Kamu</h2>
          {pendingChecklists.length > 1 && (
            <button onClick={handleApproveAll} disabled={approveAllLoading}
              className="text-xs font-medium text-green-700 border border-green-300 px-3 py-1 rounded-lg hover:bg-green-50 disabled:opacity-50 flex items-center gap-1">
              {approveAllLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              Setujui Semua ({pendingChecklists.length})
            </button>
          )}
        </div>
        {pendingChecklists.length === 0 ? (
          <p className="text-sm text-green-600 font-medium">✓ Semua checklist sudah diproses</p>
        ) : (
          <div className="space-y-3">
            {pendingChecklists.map(cl => (
              <div key={cl.id} className="border border-amber-200 bg-amber-50 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{cl.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{cl.date} · {cl.total_points_claimed || 0} poin diklaim</p>
                    {Array.isArray(cl.completed_tasks) && cl.completed_tasks.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">
                        {cl.completed_tasks.slice(0, 3).map(t => t?.task_title || t?.title || "").filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => approveMut.mutate({ id: cl.id, approved_points: cl.total_points_claimed || 0 })}
                      disabled={approveMut.isPending}
                      className="flex items-center gap-1 text-xs font-medium text-green-700 border border-green-400 px-2.5 py-1 rounded-lg hover:bg-green-100 disabled:opacity-50">
                      <CheckCircle className="w-3.5 h-3.5" /> Setujui
                    </button>
                    <button
                      onClick={() => rejectMut.mutate(cl.id)}
                      disabled={rejectMut.isPending}
                      className="flex items-center gap-1 text-xs font-medium text-red-600 border border-red-300 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50">
                      <XCircle className="w-3.5 h-3.5" /> Tolak
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 3: POIN TIM ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-semibold text-sm mb-3 text-foreground">Poin Tim Bulan Ini</h2>
        {keepers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada keeper terdaftar</p>
        ) : (
          <div className="space-y-3">
            {keepers.map(k => {
              const poin = poinByKeeper[k.email] || 0;
              const pct = Math.min(100, (poin / targetPoin) * 100);
              const achieved = poin >= targetPoin;
              return (
                <div key={k.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{k.full_name || k.email}</span>
                    <span className={`text-xs font-semibold ${achieved ? "text-green-600" : "text-red-500"}`}>
                      {poin} poin {achieved ? "✓ Target" : `✗ Kurang ${targetPoin - poin}`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full">
                    <div className={`h-2 rounded-full transition-all ${achieved ? "bg-green-500" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECTION KAS KECIL ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-600" />
            <h2 className="font-semibold text-sm text-foreground">💵 Kas Kecil</h2>
          </div>
          <Link to="/petty-cash" className="text-xs text-primary hover:underline flex items-center gap-1">
            Lihat <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-muted-foreground">Saldo Saat Ini</p>
            <p className="text-xl font-bold text-green-700">Rp {pettyCashBalance.toLocaleString("id-ID")}</p>
          </div>
          {pettyCashRequests.length > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-100 border border-amber-200 text-center">
              <p className="text-lg font-bold text-amber-700">{pettyCashRequests.length}</p>
              <p className="text-xs text-amber-600">Request Pending</p>
            </div>
          )}
        </div>
        {pettyCashRequests.length === 0 && (
          <p className="text-xs text-green-600">✓ Tidak ada request pending</p>
        )}
      </div>

      {/* ── PAKAN HARI INI ── */}
      <PakanHarianWidget />

      {/* ── SECTION STOK KRITIS ── */}
      {(criticalWarehouseStock.length > 0 || criticalFeedStock.length > 0) && (
        <div className="bg-card rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-sm text-foreground">📦 Stok Kritis</h2>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {criticalWarehouseStock.length + criticalFeedStock.length} item
            </span>
          </div>
          <div className="space-y-2">
            {criticalWarehouseStock.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2.5 bg-red-50 border border-red-100 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-red-800">{item.name}</p>
                  <p className="text-xs text-red-600">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-700">{item.current_stock} {item.unit}</p>
                  <p className="text-xs text-red-500">Min: {item.minimum_stock}</p>
                </div>
              </div>
            ))}
            {criticalFeedStock.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2.5 bg-orange-50 border border-orange-100 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-orange-800">{item.name}</p>
                  <p className="text-xs text-orange-600">Pakan</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-orange-700">{item.current_stock} {item.unit}</p>
                  <p className="text-xs text-orange-500">Min: {item.minimum_stock || 0}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/stok-unified" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Kelola Stok <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ── INKUBATOR ── */}
      <KeeperIncubatorWidget />

      {/* ── PERLU PERHATIAN ── */}
      <KeeperAttentionWidget />

      {/* ── SECTION 4: TUGASKU ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-semibold text-sm mb-3 text-foreground">Tugasku Sendiri</h2>
        {myTodayCL ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status checklist hari ini</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${myTodayCL.status === "approved" ? "bg-green-100 text-green-700" : myTodayCL.status === "submitted" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                {myTodayCL.status === "approved" ? "✓ Approved" : myTodayCL.status === "submitted" ? "Terkirim" : "Draft"}
              </span>
            </div>
            <p className="text-sm">Poin diklaim: <span className="font-bold">{myTodayCL.total_points_claimed || 0}</span></p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-2">Belum ada progress hari ini</p>
        )}
        <Link to="/"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Buka Panduan Lengkap <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}