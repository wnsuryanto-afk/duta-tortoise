import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Users } from "lucide-react";
import { useViewAs } from "@/lib/ViewAsContext";
import { ROLE_LABELS } from "@/lib/permissions";

export default function ViewAsSelector({ open, onClose }) {
  const { activateViewAs } = useViewAs();
  const [mode, setMode] = useState("role"); // "role" | "user"
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  const nonOwners = users.filter(u => u.role !== "owner");

  const handleActivate = () => {
    if (mode === "role" && selectedRole) {
      activateViewAs(selectedRole, ROLE_LABELS[selectedRole] || selectedRole);
      onClose();
    } else if (mode === "user" && selectedUser) {
      const u = users.find(u => u.id === selectedUser);
      if (u) {
        activateViewAs(u.role || "keeper", `${u.full_name || u.email} (${ROLE_LABELS[u.role] || u.role})`);
        onClose();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-4 h-4" /> Lihat Sebagai
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Simulasikan tampilan dan akses sesuai role atau user tertentu. Anda tetap sebagai Owner, hanya tampilan yang berubah.
          </p>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("role")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "role" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
            >
              Per Role
            </button>
            <button
              onClick={() => setMode("user")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "user" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
            >
              <Users className="inline w-3.5 h-3.5 mr-1" /> Per User
            </button>
          </div>

          {mode === "role" && (
            <div className="space-y-1.5">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keeper">🐢 Keeper</SelectItem>
                  <SelectItem value="kepala_feeder">🧑‍🌾 Kepala Feeder</SelectItem>
                  <SelectItem value="manajer">👔 Manajer</SelectItem>
                  <SelectItem value="admin">🛡️ Admin</SelectItem>
                  <SelectItem value="owner">👑 Owner</SelectItem>
                  <SelectItem value="investor">👁 Investor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "user" && (
            <div className="space-y-1.5">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih karyawan..." />
                </SelectTrigger>
                <SelectContent>
                  {nonOwners.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} — {ROLE_LABELS[u.role] || u.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleActivate}
              disabled={(mode === "role" && !selectedRole) || (mode === "user" && !selectedUser)}
            >
              <Eye className="w-4 h-4" /> Aktifkan Pratinjau
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}