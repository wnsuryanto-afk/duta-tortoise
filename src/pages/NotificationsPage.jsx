import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle2, Filter, Send, Users } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import SendNotifDialog from "@/components/notifications/SendNotifDialog";

const typeConfig = {
  info: { color: "bg-blue-50 border-blue-200 text-blue-800", dot: "bg-blue-500", icon: Info, iconColor: "text-blue-500" },
  warning: { color: "bg-yellow-50 border-yellow-200 text-yellow-800", dot: "bg-yellow-500", icon: AlertTriangle, iconColor: "text-yellow-500" },
  alert: { color: "bg-red-50 border-red-200 text-red-800", dot: "bg-red-500", icon: AlertCircle, iconColor: "text-red-500" },
  success: { color: "bg-green-50 border-green-200 text-green-800", dot: "bg-green-500", icon: CheckCircle2, iconColor: "text-green-500" },
};

const categoryLabel = {
  stok: "Stok", kesehatan: "Kesehatan", breeding: "Breeding",
  keuangan: "Keuangan", absensi: "Absensi", sistem: "Sistem", lainnya: "Lainnya"
};

export default function NotificationsPage() {
  const { user, role } = useCurrentUser();
  const queryClient = useQueryClient();
  const [filterRead, setFilterRead] = useState("semua");
  const [filterCategory, setFilterCategory] = useState("semua");
  const [showSend, setShowSend] = useState(false);

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email }),
    enabled: !!user?.email,
  });

  const filtered = useMemo(() => {
    return notifs
      .filter(n => filterRead === "semua" ? true : filterRead === "belum" ? !n.is_read : n.is_read)
      .filter(n => filterCategory === "semua" ? true : n.category === filterCategory)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [notifs, filterRead, filterCategory]);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    const unread = notifs.filter(n => !n.is_read);
    await Promise.all(unread.map(n =>
      base44.entities.Notification.update(n.id, { is_read: true, read_at: new Date().toISOString().split("T")[0] })
    ));
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markRead = async (notif) => {
    if (notif.is_read) return;
    await base44.entities.Notification.update(notif.id, { is_read: true, read_at: new Date().toISOString().split("T")[0] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    if (notif.action_url) window.location.href = notif.action_url;
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Notifikasi</h1>
            <p className="text-sm text-muted-foreground">{unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua sudah dibaca"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4 mr-1" /> Tandai Semua Dibaca
            </Button>
          )}
          {["owner", "admin"].includes(role) && (
            <Button size="sm" onClick={() => setShowSend(true)}>
              <Send className="w-4 h-4 mr-1" /> Kirim Notifikasi
            </Button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterRead} onValueChange={setFilterRead}>
          <SelectTrigger className="w-40">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua</SelectItem>
            <SelectItem value="belum">Belum Dibaca</SelectItem>
            <SelectItem value="sudah">Sudah Dibaca</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kategori</SelectItem>
            {Object.entries(categoryLabel).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Tidak ada notifikasi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(notif => {
            const cfg = typeConfig[notif.type] || typeConfig.info;
            const Icon = cfg.icon;
            return (
              <div
                key={notif.id}
                onClick={() => markRead(notif)}
                className={`flex gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${notif.is_read ? "bg-card border-border opacity-70" : cfg.color}`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <Icon className={`w-5 h-5 ${notif.is_read ? "text-muted-foreground" : cfg.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-tight">{notif.title}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!notif.is_read && <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {notif.created_date ? format(new Date(notif.created_date), "d MMM", { locale: id }) : ""}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm mt-1 leading-relaxed">{notif.message}</p>
                  {notif.category && (
                    <Badge variant="secondary" className="mt-2 text-xs">{categoryLabel[notif.category] || notif.category}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showSend && <SendNotifDialog open={showSend} onClose={() => setShowSend(false)} />}
    </div>
  );
}