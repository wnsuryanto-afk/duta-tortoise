import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Maximize2, RefreshCw, Video, Info, Wifi, WifiOff, Pencil, Trash2, X, Loader2 } from "lucide-react";
import AccessDenied from "@/components/common/AccessDenied";

function CameraForm({ data, onSave, onClose }) {
  const [form, setForm] = useState(data || { name: "", stream_url: "", location: "", brand: "", is_active: true, notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    if (data?.id) await base44.entities.CCTVCamera.update(data.id, form);
    else await base44.entities.CCTVCamera.create(form);
    setSaving(false);
    onSave();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 col-span-2">
          <Label>Nama Kamera *</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Kandang A, Pintu Masuk..." />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>URL Stream *</Label>
          <Input value={form.stream_url} onChange={e => set("stream_url", e.target.value)} placeholder="http://192.168.1.100/video" />
          <p className="text-xs text-muted-foreground">Mendukung: HTTP MJPEG, HTTP (gambar), HLS (.m3u8)</p>
        </div>
        <div className="space-y-1.5">
          <Label>Lokasi</Label>
          <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Area kandang..." />
        </div>
        <div className="space-y-1.5">
          <Label>Merk</Label>
          <Input value={form.brand} onChange={e => set("brand", e.target.value)} placeholder="Hikvision, Dahua..." />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Catatan</Label>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="cam_active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="w-4 h-4 accent-primary" />
          <label htmlFor="cam_active" className="text-sm font-medium">Kamera Aktif</label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={handleSave} disabled={!form.name || !form.stream_url || saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Simpan
        </Button>
      </div>
    </div>
  );
}

function CameraFeed({ camera }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState("loading"); // loading | online | offline
  const [fullscreen, setFullscreen] = useState(false);

  const isImage = camera.stream_url?.match(/\.(jpg|jpeg|png|gif)$/i) || camera.stream_url?.includes("snapshot") || camera.stream_url?.includes("image");
  const isMjpeg = camera.stream_url?.includes("mjpeg") || camera.stream_url?.includes("video") || camera.stream_url?.includes("/stream");

  const FeedContent = () => (
    <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
      {(isImage || isMjpeg) ? (
        <img
          key={refreshKey}
          src={camera.stream_url}
          alt={camera.name}
          className="w-full h-full object-contain"
          onLoad={() => setStatus("online")}
          onError={() => setStatus("offline")}
        />
      ) : (
        <iframe
          key={refreshKey}
          src={camera.stream_url}
          title={camera.name}
          className="w-full h-full border-0"
          onLoad={() => setStatus("online")}
          onError={() => setStatus("offline")}
          sandbox="allow-same-origin allow-scripts"
        />
      )}
      {status === "offline" && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 text-white">
          <WifiOff className="w-8 h-8 text-red-400" />
          <p className="text-sm font-medium">Tidak Dapat Terhubung</p>
          <p className="text-xs text-white/60">Cek jaringan WiFi & URL stream</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <FeedContent />
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{camera.name}</p>
              {camera.location && <p className="text-xs text-muted-foreground">{camera.location}</p>}
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant={status === "online" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0.5">
                {status === "online" ? <><Wifi className="w-2.5 h-2.5 mr-1" />Online</> : <><WifiOff className="w-2.5 h-2.5 mr-1" />Offline</>}
              </Badge>
              <button onClick={() => setRefreshKey(k => k + 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => setFullscreen(true)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Fullscreen">
                <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
          {camera.brand && <p className="text-[10px] text-muted-foreground/70 mt-1">{camera.brand}</p>}
        </div>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setFullscreen(false)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 text-white">
            <X className="w-6 h-6" />
          </button>
          <div className="w-full max-w-5xl p-4">
            <p className="text-white text-lg font-semibold mb-3">{camera.name}</p>
            <FeedContent />
          </div>
        </div>
      )}
    </>
  );
}

export default function CCTVPage() {
  const { role } = useCurrentUser();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editCam, setEditCam] = useState(null);

  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ["cctv-cameras"],
    queryFn: () => base44.entities.CCTVCamera.list(),
  });

  const handleDelete = async (cam) => {
    if (confirm(`Hapus kamera "${cam.name}"?`)) {
      await base44.entities.CCTVCamera.delete(cam.id);
      queryClient.invalidateQueries({ queryKey: ["cctv-cameras"] });
    }
  };

  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["cctv-cameras"] });
    setShowForm(false);
    setEditCam(null);
  };

  if (!["owner", "admin", "manajer"].includes(role)) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Video className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Monitoring CCTV</h1>
            <p className="text-sm text-muted-foreground">{cameras.length} kamera terdaftar</p>
          </div>
        </div>
        <Button onClick={() => { setEditCam(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Kamera
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Panduan Setup CCTV</p>
          <p className="text-xs">Fitur ini membutuhkan kamera dan perangkat dalam jaringan WiFi yang sama, atau kamera dengan akses remote/cloud. Pastikan kamera mendukung <strong>HTTP MJPEG Stream</strong> atau <strong>HTTP Snapshot</strong>. Masukkan URL stream dari DVR/NVR atau IP Camera kamu (contoh: <code className="bg-blue-100 px-1 rounded">http://192.168.1.100/video</code>).</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : cameras.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Belum ada kamera terdaftar</p>
          <p className="text-sm">Klik "Tambah Kamera" untuk menambahkan CCTV</p>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cameras.filter(c => c.is_active).map(cam => (
              <div key={cam.id} className="relative group">
                <CameraFeed camera={cam} />
                <div className="absolute top-2 left-2 hidden group-hover:flex gap-1">
                  <button onClick={() => { setEditCam(cam); setShowForm(true); }} className="p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(cam)} className="p-1.5 bg-black/60 rounded-lg text-white hover:bg-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {cameras.filter(c => !c.is_active).length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">{cameras.filter(c => !c.is_active).length} kamera tidak aktif disembunyikan.</p>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditCam(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCam ? "Edit Kamera" : "Tambah Kamera CCTV"}</DialogTitle>
          </DialogHeader>
          <CameraForm data={editCam} onSave={onSaved} onClose={() => { setShowForm(false); setEditCam(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}