import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Bell, Info, AlertTriangle, AlertCircle, CheckCircle2, CheckCheck, X, ExternalLink, Loader2, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { jalankanMassal, ringkasHasil } from "@/lib/tugasMassal";
import { cn } from "@/lib/utils";

/**
 * NotificationBell — lonceng notifikasi.
 *
 * Sebelumnya lencananya menetap di puluhan dan tidak pernah kembali ke nol.
 * Penyebabnya bukan tampilan: "Tandai Semua" menembakkan seluruh pembaruan
 * lewat Promise.all sekaligus, kena batas laju server, lalu gagal tanpa suara
 * karena tidak ada penanganan error sama sekali. Tombol ditekan, tidak terjadi
 * apa-apa, angkanya tetap.
 *
 * Tiga hal yang membuat notifikasi bisa habis di sini:
 *
 *   1. Penulisan massal dibatasi jumlah serentaknya, diulang saat kena batas
 *      laju, dan hasilnya dilaporkan — termasuk kalau sebagian gagal.
 *   2. Ada "Bersihkan" yang menyingkirkan yang sudah dibaca. Menandai terbaca
 *      saja tidak pernah memendekkan daftarnya.
 *   3. Kategori bisa disaring, jadi 40 notifikasi stok bisa dibereskan
 *      sekaligus tanpa harus menyentuh 40 baris satu per satu.
 */

