import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ImagePlus, X, CheckCircle2 } from "lucide-react";
import { compressImage } from "@/lib/useImageCompression";
import { toast } from "sonner";

function formatRp(n) {
  return "Rp " + Math.round(Number(n || 0)).toLocaleString("id-ID");
}

export default function ApproveTopUpDialog({ request, onClose, onSaved }) {
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, quality: 0.8 });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed.file });
      setProofUrl(file_url);
    } catch (err) {
      toast.error("Gagal upload: " + (err?.message || ""));
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('processTopUpRequest', {
        action: 'approve',
        request_id: request.id,
        transfer_proof_url: proofUrl || undefined,
        transfer_date: transferDate,
      });
      toast.success("Top-up disetujui & ditransfer. Saldo bertambah.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.data?.error || err?.message || ""));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <p className="text-xs text-muted-foreground">Request dari</p>
        <p className="font-semibold">{request.requester_name}</p>
        <p className="text-lg font-bold text-primary mt-1">{formatRp(request.amount_requested)}</p>
        <p className="text-xs text-muted-foreground mt-1">{request.reason}</p>
      </div>
      <div>
        <Label className="text-xs">Tanggal Transfer *</Label>
        <Input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Bukti Transfer (opsional)</Label>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        {proofUrl ? (
          <div className="relative mt-1 inline-block w-full">
            <img src={proofUrl} alt="bukti transfer" className="w-full max-h-48 object-contain rounded-lg border" />
            <button type="button" onClick={() => setProofUrl("")} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="mt-1 w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors">
            {uploading ? <Loader2 className="w-5 h-5 mx-auto animate-spin text-muted-foreground" /> : <ImagePlus className="w-5 h-5 mx-auto text-muted-foreground" />}
            <p className="text-xs text-muted-foreground mt-1">{uploading ? "Mengupload..." : "Upload screenshot m-banking"}</p>
          </button>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1 bg-green-600 hover:bg-green-700 gap-1.5" onClick={handleApprove} disabled={saving || uploading}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {saving ? "Memproses..." : "Setujui & Transfer"}
        </Button>
      </div>
    </div>
  );
}