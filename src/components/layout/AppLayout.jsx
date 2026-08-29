import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import PageErrorBoundary from "@/components/common/PageErrorBoundary";
import Sidebar from "./Sidebar";
import GuidedLayout from "@/components/guided/GuidedLayout";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useViewAs } from "@/lib/ViewAsContext";
import ViewAsRoleBanner from "@/components/owner/ViewAsRoleBanner";
import ViewAsSelector from "@/components/owner/ViewAsSelector";
import { Eye, User, LogOut, Loader2, Search, Settings, ArrowLeft } from "lucide-react";
import { SETTINGS_ITEMS, findParentArea } from "@/lib/navigation";
import { useDailyCareTasks } from "@/lib/useDailyCareTasks";
import { canAccess } from "@/lib/permissions";
import CommandPalette from "@/components/common/CommandPalette";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NotificationBell from "@/components/notifications/NotificationBell";
import TourController from "@/components/tutorial/TourController";
import IncompleteProfileBanner from "@/components/profile/IncompleteProfileBanner";
import TestModeBanner from "@/components/owner/TestModeBanner";
import { getBestProfile } from "@/lib/getBestProfile";
import { upsertUserProfile } from "@/lib/userProfileUpsert";
import UserAvatar from "@/components/common/UserAvatar";
import { toast } from "sonner";