const typeConfig = {
  info:    { icon: Info,          iconColor: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950/30" },
  warning: { icon: AlertTriangle, iconColor: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  alert:   { icon: AlertCircle,   iconColor: "text-red-500",    bg: "bg-red-50 dark:bg-red-950/30" },
  success: { icon: CheckCircle2,  iconColor: "text-green-500",  bg: "bg-green-50 dark:bg-green-950/30" },
};

const priorityBorder = {
  tinggi: "border-l-red-500",
  sedang: "border-l-yellow-400",
  rendah: "border-l-gray-300 dark:border-l-gray-600",
};

const LABEL_KATEGORI = {
  stok: "Stok", kesehatan: "Kesehatan", breeding: "Breeding", keuangan: "Keuangan",
  absensi: "Absensi", sistem: "Sistem", penjualan: "Penjualan", lainnya: "Lainnya",
};

const BATAS_TAMPIL = 30;

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
  const [filter, setFilter] = useState("semua");      // semua | belum | kritis
  const [kategori, setKategori] = useState("semua");
  const [sibuk, setSibuk] = useState(null);            // { label, sudah, total }
  const panelRef = useRef(null);

  const { data: notifs = [], refetch: refetchNotifs } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (open && user?.email) refetchNotifs();
  }, [open]);

  const aktif = useMemo(() => notifs.filter((n) => !n.is_dismissed), [notifs]);
  const unread = useMemo(() => aktif.filter((n) => !n.is_read), [aktif]);
  const sudahDibaca = useMemo(() => aktif.filter((n) => n.is_read), [aktif]);

  // Jumlah per kategori — inilah yang mengubah "71 notifikasi" jadi
  // "40 stok, 17 sistem, 12 kesehatan", tiga hal yang bisa dibereskan terpisah.
  const perKategori = useMemo(() => {
    const hitung = {};
    aktif.forEach((n) => {
      const k = LABEL_KATEGORI[n.category] ? n.category : "lainnya";
      hitung[k] = (hitung[k] || 0) + 1;
    });
    return Object.entries(hitung).sort((a, b) => b[1] - a[1]);
  }, [aktif]);

  const filtered = useMemo(() => {
    let list = aktif;
    if (filter === "belum") list = list.filter((n) => !n.is_read);
    if (filter === "kritis") list = list.filter((n) => n.priority === "tinggi");
    if (kategori !== "semua") {
      list = list.filter((n) => (LABEL_KATEGORI[n.category] ? n.category : "lainnya") === kategori);
    }
    return [...list].sort((a, b) => {
      const pa = a.priority === "tinggi" ? 0 : a.priority === "sedang" ? 1 : 2;
      const pb = b.priority === "tinggi" ? 0 : b.priority === "sedang" ? 1 : 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at || b.created_date || 0) - new Date(a.created_at || a.created_date || 0);
    });
  }, [aktif, filter, kategori]);

  const ditampilkan = filtered.slice(0, BATAS_TAMPIL);
  const sisa = filtered.length - ditampilkan.length;

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const segarkan = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markRead = async (notif) => {
    if (!notif.is_read) {
      try {
        await base44.entities.Notification.update(notif.id, {
          is_read: true,
          read_at: new Date().toISOString(),
        });
        segarkan();
      } catch (e) {
        toast.error("Gagal menandai terbaca: " + (e?.message || "coba lagi"));
        return;
      }
    }
    if (notif.action_url) {
      setOpen(false);
      navigate(notif.action_url);
    }
  };

  const dismiss = async (e, notif) => {
    e.stopPropagation();
    try {
      await base44.entities.Notification.update(notif.id, {
        is_dismissed: true,
        is_read: true,
        read_at: new Date().toISOString(),
      });
      segarkan();
    } catch (err) {
      toast.error("Gagal menyingkirkan: " + (err?.message || "coba lagi"));
    }
  };

  /** Penulisan massal dengan kemajuan yang terlihat dan hasil yang dilaporkan. */
  const kerjakanMassal = async (daftar, label, perubahan, satuan) => {
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

  const tandaiSemuaTerbaca = () => {
    const target = kategori === "semua" ? unread : unread.filter((n) => (LABEL_KATEGORI[n.category] ? n.category : "lainnya") === kategori);
    kerjakanMassal(target, "Menandai terbaca", () => ({ is_read: true, read_at: new Date().toISOString() }), "notifikasi");
  };

  const bersihkanTerbaca = () => {
    const target = kategori === "semua" ? sudahDibaca : sudahDibaca.filter((n) => (LABEL_KATEGORI[n.category] ? n.category : "lainnya") === kategori);
    kerjakanMassal(target, "Membersihkan", () => ({ is_dismissed: true }), "notifikasi");
  };

  const targetBersih = kategori === "semua"
    ? sudahDibaca.length
    : sudahDibaca.filter((n) => (LABEL_KATEGORI[n.category] ? n.category : "lainnya") === kategori).length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors text-foreground/70"
        aria-label={unread.length > 0 ? `Notifikasi, ${unread.length} belum dibaca` : "Notifikasi"}
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 tabular">
            {unread.length > 99 ? "99+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(26rem,calc(100vw-1.5rem))] bg-card border border-border rounded-xl shadow-modal z-50 overflow-hidden animate-fade-in">
          {/* Kepala */}
          <div className="px-4 py-3 border-b bg-muted/30 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-sm">
                Notifikasi
                {unread.length > 0 && <span className="text-red-500 tabular"> ({unread.length})</span>}
              </span>
              {kategori !== "semua" && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  aksi hanya untuk {LABEL_KATEGORI[kategori]}
                </span>
              )}
            </div>
            {(unread.length > 0 || targetBersih > 0) && (
              <div className="flex items-center gap-1.5">
                {unread.length > 0 && (
                  <button
                    onClick={tandaiSemuaTerbaca}
                    disabled={!!sibuk}
                    className="flex-1 text-[11px] font-semibold text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-1 disabled:opacity-50 px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <CheckCheck className="w-3.5 h-3.5 flex-shrink-0" /> Tandai terbaca
                  </button>
                )}
                {targetBersih > 0 && (
                  <button
                    onClick={bersihkanTerbaca}
                    disabled={!!sibuk}
                    title="Singkirkan notifikasi yang sudah dibaca dari daftar"
                    className="flex-1 text-[11px] font-semibold text-muted-foreground border border-border hover:bg-muted flex items-center justify-center gap-1 disabled:opacity-50 px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Archive className="w-3.5 h-3.5 flex-shrink-0" /> Bersihkan {targetBersih}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Kemajuan operasi massal — 71 pembaruan butuh waktu, dan tanpa
              penanda ini pengguna mengira tombolnya tidak berfungsi. */}
          {sibuk && (
            <div className="px-4 py-2 border-b bg-primary/5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">
                {sibuk.label}… <span className="tabular">{sibuk.sudah}/{sibuk.total}</span>
              </span>
              <div className="w-16 bar-track h-1.5">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${sibuk.total ? (sibuk.sudah / sibuk.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Saringan status */}
          <div className="flex border-b">
            {[
              { id: "semua", label: "Semua" },
              { id: "belum", label: `Belum dibaca${unread.length ? ` (${unread.length})` : ""}` },
              { id: "kritis", label: "Kritis" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex-1 text-xs py-2 font-medium transition-colors",
                  filter === f.id
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Saringan kategori — muncul hanya bila memang ada beberapa jenis,
              karena di bawah itu ia cuma menambah barang tanpa menolong. */}
          {perKategori.length > 1 && (
            <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto scrollbar-thin [mask-image:linear-gradient(to_right,#000_92%,transparent)]">
              <button
                onClick={() => setKategori("semua")}
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors",
                  kategori === "semua"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                Semua {aktif.length}
              </button>
              {perKategori.map(([k, n]) => (
                <button
                  key={k}
                  onClick={() => setKategori(k)}
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors tabular",
                    kategori === k
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {LABEL_KATEGORI[k]} {n}
                </button>
              ))}
            </div>
          )}

          {/* Daftar */}
          <div className="max-h-[400px] overflow-y-auto">
            {ditampilkan.length === 0 ? (
              <div className="py-10 text-center px-4">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-accent/40" />
                <p className="text-sm font-medium text-foreground">
                  {aktif.length === 0 ? "Kotak notifikasi kosong" : "Tidak ada yang cocok dengan saringan"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {aktif.length === 0
                    ? "Semuanya sudah dibaca dan dibersihkan."
                    : "Ubah saringan di atas untuk melihat yang lain."}
                </p>
              </div>
            ) : (
              ditampilkan.map((notif) => {
                const cfg = typeConfig[notif.type] || typeConfig.info;
                const Icon = cfg.icon;
                const borderColor = priorityBorder[notif.priority] || priorityBorder.rendah;
                return (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif)}
                    className={cn(
                      "flex gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors border-l-4",
                      borderColor,
                      !notif.is_read && cfg.bg
                    )}
                  >
                    <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", notif.is_read ? "text-muted-foreground" : cfg.iconColor)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={cn("text-xs leading-tight", !notif.is_read ? "font-semibold" : "font-medium text-muted-foreground")}>
                          {notif.title}
                        </p>
                        <button
                          onClick={(e) => dismiss(e, notif)}
                          aria-label="Singkirkan notifikasi ini"
                          className="p-0.5 hover:bg-muted rounded flex-shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
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

          {/* Kaki */}
          <div className="px-4 py-2.5 border-t bg-muted/20">
            <button
              onClick={() => { setOpen(false); navigate("/notifications"); }}
              className="w-full text-xs text-primary hover:underline text-center font-medium"
            >
              {sisa > 0 ? `Lihat ${sisa} notifikasi lainnya →` : "Buka halaman notifikasi →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
