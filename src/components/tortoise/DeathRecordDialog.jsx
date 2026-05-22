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
import { X } from "lucide-react";

export default function DeathRecordDialog({ tortoise, open, onOpenChange }) {
  const [formData, setFormData] = useState({
    tortoise_id: tortoise?.id || "",
    tortoise_name: tortoise?.name || "",
    death_date: new Date().toISOString().split('T')[0],
    cause_of_death: "tidak_diketahui",
    cause_detail: "",
    last_health_status: "",
    photo_url: "",
    video_url: "",
    buried_location: "",
    notes: "",
    necropsy_done: false,
    necropsy_findings: ""
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const queryClient = useQueryClient();

  const recordDeathMutation = useMutation({
    mutationFn: async (data) => {
      // Upload files first if any
      let photoUrl = data.photo_url;
      let videoUrl = data.video_url;

      if (photoFile) {
        const photoRes = await base44.integrations.Core.UploadFile({ file: photoFile });
        photoUrl = photoRes.file_url;
      }

      if (videoFile) {
        const videoRes = await base44.integrations.Core.UploadFile({ file: videoFile });
        videoUrl = videoRes.file_url;
      }

      return base44.functions.invoke("recordTortoiseDeath", {
        tortoise_id: data.tortoise_id,
        death_data: {
          ...data,
          photo_url: photoUrl,
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
      toast.error("Gagal mencatat kematian: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    recordDeathMutation.mutate(formData);
  };

  const causeOptions = [
    { value: "sakit", label: "Sakit" },
    { value: "tua", label: "Tua" },
    { value: "kecelakaan", label: "Kecelakaan" },
    { value: "predator", label: "Predator" },
    { value: "tidak_diketahui", label: "Tidak Diketahui" },
    { value: "lainnya", label: "Lainnya" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catat Kematian - {tortoise?.name}</DialogTitle>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {causeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Foto</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files[0])}
              />
            </div>

            <div>
              <Label>Video (opsional)</Label>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files[0])}
              />
            </div>
          </div>

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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={recordDeathMutation.isPending}>
              {recordDeathMutation.isPending ? "Menyimpan..." : "Catat Kematian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}