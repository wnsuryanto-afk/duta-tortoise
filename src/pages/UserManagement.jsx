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
import { UserPlus, Mail, Shield, Loader2, Users, UserX, AlertTriangle, Search, Crown } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { ROLE_LABELS, ROLE_COLORS, canManageUsers } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const ROLE_DESCRIPTIONS = {
  keeper:   "Kelola kura-kura & kesehatan. Tidak bisa akses penjualan & keuangan.",
  manajer:  "Akses penuh operasional termasuk penjualan & keuangan. Tidak bisa kelola user.",
  admin:    "Akses penuh seperti Manajer. Tidak bisa hapus data permanen.",
  owner:    "Akses penuh semua fitur & pengaturan sistem.",
  investor: "Hanya lihat: Dashboard, Tortoise, Pembiakan, Keuangan.",
};

function InviteUserDialog({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("keeper");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.users.inviteUser(email, role === "owner" || role === "admin" ? "admin" : "user");
    base44.functions.invoke("notifyNewUser", { newUserEmail: email, newUserName: email });
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
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" required />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keeper">🐢 Keeper</SelectItem>
                  <SelectItem value="manajer">👔 Manajer</SelectItem>
                  <SelectItem value="admin">🛡️ Admin</SelectItem>
                  <SelectItem value="owner">👑 Owner</SelectItem>
                  <SelectItem value="investor">💰 Investor</SelectItem>
                </SelectContent>
              </Select>
              {role && <p className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded-lg">{ROLE_DESCRIPTIONS[role]}</p>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
              <Button type="submit" disabled={loading || !email}>
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
          <DialogTitle className="font-heading">Ubah Role Pengguna</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{(targetUser?.full_name || targetUser?.email || "?")[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="font-medium text-sm">{targetUser?.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground">{targetUser?.email}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role Baru</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="keeper">🐢 Keeper</SelectItem>
                <SelectItem value="manajer">👔 Manajer</SelectItem>
                <SelectItem value="admin">🛡️ Admin</SelectItem>
                <SelectItem value="owner">👑 Owner</SelectItem>
                <SelectItem value="investor">💰 Investor</SelectItem>
              </SelectContent>
            </Select>
            {role && <p className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded-lg">{ROLE_DESCRIPTIONS[role]}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateUserDialog({ open, onClose, targetUser, isDeactivate, onDone }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await base44.entities.User.update(targetUser.id, { role: isDeactivate ? "kicked" : (targetUser._prevRole || "keeper") });
    setLoading(false);
    onDone();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <UserX className="w-5 h-5 text-destructive" />
            {isDeactivate ? "Nonaktifkan Pengguna" : "Aktifkan Pengguna"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className={`flex items-start gap-3 p-3 rounded-xl border ${isDeactivate ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDeactivate ? "text-red-500" : "text-green-500"}`} />
            <div>
              <p className={`text-sm font-medium ${isDeactivate ? "text-red-800" : "text-green-800"}`}>
                {isDeactivate ? "Konfirmasi Nonaktifkan" : "Konfirmasi Aktifkan Kembali"}
              </p>
              <p className={`text-xs mt-1 ${isDeactivate ? "text-red-700" : "text-green-700"}`}>
                <strong>{targetUser?.full_name || targetUser?.email}</strong> akan {isDeactivate ? "dinonaktifkan dan tidak dapat mengakses sistem. Tindakan ini bisa dibatalkan." : "diaktifkan kembali sebagai Keeper."}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button
              variant={isDeactivate ? "destructive" : "default"}
              className="flex-1"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isDeactivate ? "Ya, Nonaktifkan" : "Aktifkan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagement() {
  const { user: currentUser, role } = useCurrentUser();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("semua");
  const [statusFilter, setStatusFilter] = useState("aktif");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("-created_date", 100),
  });

  // Hanya owner yang bisa akses
  if (!canManageUsers(role)) return <AccessDenied />;

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "semua" || u.role === roleFilter;
    const matchStatus = statusFilter === "semua" ||
      (statusFilter === "aktif" ? u.role !== "kicked" : u.role === "kicked");
    return matchSearch && matchRole && matchStatus;
  });

  const activeCount = users.filter(u => u.role !== "kicked").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Manajemen User</h1>
          <p className="text-muted-foreground mt-1">{activeCount} pengguna aktif dari {users.length} terdaftar</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Undang Pengguna
        </Button>
      </div>

      {/* Role legend cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          { role: "owner",    emoji: "👑", desc: "Full Access + Sistem" },
          { role: "manajer",  emoji: "👔", desc: "Operasional Penuh" },
          { role: "admin",    emoji: "🛡️", desc: "Seperti Manajer" },
          { role: "keeper",   emoji: "🐢", desc: "Field Worker" },
          { role: "investor", emoji: "💰", desc: "Lihat Saja" },
        ].map(({ role: r, emoji, desc }) => {
          const count = users.filter(u => u.role === r).length;
          return (
            <Card key={r} className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-lg">{emoji}</span>
                <Badge variant="outline" className={`text-xs ${ROLE_COLORS[r]}`}>{ROLE_LABELS[r]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{desc}</p>
              <p className="text-lg font-bold text-primary mt-1">{count}</p>
            </Card>
          );
        })}
      </div>

      {/* Filter & Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Role</SelectItem>
              <SelectItem value="owner">👑 Owner</SelectItem>
              <SelectItem value="manajer">👔 Manajer</SelectItem>
              <SelectItem value="admin">🛡️ Admin</SelectItem>
              <SelectItem value="keeper">🐢 Keeper</SelectItem>
              <SelectItem value="investor">💰 Investor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Status</SelectItem>
              <SelectItem value="aktif">Aktif</SelectItem>
              <SelectItem value="nonaktif">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* User list */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Daftar Pengguna ({filtered.length})
          </h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Tidak ada pengguna yang sesuai filter</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((u) => {
              const isMe = u.id === currentUser?.id;
              const isKicked = u.role === "kicked";
              const joinDate = u.created_date ? format(new Date(u.created_date), "d MMM yyyy", { locale: id }) : "—";

              return (
                <div key={u.id} className={`flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors ${isKicked ? "opacity-60 bg-red-50/40" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isKicked ? "bg-red-100" : u.role === "owner" ? "bg-purple-100" : "bg-primary/10"
                    }`}>
                      {isKicked
                        ? <UserX className="w-5 h-5 text-red-500" />
                        : u.role === "owner"
                          ? <Crown className="w-4 h-4 text-purple-600" />
                          : <span className="text-sm font-bold text-primary">{(u.full_name || u.email || "?")[0].toUpperCase()}</span>
                      }
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{u.full_name || "—"}</p>
                        {isMe && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">Anda</span>
                        )}
                        {isKicked && (
                          <span className="text-[10px] text-red-500 font-medium">Nonaktif</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      <p className="text-[10px] text-muted-foreground/70">Bergabung {joinDate}</p>
                    </div>
                  </div>

                  {/* Role badge + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={`text-xs ${isKicked ? ROLE_COLORS.kicked : (ROLE_COLORS[u.role] || ROLE_COLORS.keeper)}`}>
                      {isKicked ? "Nonaktif" : (ROLE_LABELS[u.role] || "Keeper")}
                    </Badge>

                    {!isMe && (
                      <div className="flex items-center gap-1">
                        {!isKicked && (
                          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setEditTarget(u)}>
                            Ubah Role
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-xs h-7 px-2 ${isKicked ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-destructive hover:text-destructive hover:bg-red-50"}`}
                          onClick={() => setDeactivateTarget({ ...u, _prevRole: u.role })}
                        >
                          <UserX className="w-3 h-3 mr-1" />
                          {isKicked ? "Aktifkan" : "Nonaktifkan"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <InviteUserDialog open={showInvite} onClose={() => setShowInvite(false)} />
      {editTarget && (
        <EditRoleDialog open={!!editTarget} onClose={() => setEditTarget(null)} targetUser={editTarget} />
      )}
      {deactivateTarget && (
        <DeactivateUserDialog
          open={!!deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          targetUser={deactivateTarget}
          isDeactivate={deactivateTarget?.role !== "kicked"}
          onDone={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
        />
      )}
    </div>
  );
}