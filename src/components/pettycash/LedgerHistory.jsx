import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, ImageIcon, Pencil, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { PETTYCASH_CAT_LABELS } from "@/lib/financeCategories";
import { usePettyCashCategories } from "@/hooks/useEntityCategories";
import { logActivity } from "@/lib/logActivity";
import EditLedgerEntryDialog from "./EditLedgerEntryDialog";
import { toast } from "sonner";

const TYPE_CONFIG = {
  top_up:      { label: "Top Up",      color: "bg-green-100 text-green-700 border-green-200", sign: "+" },
  pemakaian:   { label: "Pemakaian",   color: "bg-red-100 text-red-700 border-red-200", sign: "−" },
  penyesuaian: { label: "Penyesuaian", color: "bg-gray-100 text-gray-600 border-gray-200", sign: "±" },
};

const CAT_LABELS = PETTYCASH_CAT_LABELS;

function formatRp(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

export default function LedgerHistory({ ledger, role }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { cats: pettyCats } = usePettyCashCategories();

  const canEdit = ["owner", "admin", "manajer"].includes(role);
  const canDelete = ["owner", "admin"].includes(role);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["petty-cash-ledger"] });
    qc.invalidateQueries({ queryKey: ["finance-transactions"] });
  };

  // Sort by (entry_date desc, created_date desc) for correct latest-first display
  const sortedLedger = useMemo(() => {
    return [...ledger].sort((a, b) => {
      const d = (b.entry_date || "").localeCompare(a.entry_date || "");
      return d !== 0 ? d : (b.created_date || "").localeCompare(a.created_date || "");
    });
  }, [ledger]);

  const months = useMemo(() => {
    return [...new Set(sortedLedger.map(l => l.entry_date?.substring(0, 7)).filter(Boolean))].sort().reverse();
  }, [sortedLedger]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sortedLedger.filter(l => {
      const matchSearch = !q
        || l.description?.toLowerCase().includes(q)
        || l.notes?.toLowerCase().includes(q)
        || l.recorded_by_name?.toLowerCase().includes(q);
      const matchMonth = filterMonth === "all" || l.entry_date?.startsWith(filterMonth);
      const matchType = filterType === "all" || l.entry_type === filterType;
      const matchCat = filterCat === "all" || l.category === filterCat;
      return matchSearch && matchMonth && matchType && matchCat;
    });
  }, [sortedLedger, search, filterMonth, filterType, filterCat]);

  const handleDelete = async () => {
    if (!deletingEntry) return;
    setDeleteBusy(true);
    try {
      if (deletingEntry.finance_tx_id) {
        await base44.entities.FinanceTransaction.delete(deletingEntry.finance_tx_id);
      }
      await base44.entities.PettyCashLedger.delete(deletingEntry.id);
      await base44.functions.invoke('recalculatePettyCashBalance', {});
      await logActivity({
        action: "delete",
        entity_type: "PettyCashLedger",
        entity_id: deletingEntry.id,
        entity_name: `Kas kecil — ${deletingEntry.description || ""}`,
        changes_summary: `Menghapus entri ${deletingEntry.entry_type} Rp ${Number(deletingEntry.amount || 0).toLocaleString("id-ID")}`,
      });
      toast.success("Entri dihapus & saldo dihitung ulang");
      invalidate();
      setDeletingEntry(null);
    } catch (err) {
      toast.error("Gagal hapus: " + (err?.message || ""));
    }
    setDeleteBusy(false);
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari keterangan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Bulan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bulan</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{format(new Date(m + "-01"), "MMM yyyy", { locale: id })}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Jenis" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            <SelectItem value="top_up">Top Up</SelectItem>
            <SelectItem value="pemakaian">Pemakaian</SelectItem>
            <SelectItem value="penyesuaian">Penyesuaian</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent className="max-h-72 overflow-y-auto">
            <SelectItem value="all">Semua Kategori</SelectItem>
            {(pettyCats.length ? pettyCats : Object.entries(CAT_LABELS).map(([k, v]) => ({ value: k, label: v }))).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <p>Belum ada transaksi</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(l => {
            const tc = TYPE_CONFIG[l.entry_type] || TYPE_CONFIG.penyesuaian;
            return (
              <div key={l.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${tc.color}`}>
                  {tc.sign}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium truncate">{l.description || "—"}</span>
                    {l.proof_photo && <ImageIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <Badge variant="outline" className={`text-[10px] py-0 ${tc.color}`}>{tc.label}</Badge>
                    {l.category && l.entry_type === "pemakaian" && (
                      <Badge variant="outline" className="text-[10px] py-0">{CAT_LABELS[l.category] || l.category}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(l.entry_date), "d MMM yyyy", { locale: id })}
                    </span>
                    <span className="text-xs text-muted-foreground">· {l.recorded_by_name || "—"}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${l.entry_type === "top_up" ? "text-green-700" : l.entry_type === "pemakaian" ? "text-red-600" : "text-gray-600"}`}>
                    {tc.sign} {formatRp(l.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">Saldo: {formatRp(l.balance_after)}</p>
                </div>
                {(canEdit || canDelete) && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {canEdit && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingEntry(l)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeletingEntry(l)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(v) => !v && setEditingEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-primary" /> Edit Entri Kas Kecil</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <EditLedgerEntryDialog
              entry={editingEntry}
              onClose={() => setEditingEntry(null)}
              onSaved={() => { invalidate(); setEditingEntry(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEntry} onOpenChange={(v) => !v && setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Entri Kas Kecil?</AlertDialogTitle>
            <AlertDialogDescription>
              Entri "{deletingEntry?.description}" sebesar {formatRp(deletingEntry?.amount)} akan dihapus permanen.
              {deletingEntry?.finance_tx_id && " Transaksi keuangan terkait juga akan dihapus."}
              {" "}Saldo berjalan akan dihitung ulang otomatis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={deleteBusy}>
              {deleteBusy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}