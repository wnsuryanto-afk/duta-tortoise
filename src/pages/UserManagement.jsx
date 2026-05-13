import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Mail, Shield, Loader2, Users } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { ROLE_LABELS, ROLE_COLORS, canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";

function InviteUserDialog({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("keeper");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.users.inviteUser(email, role === "owner" || role === "admin" ? "admin" : "user");
    // Also store role in our User entity (will be updated when user first logs in)
    setLoading(false);
    setDone(true);
    setTimeout(() => { setDone(false); onClose(); setEmail(""); setRole("keeper"); }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Undang Pengguna Baru</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <p className="font-medium">Undangan terkirim!</p>
            <p className="text-sm text-muted-foreground mt-1">{email}</p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@contoh.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keeper">Keeper</SelectItem>
                  <SelectItem value="manajer">Manajer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {role === "keeper" && "Kelola tortoise & kesehatan, lihat pembiakan"}
                {role === "manajer" && "Kelola tortoise, kesehatan, pembiakan, lihat penjualan"}
                {role === "admin" && "Akses penuh termasuk manajemen user"}
                {role === "owner" && "Akses penuh semua fitur & pengaturan"}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Kirim Undangan
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditRoleDialog({ open, onClose, targetUser }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState(targetUser?.role || "keeper");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await base44.entities.User.update(targetUser.id, { role });
    queryClient.invalidateQueries({ queryKey: ["users"] });
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Ubah Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">{targetUser?.full_name || targetUser?.email}</p>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keeper">Keeper</SelectItem>
                <SelectItem value="manajer">Manajer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagement() {
  const { user: currentUser, role } = useCurrentUser();
  const [showInvite, setShowInvite] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("-created_date", 100),
  });

  if (!canAccess(role, "users")) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Manajemen User</h1>
          <p className="text-muted-foreground mt-1">{users.length} pengguna terdaftar</p>
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Undang Pengguna
        </Button>
      </div>

      {/* Role info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            role: "keeper",
            desc: "Kelola tortoise & kesehatan",
            perms: ["✅ Lihat Dashboard", "✅ Kelola Tortoise", "✅ Kelola Kesehatan", "👁 Lihat Pembiakan", "❌ Penjualan", "❌ Manajemen User"],
          },
          {
            role: "manajer",
            desc: "Kelola operasional harian",
            perms: ["✅ Lihat Dashboard", "✅ Kelola Tortoise", "✅ Kelola Kesehatan", "✅ Kelola Pembiakan", "👁 Lihat Penjualan", "❌ Manajemen User"],
          },
          {
            role: "admin",
            desc: "Akses penuh + kelola user",
            perms: ["✅ Lihat Dashboard", "✅ Kelola Tortoise", "✅ Kelola Kesehatan", "✅ Kelola Pembiakan", "✅ Kelola Penjualan", "✅ Manajemen User"],
          },
          {
            role: "owner",
            desc: "Akses penuh semua fitur",
            perms: ["✅ Lihat Dashboard", "✅ Kelola Tortoise", "✅ Kelola Kesehatan", "✅ Kelola Pembiakan", "✅ Kelola Penjualan", "✅ Manajemen User"],
          },
        ].map(({ role, desc, perms }) => (
          <Card key={role} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <Badge variant="outline" className={`text-xs ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{desc}</p>
            <ul className="space-y-1">
              {perms.map((p) => (
                <li key={p} className="text-xs">{p}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* User list */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Daftar Pengguna
          </h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {(u.full_name || u.email || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.role] || ROLE_COLORS.keeper}`}>
                    {ROLE_LABELS[u.role] || "Keeper"}
                  </Badge>
                  {u.id !== currentUser?.id && (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditTarget(u)}>
                      Ubah Role
                    </Button>
                  )}
                  {u.id === currentUser?.id && (
                    <span className="text-xs text-muted-foreground italic">(Anda)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <InviteUserDialog open={showInvite} onClose={() => setShowInvite(false)} />
      {editTarget && (
        <EditRoleDialog open={!!editTarget} onClose={() => setEditTarget(null)} targetUser={editTarget} />
      )}
    </div>
  );
}