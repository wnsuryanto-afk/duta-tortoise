import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle2, Filter, Send, X, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import SendNotifDialog from "@/components/notifications/SendNotifDialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Archive } from "lucide-react";
import { jalankanMassal, ringkasHasil } from "@/lib/tugasMassal";

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

const priorityConfig = {
  tinggi: { label: "Kritis", className: "border-l-red-500" },
  sedang: { label: "Sedang", className: "border-l-yellow-400" },
  rendah: { label: "Rendah", className: "border-l-gray-300" },
};

export default function NotificationsPage() {
  const { user, role } = useCurrentUser();
  const queryClient = useQueryClient();
  const [filterRead, setFilterRead] = useState("semua");
  const [filterCategory, setFilterCategory] = useState("semua");
  const [showSend, setShowSend] = useState(false);
  const [sibuk, setSibuk] = useState(null);
  const navigate = useNavigate();

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email }),
    enabled: !!user?.email,
  });

  // Pembersihan notifikasi lebih dari 30 hari — dijalankan TERPISAH dari
  // pengambilan data. Sebelumnya penghapusan ini berada di dalam queryFn,
  // sehingga satu delete yang gagal membuat seluruh query gagal dan halaman
  // ini tampil kosong seolah tidak ada notifikasi sama sekali.
  const sudahBersih = useRef(false);
  useEffect(() => {
    if (sudahBersih.current || notifs.length === 0) return;
    sudahBersih.current = true;

    const batas = new Date();
    batas.setDate(batas.getDate() - 30);
    const kedaluwarsa = notifs.filter((n) => {
      const ts = n.created_at || n.created_date;
      return ts && new Date(ts) < batas;
    });
    if (kedaluwarsa.length === 0) return;

    jalankanMassal(kedaluwarsa, (n) => base44.entities.Notification.delete(n.id), { serentak: 3 })
      .then((hasil) => {
        if (hasil.berhasil > 0) queryClient.invalidateQueries({ queryKey: ["notifications"] });
      });
  }, [notifs, queryClient]);

  const filtered = useMemo(() => {
    return notifs
      .filter(n => !n.is_dismissed)
      .filter(n => filterRead === "semua" ? true : filterRead === "belum" ? !n.is_read : n.is_read)
      .filter(n => filterCategory === "semua" ? true : filterCategory === "kritis_only" ? n.priority === "tinggi" : n.category === filterCategory)
      .sort((a, b) => {
        const pa = a.priority === "tinggi" ? 0 : a.priority === "sedang" ? 1 : 2;
        const pb = b.priority === "tinggi" ? 0 : b.priority === "sedang" ? 1 : 2;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at || b.created_date || 0) - new Date(a.created_at || a.created_date || 0);
      });
  }, [notifs, filterRead, filterCategory]);

  const terlihat = filtered;
  const aktif = useMemo(() => notifs.filter(n => !n.is_dismissed), [notifs]);
  const unreadCount = aktif.filter(n => !n.is_read).length;
  const belumTerlihat = terlihat.filter(n => !n.is_read).length;
  const terbacaTerlihat = terlihat.filter(n => n.is_read).length;
  const disaring = filterRead !== "semua" || filterCategory !== "semua";

  const segarkan = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  /**
   * Penulisan massal dengan batas serentak, pengulangan saat kena batas laju,
   * dan hasil yang dilaporkan. Promise.all atas puluhan pembaruan sekaligus —
   * pola lama di sini — gagal diam-diam dan membuat angkanya tidak pernah turun.
   */
  const kerjakanMassal = async (daftar, label, perubahan, satuan = "notifikasi") => {
    if (daftar.length === 0 || sibuk) return;
    setSibuk({ label, sudah: 0, total: daftar.length });

    const hasil = await jalankanMassal(
      daftar,
      (n) => base44.entities.Notification.update(n.id, perubahan()),
      { serentak: 4, onKemajuan: (sudah, total) => setSibuk({ label, sudah, total }) }
    );

    setSibuk(null);
    segarkan();

    const { nada, teks } = ringkasHasil(hasil, satuan);
    if (nada === "berhasil") toast.success(teks);
    else if (nada === "gagal") toast.error(teks);
    else toast.warning(teks);
  };

  const markAllRead = () =>
    kerjakanMassal(
      terlihat.filter((n) => !n.is_read),
      "Menandai terbaca",
      () => ({ is_read: true, read_at: new Date().toISOString() })
    );

  // Menandai terbaca tidak pernah memendekkan daftar. Ini yang membuatnya habis.
  const bersihkanTerbaca = () =>
    kerjakanMassal(
      terlihat.filter((n) => n.is_read),
      "Membersihkan",
      () => ({ is_dismissed: true })
    );

  const markRead = async (notif) => {
    if (!notif.is_read) {
      try {
        await base44.entities.Notification.update(notif.id, { is_read: true, read_at: new Date().toISOString() });
        segarkan();
      } catch (e) {
        toast.error("Gagal menandai terbaca: " + (e?.message || "coba lagi"));
        return;
      }
    }
    if (notif.action_url) navigate(notif.action_url);
  };

  const dismiss = async (notifId) => {
    try {
      await base44.entities.Notification.update(notifId, { is_dismissed: true, is_read: true, read_at: new Date().toISOString() });
      segarkan();
    } catch (e) {
      toast.error("Gagal menyingkirkan: " + (e?.message || "coba lagi"));
    }
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
            <p className="text-sm text-muted-foreground">
              {aktif.length === 0
                ? "Kotak notifikasi kosong"
                : unreadCount > 0
                  ? `${unreadCount} belum dibaca dari ${aktif.length}`
                  : `Semua sudah dibaca — ${aktif.length} bisa dibersihkan`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {belumTerlihat > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={!!sibuk}>
              <CheckCheck className="w-4 h-4 mr-1" />
              Tandai {belumTerlihat} dibaca{disaring ? " (yang tampil)" : ""}
            </Button>
          )}
          {terbacaTerlihat > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={bersihkanTerbaca}
              disabled={!!sibuk}
              title="Singkirkan notifikasi yang sudah dibaca dari daftar"
            >
              <Archive className="w-4 h-4 mr-1" />
              Bersihkan {terbacaTerlihat}
            </Button>
          )}
          {["owner", "admin"].includes(role) && (
            <Button size="sm" onClick={() => setShowSend(true)}>
              <Send className="w-4 h-4 mr-1" /> Kirim Notifikasi
            </Button>
          )}
        </div>
      </div>

      {/* Kemajuan operasi massal — puluhan pembaruan butuh waktu, dan tanpa
          penanda ini tombolnya terasa tidak berfungsi. */}
      {sibuk && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-primary/25 bg-primary/5">
          <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">
            {sibuk.label}… <span className="tabular font-medium">{sibuk.sudah}/{sibuk.total}</span>
          </span>
          <div className="w-28 bar-track h-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${sibuk.total ? (sibuk.sudah / sibuk.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

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
        {/* Quick filter: Kritis */}
        <button
          onClick={() => setFilterCategory(filterCategory === "kritis_only" ? "semua" : "kritis_only")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            filterCategory === "kritis_only"
              ? "bg-red-100 text-red-700 border-red-300"
              : "bg-card text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          🔴 Kritis
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-accent/40" />
          <p className="font-medium text-foreground">
            {aktif.length === 0 ? "Kotak notifikasi kosong" : "Tidak ada yang cocok dengan saringan"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {aktif.length === 0
              ? "Semuanya sudah dibaca dan dibersihkan."
              : "Ubah saringan di atas untuk melihat notifikasi lain."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(notif => {
            const cfg = typeConfig[notif.type] || typeConfig.info;
            const pCfg = priorityConfig[notif.priority] || priorityConfig.sedang;
            const Icon = cfg.icon;
            return (
              <div
                key={notif.id}
                onClick={() => markRead(notif)}
                className={`flex gap-3 p-4 rounded-xl border-l-4 border border-border cursor-pointer transition-all hover:shadow-sm ${pCfg.className} ${notif.is_read ? "bg-card opacity-75" : cfg.color}`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <Icon className={`w-5 h-5 ${notif.is_read ? "text-muted-foreground" : cfg.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${!notif.is_read ? "font-bold" : "font-medium text-muted-foreground"}`}>{notif.title}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!notif.is_read && <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />}
                      <button
                        onClick={e => { e.stopPropagation(); dismiss(notif.id); }}
                        className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm mt-1 leading-relaxed text-muted-foreground">{notif.message}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {notif.category && (
                      <Badge variant="secondary" className="text-xs">{categoryLabel[notif.category] || notif.category}</Badge>
                    )}
                    {notif.priority === "tinggi" && (
                      <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Kritis</Badge>
                    )}
                    {notif.action_label && notif.action_url && (
                      <span className="text-xs text-primary font-semibold flex items-center gap-1 ml-auto">
                        {notif.action_label} <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground/60 ml-auto">
                      {(notif.created_at || notif.created_date)
                        ? formatDistanceToNow(new Date(notif.created_at || notif.created_date), { addSuffix: true, locale: id })
                        : ""}
                    </span>
                  </div>
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