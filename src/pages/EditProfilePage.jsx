import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { upsertUserProfile } from "@/lib/userProfileUpsert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Calendar, Building, Shield, Save, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDirty, setIsDirty] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);


  // Fetch current user and profile
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: profiles = [], refetch: refetchProfile } = useQuery({
    queryKey: ["user-profile-edit", user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (profiles.length > 0) {
      const p = profiles[0];
      setFormData(p);
      // Jika whatsapp sudah diisi dan berbeda dari phone, uncheck
      // legacy compat: tidak ada whatsapp terpisah lagi
      setLoading(false);
    } else if (user) {
      // Create new profile if doesn't exist
      setFormData({
        user_id: user.id,
        user_email: user.email,
        full_name: user.full_name || "",
      });
      setLoading(false);
    }
  }, [profiles, user]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await upsertUserProfile(user, data);
    },
    onSuccess: async (_, variables) => {
      // Sinkronisasi nama karyawan ke semua entitas jika nama berubah
      const oldName = profiles[0]?.full_name;
      if (oldName && variables.full_name && oldName !== variables.full_name && user?.email) {
        base44.functions.invoke("syncEmployeeName", {
          employee_email: user.email,
          new_name: variables.full_name,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-edit"] });
      toast.success("Profil berhasil diperbarui ✅");
      setIsDirty(false);
      navigate(-1);
    },
    onError: (error) => {
      toast.error("Gagal menyimpan profil: " + error.message);
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const IS_COMPLETE_FIELDS = ["full_name", "hp_whatsapp", "join_date", "bank_name", "bank_account_number"];

  const handleSave = () => {
    const required = ["full_name", "hp_whatsapp", "join_date"];
    const missing = required.filter(f => !formData[f] || formData[f].toString().trim() === "");
    
    if (missing.length > 0) {
      toast.error("Field wajib belum diisi: " + missing.join(", "));
      return;
    }

    const isComplete = IS_COMPLETE_FIELDS.every(f => formData[f] && formData[f].toString().trim() !== "");
    updateMutation.mutate({ ...formData, is_complete: isComplete });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Edit Profil</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola informasi pribadi Anda</p>
        </div>
        <Button variant="outline" onClick={handleCancel} className="gap-2">
          <X className="w-4 h-4" /> Batal
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-5 h-5 text-primary" />
            Informasi Pribadi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {(formData.full_name || user?.email || "?")[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-lg">{formData.full_name || "Belum diset"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium mt-1 inline-block">
                {user?.role || "user"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Nama Lengkap *</Label>
              <Input
                id="full_name"
                value={formData.full_name || ""}
                onChange={(e) => handleChange("full_name", e.target.value)}
                placeholder="Nama lengkap"
                className={!formData.full_name ? "border-red-500" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hp_whatsapp">No. HP / WhatsApp *</Label>
              <Input
                id="hp_whatsapp"
                value={formData.hp_whatsapp || formData.phone || ""}
                onChange={(e) => handleChange("hp_whatsapp", e.target.value)}
                placeholder="08123456789"
                className={!formData.hp_whatsapp && !formData.phone ? "border-red-500" : ""}
              />
            </div>

            <div>
              <Label htmlFor="join_date">Tanggal Bergabung *</Label>
              <Input
                id="join_date"
                type="date"
                value={formData.join_date || ""}
                onChange={(e) => handleChange("join_date", e.target.value)}
                className={!formData.join_date ? "border-red-500" : ""}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                value={formData.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Alamat lengkap"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="id_number">Nomor KTP</Label>
              <Input
                id="id_number"
                value={formData.id_number || ""}
                onChange={(e) => handleChange("id_number", e.target.value)}
                placeholder="Nomor KTP"
              />
            </div>

            <div>
              <Label htmlFor="emergency_contact">Kontak Darurat</Label>
              <Input
                id="emergency_contact"
                value={formData.emergency_contact || ""}
                onChange={(e) => handleChange("emergency_contact", e.target.value)}
                placeholder="Nama & nomor kontak darurat"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building className="w-5 h-5 text-primary" />
            Informasi Bank
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank_name">Nama Bank</Label>
              <Input
                id="bank_name"
                value={formData.bank_name || ""}
                onChange={(e) => handleChange("bank_name", e.target.value)}
                placeholder="Contoh: BCA, Mandiri, BNI"
              />
            </div>

            <div>
              <Label htmlFor="bank_account_number">Nomor Rekening</Label>
              <Input
                id="bank_account_number"
                value={formData.bank_account_number || ""}
                onChange={(e) => handleChange("bank_account_number", e.target.value)}
                placeholder="Nomor rekening"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="bank_account_name">Nama Pemilik Rekening</Label>
              <Input
                id="bank_account_name"
                value={formData.bank_account_name || ""}
                onChange={(e) => handleChange("bank_account_name", e.target.value)}
                placeholder="Nama sesuai rekening"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-muted-foreground" />
            Informasi Akun
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Role / Jabatan</p>
              <p className="text-sm font-medium capitalize">{user?.role || "user"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Terdaftar Sejak</p>
              <p className="text-sm font-medium">
                {user?.created_date ? new Date(user.created_date).toLocaleDateString("id-ID") : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 sticky bottom-4 bg-background/80 backdrop-blur-sm p-4 rounded-xl border">
        <Button variant="outline" onClick={handleCancel} className="gap-2">
          <X className="w-4 h-4" /> Kembali
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={!isDirty || updateMutation.isPending}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Save className="w-4 h-4" /> 
          {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </div>
  );
}