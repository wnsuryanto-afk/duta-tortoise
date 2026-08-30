import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { ROLE_LABELS, ROLE_COLORS, isOwner } from "@/lib/permissions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import AccessDenied from "@/components/common/AccessDenied";
import {
  ArrowLeft, Phone, MessageCircle, Edit, Shield,
  UserX, ChevronDown, ChevronUp, Loader2, Crown,
  Calendar, Briefcase, CreditCard, TrendingUp, Activity,
  ClipboardCheck, Building, Star, Clock, Leaf, AlertCircle
} from "lucide-react";
import { format, differenceInMonths, differenceInYears, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { suratAktif, suratTertinggi, suratMasihBerlaku } from "@/lib/suratPeringatan";

// ── helpers ──────────────────────────────────────────────────────────
const ROLE_EMOJIS = { owner: "👑", manajer: "👔", admin: "🛡️", kepala_feeder: "🧑‍🌾", keeper: "🐢", investor: "👁️", viewer: "👁️", kicked: "🚫" };

function maskIdNumber(val) {
  if (!val || val.length < 6) return val || "—";
  return "XX-XXXX-XXXX-" + val.slice(-4);
}

function workDuration(joinDate) {
  if (!joinDate) return "—";
  const d = parseISO(joinDate);
  const years = differenceInYears(new Date(), d);
  const months = differenceInMonths(new Date(), d) % 12;
  if (years > 0) return `${years} tahun ${months} bulan`;
  return `${months} bulan`;
}

function fmt(n) { return `Rp ${Number(n || 0).toLocaleString("id-ID")}`; }

// ── Edit Profile Dialog (owner only) ─────────────────────────────────
function EditProfileDialog({ open, onClose, profile, targetUser, onSaved }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: targetUser?.full_name || "",
    // Nama field-nya `hp_whatsapp`. `phone` hanya ada di salinan skema lama
    // di src/entities/ yang tidak pernah dipakai Base44, jadi menulisnya
    // tidak menyimpan apa pun. Cadangan ke `phone` untuk baris lama.
    phone: profile?.hp_whatsapp || profile?.phone || "",
    address: profile?.address || "",
    emergency_contact: profile?.emergency_contact || "",
    bank_name: profile?.bank_name || "",
    bank_account_number: profile?.bank_account_number || "",
    bank_account_name: profile?.bank_account_name || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    if (targetUser?.id) await base44.entities.User.update(targetUser.id, { full_name: form.full_name });
    if (profile?.id) {
      await base44.entities.UserProfile.update(profile.id, {
        hp_whatsapp: form.phone, address: form.address,
        emergency_contact: form.emergency_contact,
        bank_name: form.bank_name,
        bank_account_number: form.bank_account_number,
        bank_account_name: form.bank_account_name,
      });
    }
    qc.invalidateQueries({ queryKey: ["users"] });
    qc.invalidateQueries({ queryKey: ["user-profiles"] });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading">Edit Profil</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label>Nama Lengkap</Label><Input value={form.full_name} onChange={e => set("full_name", e.target.value)} /></div>
          <div><Label>Nomor Telepon</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
          <div><Label>Alamat</Label><Input value={form.address} onChange={e => set("address", e.target.value)} /></div>
          <div><Label>Kontak Darurat</Label><Input value={form.emergency_contact} onChange={e => set("emergency_contact", e.target.value)} /></div>
          <div className="pt-1 pb-1 border-t"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Info Bank</p></div>
          <div><Label>Nama Bank</Label><Input value={form.bank_name} onChange={e => set("bank_name", e.target.value)} /></div>
          <div><Label>Nomor Rekening</Label><Input value={form.bank_account_number} onChange={e => set("bank_account_number", e.target.value)} /></div>
          <div><Label>Nama Pemilik</Label><Input value={form.bank_account_name} onChange={e => set("bank_account_name", e.target.value)} /></div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Change Role Dialog (owner only) ──────────────────────────────────
function ChangeRoleDialog({ open, onClose, targetUser, onSaved }) {
  const qc = useQueryClient();
  const [role, setRole] = useState(targetUser?.role || "keeper");
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    await base44.entities.User.update(targetUser.id, { role });
    qc.invalidateQueries({ queryKey: ["users"] });
    setSaving(false);
    onSaved();
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-heading">Ubah Role</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="keeper">🐢 Keeper</SelectItem>
              <SelectItem value="kepala_feeder">🧑‍🌾 Kepala Feeder</SelectItem>
              <SelectItem value="manajer">👔 Manajer</SelectItem>
              <SelectItem value="admin">🛡️ Admin</SelectItem>
              <SelectItem value="owner">👑 Owner</SelectItem>
              <SelectItem value="investor">👁️ Investor</SelectItem>
            </SelectContent>
          </Select>
          {role && (
            <p className="text-xs text-muted-foreground p-2 bg-muted rounded-lg">
              {{
                keeper: "Kelola kura-kura & kesehatan. Tidak bisa akses penjualan & keuangan.",
                kepala_feeder: "Semua akses Keeper + request kas kecil, stok pakan, formulasi pelet.",
                manajer: "Akses operasional & keuangan penuh. Tidak bisa kelola user.",
                admin: "Akses penuh seperti Manajer + approve kas kecil. Tidak bisa hapus permanen.",
                owner: "Akses penuh semua fitur & pengaturan sistem.",
                investor: "Read-only semua modul. Tidak bisa edit/hapus data apapun.",
              }[role] || ""}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Collapsible Section ───────────────────────────────────────────────
function Section({ title, icon: Icon, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-2 font-semibold">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <CardContent className="pt-0 pb-5 px-4">{children}</CardContent>}
    </Card>
  );
}

// ── Info Row ──────────────────────────────────────────────────────────
function InfoRow({ label, value, href, clickable }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">{value || "—"}</a>
      ) : (
        <p className="text-sm font-medium">{value || "—"}</p>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color = "text-primary", bg = "bg-primary/5" }) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      {Icon && <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />}
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`animate-pulse bg-muted rounded-lg ${className}`} />;
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function UserDetailPage({ userId, onBack }) {
  const { user: currentUser, role: myRole } = useCurrentUser();
  const qc = useQueryClient();

  const [showEdit, setShowEdit] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const canOwner = isOwner(myRole);
  const canView = ["owner", "admin", "manajer"].includes(myRole);

  // ── Queries — MUST be before any early return ──
  // Detail page: pakai User.list() langsung (termasuk kicked) supaya
  // owner bisa membuka riwayat absensi/gaji karyawan yang sudah dinonaktifkan.
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list("-created_date", 100) });
  const { data: profiles = [] } = useQuery({ queryKey: ["user-profiles"], queryFn: () => base44.entities.UserProfile.list() });
  const { data: salaryConfigs = [] } = useQuery({ queryKey: ["salary-configs"], queryFn: () => base44.entities.SalaryConfig.list() });

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const currentPeriod = format(new Date(), "yyyy-MM");

  const { data: attendances = [] } = useQuery({
    queryKey: ["att-user", userId],
    queryFn: () => base44.entities.Attendance.filter({ employee_id: userId }),
    enabled: !!userId && canView,
  });
  const { data: kasbons = [] } = useQuery({
    queryKey: ["kasbon-user", userId],
    queryFn: () => base44.entities.Kasbon.list("-request_date", 50),
    enabled: !!userId && canView,
  });
  const { data: overtimes = [] } = useQuery({
    queryKey: ["overtime-user", userId],
    queryFn: () => base44.entities.OvertimeLog.list("-date", 50),
    enabled: !!userId && canView,
  });
  const { data: vegetables = [] } = useQuery({
    queryKey: ["veg-user", userId],
    queryFn: () => base44.entities.VegetablePickup.list("-date", 50),
    enabled: !!userId && canView,
  });
  const { data: activityLogs = [] } = useQuery({
    queryKey: ["activity-user", userId],
    queryFn: () => base44.entities.ActivityLog.list("-timestamp", 20),
    enabled: !!userId && canView,
  });
  const { data: checklists = [] } = useQuery({
    queryKey: ["checklist-user", userId],
    queryFn: () => base44.entities.DailyChecklist.list("-date", 50),
    enabled: !!userId && canView,
  });
  const { data: bonusRewards = [] } = useQuery({
    queryKey: ["bonus-rewards"],
    queryFn: () => base44.entities.BonusReward.list("-period", 50),
    enabled: canView,
  });
  const { data: warningLetters = [] } = useQuery({
    queryKey: ["warning-letters-user", userId],
    queryFn: () => base44.entities.WarningLetter.list("-date", 20),
    enabled: !!userId && canView,
  });

  // Keeper: block (after all hooks)
  if (!canView) return <AccessDenied message="Halaman ini hanya untuk Owner, Manajer, dan Admin." />;

  // ── Derived data ──
  const targetUser = users.find(u => u.id === userId);
  const profile = profiles.find(p => p.user_id === userId);

  const userEmail = targetUser?.email || "";
  const userAttendances = attendances.filter(a => a.employee_email === userEmail || a.employee_id === userId);
  const userKasbons = kasbons.filter(k => k.employee_email === userEmail);
  const userOvertimes = overtimes.filter(o => o.employee_email === userEmail);
  const userVegetables = vegetables.filter(v => v.employee_email === userEmail);
  const userChecklists = checklists.filter(c => c.employee_email === userEmail);
  const userActivityLogs = activityLogs.filter(l => l.user_email === userEmail);

  const monthAtt = userAttendances.filter(a => a.date >= monthStart && a.date <= monthEnd);
  const hadirDays = monthAtt.filter(a => a.status === "hadir").length;

  const monthOT = userOvertimes.filter(o => o.date >= monthStart && o.date <= monthEnd);
  const totalOTHours = monthOT.reduce((s, o) => s + (o.hours || 0), 0);

  const monthVeg = userVegetables.filter(v => v.date >= monthStart && v.date <= monthEnd);
  const totalVegTrips = monthVeg.reduce((s, v) => s + (v.trips || 0), 0);

  const monthChecklists = userChecklists.filter(c => c.date?.startsWith(currentPeriod));
  const approvedChecklists = monthChecklists.filter(c => c.status === "approved");
  const completionRate = monthChecklists.length > 0 ? Math.round((approvedChecklists.length / monthChecklists.length) * 100) : 0;
  const totalKpiPoints = (bonusRewards.find(b => b.employee_email === userEmail && b.period === currentPeriod)?.total_points) || 0;
  const activeKasbon = userKasbons.find(k => k.status === "approved");

  const salaryConfig = salaryConfigs.find(c => c.role === targetUser?.role);
  const isKicked = targetUser?.role === "kicked";
  const isMe = targetUser?.id === currentUser?.id;

  // Warning Letters
  const noHp = profile?.hp_whatsapp || profile?.phone || "";

  const userWarningLetters = warningLetters.filter(l => l.employee_email === userEmail);
  const activeWarnings = suratAktif(userWarningLetters);
  const latestActiveSP = suratTertinggi(userWarningLetters);

  // Completeness check
  const checks = [
    { label: "Nama Lengkap", done: !!(targetUser?.full_name) },
    { label: "Nomor Telepon", done: !!(profile?.hp_whatsapp || profile?.phone) },
    { label: "Alamat", done: !!(profile?.address) },
    { label: "Kontak Darurat", done: !!(profile?.emergency_contact) },
    { label: "Nomor KTP", done: !!(profile?.id_number) },
    { label: "Nama Bank", done: !!(profile?.bank_name) },
    { label: "Nomor Rekening", done: !!(profile?.bank_account_number) },
    { label: "Foto Profil", done: !!(profile?.photo_url) },
  ];
  const completePct = Math.round((checks.filter(c => c.done).length / checks.length) * 100);

  const handleToggleActive = async () => {
    if (!canOwner || isMe || !targetUser) return;
    setDeactivating(true);
    if (isKicked) {
      await base44.entities.User.update(targetUser.id, { role: "keeper" });
    } else {
      await base44.entities.User.update(targetUser.id, { role: "kicked" });
    }
    qc.invalidateQueries({ queryKey: ["users"] });
    setDeactivating(false);
  };

  if (!targetUser) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <AlertCircle className="w-14 h-14 mb-4 opacity-25" />
        <p>User tidak ditemukan</p>
        <Button variant="outline" className="mt-4" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" />Kembali</Button>
      </div>
    );
  }

  const joinDate = profile?.join_date || targetUser?.created_date?.split("T")[0];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
      </Button>

      {/* ── HEADER CARD ── */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/80 to-primary/40" />
        <div className="px-5 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10">
            {/* Avatar */}
            <div className="flex items-end gap-4">
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt={targetUser.full_name} className="w-[90px] h-[90px] rounded-2xl border-4 border-background object-cover shadow-md" />
              ) : (
                <div className={`w-[90px] h-[90px] rounded-2xl border-4 border-background shadow-md flex items-center justify-center text-3xl font-bold
                  ${isKicked ? "bg-red-100 text-red-600" : targetUser.role === "owner" ? "bg-purple-100 text-purple-700" : "bg-primary/10 text-primary"}`}>
                  {isKicked ? <UserX className="w-9 h-9" /> : (targetUser.full_name || targetUser.email || "?")[0].toUpperCase()}
                </div>
              )}
              <div className="mb-1">
                <h2 className="text-xl font-heading font-bold leading-tight">{targetUser.full_name || "Tanpa Nama"}</h2>
                <p className="text-sm text-muted-foreground">{targetUser.email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${ROLE_COLORS[isKicked ? "kicked" : targetUser.role] || ROLE_COLORS.keeper}`}>
                    {ROLE_EMOJIS[isKicked ? "kicked" : targetUser.role]} {isKicked ? "Nonaktif" : (ROLE_LABELS[targetUser.role] || "Keeper")}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${isKicked ? "bg-muted text-muted-foreground border-border" : "bg-green-100 text-green-700 border-green-300"}`}>
                    {isKicked ? "⚫ Nonaktif" : "🟢 Aktif"}
                  </Badge>
                  {isMe && <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">Anda</Badge>}
                  {latestActiveSP && (
                    <Badge className={`text-xs border ${
                      latestActiveSP.level === "SP3" ? "bg-red-100 text-red-700 border-red-300" :
                      latestActiveSP.level === "SP2" ? "bg-orange-100 text-orange-700 border-orange-300" :
                      "bg-amber-100 text-amber-700 border-amber-300"
                    }`}>
                      ⚠️ {latestActiveSP.level} Aktif
                    </Badge>
                  )}
                </div>
                {joinDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Bergabung {format(parseISO(joinDate), "d MMMM yyyy", { locale: idLocale })}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {noHp && (
                <a href={`https://wa.me/${noHp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </Button>
                </a>
              )}
              {canOwner && !isMe && (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEdit(true)}>
                    <Edit className="w-4 h-4" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowRole(true)}>
                    <Shield className="w-4 h-4" /> Ubah Role
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`gap-1.5 ${isKicked ? "text-green-700 border-green-300 hover:bg-green-50" : "text-destructive border-destructive/40 hover:bg-red-50"}`}
                    onClick={handleToggleActive}
                    disabled={deactivating}
                  >
                    {deactivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                    {isKicked ? "Aktifkan" : "Nonaktifkan"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── SECTION 1: DATA PRIBADI ── */}
      <Section title="👤 Data Pribadi" icon={null} defaultOpen>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <InfoRow label="Nama Lengkap" value={targetUser.full_name} />
          <InfoRow label="Email" value={targetUser.email} />
          <InfoRow label="Nomor Telepon" value={noHp}
            href={noHp ? `tel:${noHp}` : undefined} />
          <InfoRow label="WhatsApp" value={noHp}
            href={noHp ? `https://wa.me/${noHp.replace(/\D/g, "")}` : undefined} />
          <InfoRow label="Nomor KTP" value={maskIdNumber(profile?.id_number)} />
          <InfoRow label="Kontak Darurat" value={profile?.emergency_contact} />
          <div className="col-span-2"><InfoRow label="Alamat" value={profile?.address} /></div>
        </div>
      </Section>

      {/* ── SECTION 2: INFO KEPEGAWAIAN ── */}
      <Section title="💼 Info Kepegawaian" icon={null} defaultOpen>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <InfoRow label="Role / Jabatan" value={ROLE_LABELS[targetUser.role] || targetUser.role} />
          <InfoRow label="Status" value={isKicked ? "Nonaktif" : "Aktif"} />
          <InfoRow label="Tanggal Bergabung" value={joinDate ? format(parseISO(joinDate), "d MMMM yyyy", { locale: idLocale }) : "—"} />
          <InfoRow label="Lama Kerja" value={joinDate ? workDuration(joinDate) : "—"} />
          {salaryConfig && (
            <>
              <InfoRow label="Gaji Pokok" value={fmt(salaryConfig.base_salary)} />
              <InfoRow label="Tarif Lembur" value={`${fmt(salaryConfig.overtime_rate_per_hour)}/jam`} />
              <InfoRow label="Tunjangan Sayur" value={`${fmt(salaryConfig.vegetable_rate_per_trip)}/trip`} />
            </>
          )}
        </div>
      </Section>

      {/* ── SECTION 3: INFO BANK ── */}
      {(profile?.bank_name || profile?.bank_account_number) && (
        <Section title="🏦 Info Bank" icon={null} defaultOpen={false}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <InfoRow label="Nama Bank" value={profile?.bank_name} />
            <InfoRow label="Nama Pemilik" value={profile?.bank_account_name} />
            <InfoRow label="Nomor Rekening" value={profile?.bank_account_number} />
          </div>
        </Section>
      )}

      {/* ── SECTION 4: STATISTIK ── */}
      <Section title="📊 Statistik Kinerja Bulan Ini" icon={null} defaultOpen>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <StatCard label="Hadir" value={`${hadirDays}h`} icon={ClipboardCheck} color="text-green-700" bg="bg-green-50" />
          <StatCard label="Lembur" value={`${totalOTHours}j`} icon={Clock} color="text-blue-700" bg="bg-blue-50" />
          <StatCard label="Trip Sayur" value={totalVegTrips} icon={Leaf} color="text-lime-700" bg="bg-lime-50" />
          <StatCard label="Task Done" value={`${completionRate}%`} icon={Star} color="text-amber-700" bg="bg-amber-50" />
          <StatCard label="KPI Poin" value={totalKpiPoints} icon={TrendingUp} color="text-purple-700" bg="bg-purple-50" />
          <StatCard label="Kasbon" value={activeKasbon ? fmt(activeKasbon.amount - (activeKasbon.total_paid || 0)) : "—"} icon={CreditCard} color="text-rose-700" bg="bg-rose-50" />
        </div>
      </Section>

      {/* ── SECTION 5: AKTIVITAS TERAKHIR ── */}
      <Section title="📅 Aktivitas Terakhir" icon={null} defaultOpen={false}>
        <Tabs defaultValue="absensi">
          <TabsList className="flex-wrap h-auto mb-4">
            <TabsTrigger value="absensi">Absensi</TabsTrigger>
            <TabsTrigger value="kasbon">Kasbon</TabsTrigger>
            <TabsTrigger value="lembur">Lembur</TabsTrigger>
            <TabsTrigger value="aktivitas">Log Sistem</TabsTrigger>
          </TabsList>

          <TabsContent value="absensi" className="space-y-2">
            {userAttendances.slice(0, 10).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Belum ada data absensi</p> :
              userAttendances.slice(0, 10).map(a => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 text-sm">
                  <div>
                    <p className="font-medium">{a.date ? format(parseISO(a.date), "d MMM yyyy", { locale: idLocale }) : "—"}</p>
                    <p className="text-xs text-muted-foreground">{a.check_in || "—"} → {a.check_out || "belum keluar"}</p>
                  </div>
                  <Badge variant="outline" className={`text-xs ${a.status === "hadir" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {a.status}
                  </Badge>
                </div>
              ))
            }
          </TabsContent>

          <TabsContent value="kasbon" className="space-y-2">
            {userKasbons.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat kasbon</p> :
              userKasbons.map(k => {
                const sisa = (k.amount || 0) - (k.total_paid || 0);
                const pct = k.amount ? Math.round(((k.total_paid || 0) / k.amount) * 100) : 0;
                return (
                  <div key={k.id} className="px-3 py-2.5 rounded-lg bg-muted/40 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold">{fmt(k.amount)}</span>
                      <Badge variant="outline" className={`text-xs ${k.status === "approved" ? "bg-green-100 text-green-700" : k.status === "lunas" ? "bg-muted text-muted-foreground" : k.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {k.status}
                      </Badge>
                    </div>
                    {k.status === "approved" && (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Terbayar: {fmt(k.total_paid)}</span><span>Sisa: {fmt(sisa)} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            }
          </TabsContent>

          <TabsContent value="lembur" className="space-y-2">
            {userOvertimes.slice(0, 10).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat lembur</p> :
              userOvertimes.slice(0, 10).map(o => (
                <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 text-sm">
                  <div>
                    <p className="font-medium">{o.date ? format(parseISO(o.date), "d MMM yyyy", { locale: idLocale }) : "—"}</p>
                    {o.notes && <p className="text-xs text-muted-foreground">{o.notes}</p>}
                  </div>
                  <span className="font-semibold text-blue-700">{o.hours} jam</span>
                </div>
              ))
            }
          </TabsContent>

          <TabsContent value="aktivitas" className="space-y-2">
            {userActivityLogs.slice(0, 10).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Belum ada log aktivitas</p> :
              userActivityLogs.slice(0, 10).map(l => (
                <div key={l.id} className="px-3 py-2 rounded-lg bg-muted/40 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{l.action} {l.entity_type}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{l.timestamp ? format(new Date(l.timestamp), "d MMM, HH:mm") : "—"}</span>
                  </div>
                  {l.entity_name && <p className="text-xs text-muted-foreground">{l.entity_name}</p>}
                </div>
              ))
            }
          </TabsContent>
        </Tabs>
      </Section>

      {/* ── SECTION 5b: RIWAYAT SP ── */}
      {userWarningLetters.length > 0 && (
        <Section title="⚠️ Riwayat Surat Peringatan" icon={null} defaultOpen={activeWarnings.length > 0}>
          <div className="space-y-2">
            {userWarningLetters.map(l => {
              const isStillActive = suratMasihBerlaku(l);
              return (
                <div key={l.id} className={`flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg border ${isStillActive ? "bg-amber-50 border-amber-200" : "bg-muted/40"}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        l.level === "SP3" ? "bg-red-100 text-red-700" :
                        l.level === "SP2" ? "bg-orange-100 text-orange-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>{l.level}</span>
                      {isStillActive && <span className="text-xs text-amber-600 font-medium">🔴 Masih Aktif</span>}
                    </div>
                    {l.letter_number && <p className="text-xs font-mono text-muted-foreground mt-0.5">{l.letter_number}</p>}
                    <p className="text-xs text-muted-foreground">{l.date ? format(parseISO(l.date), "d MMM yyyy", { locale: idLocale }) : "—"}</p>
                    {l.reasons?.slice(0, 2).map((r, i) => <p key={i} className="text-xs text-muted-foreground">• {r}</p>)}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── SECTION 6: KELENGKAPAN DATA ── */}
      <Section title="📋 Kelengkapan Data" icon={null} defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span>Profil {completePct}% lengkap</span>
              <span className="text-muted-foreground">{checks.filter(c => c.done).length}/{checks.length} field</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completePct}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {checks.map(c => (
              <div key={c.label} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg ${c.done ? "text-green-700 bg-green-50" : "text-muted-foreground bg-muted/40"}`}>
                <span className="text-base">{c.done ? "✅" : "⬜"}</span>
                {c.label}
              </div>
            ))}
          </div>
          {canOwner && completePct < 100 && (
            <Button size="sm" variant="outline" onClick={() => setShowEdit(true)} className="mt-2 gap-1.5">
              <Edit className="w-3.5 h-3.5" /> Lengkapi Sekarang
            </Button>
          )}
        </div>
      </Section>

      {/* ── Dialogs ── */}
      {showEdit && (
        <EditProfileDialog
          open={showEdit}
          onClose={() => setShowEdit(false)}
          profile={profile}
          targetUser={targetUser}
          onSaved={() => qc.invalidateQueries({ queryKey: ["users"] })}
        />
      )}
      {showRole && (
        <ChangeRoleDialog
          open={showRole}
          onClose={() => setShowRole(false)}
          targetUser={targetUser}
          onSaved={() => qc.invalidateQueries({ queryKey: ["users"] })}
        />
      )}
    </div>
  );
}