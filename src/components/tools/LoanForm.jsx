import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function LoanForm({ user, onClose, onSaved }) {
  const [toolName, setToolName] = useState("");
  const [warehouseItemId, setWarehouseItemId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: tools = [] } = useQuery({
    queryKey: ["warehouse-alat-kerja"],
    queryFn: () => base44.entities.WarehouseItem.filter({ category: "alat_kerja" }),
    staleTime: 2 * 60 * 1000,
  });

  const handleSelectTool = (id) => {
    setWarehouseItemId(id);
    if (id) {
      const t = tools.find((t) => t.id === id);
      if (t) setToolName(t.name);
    }
  };

  const handleSubmit = async () => {
    if (!toolName.trim()) { toast.error("Nama alat wajib diisi"); return; }
    if (!purpose.trim()) { toast.error("Keperluan wajib diisi"); return; }
    setSaving(true);
    try {
      const selectedTool = tools.find((t) => t.id === warehouseItemId);
      await base44.entities.ToolLoan.create({
        tool_name: toolName.trim(),
        warehouse_item_id: warehouseItemId || null,
        warehouse_item_sku: selectedTool?.sku || null,
        borrower_name: user?.full_name || user?.email,
        borrower_email: user?.email,
        loan_date: format(new Date(), "yyyy-MM-dd"),
        purpose: purpose.trim(),
        status: "dipinjam",
      });
      toast.success("Alat berhasil dipinjam");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Pilih alat dari gudang (opsional)</Label>
        <select
          className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={warehouseItemId}
          onChange={(e) => handleSelectTool(e.target.value)}
        >
          <option value="">— Ketik manual / pilih —</option>
          {tools.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} {t.sku ? `(${t.sku})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Nama alat</Label>
        <Input
          value={toolName}
          onChange={(e) => { setToolName(e.target.value); setWarehouseItemId(""); }}
          placeholder="Nama alat yang dipinjam"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Keperluan</Label>
        <Textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Untuk apa alat ini dipinjam?"
          className="mt-1 h-16 resize-none text-sm"
          maxLength={200}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Batal</Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Pinjam
        </Button>
      </div>
    </div>
  );
}