import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Loader2, UserCircle2, ShieldCheck, AlertCircle } from "lucide-react";

const REQUIRED_FIELDS = ["full_name", "phone", "join_date", "bank_name", "bank_account_number", "bank_account_name"];

export default function ForceProfileSetupModal({ user, onComplete }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const fileRef = useRef(null);
  const camRef = useRef(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    phone: "",
    id_number: "",
    join_date: new Date().toISOString().split("T")[0],
    address: "",
    emergency_contact: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
  });

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    REQUIRED_FIELDS.forEach(f => {
      if (!form[f] || form[f].toString().trim() === "") {
        e[f] = "Wajib diisi";
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const isValid = REQUIRED_FIELDS.every(f => form[f] && form[f].toString().trim() !== "");

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    await base44.auth.updateMe({ full_name: form.full_name });

    const existingProfiles = await base44.entities.UserProfile.filter({ user_email: user.email });
    const profileData = {
      user_id: user.id,
      user_email: user.email,
      full_name: form.full_name,
      phone: form.phone,
      address: form.address,
      id_number: form.id_number,
      emergency_contact: form.emergency_contact,
      join_date: form.join_date,
      bank_name: form.bank_name,
      bank_account_number: form.bank_account_number,
      bank_account_name: form.bank_account_name,
      photo_url: photoUrl,
      is_complete: true,
    };

    if (existingProfiles.length > 0) {
      await base44.entities.UserProfile.update(existingProfiles[0].id, profileData);
    } else {
      await base44.entities.UserProfile.create(profileData);
    }

    qc.invalidateQueries({ queryKey: ["user-profile"] });
    qc.invalidateQueries({ queryKey: ["currentUser"] });
    setSaving(false);
    if (onComplete) onComplete();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-start justify-center overflow-y-auto py-4 px-3">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl my-auto">
        {/* Header */}
        <div className="bg-primary rounded-t-2xl px-6 py-5 text-primary-foreground">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-heading font-bold">Lengkapi Data Diri</h2>
              <p className="text-sm opacity-80 mt-0.5">Wajib diisi sebelum menggunakan aplikasi</p>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mx-6 mt-4 flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Data ini diperlukan untuk keperluan penggajian, notifikasi, dan administrasi. Tidak bisa dilanjutkan sebelum semua field wajib terisi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {/* Foto Profil */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center relative">
              {photoUrl ? (
                <img src={photoUrl} alt="Foto profil" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-12 h-12 text-muted-foreground/40" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <ImagePlus className="w-3 h-3" /> Galeri
              </Button>
              <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => camRef.current?.click()} disabled={uploading}>
                <Camera className="w-3 h-3" /> Kamera
              </Button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e.target.files?.[0])} />
            <input ref={camRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => handlePhotoUpload(e.target.files?.[0])} />
          </div>

          {/* Data Pribadi */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Pribadi</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Nama lengkap Anda" className={`mt-0.5 ${errors.full_name ? "border-red-500" : ""}`} />
                {errors.full_name && <p className="text-xs text-red-500 mt-0.5">{errors.full_name}</p>}
              </div>
              <div>
                <Label className="text-xs">No. Telepon <span className="text-red-500">*</span></Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="08xx" className={`mt-0.5 ${errors.phone ? "border-red-500" : ""}`} />
                {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>}
              </div>
              <div>
                <Label className="text-xs">No. KTP</Label>
                <Input value={form.id_number} onChange={e => set("id_number", e.target.value)} placeholder="16 digit" className="mt-0.5" />
              </div>
              <div>
                <Label className="text-xs">Tanggal Bergabung <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.join_date} onChange={e => set("join_date", e.target.value)} className={`mt-0.5 ${errors.join_date ? "border-red-500" : ""}`} />
                {errors.join_date && <p className="text-xs text-red-500 mt-0.5">{errors.join_date}</p>}
              </div>
              <div>
                <Label className="text-xs">Kontak Darurat</Label>
                <Input value={form.emergency_contact} onChange={e => set("emergency_contact", e.target.value)} placeholder="Nama & nomor" className="mt-0.5" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Alamat</Label>
                <Textarea value={form.address} onChange={e => set("address", e.target.value)} rows={2} placeholder="Alamat lengkap" className="mt-0.5 resize-none" />
              </div>
            </div>
          </div>

          {/* Data Bank */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Rekening Bank</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nama Bank <span className="text-red-500">*</span></Label>
                <Input value={form.bank_name} onChange={e => set("bank_name", e.target.value)} placeholder="BCA, BRI, Mandiri..." className={`mt-0.5 ${errors.bank_name ? "border-red-500" : ""}`} />
                {errors.bank_name && <p className="text-xs text-red-500 mt-0.5">{errors.bank_name}</p>}
              </div>
              <div>
                <Label className="text-xs">No. Rekening <span className="text-red-500">*</span></Label>
                <Input value={form.bank_account_number} onChange={e => set("bank_account_number", e.target.value)} placeholder="No. rekening" className={`mt-0.5 ${errors.bank_account_number ? "border-red-500" : ""}`} />
                {errors.bank_account_number && <p className="text-xs text-red-500 mt-0.5">{errors.bank_account_number}</p>}
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Nama Pemilik Rekening <span className="text-red-500">*</span></Label>
                <Input value={form.bank_account_name} onChange={e => set("bank_account_name", e.target.value)} placeholder="Nama sesuai rekening" className={`mt-0.5 ${errors.bank_account_name ? "border-red-500" : ""}`} />
                {errors.bank_account_name && <p className="text-xs text-red-500 mt-0.5">{errors.bank_account_name}</p>}
              </div>
            </div>
          </div>

          {!isValid && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Mohon isi semua field bertanda * terlebih dahulu
            </p>
          )}

          <div className="sticky bottom-0 pt-4 bg-card border-t border-border -mx-6 px-6 pb-6">
            <Button type="submit" className="w-full gap-2 h-11" disabled={saving || !isValid}>
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Simpan & Lanjutkan</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}