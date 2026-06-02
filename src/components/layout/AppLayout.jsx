import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import GuidedLayout from "@/components/guided/GuidedLayout";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useViewAs } from "@/lib/ViewAsContext";
import ViewAsRoleBanner from "@/components/owner/ViewAsRoleBanner";
import ViewAsSelector from "@/components/owner/ViewAsSelector";
import { Eye, User, Bell, LogOut, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NotificationBell from "@/components/notifications/NotificationBell";
import TourController from "@/components/tutorial/TourController";
import IncompleteProfileBanner from "@/components/profile/IncompleteProfileBanner";
import TestModeBanner from "@/components/owner/TestModeBanner";
import { toast } from "sonner";

// ── Fullscreen profile setup — ditampilkan saat profil belum lengkap (non-owner) ──
function ProfileSetupScreen({ user, onComplete }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    phone: "",
    join_date: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    id_number: "",
    emergency_contact: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Pre-fill dari profil yang sudah ada
  useEffect(() => {
    base44.entities.UserProfile.filter({ user_email: user?.email }).then(profiles => {
      if (profiles?.[0]) {
        const p = profiles[0];
        setForm(prev => ({
          ...prev,
          full_name: p.full_name || prev.full_name,
          phone: p.phone || "",
          join_date: p.join_date || "",
          bank_name: p.bank_name || "",
          bank_account_number: p.bank_account_number || "",
          bank_account_name: p.bank_account_name || "",
          id_number: p.id_number || "",
          emergency_contact: p.emergency_contact || "",
        }));
      }
    }).catch(() => {});
  }, [user?.email]);

  const REQUIRED = ["full_name", "phone", "join_date", "bank_name", "bank_account_number"];
  const isValid = REQUIRED.every(f => form[f]?.toString().trim() !== "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    REQUIRED.forEach(f => { if (!form[f]?.toString().trim()) newErrors[f] = true; });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSaving(true);
    const isComplete = REQUIRED.every(f => form[f]?.toString().trim() !== "");
    const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
    const data = { ...form, is_complete: isComplete, user_id: user.id, user_email: user.email };

    if (profiles?.[0]) {
      await base44.entities.UserProfile.update(profiles[0].id, data);
    } else {
      await base44.entities.UserProfile.create(data);
    }

    if (form.full_name && user.full_name !== form.full_name) {
      await base44.auth.updateMe({ full_name: form.full_name });
    }

    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    toast.success("Profil berhasil disimpan!");
    setSaving(false);
    onComplete();
  };

  const handleChange = (f, v) => {
    setForm(p => ({ ...p, [f]: v }));
    setErrors(p => ({ ...p, [f]: false }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🐢</div>
          <h1 className="text-xl font-bold text-green-900 font-heading">Duta Tortoise</h1>
          <h2 className="text-lg font-semibold text-green-800 mt-2">Lengkapi Profil Anda</h2>
          <p className="text-sm text-muted-foreground mt-1">Data ini diperlukan untuk penggajian. Harap lengkapi sebelum menggunakan app.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { id: "full_name", label: "Nama Lengkap *", placeholder: "Nama lengkap Anda" },
            { id: "phone", label: "Nomor Telepon *", placeholder: "08123456789" },
            { id: "join_date", label: "Tanggal Bergabung *", type: "date" },
            { id: "id_number", label: "Nomor KTP", placeholder: "16 digit" },
          ].map(({ id, label, placeholder, type }) => (
            <div key={id} className="space-y-1">
              <Label htmlFor={id}>{label}</Label>
              <Input id={id} type={type || "text"} value={form[id]} onChange={e => handleChange(id, e.target.value)}
                placeholder={placeholder} className={errors[id] ? "border-red-500 bg-red-50" : ""} />
              {errors[id] && <p className="text-xs text-red-500">Wajib diisi</p>}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nama Bank *</Label>
              <Input value={form.bank_name} onChange={e => handleChange("bank_name", e.target.value)}
                placeholder="cth: BCA" className={errors.bank_name ? "border-red-500 bg-red-50" : ""} />
              {errors.bank_name && <p className="text-xs text-red-500">Wajib diisi</p>}
            </div>
            <div className="space-y-1">
              <Label>Nama Pemilik Rekening</Label>
              <Input value={form.bank_account_name} onChange={e => handleChange("bank_account_name", e.target.value)} placeholder="Sesuai buku tabungan" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Nomor Rekening *</Label>
            <Input value={form.bank_account_number} onChange={e => handleChange("bank_account_number", e.target.value)}
              placeholder="Nomor rekening" className={errors.bank_account_number ? "border-red-500 bg-red-50" : ""} />
            {errors.bank_account_number && <p className="text-xs text-red-500">Wajib diisi</p>}
          </div>
          <div className="space-y-1">
            <Label>Kontak Darurat</Label>
            <Input value={form.emergency_contact} onChange={e => handleChange("emergency_contact", e.target.value)} placeholder="Nama & nomor telepon" />
          </div>
          <Button type="submit" disabled={saving || !isValid}
            className={`w-full font-semibold py-3 mt-2 ${isValid ? "bg-green-700 hover:bg-green-800" : "bg-gray-200 text-gray-400"}`}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : "Simpan & Lanjutkan →"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, isLoading } = useCurrentUser();
  const { viewAsRole, viewAsLabel, resetViewAs } = useViewAs();
  const [showViewAsSelector, setShowViewAsSelector] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const isOwner = user?.role === "owner";
  const isGuidedRole = ["keeper", "kepala_feeder"].includes(user?.role);
  const [forceNormalMode, setForceNormalMode] = useState(false);
  const isInvestor = (viewAsRole || user?.role) === "investor";
  const isViewingAs = !!viewAsRole;

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    if (showUserMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  const { data: profiles = [], isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["user-profile", user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user.email }),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // is_complete = true HANYA jika 5 field esensial semua terisi
  const checkProfileComplete = (p) => {
    if (!p) return false;
    const fields = ["full_name", "phone", "join_date", "bank_name", "bank_account_number"];
    return fields.every(f => p[f] && p[f].toString().trim() !== "");
  };

  const isProfileLoaded = !isLoading && !profileLoading && !!user;
  const profile = profiles[0];
  const profileComplete = checkProfileComplete(profile);
  const navigate = useNavigate();

  // Non-owner + profil belum lengkap → tampilkan fullscreen setup form
  // Owner → tetap masuk app (ada banner kuning saja)
  if (isProfileLoaded && !isOwner && !profileComplete) {
    return <ProfileSetupScreen user={user} onComplete={() => refetchProfile()} />;
  }

  // Keeper / Kepala Feeder → Guided Mode (kecuali user minta normal)
  if (isProfileLoaded && isGuidedRole && !forceNormalMode && !isViewingAs) {
    return (
      <GuidedLayout
        user={user}
        onSwitchToNormal={() => setForceNormalMode(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isViewingAs && (
        <ViewAsRoleBanner viewAsLabel={viewAsLabel} onReset={resetViewAs} />
      )}

      <Sidebar viewAsRole={isViewingAs ? viewAsRole : null} />

      <main className={`lg:ml-64 min-h-screen ${isViewingAs ? "mt-10" : ""}`}>
        {/* ── Top bar ── */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex justify-between items-center px-4 lg:px-8 py-3 max-w-7xl mx-auto">
            <div className="w-8 lg:hidden" />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {isOwner && !isViewingAs && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 hidden sm:flex"
                  onClick={() => setShowViewAsSelector(true)}
                >
                  <Eye className="w-3.5 h-3.5" /> Lihat Sebagai
                </Button>
              )}

              {isInvestor && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                  👁 Mode Investor
                </span>
              )}

              <NotificationBell />

              {/* User menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-primary">
                      {(user?.full_name || user?.email || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[13px] font-medium hidden sm:block text-foreground/80 max-w-[120px] truncate">
                    {user?.full_name || user?.email}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-modal z-50 overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 border-b border-border bg-muted/40">
                      <p className="text-sm font-semibold text-foreground">{user?.full_name || user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role || "user"}</p>
                    </div>
                    <div className="py-1.5">
                      {[
                        { label: "Edit Profil", icon: User, path: "/edit-profil" },
                        { label: "Notifikasi", icon: Bell, path: "/notifications" },
                      ].map(({ label, icon: Icon, path }) => (
                        <button
                          key={path}
                          onClick={() => { navigate(path); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-muted transition-colors text-foreground/80 hover:text-foreground"
                        >
                          <Icon className="w-4 h-4 text-primary/70" />
                          {label}
                        </button>
                      ))}
                      {isOwner && !isViewingAs && (
                        <button
                          onClick={() => { setShowViewAsSelector(true); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-amber-50 transition-colors text-amber-700"
                        >
                          <Eye className="w-4 h-4" />
                          Lihat Sebagai...
                        </button>
                      )}
                      <ThemeToggle compact />
                    </div>
                    <div className="py-1.5 border-t border-border">
                      <button
                        onClick={() => base44.auth.logout()}
                        className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Keluar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <TestModeBanner />
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {isOwner && <IncompleteProfileBanner user={user} profile={profile} />}
          <Outlet />
        </div>
      </main>

      <TourController />
      {isOwner && (
        <ViewAsSelector
          open={showViewAsSelector}
          onClose={() => setShowViewAsSelector(false)}
        />
      )}
    </div>
  );
}