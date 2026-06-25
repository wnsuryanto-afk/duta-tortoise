import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Activity, Search, Eye } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";

const ACTION_META = {
  create:   { label: "BUAT",      color: "bg-green-100 text-green-700 border-green-300",   icon: "➕" },
  update:   { label: "UBAH",      color: "bg-blue-100 text-blue-700 border-blue-300",       icon: "✏️" },
  delete:   { label: "HAPUS",     color: "bg-red-100 text-red-700 border-red-300",          icon: "🗑️" },
  approve:  { label: "SETUJUI",   color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: "✅" },
  reject:   { label: "TOLAK",     color: "bg-rose-100 text-rose-700 border-rose-300",       icon: "❌" },
  transfer: { label: "TRANSFER",  color: "bg-purple-100 text-purple-700 border-purple-300", icon: "🔄" },
  checkin:  { label: "CHECK IN",  color: "bg-teal-100 text-teal-700 border-teal-300",       icon: "🕐" },
  checkout: { label: "CHECK OUT", color: "bg-cyan-100 text-cyan-700 border-cyan-300",       icon: "🕔" },
  login:    { label: "MASUK",     color: "bg-gray-100 text-gray-700 border-gray-300",       icon: "🔑" },
};

const ENTITY_ICONS = {
  Tortoise: "🐢", Breeding: "🥚", Sale: "💰", Enclosure: "🏠",
  HealthRecord: "🏥", UserProfile: "👤", FinanceTransaction: "💵",
  Kasbon: "📝", Attendance: "✅", SalarySlip: "💼", FeedStock: "🥬",
  WarehouseItem: "📦", DailyChecklist: "📋", MaintenanceLog: "🔧",
  PettyCashLedger: "🪙",
};

// Modul filter groups
const MODULE_GROUPS = {
  kura:       { label: "🐢 Kura", types: ["Tortoise", "HealthRecord", "Breeding"] },
  checklist:  { label: "📋 Checklist", types: ["DailyChecklist"] },
  breeding:   { label: "🥚 Breeding", types: ["Breeding"] },
  stok:       { label: "📦 Stok", types: ["FeedStock", "WarehouseItem"] },
  absensi:    { label: "✅ Absensi", types: ["Attendance"] },
  kasbon:     { label: "📝 Kasbon", types: ["Kasbon"] },
  keuangan:   { label: "💵 Keuangan", types: ["FinanceTransaction", "PettyCashLedger"] },
};

// Aksi filter groups
const ACTION_GROUPS = {
  update:    ["update"],
  create:    ["create"],
  delete:    ["delete"],
  approve:   ["approve", "reject"],
  transfer:  ["transfer"],
  checkinout: ["checkin", "checkout"],
};

function formatTimestamp(ts) {
  if (!ts) return "-";
  try { return format(new Date(ts), "dd MMM yyyy, HH:mm", { locale: idLocale }); }
  catch { return ts; }
}

