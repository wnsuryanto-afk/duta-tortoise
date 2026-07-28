import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { normalizePhone, normalizePhoneInput } from "@/lib/normalizePhone";
import { safeFormatDate } from "@/lib/safeDate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import AccessDenied from "@/components/common/AccessDenied";
import {
  ShieldCheck, Eye, EyeOff, Send, Save, Loader2, CheckCircle2,
  AlertCircle, MessageCircle, Phone, Users, RefreshCw, Copy,
} from "lucide-react";

const NOTIF_CONFIG = [
  { key: "notif_daily_approval", label: "⏰ Pengingat Harian (17:30)", desc: "Jumlah checklist menunggu approval → Owner" },
  { key: "notif_sick_report", label: "🤒 Laporan Kura Sakit", desc: "Laporan sakit baru → Owner + Manajer" },
  { key: "notif_low_stock", label: "💊 Stok Obat Menipis", desc: "Stok menyentuh minimum → Owner + Manajer + Admin" },
  { key: "notif_salary_paid", label: "💸 Gaji Dibayar", desc: "Slip ditandai dibayar → Karyawan ybs" },
  { key: "notif_incidental_task", label: "📌 Tugas Insidentil Baru", desc: "Tugas baru → Karyawan yang ditugaskan" },
  { key: "notif_tool_request", label: "🔴 Alat Rusak / Pengajuan", desc: "Pengajuan barang baru → Owner + Manajer" },
];

