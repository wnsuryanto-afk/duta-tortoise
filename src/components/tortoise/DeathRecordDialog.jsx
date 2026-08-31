import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { X, ImagePlus, Video, AlertCircle } from "lucide-react";

export default function DeathRecordDialog({ tortoise, open, onOpenChange }) {
  const [formData, setFormData] = useState({
    tortoise_id: tortoise?.id || "",
    tortoise_name: tortoise?.name || "",
    death_date: new Date().toISOString().split('T')[0],
    cause_of_death: "tidak_diketahui",
    cause_detail: "",
    last_health_status: "",
    buried_location: "",
    notes: "",
    necropsy_done: false,
    necropsy_findings: ""
  });

  const [photoFiles, setPhotoFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (photoFiles.length + files.length > 5) {
      toast.error("Maksimal 5 foto");
      return;
    }
    setPhotoFiles(prev => [...prev, ...files]);
  };

  const removePhoto = (idx) => setPhotoFiles(prev => prev.filter((_, i) => i !== idx));

  const recordDeathMutation = useMutation({
    mutationFn: async (data) => {
      setUploading(true);
      setValidationError("");

      if (photoFiles.length === 0) {
        throw new Error("Upload minimal 1 foto dan 1 video untuk dokumentasi");
      }
      if (!videoFile) {
        throw new Error("Upload minimal 1 foto dan 1 video untuk dokumentasi");
      }

      // Upload all photos
      const photoUrls = [];
      for (const file of photoFiles) {
        const res = await base44.integrations.Core.UploadFile({ file });
        photoUrls.push(res.file_url);
      }

      // Upload video
      const videoRes = await base44.integrations.Core.UploadFile({ file: videoFile });
      const videoUrl = videoRes.file_url;

      setUploading(false);

      return base44.functions.invoke("recordTortoiseDeath", {
        tortoise_id: data.tortoise_id,
        death_data: {
          ...data,
          photo_urls: photoUrls,
          photos_count: photoUrls.length,
          video_url: videoUrl
        }
      });
    },
    onSuccess: () => {
      toast.success("Kematian berhasil dicatat");
      queryClient.invalidateQueries({ queryKey: ["tortoises"] });
      queryClient.invalidateQueries({ queryKey: ["death-records"] });
      onOpenChange(false);
    },
    onError: (error) => {
      setUploading(false);
      if (error.message.includes("foto dan 1 video")) {
        setValidationError(error.message);
      } else {
        toast.error("Gagal mencatat kematian: " + error.message);
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError("");
    if (photoFiles.length === 0 || !videoFile) {
      setValidationError("Upload minimal 1 foto dan 1 video untuk dokumentasi");
      return;
    }
    recordDeathMutation.mutate(formData);
  };

  const causeOptions = [
    { value: "sakit", label: "Sakit" },
    { value: "tua", label: "Tua / Usia" },
    { value: "kecelakaan", label: "Kecelakaan" },
    { value: "predator", label: "Predator" },
    { value: "infeksi", label: "Infeksi" },
    { value: "kelainan_bawaan", label: "Kelainan Bawaan" },
    { value: "tidak_diketahui", label: "Tidak Diketahui" },
    { value: "lainnya", label: "Lainnya" }
  ];

  const isPending = recordDeathMutation.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catat Kematian — {tortoise?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tanggal Kematian *</Label>
              <Input
                type="date"
                value={formData.death_date}
                onChange={(e) => setFormData({ ...formData, death_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Penyebab Kematian *</Label>
              <Select
                value={formData.cause_of_death}
                onValueChange={(value) => setFormData({ ...formData, cause_of_death: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {causeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Detail Penyebab</Label>
            <Textarea
              value={formData.cause_detail}
              onChange={(e) => setFormData({ ...formData, cause_detail: e.target.value })}
              rows={2}
              placeholder="Jelaskan lebih detail penyebab kematian..."
            />
          </div>

          <div>
            <Label>Kondisi Kesehatan Terakhir</Label>
            <Textarea
              value={formData.last_health_status}
              onChange={(e) => setFormData({ ...formData, last_health_status: e.target.value })}
              rows={2}
              placeholder="Kondisi sebelum meninggal..."
            />
          </div>

          {/* Multi-photo upload */}
          <div>
            <Label className="flex items-center gap-1.5">
              <ImagePlus className="w-4 h-4" />
              Foto Dokumentasi * <span className="text-muted-foreground text-xs">(min. 1, maks. 5)</span>
            </Label>
            <div className="mt-1.5 border-2 border-dashed border-border rounded-xl p-4">
              {photoFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {photoFiles.map((f, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted/30">
                      <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photoFiles.length < 5 && (
                <label className="flex flex-col items-center gap-1 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ImagePlus className="w-6 h-6" />
                  <span>Klik untuk tambah foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{photoFiles.length}/5 foto dipilih</p>
          </div>

          {/* Video upload */}
          <div>
            <Label className="flex items-center gap-1.5">
              <Video className="w-4 h-4" />
              Video Dokumentasi * <span className="text-muted-foreground text-xs">(wajib, maks. 50MB)</span>
            </Label>
            <div className="mt-1.5 border-2 border-dashed border-border rounded-xl p-4">
              {videoFile ? (
                <div className="flex items-center gap-3">
                  <Video className="w-8 h-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{videoFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVideoFile(null)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-1 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Video className="w-6 h-6" />
                  <span>Klik untuk pilih video</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => setVideoFile(e.target.files[0])}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {validationError}
            </div>
          )}

          <div>
            <Label>Lokasi Pemakaman</Label>
            <Input
              value={formData.buried_location}
              onChange={(e) => setFormData({ ...formData, buried_location: e.target.value })}
              placeholder="Dimana dikuburkan..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="necropsy"
              checked={formData.necropsy_done}
              onChange={(e) => setFormData({ ...formData, necropsy_done: e.target.checked })}
            />
            <Label htmlFor="necropsy">Sudah dilakukan autopsi/necropsy</Label>
          </div>

          {formData.necropsy_done && (
            <div>
              <Label>Hasil Autopsi</Label>
              <Textarea
                value={formData.necropsy_findings}
                onChange={(e) => setFormData({ ...formData, necropsy_findings: e.target.value })}
                rows={3}
                placeholder="Temuan dari autopsi..."
              />
            </div>
          )}

          <div>
            <Label>Catatan Tambahan</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (uploading ? "Mengupload..." : "Menyimpan...") : "Catat Kematian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}