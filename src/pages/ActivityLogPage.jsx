import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Activity, Search, Eye, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";

const ACTION_COLORS = {
  create: "bg-green-100 text-green-700 border-green-300",
  update: "bg-blue-100 text-blue-700 border-blue-300",
  delete: "bg-red-100 text-red-700 border-red-300",
  login: "bg-purple-100 text-purple-700 border-purple-300",
  logout: "bg-gray-100 text-gray-700 border-gray-300",
};

const ACTION_LABELS = {
  create: "BUAT", update: "UBAH", delete: "HAPUS", login: "MASUK", logout: "KELUAR",
};

const ENTITY_ICONS = {
  Tortoise: "🐢", Breeding: "🥚", Sale: "💰", Enclosure: "🏠",
  HealthRecord: "🏥", UserProfile: "👤", FinanceTransaction: "💵",
  Kasbon: "📝", Attendance: "✅", SalarySlip: "💼", FeedStock: "🥬",
  WarehouseItem: "📦", DailyChecklist: "📋", MaintenanceLog: "🔧",
};

function formatTimestamp(ts) {
  if (!ts) return "-";
  try {
    return format(new Date(ts), "dd MMM yyyy, HH:mm", { locale: idLocale });
  } catch { return ts; }
}

// ── Detail Modal ─────────────────────────────────────────────────────────────
function ActivityDetailModal({ log, onClose }) {
  if (!log) return null;

  const hasChangesDetail = Array.isArray(log.changes_detail) && log.changes_detail.length > 0;

  return (
    <Dialog open={!!log} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-primary" />
            Detail Aktivitas
          </DialogTitle>
        </DialogHeader>

        {/* Header info */}
        <div className="grid grid-cols-2 gap-3 text-sm bg-muted/40 rounded-xl p-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Aksi</p>
            <Badge variant="outline" className={ACTION_COLORS[log.action] || "bg-gray-100"}>
              {ACTION_LABELS[log.action] || log.action}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tipe Data</p>
            <p className="font-medium">{ENTITY_ICONS[log.entity_type] || "📄"} {log.entity_type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Nama</p>
            <p className="font-semibold">{log.entity_name || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">ID Record</p>
            <p className="font-mono text-xs text-muted-foreground">{log.entity_id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">User</p>
            <p className="font-medium">{log.user_name || log.user_email}</p>
            <p className="text-xs text-muted-foreground">{log.user_email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Waktu</p>
            <p className="font-medium">
              {log.timestamp ? format(new Date(log.timestamp), "dd MMM yyyy, HH:mm:ss", { locale: idLocale }) : "-"}
            </p>
          </div>
        </div>

        {/* UPDATE: tabel perubahan */}
        {log.action === "update" && (
          <div>
            <p className="text-sm font-semibold mb-2">Perubahan Data</p>
            {hasChangesDetail ? (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Field</th>
                      <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Nilai Lama</th>
                      <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Nilai Baru</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.changes_detail.map((ch, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 font-medium text-foreground">{ch.label || ch.field}</td>
                        <td className="px-3 py-2">
                          <span className="text-red-600 line-through">{ch.old_value}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-green-700 font-semibold">{ch.new_value}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : log.changes_summary ? (
              <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
                {log.changes_summary.split(" | ").map((line, i) => (
                  <p key={i} className="text-sm text-foreground/80">• {line}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Tidak ada detail perubahan tercatat</p>
            )}
          </div>
        )}

        {/* CREATE: ringkasan field utama */}
        {log.action === "create" && (
          <div>
            <p className="text-sm font-semibold mb-2">Data Dibuat</p>
            {log.changes_summary ? (
              <div className="rounded-xl border bg-green-50 p-3">
                <p className="text-sm text-green-800">{log.changes_summary}</p>
              </div>
            ) : (
              <div className="rounded-xl border bg-green-50 p-3">
                <p className="text-sm text-green-800">Record baru berhasil dibuat: <strong>{log.entity_name}</strong></p>
              </div>
            )}
          </div>
        )}

        {/* DELETE */}
        {log.action === "delete" && (
          <div>
            <p className="text-sm font-semibold mb-2">Data Dihapus</p>
            <div className="rounded-xl border bg-red-50 p-3">
              <p className="text-sm text-red-800">Record <strong>{log.entity_name}</strong> (ID: <span className="font-mono text-xs">{log.entity_id}</span>) telah dihapus.</p>
            </div>
          </div>
        )}

        {log.notes && (
          <div>
            <p className="text-sm font-semibold mb-1">Catatan</p>
            <p className="text-sm text-muted-foreground">{log.notes}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ActivityLogPage() {
  const { role, user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("semua");
  const [entityFilter, setEntityFilter] = useState("semua");
  const [userFilter, setUserFilter] = useState("semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const isKeeperLevel = !["owner", "admin", "manajer"].includes(role);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => base44.entities.ActivityLog.list("-timestamp", 500),
  });

  const entityTypes = [...new Set(logs.map(l => l.entity_type))].filter(Boolean).sort();
  const userEmails = [...new Set(logs.map(l => l.user_email))].filter(Boolean).sort();

  const filtered = logs.filter(log => {
    if (isKeeperLevel && log.user_email !== user?.email) return false;

    const matchSearch = !search ||
      log.entity_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.changes_summary?.toLowerCase().includes(search.toLowerCase());

    const matchAction = actionFilter === "semua" || log.action === actionFilter;
    const matchEntity = entityFilter === "semua" || log.entity_type === entityFilter;
    const matchUser = userFilter === "semua" || log.user_email === userFilter;

    let matchDate = true;
    if (dateFrom && log.timestamp) matchDate = log.timestamp >= dateFrom;
    if (dateTo && log.timestamp && matchDate) matchDate = log.timestamp.startsWith(dateTo) || log.timestamp <= dateTo + "T23:59:59";

    return matchSearch && matchAction && matchEntity && matchUser && matchDate;
  });

  const stats = {
    total: filtered.length,
    create: filtered.filter(l => l.action === "create").length,
    update: filtered.filter(l => l.action === "update").length,
    delete: filtered.filter(l => l.action === "delete").length,
  };

  if (!["owner", "admin", "manajer", "keeper", "kepala_feeder"].includes(role)) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-lg font-medium">🔒 Akses Terbatas</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Riwayat Aktivitas</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor semua perubahan data di sistem</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Aktivitas", val: stats.total, color: "text-foreground" },
          { label: "Buat", val: stats.create, color: "text-green-600" },
          { label: "Ubah", val: stats.update, color: "text-blue-600" },
          { label: "Hapus", val: stats.delete, color: "text-red-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, user, perubahan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="Aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Aksi</SelectItem>
            <SelectItem value="create">Buat</SelectItem>
            <SelectItem value="update">Ubah</SelectItem>
            <SelectItem value="delete">Hapus</SelectItem>
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Tipe Data" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Tipe</SelectItem>
            {entityTypes.map(type => (
              <SelectItem key={type} value={type}>
                {ENTITY_ICONS[type] || "📄"} {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isKeeperLevel && (
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua User</SelectItem>
              {userEmails.map(email => (
                <SelectItem key={email} value={email}>{email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-1.5">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-36" title="Dari tanggal" />
          <span className="text-muted-foreground text-xs">–</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-36" title="Sampai tanggal" />
        </div>

        {(search || actionFilter !== "semua" || entityFilter !== "semua" || userFilter !== "semua" || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => {
            setSearch(""); setActionFilter("semua"); setEntityFilter("semua");
            setUserFilter("semua"); setDateFrom(""); setDateTo("");
          }}>
            Reset
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Belum ada aktivitas ditemukan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Waktu</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Aksi</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Tipe Data</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Nama</th>
                {!isKeeperLevel && <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">User</th>}
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">Ringkasan Perubahan</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr
                  key={log.id || i}
                  className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${ACTION_COLORS[log.action] || "bg-gray-100"}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {ENTITY_ICONS[log.entity_type] || "📄"} {log.entity_type}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {log.entity_name || <span className="text-muted-foreground italic">—</span>}
                  </td>
                  {!isKeeperLevel && (
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.user_name || log.user_email}
                    </td>
                  )}
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-xs">
                    {log.changes_summary ? (
                      <span className="line-clamp-2">{log.changes_summary}</span>
                    ) : log.action === "update" ? (
                      <span className="italic opacity-50">Tidak ada detail</span>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ActivityDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}