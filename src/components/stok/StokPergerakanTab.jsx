import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ArrowUp, ArrowDown, CheckCircle2, Clock, XCircle, Search, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canApprove } from "@/lib/permissions";
import { batalkanPergerakan, pesanKonfirmasi, sudahMenggerakkanStok } from "@/lib/koreksiPergerakan";
import { toast } from "sonner";
import { rupiah } from "@/lib/rupiah";
import FormPergerakanStok from "@/components/stok/FormPergerakanStok";


function StatusBadge({ status }) {
  const map = {
    selesai: { label: "Selesai", cls: "bg-green-100 text-green-700" },
    menunggu_approval: { label: "Menunggu", cls: "bg-yellow-100 text-yellow-700" },
    disetujui: { label: "Disetujui", cls: "bg-blue-100 text-blue-700" },
    ditolak: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge className={`text-[10px] ${s.cls}`}>{s.label}</Badge>;
}

// ── Movement Form ───────────────────────────────────────────────────────
// MovementForm dipindah ke components/stok/FormPergerakanStok.jsx supaya
// beranda bisa memakai formulir yang SAMA, bukan jalur kedua yang menulis
// StockMovement sendiri. Lihat keterangan panjang di berkas itu.

// ── MAIN ─────────────────────────────────────────────────────────────
export default function StokPergerakanTab({ movements, feedstocks, warehouseItems, batches = [], role }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const canApproveRole = canApprove(role);

  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState("semua");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [search, setSearch] = useState("");
  const [membatalkan, setMembatalkan] = useState(null);
  const threshold = 500000; // default, bisa dari CompanySettings

  const filtered = useMemo(() => {
    return movements.filter(m => {
      const matchType = typeFilter === "semua" || m.type === typeFilter;
      const matchStatus = statusFilter === "semua" || m.status === statusFilter;
      const matchSearch = !search || m.item_name?.toLowerCase().includes(search.toLowerCase());
      return matchType && matchStatus && matchSearch;
    });
  }, [movements, typeFilter, statusFilter, search]);

  /*
   * Pembatalan satu baris pergerakan.
   *
   * Ada karena Ambil Barang menulis baris di sini langsung dari kamera:
   * salah baca barang atau salah baca jumlah langsung memotong stok, dan
   * sampai hari ini tidak ada satu pun tombol untuk membatalkannya. Tab
   * Riwayat Pakan sudah punya sejak lama — barisnya sejenis, perlakuannya
   * berbeda, dan yang tanpa tombol justru yang diisi mesin.
   *
   * Aturan pengembaliannya dipegang lib/koreksiPergerakan, dipakai bersama
   * dengan tab pakan, supaya tidak ada dua jawaban untuk satu pertanyaan.
   */
  const handleBatalkan = async (m) => {
    const batch = m.batch_id ? batches.find((b) => b.id === m.batch_id) : null;
    if (!confirm(pesanKonfirmasi(m, { adaBatch: !!batch }))) return;
    setMembatalkan(m.id);
    try {
      const hasil = await batalkanPergerakan(base44, m, {
        pakan: feedstocks, gudang: warehouseItems, batch: batches,
      });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["feedstocks"] });
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
      qc.invalidateQueries({ queryKey: ["batch-barang"] });
      // Disebut apa adanya: kalau barangnya sudah tidak ada di daftar,
      // stoknya TIDAK dikembalikan, dan diam soal itu lebih buruk daripada
      // tidak menghapus sama sekali.
      toast.success(
        sudahMenggerakkanStok(m)
          ? (hasil.stokDikembalikan
              ? `Pergerakan dihapus, stok dikembalikan${hasil.batchDikembalikan ? " (termasuk sisa batch)" : ""}`
              : "Pergerakan dihapus — barangnya tidak ditemukan, stok TIDAK dikembalikan")
          : "Pergerakan dihapus (belum pernah menggerakkan stok)"
      );
    } catch (e) {
      toast.error("Gagal membatalkan: " + (e?.message || ""));
    }
    setMembatalkan(null);
  };

  const handleApprove = async (m) => {
    await base44.entities.StockMovement.update(m.id, {
      status: "disetujui",
      approved_by: user?.full_name || user?.email,
      approved_at: new Date().toISOString(),
    });
    // Update stok setelah disetujui
    const allList = m.item_type === "feedstock" ? feedstocks : warehouseItems;
    const entity = m.item_type === "feedstock" ? base44.entities.FeedStock : base44.entities.WarehouseItem;
    const current = allList.find(i => i.id === m.item_id);
    if (current) {
      const newStock = m.type === "masuk"
        ? current.current_stock + (m.quantity || 0)
        : Math.max(0, current.current_stock - (m.quantity || 0));
      await entity.update(m.item_id, { current_stock: newStock });
    }
    qc.invalidateQueries({ queryKey: ["stock-movements"] });
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
  };

  const handleReject = async (m) => {
    const reason = prompt("Alasan penolakan:");
    if (!reason) return;
    await base44.entities.StockMovement.update(m.id, { status: "ditolak", rejected_reason: reason });
    qc.invalidateQueries({ queryKey: ["stock-movements"] });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Tipe</SelectItem>
            <SelectItem value="masuk">↑ Masuk</SelectItem>
            <SelectItem value="keluar">↓ Keluar</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            <SelectItem value="selesai">Selesai</SelectItem>
            <SelectItem value="menunggu_approval">Menunggu Approval</SelectItem>
            <SelectItem value="disetujui">Disetujui</SelectItem>
            <SelectItem value="ditolak">Ditolak</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gap-1.5 h-9 text-sm ml-auto" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Catat Pergerakan
        </Button>
      </div>

      {/* Pending approvals alert */}
      {movements.filter(m => m.status === "menunggu_approval").length > 0 && canApproveRole && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>{movements.filter(m => m.status === "menunggu_approval").length} transaksi menunggu approval Anda</span>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Tanggal</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Item</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Tipe</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Qty</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Total Nilai</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Oleh</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Belum ada data pergerakan stok</td>
                </tr>
              ) : (
                filtered.map(m => (
                  <tr key={m.id} className={`hover:bg-muted/30 transition-colors ${m.status === "menunggu_approval" ? "bg-yellow-50/40" : ""}`}>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {m.date ? format(new Date(m.date), "d MMM yy", { locale: idLocale }) : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{m.item_name}</p>
                      {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      {m.type === "masuk"
                        ? <span className="flex items-center gap-1 text-green-700 text-xs font-medium"><ArrowUp className="w-3.5 h-3.5" />Masuk</span>
                        : <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><ArrowDown className="w-3.5 h-3.5" />Keluar</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {m.quantity} <span className="text-xs font-normal text-muted-foreground">{m.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs">
                      {m.total_value ? rupiah(m.total_value) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{m.by_name || m.by_email || "-"}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={m.status || "selesai"} /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {m.status === "menunggu_approval" && canApproveRole && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleApprove(m)} title="Setujui">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleReject(m)} title="Tolak">
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 text-destructive"
                          disabled={membatalkan === m.id}
                          onClick={() => handleBatalkan(m)}
                          title="Hapus & kembalikan stok"
                        >
                          {membatalkan === m.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t text-xs text-muted-foreground bg-muted/20">
          {filtered.length} transaksi
        </div>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) setShowForm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Pergerakan Stok</DialogTitle>
          </DialogHeader>
          <FormPergerakanStok
            feedstocks={feedstocks}
            warehouseItems={warehouseItems}
            onClose={() => setShowForm(false)}
            threshold={threshold}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}