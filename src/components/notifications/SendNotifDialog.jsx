import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Users } from "lucide-react";
import { useActiveUsers } from "@/hooks/useActiveUsers";

export default function SendNotifDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "", message: "", type: "info", category: "sistem",
    recipient_type: "semua_role", recipient_role: "semua", recipient_email: ""
  });
  const [saving, setSaving] = useState(false);

  const { data: users = [] } = useActiveUsers();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSend = async () => {
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const base = {
      title: form.title,
      message: form.message,
      type: form.type,
      category: form.category,
      is_read: false,
      created_at: today,
    };

    if (form.recipient_type === "semua_role") {
      // kirim ke semua user / role tertentu
      const targets = form.recipient_role === "semua"
        ? users
        : users.filter(u => u.role === form.recipient_role);

      await Promise.all(targets.map(u =>
        base44.entities.Notification.create({ ...base, recipient_email: u.email, recipient_role: u.role || "semua" })
      ));
    } else {
      // kirim ke 1 email spesifik
      await base44.entities.Notification.create({ ...base, recipient_email: form.recipient_email });
    }

    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Kirim Notifikasi
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Kirim Ke</Label>
            <Select value={form.recipient_type} onValueChange={v => set("recipient_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua_role">Berdasarkan Role</SelectItem>
                <SelectItem value="email">Email Tertentu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.recipient_type === "semua_role" ? (
            <div className="space-y-1.5">
              <Label>Role Penerima</Label>
              <Select value={form.recipient_role} onValueChange={v => set("recipient_role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua User</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manajer">Manajer</SelectItem>
                  <SelectItem value="keeper">Keeper</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.recipient_email} onChange={e => set("recipient_email", e.target.value)} placeholder="email@contoh.com" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipe</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ℹ️ Info</SelectItem>
                  <SelectItem value="warning">⚠️ Warning</SelectItem>
                  <SelectItem value="alert">🔴 Alert</SelectItem>
                  <SelectItem value="success">✅ Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sistem">Sistem</SelectItem>
                  <SelectItem value="stok">Stok</SelectItem>
                  <SelectItem value="kesehatan">Kesehatan</SelectItem>
                  <SelectItem value="breeding">Breeding</SelectItem>
                  <SelectItem value="keuangan">Keuangan</SelectItem>
                  <SelectItem value="absensi">Absensi</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Judul *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Judul notifikasi" />
          </div>
          <div className="space-y-1.5">
            <Label>Pesan *</Label>
            <Textarea value={form.message} onChange={e => set("message", e.target.value)} rows={3} placeholder="Isi pesan..." />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={handleSend} disabled={!form.title || !form.message || saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Kirim
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}