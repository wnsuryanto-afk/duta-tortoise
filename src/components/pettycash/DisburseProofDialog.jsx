import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/useImageCompression";

function formatRp(n) {
  return "Rp " + Math.round(Number(n || 0)).toLocaleString("id-ID");
}

/**
 * Dialog untuk upload bukti transfer saat mencairkan request, atau menambah bukti menyusul.
 * mode="disburse" → pencairan penuh (dengan tombol Lewati/Tunai)
 * mode="add_proof" → tambah bukti menyusul pada request yang sudah dicairkan
 */
export default function DisburseProofDialog({ request, mode = "disburse", user, onClose, onSaved }) {
  const [proofUrl, setProofUrl] = useState(request?.disbursement_proof_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const isAddProofMode = mode === "add_proof";

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      toast.error("Format harus JPG/PNG/WEBP");
      return;
    }
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

  const handleDisburse = async (method) => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        status: "dicairkan",
        disbursement_date: new Date().toISOString().split("T")[0],
        disbursement_method: method,
        disbursement_proof_uploaded_at: now,
        disbursement_proof_uploaded_by: user?.full_name || user?.email,
      };
      if (method === "transfer" && proofUrl) {
        payload.disbursement_proof_url = proofUrl;
      }
      await base44.entities.PettyCashRequest.update(request.id, payload);
      toast.success(method === "transfer" ? "Dana dicairkan dengan bukti transfer" : "Dana dicairkan (tunai)");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setSaving(false);
  };

  const handleAddProof = async () => {
    if (!proofUrl) { toast.error("Upload bukti dulu"); return; }
    setSaving(true);
    try {
      await base44.entities.PettyCashRequest.update(request.id, {
        disbursement_proof_url: proofUrl,
        disbursement_method: "transfer",
        disbursement_proof_uploaded_at: new Date().toISOString(),
        disbursement_proof_uploaded_by: user?.full_name || user?.email,
      });
      toast.success("Bukti transfer ditambahkan");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        {isAddProofMode ? (
          <>Tambahkan bukti transfer untuk request <strong>{request.requester_name}</strong> — {formatRp(request.amount_requested)}</>
        ) : (
          <>Cairkan dana <strong>{formatRp(request.amount_requested)}</strong> ke <strong>{request.requester_name}</strong>. Lampirkan bukti transfer (screenshot m-banking) atau lewati untuk tunai.</>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {proofUrl ? (
        <div className="relative inline-block w-full">
          <img src={proofUrl} alt="bukti transfer" className="w-full max-h-48 object-contain rounded-lg border" />
          <button
            type="button"
            onClick={() => setProofUrl("")}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="w-6 h-6 mx-auto text-muted-foreground" />
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {uploading ? "Mengupload..." : "Upload bukti transfer"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">JPG/PNG/WEBP</p>
        </button>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
          Batal
        </Button>
        {isAddProofMode ? (
          <Button
            className="flex-1"
            onClick={handleAddProof}
            disabled={saving || uploading || !proofUrl}
          >
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Simpan Bukti
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleDisburse("tunai")}
              disabled={saving || uploading}
            >
              Lewati (Tunai)
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleDisburse("transfer")}
              disabled={saving || uploading || !proofUrl}
            >
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Cairkan
            </Button>
          </>
        )}
      </div>
    </div>
  );
}