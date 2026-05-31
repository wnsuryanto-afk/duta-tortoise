import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Bell, Info, AlertTriangle, AlertCircle, CheckCircle2, CheckCheck, X, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

const typeConfig = {
  info:    { icon: Info,          iconColor: "text-blue-500",   bg: "bg-blue-50",   border: "border-l-blue-400" },
  warning: { icon: AlertTriangle, iconColor: "text-yellow-500", bg: "bg-yellow-50", border: "border-l-yellow-400" },
  alert:   { icon: AlertCircle,   iconColor: "text-red-500",    bg: "bg-red-50",    border: "border-l-red-500" },
  success: { icon: CheckCircle2,  iconColor: "text-green-500",  bg: "bg-green-50",  border: "border-l-green-400" },
};

const priorityBorder = {
  tinggi: "border-l-red-500",
  sedang: "border-l-yellow-400",
  rendah: "border-l-gray-300",
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: id });
  } catch {
    return "";
  }
}

export default function NotificationBell() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("semua"); // semua | belum | kritis
  const panelRef = useRef(null);

  const { data: notifs = [], refetch: refetchNotifs } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,    // cache 5 menit
    refetchInterval: false,       // matikan polling otomatis
    refetchOnWindowFocus: false,  // jangan refetch saat tab aktif kembali
  });

  // Refresh manual saat panel dibuka
  useEffect(() => {
    if (open && user?.email) refetchNotifs();
  }, [open]);

  const unread = notifs.filter(n => !n.is_read && !n.is_dismissed);

  const filtered = useMemo(() => {
    let list = notifs.filter(n => !n.is_dismissed);
    if (filter === "belum") list = list.filter(n => !n.is_read);
    if (filter === "kritis") list = list.filter(n => n.priority === "tinggi");
    // Sort: priority tinggi dulu, lalu terbaru
    return list.sort((a, b) => {
      const pa = a.priority === "tinggi" ? 0 : a.priority === "sedang" ? 1 : 2;
      const pb = b.priority === "tinggi" ? 0 : b.priority === "sedang" ? 1 : 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at || b.created_date || 0) - new Date(a.created_at || a.created_date || 0);
    }).slice(0, 15);
  }, [notifs, filter]);

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
      await base44.entities.Notification.update(notif.id, {
        is_read: true,
        read_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (notif.action_url) {
      setOpen(false);
      navigate(notif.action_url);
    }
  };

  const dismiss = async (e, notif) => {
    e.stopPropagation();
    await base44.entities.Notification.update(notif.id, {
      is_dismissed: true,
      is_read: true,
      read_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllRead = async () => {
    await Promise.all(unread.map(n =>
      base44.entities.Notification.update(n.id, { is_read: true, read_at: new Date().toISOString() })
    ));
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors text-foreground/70"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unread.length > 99 ? "99+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <span className="font-semibold text-sm">
              Notifikasi {unread.length > 0 && <span className="text-red-500">({unread.length})</span>}
            </span>
            {unread.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Tandai Semua
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex border-b">
            {[
              { id: "semua", label: "Semua" },
              { id: "belum", label: "Belum Dibaca" },
              { id: "kritis", label: "🔴 Kritis" },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-1 text-xs py-2 font-medium transition-colors ${
                  filter === f.id
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                Tidak ada notifikasi
              </div>
            ) : (
              filtered.map(notif => {
                const cfg = typeConfig[notif.type] || typeConfig.info;
                const Icon = cfg.icon;
                const borderColor = priorityBorder[notif.priority] || "border-l-gray-300";
                return (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif)}
                    className={`flex gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors border-l-4 ${borderColor} ${!notif.is_read ? cfg.bg : ""}`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${notif.is_read ? "text-muted-foreground" : cfg.iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-xs leading-tight ${!notif.is_read ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                          {notif.title}
                        </p>
                        <button
                          onClick={(e) => dismiss(e, notif)}
                          className="p-0.5 hover:bg-muted rounded flex-shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-muted-foreground/60">
                          {timeAgo(notif.created_at || notif.created_date)}
                        </p>
                        {notif.action_label && notif.action_url && (
                          <span className="text-[10px] text-primary font-semibold flex items-center gap-0.5">
                            {notif.action_label} <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t bg-muted/20">
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