import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { safeFormatDate } from "@/lib/safeDate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AccessDenied from "@/components/common/AccessDenied";
import { Loader2, MessageCircle, RefreshCw, Inbox } from "lucide-react";

const TYPE_LABELS = {
  daily_approval: "⏰ Pengingat Harian",
  sick_report: "🤒 Laporan Sakit",
  low_stock: "💊 Stok Menipis",
  salary_paid: "💸 Gaji Dibayar",
  incidental_task: "📌 Tugas Insidentil",
  tool_request: "🔴 Pengajuan Alat",
  test_send: "🧪 Tes Kirim",
};

const STATUS_STYLES = {
  terkirim: "bg-green-100 text-green-700 border-green-200",
  gagal: "bg-red-100 text-red-700 border-red-200",
  skipped: "bg-slate-100 text-slate-600 border-slate-200",
  pending_ai: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function WhatsAppLogPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["wa-logs"],
    queryFn: () => base44.entities.WhatsAppLog.list("-sent_at", 100),
    enabled: !!user && user.role === "owner",
    staleTime: 30000,
  });

  const { data: waSettings } = useQuery({
    queryKey: ["wa-settings-log"],
    queryFn: async () => {
      const list = await base44.entities.WhatsAppSettings.filter({ setting_key: "main" });
      return list[0] || null;
    },
    enabled: !!user && user.role === "owner",
    staleTime: 30000,
  });

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || user.role !== "owner") {
    return <AccessDenied message="Halaman ini hanya dapat diakses oleh Owner." />;
  }

  const filtered = (logs || []).filter((log) => {
    if (typeFilter !== "all" && log.notification_type !== typeFilter) return false;
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4 p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Log WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Riwayat pesan notifikasi terkirim
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* AI Call Counter */}
      {waSettings && (
        <Card>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">🤖 Panggilan AI Hari Ini</p>
              <p className="text-xs text-muted-foreground">
                Pantau biaya — AI dipakai untuk sorotan, analisis mingguan, & saring peringatan
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {(() => {
                  const now = new Date();
                  const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
                  return waSettings.ai_calls_count_date === todayStr ? (waSettings.ai_calls_today || 0) : 0;
                })()}
              </p>
              <p className="text-[10px] text-muted-foreground">panggilan hari ini</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua jenis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua jenis</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="terkirim">✅ Terkirim</SelectItem>
            <SelectItem value="gagal">❌ Gagal</SelectItem>
            <SelectItem value="skipped">⏭️ Dilewati</SelectItem>
            <SelectItem value="pending_ai">⏳ Tertunda (AI)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Log List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center">
            <Inbox className="w-10 h-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {logs?.length === 0
                ? "Belum ada pesan WhatsApp terkirim."
                : "Tidak ada log yang cocok dengan filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <Card key={log.id} className="overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[11px]">
                        {TYPE_LABELS[log.notification_type] || log.notification_type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[11px] ${STATUS_STYLES[log.status] || ""}`}
                      >
                        {log.status === "terkirim" ? "✅" : log.status === "gagal" ? "❌" : log.status === "pending_ai" ? "⏳" : "⏭️"}
                        {" "}{log.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {safeFormatDate(log.sent_at, "d MMM yyyy, HH:mm:ss")}
                    </p>
                    {log.targets && log.targets.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Tujuan: {log.targets.join(", ")}
                      </p>
                    )}
                    {log.message_preview && (
                      <p className="text-xs text-foreground/80 line-clamp-2 mt-1">
                        {log.message_preview}
                      </p>
                    )}
                    {log.error_reason && log.status !== "terkirim" && (
                      <p className="text-xs text-red-500 mt-1">
                        Alasan: {log.error_reason}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Menampilkan {filtered.length} dari {logs?.length || 0} log
        </p>
      )}
    </div>
  );
}