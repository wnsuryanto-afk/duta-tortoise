import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const REQUIRED_FIELDS = ["full_name", "phone", "join_date", "id_number", "bank_name", "bank_account_number"];

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [errors, setErrors] = useState({});
  const isOwner = user?.role === "owner";

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
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
    queryFn: async () => {
      if (!user?.email) return [];
      const data = await base44.entities.UserProfile.filter({ user_email: user.email });
      console.log("ProfileSetup: UserProfile check", { email: user.email, count: data.length, hasData: data[0] });
      return data;
    },
    enabled: !!user?.email,
  });

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (profileData) => {
      // Auto-set is_complete jika field-field penting sudah terisi
      const isComplete = !!(
        profileData.full_name && 
        profileData.phone && 
        profileData.join_date && 
        profileData.bank_account_number
      );
      
      const dataToSave = {
        ...profileData,
        is_complete: isComplete,
      };
      
      if (profiles && profiles.length > 0) {
        return await base44.entities.UserProfile.update(profiles[0].id, dataToSave);
      } else {
        return await base44.entities.UserProfile.create({
          ...dataToSave,
          user_id: user.id,
          user_email: user.email,
        });
      }
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
  };

  const isFormValid = REQUIRED_FIELDS.every(f => form[f] && form[f].toString().trim() !== "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    REQUIRED_FIELDS.forEach(f => {
      if (!form[f] || form[f].toString().trim() === "") newErrors[f] = true;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll ke field pertama yang kosong
      const firstErr = REQUIRED_FIELDS.find(f => newErrors[f]);
      if (firstErr) document.getElementById(firstErr)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Harap lengkapi semua field wajib");
      return;
    }

    setSaving(true);
    await saveProfileMutation.mutateAsync({ ...form, is_complete: true });
    setSaving(false);
  };

  const handleSkipOwner = () => navigate("/");

  // Auto-populate from existing profile
  useEffect(() => {
    if (profiles && profiles.length > 0 && profiles[0]) {
      const p = profiles[0];
      setForm(prev => ({
        ...prev,
        full_name: p.full_name || prev.full_name,
        phone: p.phone || prev.phone,
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
              Data ini diperlukan untuk penggajian dan notifikasi.<br/>
              Harap lengkapi sebelum menggunakan app.
            </p>
            {isOwner && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 text-left">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                Sebagai Owner, Anda bisa melewati langkah ini — tapi data ini diperlukan untuk laporan gaji.
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { id: "full_name", label: "Nama Lengkap", placeholder: "Nama lengkap Anda", required: true },
              { id: "phone", label: "Nomor Telepon", placeholder: "08123456789", required: true },
              { id: "join_date", label: "Tanggal Bergabung", type: "date", required: true },
              { id: "id_number", label: "Nomor KTP", placeholder: "Nomor KTP 16 digit", required: true },
            ].map(({ id, label, placeholder, type, required }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label} {required && <span className="text-red-500">*</span>}</Label>
                <Input
                  id={id}
                  type={type || "text"}
                  value={form[id]}
                  onChange={(e) => { handleChange(id, e.target.value); setErrors(p => ({ ...p, [id]: false })); }}
                  placeholder={placeholder}
                  className={errors[id] ? "border-red-500 bg-red-50" : ""}
                />
                {errors[id] && <p className="text-xs text-red-500">Field ini wajib diisi</p>}
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bank_name">Nama Bank <span className="text-red-500">*</span></Label>
                <Input
                  id="bank_name"
                  value={form.bank_name}
                  onChange={(e) => { handleChange("bank_name", e.target.value); setErrors(p => ({ ...p, bank_name: false })); }}
                  placeholder="Contoh: BCA"
                  className={errors.bank_name ? "border-red-500 bg-red-50" : ""}
                />
                {errors.bank_name && <p className="text-xs text-red-500">Wajib diisi</p>}
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
              <Label htmlFor="bank_account_number">Nomor Rekening <span className="text-red-500">*</span></Label>
              <Input
                id="bank_account_number"
                value={form.bank_account_number}
                onChange={(e) => { handleChange("bank_account_number", e.target.value); setErrors(p => ({ ...p, bank_account_number: false })); }}
                placeholder="Nomor rekening"
                className={errors.bank_account_number ? "border-red-500 bg-red-50" : ""}
              />
              {errors.bank_account_number && <p className="text-xs text-red-500">Wajib diisi</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emergency_contact">Kontak Darurat</Label>
              <Input
                id="emergency_contact"
                value={form.emergency_contact}
                onChange={(e) => handleChange("emergency_contact", e.target.value)}
                placeholder="Nomor telepon kontak darurat"
              />
            </div>

            <Button
              type="submit"
              className={`w-full font-semibold py-3 mt-6 transition-colors ${
                isFormValid
                  ? "bg-green-700 hover:bg-green-800 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              disabled={saving || !isFormValid}
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

            {isOwner && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground text-sm"
                onClick={handleSkipOwner}
              >
                Lewati untuk Sekarang (Owner)
              </Button>
            )}
          </form>
        </div>
      </Card>
    </div>
  );
}