// ── Fullscreen profile setup — ditampilkan saat profil belum lengkap (non-owner) ──
function ProfileSetupScreen({ user, onComplete }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    hp_whatsapp: "",
    join_date: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    id_number: "",
    emergency_contact: "",
  });
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [errors, setErrors] = useState({});

  // Pre-fill dari profil terbaik yang sudah ada
  useEffect(() => {
    base44.entities.UserProfile.filter({ user_email: user?.email }).then(profiles => {
      const best = getBestProfile(profiles);
      if (best) {
        setForm(prev => ({
          ...prev,
          full_name: best.full_name || prev.full_name,
          hp_whatsapp: best.hp_whatsapp || best.phone || "",
          join_date: best.join_date || "",
          bank_name: best.bank_name || "",
          bank_account_number: best.bank_account_number || "",
          bank_account_name: best.bank_account_name || "",
          id_number: best.id_number || "",
          emergency_contact: best.emergency_contact || "",
        }));
      }
    }).catch(() => {});
  }, [user?.email]);

  const REQUIRED = ["full_name"];

  const doSave = async (skipValidation = false) => {
    if (!skipValidation) {
      const newErrors = {};
      REQUIRED.forEach(f => { if (!form[f]?.toString().trim()) newErrors[f] = true; });
      if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    }

    setSaving(true);
    setSaveError("");
    try {
      const data = {
        full_name: form.full_name || user?.full_name || "Pengguna",
        hp_whatsapp: form.hp_whatsapp || "",
        join_date: form.join_date || new Date().toISOString().split("T")[0],
        bank_name: form.bank_name || "",
        bank_account_number: form.bank_account_number || "",
        bank_account_name: form.bank_account_name || "",
        id_number: form.id_number || "",
        emergency_contact: form.emergency_contact || "",
        is_complete: true,
        tour_completed: true,
      };

      // GUNAKAN upsert — cari dulu, update jika ada, create jika belum
      await upsertUserProfile(user, data);

      if (form.full_name && user.full_name !== form.full_name) {
        await base44.auth.updateMe({ full_name: form.full_name });
      }

      toast.success("Profil berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      onComplete();
    } catch (err) {
      setSaveError("Gagal menyimpan: " + (err?.message || "Terjadi kesalahan. Coba lagi."));
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doSave(false);
  };

  const handleSkip = () => {
    setSkipping(true);
    doSave(true).finally(() => setSkipping(false));
  };

  const handleChange = (f, v) => {
    setForm(p => ({ ...p, [f]: v }));
    setErrors(p => ({ ...p, [f]: false }));
    setSaveError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🐢</div>
          <h1 className="text-xl font-bold text-green-900 font-heading">Duta Tortoise</h1>
          <h2 className="text-lg font-semibold text-green-800 mt-2">Lengkapi Profil Anda</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Hanya <strong>Nama Lengkap</strong> yang wajib.<br />Data lainnya bisa dilengkapi nanti.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { id: "full_name", label: "Nama Lengkap *", placeholder: "Nama lengkap Anda" },
            { id: "hp_whatsapp", label: "Nomor HP/WhatsApp (opsional)", placeholder: "08123456789" },
            { id: "join_date", label: "Tanggal Bergabung (opsional)", type: "date" },
            { id: "id_number", label: "Nomor KTP (opsional)", placeholder: "16 digit" },
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
              <Label>Nama Bank (opsional)</Label>
              <Input value={form.bank_name} onChange={e => handleChange("bank_name", e.target.value)} placeholder="cth: BCA" />
            </div>
            <div className="space-y-1">
              <Label>Nama Pemilik Rekening (opsional)</Label>
              <Input value={form.bank_account_name} onChange={e => handleChange("bank_account_name", e.target.value)} placeholder="Sesuai buku tabungan" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Nomor Rekening (opsional)</Label>
            <Input value={form.bank_account_number} onChange={e => handleChange("bank_account_number", e.target.value)} placeholder="Nomor rekening" />
          </div>
          <div className="space-y-1">
            <Label>Kontak Darurat (opsional)</Label>
            <Input value={form.emergency_contact} onChange={e => handleChange("emergency_contact", e.target.value)} placeholder="Nama & nomor telepon" />
          </div>

          {saveError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {saveError}
            </div>
          )}

          <Button type="submit" disabled={saving || skipping}
            className="w-full font-semibold py-3 mt-2 bg-green-700 hover:bg-green-800">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : "Simpan & Lanjutkan →"}
          </Button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving || skipping}
            className="w-full text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 py-1 transition-colors disabled:opacity-50"
          >
            {skipping ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin inline" />Memproses...</> : "Lewati & Masuk →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, isLoading } = useCurrentUser();
  const { viewAsRole, viewAsLabel, viewAsUserEmail, testSaveMode, isViewingAs, resetViewAs } = useViewAs();
  const [showViewAsSelector, setShowViewAsSelector] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const location = useLocation();
  // Jalur cadangan pengganti cron: buat tugas perawatan harian
  // untuk kura yang masih sakit saat aplikasi pertama dibuka hari ini.
  useDailyCareTasks(!!user);
  // Tombol kembali sadar konteks: dari halaman detail -> kembali ke area induknya,
  // dari halaman area/pengaturan -> kembali ke Beranda.
  const parentArea = findParentArea(location.pathname);
  const backTarget = location.pathname === "/" ? null : (parentArea ? parentArea.hub : "/");
  const backLabel = parentArea ? parentArea.label : "Beranda";
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const isOwner = user?.role === "owner"; // selalu berdasarkan role asli
  // Role efektif: saat ViewAs aktif, pakai role yang sedang di-preview.
  // Dengan ini owner benar-benar melihat layar Guided yang dipakai keeper,
  // bukan dashboard lama yang tidak pernah mereka lihat.
  const effectiveRole = isViewingAs && viewAsRole ? viewAsRole : user?.role;
  const isGuidedRole = ["keeper", "kepala_feeder"].includes(effectiveRole);
  const [forceNormalMode, setForceNormalMode] = useState(false);
  const isInvestor = (viewAsRole || user?.role) === "investor";
  // isViewingAs comes from context now

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    if (showUserMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  const [onboardingDone, setOnboardingDone] = useState(false);

  const { data: profiles = [], isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user.email }),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const isProfileLoaded = !isLoading && !profileLoading && !!user;
  // Ambil profil TERBAIK (is_complete=true, terbaru, bukan duplikat)
  const profile = getBestProfile(profiles);
  // Cek hanya berdasarkan is_complete dari database ATAU flag lokal setelah onboarding selesai
  const profileComplete = onboardingDone || profile?.is_complete === true;
  const navigate = useNavigate();

  // Masih loading — tampilkan spinner diam, jangan render kondisi apapun
  if (isLoading || (!!user?.email && profileLoading)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background">
        <div className="text-4xl animate-float">🐢</div>
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Menyiapkan Duta Tortoise…</p>
      </div>
    );
  }

  // Non-owner + profil belum lengkap → tampilkan fullscreen setup form
  // Owner → tetap masuk app (ada banner kuning saja)
  if (isProfileLoaded && !isOwner && !profileComplete) {
    return <ProfileSetupScreen user={user} onComplete={() => setOnboardingDone(true)} />;
  }

  // Keeper / Kepala Feeder → Guided Mode (kecuali user minta normal)
  if (isProfileLoaded && isGuidedRole && !forceNormalMode) {
    // Saat owner memakai "Lihat Sebagai", tampilkan layar guided milik user
    // yang dipilih. Tanpa Mode Uji, seluruh aksi diblokir agar aktivitas owner
    // tidak pernah membuat checklist/absensi atas nama keeper.
    const previewUser = isViewingAs
      ? {
          ...user,
          email: viewAsUserEmail || user?.email,
          full_name: viewAsLabel || user?.full_name,
          role: viewAsRole,
        }
      : user;
    const readOnlyPreview = isViewingAs && !testSaveMode;

    return (
      <PageErrorBoundary>
        {isViewingAs && (
          <ViewAsRoleBanner viewAsLabel={viewAsLabel} viewAsRole={viewAsRole} onReset={resetViewAs} />
        )}
        <div
          className={isViewingAs ? "pt-10" : ""}
          onClickCapture={(e) => {
            if (!readOnlyPreview) return;
            e.preventDefault();
            e.stopPropagation();
            toast.info("Mode preview — aksi dinonaktifkan. Aktifkan Mode Uji bila ingin mencoba menyimpan.");
          }}
        >
          <GuidedLayout
            user={previewUser}
            onSwitchToNormal={() => setForceNormalMode(true)}
          />
        </div>
      </PageErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isViewingAs && viewAsRole && (
        <ViewAsRoleBanner viewAsLabel={viewAsLabel} viewAsRole={viewAsRole} onReset={resetViewAs} />
      )}

      <Sidebar viewAsRole={isViewingAs ? viewAsRole : null} onOpenSearch={() => setShowPalette(true)} />

      <main className={`lg:ml-64 min-h-screen ${isViewingAs ? "mt-10" : ""}`}>
        {/* ── Top bar ── */}
        <div className={`sticky top-0 z-30 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 border-b transition-colors ${isViewingAs && viewAsRole ? "border-blue-400 border-b-2" : "border-border"}`}>
          <div className="flex justify-between items-center px-4 lg:px-8 py-3 max-w-7xl mx-auto">
            <div className="w-8 lg:hidden" />
            {backTarget ? (
              <button
                onClick={() => navigate(backTarget)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 -ml-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={`Kembali ke ${backLabel}`}
              >
                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-none">{backLabel}</span>
              </button>
            ) : null}
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {/* Pencarian halaman — menggantikan kebutuhan menu panjang */}
              <button
                onClick={() => setShowPalette(true)}
                className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted hover:border-primary/30 hover:text-foreground transition-all active:scale-95"
                title="Cari halaman (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cari halaman</span>
                <kbd className="hidden lg:inline text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/60">⌘K</kbd>
              </button>
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

              {isOwner && isViewingAs && viewAsRole && (
                <button
                  onClick={() => setShowViewAsSelector(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Ganti Role
                </button>
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
                  <UserAvatar name={user?.full_name || user?.email} photoUrl={profile?.photo_url} size="sm" />
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
                        ...SETTINGS_ITEMS
                          .filter((i) => canAccess(isViewingAs && viewAsRole ? viewAsRole : user?.role, i.section))
                          .map((i) => ({ label: i.label, icon: Settings, path: i.path })),
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
                      {isOwner && (
                        <button
                          onClick={() => { setShowViewAsSelector(true); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-amber-50 transition-colors text-amber-700"
                        >
                          <Eye className="w-4 h-4" />
                          {isViewingAs && viewAsRole ? "Ganti Preview Role..." : "Lihat Sebagai..."}
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
          <PageErrorBoundary>
            <Outlet />
          </PageErrorBoundary>
        </div>
      </main>

      <TourController />
      <CommandPalette
        open={showPalette}
        onOpenChange={setShowPalette}
        role={isViewingAs && viewAsRole ? viewAsRole : user?.role}
      />
      {isOwner && (
        <ViewAsSelector
          open={showViewAsSelector}
          onClose={() => setShowViewAsSelector(false)}
        />
      )}
    </div>
  );
}