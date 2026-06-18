import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { upsertUserProfile } from "@/lib/userProfileUpsert";

const REQUIRED_FIELDS = ["full_name"];

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [user, setUser] = useState(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    full_name: "",
    hp_whatsapp: "",
    join_date: "",
    id_number: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    emergency_contact: "",
  });

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        setForm(prev => ({ ...prev, full_name: u.full_name || "" }));
      } catch (err) {
        console.error("Error getting user:", err);
      }
    };
    getUser();
  }, []);

  // Check if profile exists
  const { data: profiles } = useQuery({
    queryKey: ["user-profile-setup", user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user.email }),
    enabled: !!user?.email,
    staleTime: 60 * 1000,
    retry: 1,
  });

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (profileData) => {
      return await upsertUserProfile(user, profileData);
    },
    onSuccess: async () => {
      // Update user full_name if changed
      if (form.full_name && user.full_name !== form.full_name) {
        await base44.auth.updateMe({ full_name: form.full_name });
      }
      
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-setup"] });
      
      toast.success("Profil berhasil disimpan!");
      // Redirect IMMEDIATE ke dashboard tanpa menunggu refetch
      navigate("/");
    },
    onError: (err) => {
      console.error("Error saving profile:", err);
      toast.error("Gagal menyimpan profil. Silakan coba lagi.");
    },
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: false }));
    setSaveError(null);
  };

  const doSave = async (dataOverride) => {
    setSaving(true);
    setSaveError(null);
    try {
      const data = dataOverride || { ...form, is_complete: true, tour_completed: true };
      // Pastikan full_name selalu terisi
      if (!data.full_name || !data.full_name.trim()) {
        data.full_name = user?.full_name || "Pengguna";
      }
      await saveProfileMutation.mutateAsync(data);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveError(err?.message || "Gagal menyimpan profil");
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    REQUIRED_FIELDS.forEach(f => {
      if (!form[f] || form[f].toString().trim() === "") newErrors[f] = true;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErr = REQUIRED_FIELDS.find(f => newErrors[f]);
      if (firstErr) document.getElementById(firstErr)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Nama Lengkap wajib diisi");
      return;
    }

    await doSave();
  };

  const handleSkip = async () => {
    setSkipping(true);
    setSaveError(null);
    const skipData = {
      full_name: form.full_name || user?.full_name || "Pengguna",
      hp_whatsapp: form.hp_whatsapp || "",
      join_date: form.join_date || new Date().toISOString().split("T")[0],
      is_complete: true,
      tour_completed: true,
    };
    await doSave(skipData);
    setSkipping(false);
  };

  // Auto-redirect jika profil sudah lengkap
  useEffect(() => {
    if (profiles && profiles.length > 0) {
      const existing = profiles.find(p => p.is_complete);
      if (existing) {
        navigate("/", { replace: true });
      }
    }
  }, [profiles, navigate]);

  // Auto-populate from existing profile
  useEffect(() => {
    if (profiles && profiles.length > 0 && profiles[0]) {
      const p = profiles[0];
      setForm(prev => ({
        ...prev,
        full_name: p.full_name || prev.full_name,
        hp_whatsapp: p.hp_whatsapp || p.phone || prev.hp_whatsapp,
        join_date: p.join_date || prev.join_date,
        id_number: p.id_number || prev.id_number,
        bank_name: p.bank_name || prev.bank_name,
        bank_account_number: p.bank_account_number || prev.bank_account_number,
        bank_account_name: p.bank_account_name || prev.bank_account_name,
        emergency_contact: p.emergency_contact || prev.emergency_contact,
      }));
    }
  }, [profiles]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-white shadow-xl border-0">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
          <div className="text-4xl mb-3">🐢</div>
          <h1 className="text-2xl font-heading font-bold text-green-900">Duta Tortoise</h1>
          <h2 className="text-xl font-semibold mt-4 text-green-800">Lengkapi Profil Anda</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Hanya <strong>Nama Lengkap</strong> yang wajib diisi saat ini.<br/>
            Data lainnya bisa dilengkapi nanti dari menu Edit Profil.
          </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { id: "full_name", label: "Nama Lengkap", placeholder: "Nama lengkap Anda", required: true },
              { id: "hp_whatsapp", label: "No. HP / WhatsApp", placeholder: "08123456789", required: false, hint: "Opsional — bisa diisi nanti" },
              { id: "join_date", label: "Tanggal Bergabung", type: "date", required: false, hint: "Opsional — bisa diisi nanti" },
              { id: "id_number", label: "Nomor KTP", placeholder: "Nomor KTP 16 digit", required: false, hint: "Opsional" },
            ].map(({ id, label, placeholder, type, required, hint }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label} {required && <span className="text-red-500">*</span>}</Label>
                <Input
                  id={id}
                  type={type || "text"}
                  value={form[id]}
                  onChange={(e) => handleChange(id, e.target.value)}
                  placeholder={placeholder}
                  className={errors[id] ? "border-red-500 bg-red-50" : ""}
                />
                {errors[id] && <p className="text-xs text-red-500">Field ini wajib diisi</p>}
                {!required && hint && <p className="text-[11px] text-muted-foreground italic">{hint}</p>}
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bank_name">Nama Bank <span className="text-xs text-muted-foreground font-normal">(opsional)</span></Label>
                <Input
                  id="bank_name"
                  value={form.bank_name}
                  onChange={(e) => handleChange("bank_name", e.target.value)}
                  placeholder="Contoh: BCA"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank_account_name">Nama Pemilik Rekening</Label>
                <Input
                  id="bank_account_name"
                  value={form.bank_account_name}
                  onChange={(e) => handleChange("bank_account_name", e.target.value)}
                  placeholder="Sesuai buku tabungan"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bank_account_number">Nomor Rekening <span className="text-xs text-muted-foreground font-normal">(opsional)</span></Label>
              <Input
                id="bank_account_number"
                value={form.bank_account_number}
                onChange={(e) => handleChange("bank_account_number", e.target.value)}
                placeholder="Nomor rekening"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emergency_contact">Kontak Darurat <span className="text-xs text-muted-foreground font-normal">(opsional)</span></Label>
              <Input
                id="emergency_contact"
                value={form.emergency_contact}
                onChange={(e) => handleChange("emergency_contact", e.target.value)}
                placeholder="Nomor telepon kontak darurat"
              />
            </div>

            {/* Error banner */}
            {saveError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                Gagal menyimpan: {saveError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-semibold py-3 mt-4 bg-green-700 hover:bg-green-800 text-white transition-colors"
              disabled={saving || skipping}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan & Lanjutkan"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full text-muted-foreground text-sm mt-2"
              disabled={saving || skipping}
              onClick={handleSkip}
            >
              {skipping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Lewati & Masuk Dashboard"
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}