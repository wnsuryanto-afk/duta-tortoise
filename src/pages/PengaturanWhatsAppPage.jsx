import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { normalizePhoneInput } from "@/lib/normalizePhone";
import { safeFormatDate } from "@/lib/safeDate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import AccessDenied from "@/components/common/AccessDenied";
import {
  ShieldCheck, Eye, EyeOff, Send, Save, Loader2, CheckCircle2,
  AlertCircle, MessageCircle, Phone, Users, RefreshCw, Copy, Sunrise,
} from "lucide-react";

const NOTIF_CONFIG = [
  { key: "notif_daily_approval", label: "⏰ Pengingat Harian (17:30)", desc: "Jumlah checklist menunggu approval → Owner" },
  { key: "notif_sick_report", label: "🤒 Laporan Kura Sakit", desc: "Laporan sakit baru → Owner + Manajer", destKey: "notif_sick_report_destination", groupLabel: "Grup PAGI (berisi keeper)" },
  { key: "notif_low_stock", label: "💊 Stok Obat Menipis", desc: "Stok menyentuh minimum → Owner + Manajer + Admin", destKey: "notif_low_stock_destination", groupLabel: "Grup SORE (manajemen)" },
  { key: "notif_salary_paid", label: "💸 Gaji Dibayar", desc: "Slip ditandai dibayar → Karyawan ybs" },
  { key: "notif_incidental_task", label: "📌 Tugas Insidentil Baru", desc: "Tugas baru → Karyawan yang ditugaskan" },
  { key: "notif_tool_request", label: "🔴 Alat Rusak / Pengajuan", desc: "Pengajuan barang baru → Owner + Manajer", destKey: "notif_tool_request_destination", groupLabel: "Grup PAGI (berisi keeper)" },
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
  const [summaryTime, setSummaryTime] = useState("16:30");
  const [summaryEnabled, setSummaryEnabled] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [aiSorotan, setAiSorotan] = useState(true);
  const [aiWeekly, setAiWeekly] = useState(true);
  const [aiSmartAlerts, setAiSmartAlerts] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [groupList, setGroupList] = useState([]);
  const [groupError, setGroupError] = useState("");
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [copiedId, setCopiedId] = useState("");
  const [summaryDestination, setSummaryDestination] = useState("individuals");
  const [recipients, setRecipients] = useState({});
  const [summaryResults, setSummaryResults] = useState(null);
  // Morning summary
  const [morningEnabled, setMorningEnabled] = useState(false);
  const [morningTime, setMorningTime] = useState("07:00");
  const [morningGroupId, setMorningGroupId] = useState("");
  const [morningDestination, setMorningDestination] = useState("group");
  const [morningShowPoints, setMorningShowPoints] = useState(false);
  const [sendingMorning, setSendingMorning] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["wa-settings"],
    queryFn: async () => {
      const list = await base44.entities.WhatsAppSettings.filter({ setting_key: "main" });
      return list[0] || null;
    },
    enabled: !!user && user.role === "owner",
    staleTime: 30000,
  });

  const { data: users } = useActiveUsers({ enabled: !!user && user.role === "owner" });

  // Sync from a data object (not closure) — avoids stale-data race condition
  const syncFromData = (data) => {
    if (!data) return;
    setToken(data.fonnte_token || "");
    setTokenDirty(false);
    setPhones({
      owner: data.phone_owner || "",
      manajer: data.phone_manajer || "",
      admin: data.phone_admin || "",
    });
    const epMap = {};
    if (Array.isArray(data.employee_phones)) {
      data.employee_phones.forEach((e) => {
        if (e.email) epMap[e.email] = e.phone || "";
      });
    }
    setEmpPhones(epMap);
    const tg = {};
    NOTIF_CONFIG.forEach((c) => {
      tg[c.key] = data[c.key] !== false;
      // Muat juga tujuan pengiriman untuk notifikasi yang mendukung grup
      if (c.destKey) tg[c.destKey] = data[c.destKey] || "individuals";
    });
    setToggles(tg);
    setGroupId(data.group_id || "");
    setSummaryTime(data.daily_summary_time || "16:30");
    setSummaryEnabled(data.daily_summary_enabled === true);
    setShowPoints(data.daily_summary_show_points === true);
    setWeeklyEnabled(data.weekly_summary_enabled === true);
    setAiSorotan(data.ai_sorotan_enabled !== false);
    setAiWeekly(data.ai_weekly_enabled !== false);
    setAiSmartAlerts(data.ai_smart_alerts_enabled === true);
    setSummaryDestination(data.summary_destination || "individuals");
    setMorningEnabled(data.morning_summary_enabled === true);
    setMorningTime(data.morning_summary_time || "07:00");
    setMorningGroupId(data.morning_group_id || "");
    setMorningDestination(data.morning_summary_destination || "group");
    setMorningShowPoints(data.morning_summary_show_points === true);
    setSummaryResults(null);
    const rcMap = {};
    if (Array.isArray(data.summary_recipients) && data.summary_recipients.length > 0) {
      data.summary_recipients.forEach((r) => {
        if (r.email) rcMap[r.email] = true;
      });
    } else {
      rcMap["role:owner"] = true;
    }
    setRecipients(rcMap);
  };

  // Initialize when settings first load
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (settings && !initialized) {
      syncFromData(settings);
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
          phone: normalizePhoneInput(empPhones[u.email] || ""),
        }))
        .filter((e) => e.phone);

      const availRecips = [];
      if (phones.owner) availRecips.push({ key: "role:owner", name: "Owner", phone: phones.owner });
      if (phones.manajer) availRecips.push({ key: "role:manajer", name: "Manajer", phone: phones.manajer });
      if (phones.admin) availRecips.push({ key: "role:admin", name: "Admin", phone: phones.admin });
      (users || []).filter((u) => !["owner", "investor"].includes(u.role)).forEach((u) => {
        const ph = empPhones[u.email];
        if (ph) availRecips.push({ key: u.email, name: u.full_name || u.email, phone: ph });
      });
      const summaryRecipients = availRecips
        .filter((r) => recipients[r.key])
        .map((r) => ({
          name: r.name,
          phone: normalizePhoneInput(r.phone),
          email: r.key,
        }));

      const payload = {
        setting_key: "main",
        phone_owner: normalizePhoneInput(phones.owner),
        phone_manajer: normalizePhoneInput(phones.manajer),
        phone_admin: normalizePhoneInput(phones.admin),
        employee_phones: empArray,
        notif_daily_approval: toggles.notif_daily_approval ?? true,
        notif_sick_report: toggles.notif_sick_report ?? true,
        notif_low_stock: toggles.notif_low_stock ?? true,
        notif_salary_paid: toggles.notif_salary_paid ?? false,
        notif_incidental_task: toggles.notif_incidental_task ?? false,
        notif_tool_request: toggles.notif_tool_request ?? false,
        notif_sick_report_destination: toggles.notif_sick_report_destination || "individuals",
        notif_low_stock_destination: toggles.notif_low_stock_destination || "individuals",
        notif_tool_request_destination: toggles.notif_tool_request_destination || "individuals",
        group_id: groupId,
        summary_destination: summaryDestination,
        summary_recipients: summaryRecipients,
        daily_summary_time: summaryTime || "16:30",
        daily_summary_enabled: summaryEnabled,
        daily_summary_show_points: showPoints,
        weekly_summary_enabled: weeklyEnabled,
        morning_summary_enabled: morningEnabled,
        morning_summary_time: morningTime || "07:00",
        morning_group_id: morningGroupId,
        morning_summary_destination: morningDestination,
        morning_summary_show_points: morningShowPoints,
        ai_sorotan_enabled: aiSorotan,
        ai_weekly_enabled: aiWeekly,
        ai_smart_alerts_enabled: aiSmartAlerts,
        updated_at: new Date().toISOString(),
        updated_by: user?.email || "",
      };
      if (tokenDirty && token) {
        payload.fonnte_token = token;
      }

      // Robust upsert: always look up by fixed key (don't rely on possibly-stale closure)
      const existing = await base44.entities.WhatsAppSettings.filter({ setting_key: "main" });
      const existingRecord = existing[0];

      if (existingRecord?.id) {
        // Dedup: if multiple records exist, keep the newest and delete the rest
        if (existing.length > 1) {
          const sorted = [...existing].sort(
            (a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date)
          );
          const newest = sorted[0];
          payload.fonnte_token = payload.fonnte_token || newest.fonnte_token || "";
          for (const dup of sorted.slice(1)) {
            try { await base44.entities.WhatsAppSettings.delete(dup.id); } catch {}
          }
          return base44.entities.WhatsAppSettings.update(newest.id, payload);
        }
        return base44.entities.WhatsAppSettings.update(existingRecord.id, payload);
      }
      payload.fonnte_token = token || payload.fonnte_token || "";
      return base44.entities.WhatsAppSettings.create(payload);
    },
    onSuccess: async () => {
      // Fetch fresh data from server and sync — NOT from stale cache
      try {
        const freshList = await base44.entities.WhatsAppSettings.filter({ setting_key: "main" });
        if (freshList[0]) {
          syncFromData(freshList[0]);
        }
      } catch {}
      queryClient.invalidateQueries({ queryKey: ["wa-settings"] });
      setTokenDirty(false);
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
    // Anti-spam: jeda minimal 30 menit antar panggilan
    const COOLDOWN_MS = 30 * 60 * 1000;
    if (lastFetchTime) {
      const elapsed = Date.now() - lastFetchTime;
      if (elapsed < COOLDOWN_MS) {
        const waitMin = Math.ceil((COOLDOWN_MS - elapsed) / 60000);
        toast({
          title: "⏳ Tunggu sebentar",
          description: `Tunggu ${waitMin} menit lagi sebelum mengambil daftar grup. Pemanggilan berlebihan bisa memicu pemblokiran nomor oleh Meta.`,
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
      } else {
        let errMsg = data.error || "Gagal mengambil daftar grup.";
        if (data.rawResponse) {
          errMsg += `\n\nFonnte menjawab: ${data.rawResponse}`;
        }
        setGroupError(errMsg);
      }
    } catch (err) {
      setGroupError(err.message || "Gagal memanggil fungsi.");
    } finally {
      setFetchingGroups(false);
    }
  };

  const handleSelectGroup = (g) => {
    setGroupId(String(g.id || ""));
    toast({
      title: "✅ Grup dipilih",
      description: `${g.name} — ID terisi otomatis.`,
      className: "bg-green-50 border-green-200",
    });
  };

  const handleCopyId = (id) => {
    const idStr = String(id || "");
    if (!idStr) return;
    navigator.clipboard.writeText(idStr).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2000);
    });
  };

  const handleSendSummaryNow = async () => {
    if (!checkTokenSaved()) return;
    setSendingSummary(true);
    setSummaryResults(null);
    try {
      const res = await base44.functions.invoke("sendDailySummary", { force: true });
      const data = res.data || res;
      if (data.results && Array.isArray(data.results)) {
        setSummaryResults(data.results);
        const okCount = data.results.filter((r) => r.success).length;
        const failCount = data.results.length - okCount;
        if (okCount > 0 && failCount === 0) {
          toast({
            title: "✅ Ringkasan terkirim",
            description: `Berhasil ke ${okCount} tujuan.`,
            className: "bg-green-50 border-green-200",
          });
        } else if (okCount > 0) {
          toast({
            title: "⚠️ Sebagian terkirim",
            description: `${okCount} berhasil, ${failCount} gagal. Lihat detail di bawah.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "❌ Gagal mengirim",
            description: "Semua pengiriman gagal. Lihat detail di bawah.",
            variant: "destructive",
          });
        }
      } else if (data.success) {
        toast({
          title: "✅ Ringkasan terkirim",
          description: data.message || "Ringkasan harian telah dikirim.",
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

  const handleSendMorningNow = async () => {
    if (!checkTokenSaved()) return;
    setSendingMorning(true);
    try {
      const res = await base44.functions.invoke("sendDailySummary", { force: true, type: "morning" });
      const data = res.data || res;
      if (data.success) {
        toast({ title: "✅ Ringkasan pagi terkirim", description: data.message || "Ringkasan pagi telah dikirim.", className: "bg-green-50 border-green-200" });
      } else {
        toast({ title: "❌ Gagal", description: data.error || data.reason || "Gagal mengirim.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingMorning(false);
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

  const availableRecipients = [];
  if (phones.owner) availableRecipients.push({ key: "role:owner", name: "Owner", phone: phones.owner });
  if (phones.manajer) availableRecipients.push({ key: "role:manajer", name: "Manajer", phone: phones.manajer });
  if (phones.admin) availableRecipients.push({ key: "role:admin", name: "Admin", phone: phones.admin });
  (users || []).filter((u) => !["owner", "investor"].includes(u.role)).forEach((u) => {
    const ph = empPhones[u.email];
    if (ph) availableRecipients.push({ key: u.email, name: u.full_name || u.email, phone: ph });
  });

  const needsGroup = summaryDestination === "group" || summaryDestination === "both";
  const needsIndividuals = summaryDestination === "individuals" || summaryDestination === "both";
  const canSendSummary = savedToken &&
    (!needsIndividuals || availableRecipients.some((r) => recipients[r.key])) &&
    (!needsGroup || !!groupId.trim());

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
          {NOTIF_CONFIG.map((cfg) => {
            const aktif = toggles[cfg.key] ?? false;
            const dest = toggles[cfg.destKey] || "individuals";
            return (
              <div key={cfg.key} className="py-2 border-b last:border-0 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                  </div>
                  <Switch
                    checked={aktif}
                    onCheckedChange={(v) => setToggles((t) => ({ ...t, [cfg.key]: v }))}
                  />
                </div>

                {/* Pilihan tujuan hanya untuk notifikasi yang aman masuk grup.
                    Gaji & tugas insidentil sengaja tidak punya opsi ini. */}
                {cfg.destKey && aktif && (
                  <div className="ml-1 pl-3 border-l-2 border-muted flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground mr-1">Kirim ke:</span>
                    {[
                      { v: "individuals", t: "Perorangan" },
                      { v: "group", t: "Grup" },
                      { v: "both", t: "Keduanya" },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setToggles((t) => ({ ...t, [cfg.destKey]: opt.v }))}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                          dest === opt.v
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {opt.t}
                      </button>
                    ))}
                    {dest !== "individuals" && (
                      <span className="text-[11px] text-muted-foreground w-full mt-0.5">
                        → {cfg.groupLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <p className="text-[11px] text-muted-foreground pt-1 border-t">
            Gaji Dibayar dan Tugas Insidentil sengaja tidak punya pilihan grup — nominal gaji
            dan tugas perorangan tidak boleh terlihat seluruh anggota grup.
          </p>
        </CardContent>
      </Card>

      {/* Ringkasan Harian */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-green-600" />
            Ringkasan Harian
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Tujuan Pengiriman */}
          <div>
            <Label className="mb-2">Kirim ringkasan harian ke:</Label>
            <RadioGroup
              value={summaryDestination}
              onValueChange={setSummaryDestination}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="individuals" id="dest-individuals" />
                <Label htmlFor="dest-individuals" className="font-normal cursor-pointer">
                  Nomor perorangan (dicentang di bawah)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="group" id="dest-group" />
                <Label htmlFor="dest-group" className="font-normal cursor-pointer">
                  Grup WhatsApp (memakai ID grup)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="both" id="dest-both" />
                <Label htmlFor="dest-both" className="font-normal cursor-pointer">
                  Keduanya
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Checkbox Penerima (individu / both) */}
          {(summaryDestination === "individuals" || summaryDestination === "both") && (
            <div className="space-y-2">
              <Label>Pilih Penerima:</Label>
              {availableRecipients.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Isi nomor WhatsApp di bagian "Nomor WhatsApp per Role" / "Karyawan" di atas terlebih dahulu.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {availableRecipients.map((r) => (
                    <label
                      key={r.key}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={!!recipients[r.key]}
                        onCheckedChange={(v) =>
                          setRecipients((prev) => ({ ...prev, [r.key]: v }))
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">{r.phone}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Group ID + Ambil Daftar Grup (group / both) */}
          {needsGroup && (
            <div>
              <Label>ID Grup WhatsApp</Label>
              <Input
                className="mt-1"
                placeholder="Contoh: 120363xxx@g.us"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Isi manual, atau tekan "Ambil Daftar Grup" di bawah.
              </p>
            </div>
          )}

          {needsGroup && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>⚠️ <strong>Jangan tekan berulang kali.</strong> Pemanggilan berlebihan bisa memicu pemblokiran nomor WhatsApp oleh Meta.</span>
            </div>
          )}

          {needsGroup && (
            <div>
              <Button
                onClick={handleFetchGroups}
                disabled={fetchingGroups || (!savedToken && !token.trim())}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                {fetchingGroups ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengambil daftar grup (±8 detik)...</>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5" /> 🔄 Ambil Daftar Grup</>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-1">
                Hanya bisa ditekan 1 kali per 30 menit.
              </p>
            </div>
          )}

          {needsGroup && groupError && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div className="whitespace-pre-line">
                {groupError}
                <p className="mt-1 font-medium">💡 Saran: Coba lagi besok, isi ID grup manual, atau gunakan pilihan "Nomor perorangan".</p>
              </div>
            </div>
          )}

          {needsGroup && groupList.length > 0 && (
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
            <Label>Jam Kirim Ringkasan Harian (WIB)</Label>
            <Input
              type="time"
              className="mt-1 w-32"
              value={summaryTime}
              onChange={(e) => setSummaryTime(e.target.value)}
            />
          </div>
          {settings?.daily_summary_last_sent && (
            <p className="text-xs text-muted-foreground">
              📤 Pengiriman terakhir (sore): {settings.daily_summary_last_sent}
            </p>
          )}
          {settings?.weekly_summary_last_sent && settings.weekly_summary_enabled && (
            <p className="text-xs text-muted-foreground">
              📤 Pengiriman terakhir (mingguan): {settings.weekly_summary_last_sent}
            </p>
          )}
          <div className="flex items-center justify-between gap-3 py-2 border-b">
            <div className="flex-1">
              <p className="text-sm font-medium">Aktifkan Ringkasan Harian</p>
              <p className="text-xs text-muted-foreground">Kirim otomatis ke tujuan terpilih setiap hari pada jam di atas</p>
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

          {/* AI Features */}
          <div className="pt-2 border-t mt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">🤖 Fitur AI</p>
          </div>
          <div className="flex items-center justify-between gap-3 py-2 border-b">
            <div className="flex-1">
              <p className="text-sm font-medium">Sorotan AI di ringkasan</p>
              <p className="text-xs text-muted-foreground">3-4 kalimat AI di atas ringkasan harian. Bila gagal, ringkasan tetap terkirim tanpa sorotan.</p>
            </div>
            <Switch checked={aiSorotan} onCheckedChange={setAiSorotan} />
          </div>
          <div className="flex items-center justify-between gap-3 py-2 border-b">
            <div className="flex-1">
              <p className="text-sm font-medium">Laporan mingguan analitis (AI)</p>
              <p className="text-xs text-muted-foreground">Analisis tren + 3 saran AI di ringkasan Sabtu. Fallback ke template biasa bila gagal.</p>
            </div>
            <Switch checked={aiWeekly} onCheckedChange={setAiWeekly} />
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex-1">
              <p className="text-sm font-medium">Peringatan cerdas (saring dengan AI)</p>
              <p className="text-xs text-muted-foreground">AI menilai urgensi notifikasi seketika. Rendah/biasa ditahan ke ringkasan berikutnya. Sakit berat SELALU dikirim.</p>
            </div>
            <Switch checked={aiSmartAlerts} onCheckedChange={setAiSmartAlerts} />
          </div>
          {summaryResults && summaryResults.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-semibold text-muted-foreground">Hasil Pengiriman:</p>
              {summaryResults.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  {r.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-medium">{r.target}</span>
                    {r.success ? (
                      <span className="text-green-600 ml-1">— terkirim</span>
                    ) : (
                      <span className="text-red-500 ml-1">— gagal: {r.reason}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button
            onClick={handleSendSummaryNow}
            disabled={sendingSummary || (!savedToken && !token.trim()) || !canSendSummary}
            variant="outline"
            className="w-full gap-1.5"
          >
            {sendingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            🧪 Kirim Ringkasan Sekarang
          </Button>
        </CardContent>
      </Card>

      {/* Ringkasan Pagi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sunrise className="w-4 h-4 text-amber-600" />
            Ringkasan Pagi (Perintah Kerja)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3 py-2 border-b">
            <div className="flex-1">
              <p className="text-sm font-medium">Aktifkan Ringkasan Pagi</p>
              <p className="text-xs text-muted-foreground">Kirim perintah kerja harian ke grup pagi (keeper). Isi ID Grup Pagi di bawah lebih dulu.</p>
            </div>
            <Switch checked={morningEnabled} onCheckedChange={setMorningEnabled} />
          </div>
          <div>
            <Label>Jam Kirim Ringkasan Pagi (WIB)</Label>
            <Input type="time" className="mt-1 w-32" value={morningTime} onChange={(e) => setMorningTime(e.target.value)} />
          </div>
          {settings?.morning_summary_last_sent && (
            <p className="text-xs text-muted-foreground">
              📤 Pengiriman terakhir (pagi): {settings.morning_summary_last_sent}
            </p>
          )}
          <div>
            <Label>ID Grup WhatsApp Pagi (Keeper)</Label>
            <Input className="mt-1" placeholder="Contoh: 120363xxx@g.us" value={morningGroupId} onChange={(e) => setMorningGroupId(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Grup ini berisi keeper. Ringkasan pagi berisi perintah kerja, bukan daftar tugas lengkap atau poin.</p>
          </div>
          <div>
            <Label className="mb-2">Kirim ringkasan pagi ke:</Label>
            <RadioGroup value={morningDestination} onValueChange={setMorningDestination} className="space-y-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="group" id="morn-dest-group" />
                <Label htmlFor="morn-dest-group" className="font-normal cursor-pointer">Grup Pagi saja</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="individuals" id="morn-dest-indiv" />
                <Label htmlFor="morn-dest-indiv" className="font-normal cursor-pointer">Nomor perorangan saja</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="both" id="morn-dest-both" />
                <Label htmlFor="morn-dest-both" className="font-normal cursor-pointer">Keduanya</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex-1">
              <p className="text-sm font-medium">Tampilkan Poin (TIDAK disarankan)</p>
              <p className="text-xs text-muted-foreground">Grup pagi berisi keeper — menampilkan poin memicu perbandingan antar karyawan.</p>
            </div>
            <Switch checked={morningShowPoints} onCheckedChange={setMorningShowPoints} />
          </div>
          <Button onClick={handleSendMorningNow} disabled={sendingMorning || (!savedToken && !token.trim()) || !morningGroupId.trim()} variant="outline" className="w-full gap-1.5">
            {sendingMorning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            🧪 Kirim Ringkasan Pagi Sekarang
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