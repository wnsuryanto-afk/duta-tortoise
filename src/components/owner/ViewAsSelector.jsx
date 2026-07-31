import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, User, ChevronRight, UserPlus } from "lucide-react";
import { useViewAs } from "@/lib/ViewAsContext";
import { ROLE_LABELS } from "@/lib/permissions";
import { useNavigate } from "react-router-dom";

const ROLE_OPTIONS = [
  { role: "owner",         emoji: "👑", label: "Owner",         desc: "Kembali ke tampilan Owner (akses penuh)" },
  { role: "manajer",       emoji: "📊", label: "Manajer",       desc: "Dashboard keuangan, SDM, breeding" },
  { role: "admin",         emoji: "🗂️", label: "Admin",         desc: "Approval queue, stok, treatment" },
  { role: "kepala_feeder", emoji: "👨‍💼", label: "Kepala Feeder", desc: "Feeding, SOP, kandang, kas kecil" },
  { role: "keeper",        emoji: "👷", label: "Keeper",        desc: "Tugas harian, checklist, treatment" },
  { role: "investor",      emoji: "💼", label: "Investor",      desc: "Laporan keuangan & populasi (read-only)" },
];

export default function ViewAsSelector({ open, onClose }) {
  const { activateViewAs } = useViewAs();
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserMode, setShowUserMode] = useState(false);
  const [testSave, setTestSave] = useState(false);
  const navigate = useNavigate();

  const { data: users = [] } = useActiveUsers({ enabled: open });

  const nonOwners = users.filter(u => u.role !== "owner");

  const handleSelectRole = (role, label) => {
    if (role === "owner") {
      activateViewAs(null, "Owner");
      onClose();
      return;
    }
    const matchingUser = users.find(u => u.role === role);
    const userEmail = matchingUser?.email || null;
    activateViewAs(role, label, userEmail, { testSave });
    onClose();
    if (testSave) navigate("/sop");
    setTestSave(false);
  };

  const handleSelectUser = (u) => {
    activateViewAs(u.role || "keeper", `${u.full_name || u.email} (${ROLE_LABELS[u.role] || u.role})`, u.email, { testSave });
    onClose();
    if (testSave) navigate("/sop");
    setTestSave(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-primary" /> Lihat Sebagai
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Simulasikan tampilan sesuai role. Anda tetap sebagai Owner — tidak ada data yang berubah, kecuali "Mode uji" aktif.
          </p>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex border-b">
          <button
            onClick={() => setShowUserMode(false)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${!showUserMode ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/40"}`}
          >
            Per Role
          </button>
          <button
            onClick={() => setShowUserMode(true)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${showUserMode ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/40"}`}
          >
            <User className="inline w-3 h-3 mr-1" /> Per Karyawan
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {!showUserMode ? (
            <div className="py-2">
              {ROLE_OPTIONS.map(({ role, emoji, label, desc }) => {
                const matchingUsers = users.filter(u => u.role === role);
                const hasUsers = matchingUsers.length > 0;

                return (
                  <button
                    key={role}
                    onClick={() => handleSelectRole(role, label)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors text-left group"
                  >
                    <span className="text-xl w-8 text-center">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                      {!hasUsers && role !== "owner" && (
                        <Badge variant="outline" className="text-[10px] mt-0.5 border-amber-300 text-amber-600 bg-amber-50">
                          Belum ada user
                        </Badge>
                      )}
                      {hasUsers && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {matchingUsers.length} user terdaftar
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-2">
              {nonOwners.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <User className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>Belum ada karyawan terdaftar</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 gap-1.5"
                    onClick={() => { navigate("/users"); onClose(); }}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Daftarkan User
                  </Button>
                </div>
              ) : (
                nonOwners.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      {(u.full_name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <Badge variant="outline" className="text-[10px] mt-0.5">{ROLE_LABELS[u.role] || u.role}</Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={testSave}
              onChange={(e) => setTestSave(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <div>
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">🧪 Mode uji — simpan data sebagai test</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Penyimpanan berfungsi (data benar-benar tersimpan) tapi ditandai <strong>is_test_data</strong> agar tidak masuk laporan/hitung poin. Memilih role langsung membuka halaman tugas keeper.
              </p>
            </div>
          </label>
          <Button variant="outline" className="w-full" onClick={onClose}>Batal</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}