export default function PengaturanWhatsAppPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [tokenDirty, setTokenDirty] = useState(false);
  const [phones, setPhones] = useState({ owner: "", manajer: "", admin: "" });
  const [empPhones, setEmpPhones] = useState({});
  const [toggles, setToggles] = useState({});
  const [testing, setTesting] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [summaryTime, setSummaryTime] = useState("17:00");
  const [summaryEnabled, setSummaryEnabled] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [groupList, setGroupList] = useState([]);
  const [groupError, setGroupError] = useState("");
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [copiedId, setCopiedId] = useState("");

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["wa-settings"],
    queryFn: async () => {
      const list = await base44.entities.WhatsAppSettings.filter({ setting_key: "main" });
      return list[0] || null;
    },
    enabled: !!user && user.role === "owner",
    staleTime: 30000,
  });

  const { data: users } = useQuery({
    queryKey: ["all-users-wa"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user && user.role === "owner",
    staleTime: 60000,
  });

  // Sync settings → local state when loaded
  const syncFromSettings = () => {
    if (!settings) return;
    setToken(settings.fonnte_token || "");
    setTokenDirty(false);
    setPhones({
      owner: settings.phone_owner || "",
      manajer: settings.phone_manajer || "",
      admin: settings.phone_admin || "",
    });
    const epMap = {};
    if (Array.isArray(settings.employee_phones)) {
      settings.employee_phones.forEach((e) => {
        if (e.email) epMap[e.email] = e.phone || "";
      });
    }
    setEmpPhones(epMap);
    const tg = {};
    NOTIF_CONFIG.forEach((c) => {
      tg[c.key] = settings[c.key] !== false;
    });
    setToggles(tg);
    setGroupId(settings.group_id || "");
    setSummaryTime(settings.daily_summary_time || "17:00");
    setSummaryEnabled(settings.daily_summary_enabled === true);
    setShowPoints(settings.daily_summary_show_points === true);
    setWeeklyEnabled(settings.weekly_summary_enabled === true);
  };

  // Initialize when settings first load
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (settings && !initialized) {
      syncFromSettings();
      setInitialized(true);
    }
  }, [settings, initialized]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const empArray = (users || [])
        .filter((u) => !["owner", "investor"].includes(u.role))
        .map((u) => ({
          email: u.email,
          name: u.full_name || u.email,
          phone: normalizePhone(empPhones[u.email] || ""),
        }))
        .filter((e) => e.phone.trim());

      const payload = {
        setting_key: "main",
        phone_owner: normalizePhone(phones.owner),
        phone_manajer: normalizePhone(phones.manajer),
        phone_admin: normalizePhone(phones.admin),
        employee_phones: empArray,
        notif_daily_approval: toggles.notif_daily_approval ?? true,
        notif_sick_report: toggles.notif_sick_report ?? true,
        notif_low_stock: toggles.notif_low_stock ?? true,
        notif_salary_paid: toggles.notif_salary_paid ?? false,
        notif_incidental_task: toggles.notif_incidental_task ?? false,
        notif_tool_request: toggles.notif_tool_request ?? false,
        group_id: groupId,
        daily_summary_time: summaryTime || "17:00",
        daily_summary_enabled: summaryEnabled,
        daily_summary_show_points: showPoints,
        weekly_summary_enabled: weeklyEnabled,
        updated_at: new Date().toISOString(),
        updated_by: user?.email || "",
      };
      if (tokenDirty && token) {
        payload.fonnte_token = token;
      }

      if (settings?.id) {
        return base44.entities.WhatsAppSettings.update(settings.id, payload);
      }
      payload.fonnte_token = token || payload.fonnte_token || "";
      return base44.entities.WhatsAppSettings.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-settings"] });
      setTokenDirty(false);
      setInitialized(false);
      toast({
        title: "✅ Pengaturan tersimpan",
        description: "Token & nomor WhatsApp berhasil disimpan ke server.",
        className: "bg-green-50 border-green-200",
      });
    },
    onError: (err) => {
      toast({
        title: "❌ Gagal menyimpan",
        description: err.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const checkTokenSaved = () => {
    if (tokenDirty || !savedToken) {
      toast({
        title: "⚠️ Token belum disimpan",
        description: "Tekan 💾 Simpan Pengaturan dulu sebelum menggunakan fitur ini.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleFetchGroups = async () => {
    if (!checkTokenSaved()) return;
    // Anti-spam: jeda minimal 1 menit antar panggilan
    if (lastFetchTime) {
      const elapsed = Date.now() - lastFetchTime;
      if (elapsed < 60000) {
        const waitSec = Math.ceil((60000 - elapsed) / 1000);
        toast({
          title: "⏳ Tunggu sebentar",
          description: `Tunggu ${waitSec} detik sebelum mengambil daftar grup lagi (mencegah pemblokiran nomor).`,
          variant: "destructive",
        });
        return;
      }
    }

    setFetchingGroups(true);
    setGroupError("");
    setGroupList([]);
    setLastFetchTime(Date.now());

    try {
      const res = await base44.functions.invoke("sendWhatsApp", { action: "fetch_groups" });
      const data = res.data || res;
      if (data.success && Array.isArray(data.groups)) {
        setGroupList(data.groups);
        if (data.groups.length === 0) {
          setGroupError("Belum ada grup terdeteksi. Pastikan nomor pengirim sudah menjadi anggota grup, lalu tekan Ambil Daftar Grup lagi.");
        }
      } else {
        setGroupError(data.error || "Gagal mengambil daftar grup.");
      }
    } catch (err) {
      setGroupError(err.message || "Gagal memanggil fungsi.");
    } finally {
      setFetchingGroups(false);
    }
  };

  const handleSelectGroup = (g) => {
    setGroupId(g.id);
    toast({
      title: "✅ Grup dipilih",
      description: `${g.name} — ID terisi otomatis.`,
      className: "bg-green-50 border-green-200",
    });
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2000);
    });
  };

  const handleSendSummaryNow = async () => {
    if (!checkTokenSaved()) return;
    setSendingSummary(true);
    try {
      const res = await base44.functions.invoke("sendDailySummary", { force: true });
      const data = res.data || res;
      if (data.success) {
        toast({
          title: "✅ Ringkasan terkirim",
          description: data.message || "Ringkasan harian telah dikirim ke grup WhatsApp.",
          className: "bg-green-50 border-green-200",
        });
      } else {
        toast({
          title: "❌ Gagal mengirim",
          description: data.error || data.reason || "Gagal mengirim ringkasan.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err.message || "Gagal memanggil fungsi",
        variant: "destructive",
      });
    } finally {
      setSendingSummary(false);
    }
  };

  const handleTestSend = async () => {
    if (!checkTokenSaved()) return;
    setTesting(true);
    try {
      const res = await base44.functions.invoke("sendWhatsApp", { action: "test_send" });
      const data = res.data || res;
      if (data.success) {
        toast({
          title: "✅ Tes berhasil",
          description: data.message || "Pesan uji terkirim ke nomor owner.",
          className: "bg-green-50 border-green-200",
        });
      } else {
        toast({
          title: "❌ Tes gagal",
          description: data.error || data.reason || "Gagal mengirim pesan uji.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "❌ Error",
        description: err.message || "Gagal memanggil fungsi",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (userLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || user.role !== "owner") {
    return <AccessDenied message="Halaman ini hanya dapat diakses oleh Owner." />;
  }

  const savedToken = !!(settings?.fonnte_token);
  const tokenUnsaved = tokenDirty && !!token.trim();

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Pengaturan WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Integrasi notifikasi otomatis via Fonnte
          </p>
        </div>
      </div>

      {/* Token Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            Token Fonnte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="token">Token API Fonnte</Label>
            <div className="relative mt-1">
              <Input
                id="token"
                type={showToken ? "text" : "password"}
                placeholder="Masukkan token Fonnte Anda..."
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setTokenDirty(true);
                }}
                className="pr-10 font-mono text-sm"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dapatkan token di{" "}
              <a
                href="https://fonnte.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 underline"
              >
                fonnte.com
              </a>
              . Token disimpan aman dan hanya dipanggil server-side.
            </p>
          </div>
          {savedToken ? (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Token aktif (tersimpan)
            </Badge>
          ) : tokenUnsaved ? (
            <Badge className="bg-amber-100 text-amber-700 border-amber-300">
              <AlertCircle className="w-3 h-3 mr-1" /> ⚠️ Belum disimpan
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <AlertCircle className="w-3 h-3 mr-1" /> Token belum diisi
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Role Phone Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="w-4 h-4 text-green-600" />
            Nomor WhatsApp per Role
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "owner", label: "Owner" },
            { key: "manajer", label: "Manajer" },
            { key: "admin", label: "Admin" },
          ].map((r) => (
            <div key={r.key}>
              <Label>{r.label}</Label>
              <Input
                className="mt-1"
                placeholder="08xxx atau 62xxx"
                value={phones[r.key] || ""}
                onChange={(e) =>
                  setPhones((p) => ({ ...p, [r.key]: e.target.value }))
                }
                onBlur={(e) =>
                  setPhones((p) => ({
                    ...p,
                    [r.key]: normalizePhoneInput(e.target.value),
                  }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Employee Phones */}
      {users && users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-green-600" />
              Nomor WhatsApp Karyawan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {users
              .filter((u) => !["owner", "investor"].includes(u.role))
              .map((u) => (
                <div key={u.id} className="flex items-center gap-2">
                  <div className="w-40 flex-shrink-0">
                    <p className="text-sm font-medium truncate">
                      {u.full_name || u.email}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{u.role}</p>
                  </div>
                  <Input
                    className="flex-1"
                    placeholder="08xxx"
                    value={empPhones[u.email] || ""}
                    onChange={(e) =>
                      setEmpPhones((p) => ({ ...p, [u.email]: e.target.value }))
                    }
                    onBlur={(e) =>
                      setEmpPhones((p) => ({
                        ...p,
                        [u.email]: normalizePhoneInput(e.target.value),
                      }))
                    }
                  />
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Notification Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="w-4 h-4 text-green-600" />
            Jenis Notifikasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {NOTIF_CONFIG.map((cfg) => (
            <div
              key={cfg.key}
              className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cfg.label}</p>
                <p className="text-xs text-muted-foreground">{cfg.desc}</p>
              </div>
              <Switch
                checked={toggles[cfg.key] ?? false}
                onCheckedChange={(v) =>
                  setToggles((t) => ({ ...t, [cfg.key]: v }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ringkasan Harian ke Grup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-green-600" />
            Ringkasan Harian ke Grup WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>ID Grup WhatsApp</Label>
            <Input
              className="mt-1"
              placeholder="Contoh: 120363xxx@g.us"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Klik "Ambil Daftar Grup" di bawah untuk memilih otomatis, atau isi manual.
            </p>
          </div>

          {/* Tombol Ambil Daftar Grup */}
          <div>
            <Button
              onClick={handleFetchGroups}
              disabled={fetchingGroups || (!savedToken && !token.trim())}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              {fetchingGroups ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengambil daftar grup...</>
              ) : (
                <><RefreshCw className="w-3.5 h-3.5" /> 🔄 Ambil Daftar Grup</>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1">
              Memanggil API Fonnte untuk mengambil daftar grup. Beri jeda 1 menit antar panggilan.
            </p>
          </div>

          {/* Daftar Grup */}
          {groupError && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{groupError}</span>
            </div>
          )}

          {groupList.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Pilih Grup Tujuan:</p>
              {groupList.map((g, i) => (
                <div
                  key={g.id || i}
                  className={`flex items-center justify-between gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    groupId === g.id
                      ? "bg-green-50 border-green-400"
                      : "bg-background border-border hover:bg-muted/50"
                  }`}
                  onClick={() => handleSelectGroup(g)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.name || "(tanpa nama)"}</p>
                    <p className="text-[10px] text-muted-foreground truncate font-mono">{g.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyId(g.id);
                    }}
                    className="flex-shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                    title="Salin ID"
                  >
                    {copiedId === g.id ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div>
            <Label>Jam Kirim Ringkasan Harian</Label>
            <Input
              type="time"
              className="mt-1 w-32"
              value={summaryTime}
              onChange={(e) => setSummaryTime(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 py-2 border-b">
            <div className="flex-1">
              <p className="text-sm font-medium">Aktifkan Ringkasan Harian</p>
              <p className="text-xs text-muted-foreground">Kirim otomatis ke grup setiap hari pada jam di atas</p>
            </div>
            <Switch checked={summaryEnabled} onCheckedChange={setSummaryEnabled} />
          </div>
          <div className="flex items-center justify-between gap-3 py-2 border-b">
            <div className="flex-1">
              <p className="text-sm font-medium">Tampilkan Poin di Ringkasan</p>
              <p className="text-xs text-muted-foreground">Nonaktif default — hindari perbandingan poin antar karyawan di grup</p>
            </div>
            <Switch checked={showPoints} onCheckedChange={setShowPoints} />
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex-1">
              <p className="text-sm font-medium">Ringkasan Mingguan (Sabtu)</p>
              <p className="text-xs text-muted-foreground">Kirim rekap mingguan setiap Sabtu pada jam yang sama</p>
            </div>
            <Switch checked={weeklyEnabled} onCheckedChange={setWeeklyEnabled} />
          </div>
          <Button
            onClick={handleSendSummaryNow}
            disabled={sendingSummary || (!savedToken && !token.trim()) || !groupId.trim()}
            variant="outline"
            className="w-full gap-1.5"
          >
            {sendingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            🧪 Kirim Ringkasan Sekarang
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-background/80 backdrop-blur-sm p-3 rounded-xl border">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          size="lg"
          className="flex-1"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Simpan Pengaturan
        </Button>
        <Button
          onClick={handleTestSend}
          disabled={testing || (!savedToken && !token.trim())}
          variant="outline"
          className="flex-1"
        >
          {testing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          🧪 Tes Kirim
        </Button>
      </div>

      {settings?.updated_at && (
        <p className="text-xs text-muted-foreground text-center">
          Terakhir diperbarui: {safeFormatDate(settings.updated_at, "d MMM yyyy, HH:mm")}
          {settings.updated_by ? ` oleh ${settings.updated_by}` : ""}
        </p>
      )}
    </div>
  );
}