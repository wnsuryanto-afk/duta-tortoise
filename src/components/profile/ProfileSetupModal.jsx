import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Loader2, UserCircle2 } from "lucide-react";

export default function ProfileSetupModal({ open, user }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const fileRef = useRef(null);
  const camRef = useRef(null);
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    phone: "",
    address: "",
    id_number: "",
    emergency_contact: "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone) return;
    setSaving(true);

    // Update nama di user entity
    await base44.auth.updateMe({ full_name: form.full_name });

    // Simpan profil lengkap
    const existingProfiles = await base44.entities.UserProfile.filter({ user_email: user.email });
    const profileData = {
      user_id: user.id,
      user_email: user.email,
      full_name: form.full_name,
      phone: form.phone,
      address: form.address,
      id_number: form.id_number,
      emergency_contact: form.emergency_contact,
      photo_url: photoUrl,
      join_date: new Date().toISOString().split("T")[0],
      is_complete: true,
    };

    if (existingProfiles.length > 0) {
      await base44.entities.UserProfile.update(existingProfiles[0].id, profileData);
    } else {
      await base44.entities.UserProfile.create(profileData);
    }

    qc.invalidateQueries({ queryKey: ["currentUser"] });
    qc.invalidateQueries({ queryKey: ["user-profile"] });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Lengkapi Data Pribadi</DialogTitle>
          <p className="text-sm text-muted-foreground">Selamat datang! Mohon lengkapi data diri Anda sebelum menggunakan aplikasi.</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Foto Profil */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center relative">
              {photoUrl ? (
                <img src={photoUrl} alt="Foto profil" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-16 h-16 text-muted-foreground/40" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <ImagePlus className="w-3.5 h-3.5" /> Galeri
              </Button>
              <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => camRef.current?.click()} disabled={uploading}>
                <Camera className="w-3.5 h-3.5" /> Kamera
              </Button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e.target.files?.[0])} />
            <input ref={camRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => handlePhotoUpload(e.target.files?.[0])} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nama Lengkap *</Label>
              <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Nama lengkap" required />
            </div>
            <div>
              <Label>No. Telepon *</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="08xx" required />
            </div>
            <div>
              <Label>No. KTP</Label>
              <Input value={form.id_number} onChange={e => set("id_number", e.target.value)} placeholder="16 digit" />
            </div>
            <div className="col-span-2">
              <Label>Alamat</Label>
              <Textarea value={form.address} onChange={e => set("address", e.target.value)} rows={2} placeholder="Alamat lengkap" />
            </div>
            <div className="col-span-2">
              <Label>Kontak Darurat</Label>
              <Input value={form.emergency_contact} onChange={e => set("emergency_contact", e.target.value)} placeholder="Nama & nomor kontak darurat" />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={saving || !form.full_name || !form.phone}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving ? "Menyimpan..." : "Simpan & Mulai"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}