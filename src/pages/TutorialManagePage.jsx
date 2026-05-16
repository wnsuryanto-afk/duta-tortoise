import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, PlayCircle, BookOpen, ChevronRight, ExternalLink } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";

const CATEGORIES = [
  { id: "all", label: "Semua" },
  { id: "dasar", label: "Dasar" },
  { id: "pakan", label: "Pakan" },
  { id: "kandang", label: "Kandang" },
  { id: "kesehatan", label: "Kesehatan" },
  { id: "breeding", label: "Breeding" },
  { id: "lainnya", label: "Lainnya" },
];

function getYoutubeEmbed(url) {
  if (!url) return null;
  if (url.includes("youtube.com/embed/")) return url;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return url;
}

function ContentModal({ item, onClose }) {
  if (!item) return null;
  const embedUrl = getYoutubeEmbed(item.video_url);
  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg leading-snug pr-4">{item.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {item.type === "video" && embedUrl ? (
            <div className="rounded-xl overflow-hidden aspect-video bg-black">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={item.title}
              />
            </div>
          ) : item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-48 object-cover rounded-xl" />
          ) : null}
          <div className="flex gap-2">
            <Badge className={item.type === "video" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
              {item.type === "video" ? "🎬 Video" : "📄 Artikel"}
            </Badge>
            <Badge variant="outline" className="capitalize">{item.category}</Badge>
          </div>
          {item.summary && <p className="text-sm text-muted-foreground italic">{item.summary}</p>}
          {item.content && (
            <div className="text-sm leading-relaxed whitespace-pre-line">{item.content}</div>
          )}
          {item.video_url && item.type === "video" && !embedUrl?.includes("youtube") && (
            <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> Buka Video
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const DEFAULT_FORM = { title: "", category: "lainnya", type: "artikel", summary: "", content: "", video_url: "", image_url: "", is_published: true };

export default function TutorialManagePage() {
  const { role } = useCurrentUser();
  const qc = useQueryClient();
  const isAdmin = role === "owner" || role === "admin";
  const [activeCategory, setActiveCategory] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const { data: tutorials = [], isLoading } = useQuery({
    queryKey: ["tutorials"],
    queryFn: () => base44.entities.TutorialContent.list("-created_date", 200),
  });

  const filtered = tutorials.filter(t => {
    if (!t.is_published && !isAdmin) return false;
    return activeCategory === "all" || t.category === activeCategory;
  });

  const openNew = () => { setForm(DEFAULT_FORM); setEditData(null); setShowForm(true); };
  const openEdit = (t) => { setForm({ ...t }); setEditData(t); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editData?.id) await base44.entities.TutorialContent.update(editData.id, form);
    else await base44.entities.TutorialContent.create(form);
    qc.invalidateQueries({ queryKey: ["tutorials"] });
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (t) => {
    if (confirm(`Hapus "${t.title}"?`)) {
      await base44.entities.TutorialContent.delete(t.id);
      qc.invalidateQueries({ queryKey: ["tutorials"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold">Tutorial & Panduan</h1>
          <p className="text-muted-foreground mt-1">Video & artikel panduan merawat Sulcata</p>
        </div>
        {isAdmin && (
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Konten
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-primary"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-20 text-center text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada konten</p>
          {isAdmin && <Button size="sm" className="mt-3" onClick={openNew}>Tambah Konten</Button>}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group">
              <div className="relative" onClick={() => setSelected(item)}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-40 bg-muted/50 flex items-center justify-center">
                    {item.type === "video" ? <PlayCircle className="w-12 h-12 text-muted-foreground/40" /> : <BookOpen className="w-12 h-12 text-muted-foreground/40" />}
                  </div>
                )}
                {item.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                      <PlayCircle className="w-7 h-7 text-white" />
                    </div>
                  </div>
                )}
                {!item.is_published && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-gray-800 text-white text-[10px]">Draft</Badge>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Badge className={`text-[10px] ${item.type === "video" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                    {item.type === "video" ? "🎬 Video" : "📄 Artikel"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{item.category}</Badge>
                </div>
                <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors" onClick={() => setSelected(item)}>
                  {item.title}
                </h3>
                {item.summary && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{item.summary}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <button className="flex items-center gap-1 text-xs text-primary font-medium" onClick={() => setSelected(item)}>
                    {item.type === "video" ? "Tonton" : "Baca"} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ContentModal item={selected} onClose={() => setSelected(null)} />

      {/* Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editData ? "Edit Konten" : "Tambah Konten Tutorial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium mb-1 block">Judul *</label>
                <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Judul konten..." />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Tipe</label>
                <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="artikel">📄 Artikel</SelectItem>
                    <SelectItem value="video">🎬 Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Kategori</label>
                <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["dasar", "pakan", "kandang", "kesehatan", "breeding", "lainnya"].map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.type === "video" && (
              <div>
                <label className="text-xs font-medium mb-1 block">URL Video / Link YouTube *</label>
                <Input value={form.video_url} onChange={(e) => setForm(p => ({ ...p, video_url: e.target.value }))} placeholder="https://www.youtube.com/watch?v=... atau link video lainnya" />
                <p className="text-[11px] text-muted-foreground mt-1">Mendukung link YouTube (watch?v= / youtu.be/) dan video embed langsung</p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium mb-1 block">URL Gambar Thumbnail</label>
              <Input value={form.image_url} onChange={(e) => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://... (URL gambar)" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Ringkasan</label>
              <Textarea value={form.summary} onChange={(e) => setForm(p => ({ ...p, summary: e.target.value }))} className="resize-none h-16 text-sm" placeholder="Ringkasan singkat..." />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Isi Konten</label>
              <Textarea value={form.content} onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))} className="resize-none h-32 text-sm" placeholder="Isi artikel / deskripsi video..." />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm(p => ({ ...p, is_published: v }))} />
              Tampilkan ke semua pengguna
            </label>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}