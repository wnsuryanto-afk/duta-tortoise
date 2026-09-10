import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Mail, Loader2, Users, UserX, Search, Crown, ChevronRight } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { ROLE_LABELS, ROLE_COLORS, canManageUsers, canInviteUser, canEditUsers } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import UserDetailPage from "@/pages/UserDetailPage";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const ROLE_DESCRIPTIONS = {
  keeper:         "Kelola kura-kura & kesehatan. Tidak bisa akses penjualan & keuangan.",
  kepala_feeder:  "Semua akses Keeper + pegang kas kecil, input formulasi pelet, ambil bahan baku tanpa approval.",
  manajer:        "Akses penuh operasional termasuk penjualan & keuangan. Tidak bisa kelola user.",
  admin:          "Akses penuh seperti Manajer. Tidak bisa hapus data permanen.",
  owner:          "Akses penuh semua fitur & pengaturan sistem.",
  investor:       "Read-only. Hanya bisa lihat dashboard, kura-kura, breeding, keuangan, dan statistik.",
};

// ── Invite Dialog ─────────────────────────────────────────────────────
function InviteUserDialog({ open, onClose, canInviteAsOwner }) {
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
                  <SelectItem value="kepala_feeder">🧑‍🌾 Kepala Feeder</SelectItem>
                  <SelectItem value="manajer">👔 Manajer</SelectItem>
                  <SelectItem value="admin">🛡️ Admin</SelectItem>
                  {canInviteAsOwner && <SelectItem value="owner">👑 Owner</SelectItem>}
                  <SelectItem value="investor">👁 Investor</SelectItem>
                </SelectContent>
              </Select>
              {role && ROLE_DESCRIPTIONS[role] && (
                <p className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded-lg">{ROLE_DESCRIPTIONS[role]}</p>
              )}
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

// ════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════
export default function UserManagement() {
  const { user: currentUser, role } = useCurrentUser();
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("semua");
  const [statusFilter, setStatusFilter] = useState("aktif");
  const [selectedUserId, setSelectedUserId] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("-created_date", 100),
  });

  // Block keeper entirely
  if (!canManageUsers(role)) return <AccessDenied message="Halaman ini hanya untuk Owner, Manajer, dan Admin." />;

  const ownerOnly = canEditUsers(role);
  const canInvite = canInviteUser(role);

  // If a user is selected, show detail page
  if (selectedUserId) {
    return <UserDetailPage userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
  }

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.role || "").toLowerCase().includes(search.toLowerCase());
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
          <h1 className="text-3xl font-heading font-bold">
            {role === "admin" ? "Direktori User" : "Manajemen User"}
          </h1>
          <p className="text-muted-foreground mt-1">{activeCount} pengguna aktif dari {users.length} terdaftar</p>
        </div>
        {canInvite && (
          <Button onClick={() => setShowInvite(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Tambah User Baru
          </Button>
        )}
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { r: "owner",          emoji: "👑", desc: "Owner" },
          { r: "manajer",        emoji: "👔", desc: "Manajer" },
          { r: "admin",          emoji: "🛡️", desc: "Admin" },
          { r: "kepala_feeder",  emoji: "🌿", desc: "Kep. Feeder" },
          { r: "keeper",         emoji: "🐢", desc: "Keeper" },
          { r: "investor",       emoji: "👁", desc: "Investor" },
        ].map(({ r, emoji, desc }) => (
          <Card key={r} className="p-3 text-center cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setRoleFilter(roleFilter === r ? "semua" : r)}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-lg">{emoji}</span>
              <Badge variant="outline" className={`text-xs ${ROLE_COLORS[r]}`}>{desc}</Badge>
            </div>
            <p className="text-2xl font-bold text-primary">{users.filter(u => u.role === r).length}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari nama, email, atau role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filter Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Role</SelectItem>
              {/* Daftar tetap yang lama tidak memuat "kicked" — padahal tiga
                  akun berstatus itu, dan justru akun seperti itulah yang
                  perlu dicari saat merapikan akses. Sekarang pilihan
                  dilengkapi dari role yang benar-benar ada di data, jadi
                  tidak ada akun yang tersembunyi dari penyaring. */}
              {ROLE_TAMPIL.map(r => (
                <SelectItem key={r} value={r}>{ROLE_LABEL[r] || r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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
        <div className="p-4 border-b">
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
                <div
                  key={u.id}
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer ${isKicked ? "opacity-60" : ""}`}
                  onClick={() => setSelectedUserId(u.id)}
                >
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                    isKicked ? "bg-red-100 text-red-500" : u.role === "owner" ? "bg-purple-100 text-purple-700" : "bg-primary/10 text-primary"
                  }`}>
                    {isKicked ? <UserX className="w-5 h-5" /> : u.role === "owner" ? <Crown className="w-4 h-4" /> : (u.full_name || u.email || "?")[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{u.full_name || "Tanpa Nama"}</p>
                      {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">Anda</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-[10px] text-muted-foreground/70">Bergabung {joinDate}</p>
                  </div>

                  {/* Badges + arrow */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={`text-xs hidden sm:inline-flex ${isKicked ? ROLE_COLORS.kicked : (ROLE_COLORS[u.role] || ROLE_COLORS.keeper)}`}>
                      {isKicked ? "Nonaktif" : (ROLE_LABELS[u.role] || "Keeper")}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${isKicked ? "bg-muted text-muted-foreground border-border" : "bg-green-100 text-green-700 border-green-200"}`}>
                      {isKicked ? "⚫" : "🟢"}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <InviteUserDialog
        open={showInvite}
        onClose={() => setShowInvite(false)}
        canInviteAsOwner={ownerOnly}
      />
    </div>
  );
}