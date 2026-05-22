import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Bell, Info, AlertTriangle, AlertCircle, CheckCircle2, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const typeConfig = {
  info: { dot: "bg-blue-500", icon: Info, iconColor: "text-blue-500", bg: "bg-blue-50" },
  warning: { dot: "bg-yellow-500", icon: AlertTriangle, iconColor: "text-yellow-500", bg: "bg-yellow-50" },
  alert: { dot: "bg-red-500", icon: AlertCircle, iconColor: "text-red-500", bg: "bg-red-50" },
  success: { dot: "bg-green-500", icon: CheckCircle2, iconColor: "text-green-500", bg: "bg-green-50" },
};

export default function NotificationBell() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email }),
    enabled: !!user?.email,
    refetchInterval: 60000, // refresh tiap 1 menit
  });

  const unread = notifs.filter(n => !n.is_read);
  const recent = [...notifs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (notif) => {
    if (!notif.is_read) {
      await base44.entities.Notification.update(notif.id, { is_read: true, read_at: new Date().toISOString().split("T")[0] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    setOpen(false);
    if (notif.action_url) navigate(notif.action_url);
  };

  const markAllRead = async () => {
    await Promise.all(unread.map(n =>
      base44.entities.Notification.update(n.id, { is_read: true, read_at: new Date().toISOString().split("T")[0] })
    ));
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unread.length > 99 ? "99+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Notifikasi</span>
            {unread.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Tandai Semua
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Tidak ada notifikasi</div>
            ) : (
              recent.map(notif => {
                const cfg = typeConfig[notif.type] || typeConfig.info;
                const Icon = cfg.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif)}
                    className={`flex gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/40 transition-colors ${!notif.is_read ? cfg.bg : ""}`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${notif.is_read ? "text-muted-foreground" : cfg.iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold truncate">{notif.title}</p>
                        {!notif.is_read && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {notif.created_date ? format(new Date(notif.created_date), "d MMM HH:mm", { locale: id }) : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="px-4 py-2.5 border-t">
            <button
              onClick={() => { setOpen(false); navigate("/notifications"); }}
              className="w-full text-xs text-primary hover:underline text-center font-medium"
            >
              Lihat semua notifikasi →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}