// ── Detail Modal ─────────────────────────────────────────────────────────────
function ActivityDetailModal({ log, onClose }) {
  if (!log) return null;
  const meta = ACTION_META[log.action] || { label: log.action, color: "bg-gray-100", icon: "📄" };
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
            <Badge variant="outline" className={meta.color}>
              {meta.icon} {meta.label}
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

        {/* Tabel perubahan — tampil untuk SEMUA aksi yang punya changes_detail */}
        {hasChangesDetail ? (
          <div>
            <p className="text-sm font-semibold mb-2">Detail Perubahan</p>
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
                      <td className="px-3 py-2"><span className="text-red-600 line-through">{ch.old_value}</span></td>
                      <td className="px-3 py-2"><span className="text-green-700 font-semibold">{ch.new_value}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : log.action === "create" ? (
          <div>
            <p className="text-sm font-semibold mb-2">Data Dibuat</p>
            <div className="rounded-xl border bg-green-50 p-3">
              <p className="text-sm text-green-800">
                {log.changes_summary || `Record baru berhasil dibuat: `}<strong>{log.entity_name}</strong>
              </p>
            </div>
          </div>
        ) : log.action === "delete" ? (
          <div>
            <p className="text-sm font-semibold mb-2">Data Dihapus</p>
            <div className="rounded-xl border bg-red-50 p-3">
              <p className="text-sm text-red-800">Record <strong>{log.entity_name}</strong> (ID: <span className="font-mono text-xs">{log.entity_id}</span>) telah dihapus.</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Tidak ada detail perubahan tercatat</p>
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
  const [actionGroupFilter, setActionGroupFilter] = useState("semua");
  const [moduleFilter, setModuleFilter] = useState("semua");
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

    // Filter aksi group
    const actionActions = ACTION_GROUPS[actionGroupFilter];
    const matchAction = actionGroupFilter === "semua" || (actionActions && actionActions.includes(log.action));

    // Filter modul
    const modTypes = MODULE_GROUPS[moduleFilter]?.types;
    const matchModule = moduleFilter === "semua" || (modTypes && modTypes.includes(log.entity_type));

    const matchEntity = entityFilter === "semua" || log.entity_type === entityFilter;
    const matchUser = userFilter === "semua" || log.user_email === userFilter;

    let matchDate = true;
    if (dateFrom && log.timestamp) matchDate = log.timestamp >= dateFrom;
    if (dateTo && log.timestamp && matchDate) matchDate = log.timestamp.startsWith(dateTo) || log.timestamp <= dateTo + "T23:59:59";

    return matchSearch && matchAction && matchModule && matchEntity && matchUser && matchDate;
  });

  const stats = {
    total: filtered.length,
    create: filtered.filter(l => l.action === "create").length,
    update: filtered.filter(l => l.action === "update").length,
    other: filtered.filter(l => !["create", "update"].includes(l.action)).length,
  };

  const hasAnyFilter = search || actionGroupFilter !== "semua" || moduleFilter !== "semua" || entityFilter !== "semua" || userFilter !== "semua" || dateFrom || dateTo;

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
          { label: "Lainnya", val: stats.other, color: "text-purple-600" },
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
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, user, perubahan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filter Tipe Aksi */}
        <Select value={actionGroupFilter} onValueChange={setActionGroupFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Tipe Aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Aksi</SelectItem>
            <SelectItem value="update">✏️ Ubah</SelectItem>
            <SelectItem value="create">➕ Tambah</SelectItem>
            <SelectItem value="delete">🗑️ Hapus</SelectItem>
            <SelectItem value="approve">✅ Approve</SelectItem>
            <SelectItem value="transfer">🔄 Transfer</SelectItem>
            <SelectItem value="checkinout">🕐 Check In/Out</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter Modul */}
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Modul" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Modul</SelectItem>
            {Object.entries(MODULE_GROUPS).map(([key, g]) => (
              <SelectItem key={key} value={key}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter Tipe Data spesifik */}
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Tipe Data" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Tipe</SelectItem>
            {entityTypes.map(type => (
              <SelectItem key={type} value={type}>{ENTITY_ICONS[type] || "📄"} {type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter User */}
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

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-36" title="Dari tanggal" />
          <span className="text-muted-foreground text-xs">–</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-36" title="Sampai tanggal" />
        </div>

        {hasAnyFilter && (
          <Button variant="ghost" size="sm" onClick={() => {
            setSearch(""); setActionGroupFilter("semua"); setModuleFilter("semua");
            setEntityFilter("semua"); setUserFilter("semua"); setDateFrom(""); setDateTo("");
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
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">Ringkasan</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => {
                const meta = ACTION_META[log.action] || { label: log.action, color: "bg-gray-100 text-gray-700 border-gray-300", icon: "📄" };
                return (
                  <tr
                    key={log.id || i}
                    className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${meta.color}`}>
                        {meta.icon} {meta.label}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ActivityDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}