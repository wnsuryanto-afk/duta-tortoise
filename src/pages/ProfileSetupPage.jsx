import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

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
      if (profiles && profiles.length > 0) {
        return await base44.entities.UserProfile.update(profiles[0].id, profileData);
      } else {
        return await base44.entities.UserProfile.create({
          ...profileData,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = ["full_name", "phone", "join_date", "id_number", "bank_name", "bank_account_number"];
    const missing = requiredFields.filter(f => !form[f] || form[f].toString().trim() === "");
    
    if (missing.length > 0) {
      toast.error(`Harap lengkapi semua field wajib: ${missing.join(", ")}`);
      return;
    }

    setSaving(true);
    await saveProfileMutation.mutateAsync({
      ...form,
      is_complete: true,
    });
    setSaving(false);
  };

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
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nama Lengkap <span className="text-red-500">*</span></Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                placeholder="Nama lengkap Anda"
                className={form.full_name ? "" : "border-red-300 focus:border-red-500"}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Nomor Telepon <span className="text-red-500">*</span></Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="08123456789"
                className={form.phone ? "" : "border-red-300 focus:border-red-500"}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="join_date">Tanggal Bergabung <span className="text-red-500">*</span></Label>
              <Input
                id="join_date"
                type="date"
                value={form.join_date}
                onChange={(e) => handleChange("join_date", e.target.value)}
                className={form.join_date ? "" : "border-red-300 focus:border-red-500"}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="id_number">Nomor KTP <span className="text-red-500">*</span></Label>
              <Input
                id="id_number"
                value={form.id_number}
                onChange={(e) => handleChange("id_number", e.target.value)}
                placeholder="Nomor KTP"
                className={form.id_number ? "" : "border-red-300 focus:border-red-500"}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bank_name">Nama Bank <span className="text-red-500">*</span></Label>
                <Input
                  id="bank_name"
                  value={form.bank_name}
                  onChange={(e) => handleChange("bank_name", e.target.value)}
                  placeholder="Contoh: BCA"
                  className={form.bank_name ? "" : "border-red-300 focus:border-red-500"}
                  required
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
              <Label htmlFor="bank_account_number">Nomor Rekening <span className="text-red-500">*</span></Label>
              <Input
                id="bank_account_number"
                value={form.bank_account_number}
                onChange={(e) => handleChange("bank_account_number", e.target.value)}
                placeholder="Nomor rekening"
                className={form.bank_account_number ? "" : "border-red-300 focus:border-red-500"}
                required
              />
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
              className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 mt-6"
              disabled={saving}
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
          </form>
        </div>
      </Card>
    </div>
  );
}