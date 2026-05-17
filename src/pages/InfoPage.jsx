import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, PlayCircle, ChevronRight, Leaf, Heart, AlertTriangle, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
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

// Artikel bawaan statis (panduan dasar)
const BUILT_IN = [
  {
    id: "b1", category: "dasar", type: "artikel",
    title: "Mengenal Sulcata (African Spurred Tortoise)",
    summary: "Sulcata adalah kura-kura darat terbesar ketiga di dunia. Asli dari padang pasir Sub-Sahara Afrika, bisa hidup hingga 70–100 tahun.",
    image_url: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=600&q=80",
    content: `Sulcata (Centrochelys sulcata) adalah salah satu spesies kura-kura darat paling populer. Mereka memiliki taji (spurs) di kaki belakang.

**Fakta Penting:**
• Bisa tumbuh hingga 90 cm dan berat 100 kg lebih
• Hidup hingga 70–100 tahun
• Asli dari wilayah kering Sub-Sahara Afrika
• Herbivora sejati — HANYA makan tumbuhan

**Tips Pemilik Baru:**
Sulcata membutuhkan komitmen jangka panjang dan ruang yang sangat besar saat dewasa.`,
  },
  {
    id: "b2", category: "pakan", type: "artikel",
    title: "Panduan Lengkap Pakan Sulcata",
    summary: "Diet yang tepat adalah kunci kesehatan dan umur panjang Sulcata. Pelajari apa yang boleh dan tidak boleh diberikan.",
    image_url: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=600&q=80",
    content: `Diet Sulcata harus mengandung serat tinggi dan kalsium yang cukup.

**✅ Boleh Diberikan:**
• Rumput (rumput gajah, sudan, odot) — makanan utama 70%
• Daun-daunan: daun pepaya, daun kelor, daun singkong
• Sayuran berdaun hijau: sawi, bayam, kangkung
• Wortel, labu, ubi (sebagai camilan)

**❌ Jangan Diberikan:**
• Protein hewani
• Makanan olahan / roti / nasi
• Bawang, bawang putih

**Suplemen:**
Tabur kalsium karbonat / cuttlebone 2-3x seminggu.`,
  },
  {
    id: "b3", category: "kandang", type: "artikel",
    title: "Setup Kandang Sulcata yang Ideal",
    summary: "Kandang yang benar menentukan kesehatan Sulcata. Pelajari kebutuhan suhu, cahaya, dan ukuran kandang yang tepat.",
    image_url: "https://images.unsplash.com/photo-1617575521317-d2974f3b56d2?w=600&q=80",
    content: `**Ukuran Kandang:**
• Baby (< 500g): min. 60x120 cm
• Juvenile (0.5–5 kg): min. 1x2 meter
• Adult (> 5 kg): kandang outdoor minimal 10-20 m²

**Suhu:**
• Siang (basking area): 38–45°C
• Siang (cool area): 24–28°C
• Malam: minimal 18°C

**Pencahayaan:**
• UVB 10.0 wajib untuk indoor — 12 jam/hari
• Ganti lampu UVB setiap 6 bulan`,
  },
  {
    id: "b4", category: "kesehatan", type: "artikel",
    title: "Tanda-tanda Sulcata Sakit & Penanganannya",
    summary: "Kenali tanda dini Sulcata yang sakit agar bisa ditangani lebih cepat.",
    image_url: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80",
    content: `**Tanda Sulcata Tidak Sehat:**
• Tidak mau makan lebih dari 3 hari
• Mata tertutup atau bengkak
• Pilek — lendir dari hidung
• Nafas bunyi / menganga
• Cangkang lembek

**Penyakit Umum:**
🔴 MBD — kurang kalsium & UVB → cangkang lembek
🔴 Respiratory Infection — terlalu dingin → nafas bunyi
🔴 Pyramiding — pertumbuhan terlalu cepat

**Soak (Mandi):**
Rendam di air hangat 15-20 menit, 2-3x seminggu (baby), 1x seminggu (adult).`,
  },
  {
    id: "b5", category: "breeding", type: "artikel",
    title: "Panduan Breeding Sulcata",
    summary: "Persiapan breeding, proses kawin, inkubasi telur, hingga merawat baby sulcata.",
    image_url: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&q=80",
    content: `**Syarat Indukan:**
• Jantan: min. 5-6 tahun, berat 8-10 kg+
• Betina: min. 8-10 tahun, berat 15 kg+

**Bertelur:**
• Betina menggali lubang 30–60 cm
• Jumlah telur: 15–30 butir per clutch

**Inkubasi:**
• Suhu: 28–32°C
• Kelembaban: 70–80%
• Durasi: 90–120 hari`,
  },
  {
    id: "b6", category: "kesehatan", type: "artikel",
    title: "Jadwal Perawatan Rutin Sulcata",
    summary: "Checklist perawatan harian, mingguan, bulanan, dan tahunan.",
    image_url: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&q=80",
    content: `**📅 Harian:**
• Berikan makan segar
• Cek suhu kandang
• Pastikan lampu UVB menyala
• Bersihkan kotoran

**📅 Mingguan:**
• Soak / mandi hangat 15-20 menit
• Timbang berat (baby)
• Bersihkan kandang menyeluruh

**📅 Bulanan:**
• Timbang & ukur cangkang (adult)
• Foto dokumentasi kondisi
• Cek kondisi cangkang

**📅 Tahunan:**
• Pemeriksaan vet lengkap
• Cek parasit (fecal test)
• Ganti lampu UVB`,
  },
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
  const embedUrl = item.videoUrl || (item.video_url ? getYoutubeEmbed(item.video_url) : null);
  const imgUrl = item.image_url || item.image;
  const content = item.content || "";
  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg leading-snug pr-4">{item.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {item.type === "video" && embedUrl ? (
            <div className="rounded-xl overflow-hidden aspect-video bg-black">
              <iframe src={embedUrl} className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen title={item.title} />
            </div>
          ) : imgUrl ? (
            <img src={imgUrl} alt={item.title} className="w-full h-48 object-cover rounded-xl" />
          ) : null}
          <div className="flex gap-2">
            <Badge className={item.type === "video" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
              {item.type === "video" ? "🎬 Video" : "📄 Artikel"}
            </Badge>
            <Badge variant="outline" className="capitalize">{item.category}</Badge>
          </div>
          {item.summary && <p className="text-sm text-muted-foreground italic">{item.summary}</p>}
          {content && (
            <div className="text-sm leading-relaxed whitespace-pre-line">
              {content.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold mt-3 mb-1">{line.replace(/\*\*/g,'')}</p>;
                if (/^[•✅❌🔴📅]/.test(line)) return <p key={i} className="ml-2">{line}</p>;
                if (line.trim() === '') return <br key={i} />;
                return <p key={i}>{line}</p>;
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const DEFAULT_FORM = { title: "", category: "lainnya", type: "artikel", summary: "", content: "", video_url: "", image_url: "", is_published: true };

export default function InfoPage() {
  const { role } = useCurrentUser();
  const qc = useQueryClient();
  const isAdmin = role === "owner" || role === "admin";
  const [tab, setTab] = useState("panduan");
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

  const publishedTutorials = tutorials.filter(t => t.is_published || isAdmin);
  const allItems = [...BUILT_IN, ...publishedTutorials];
  const filtered = activeCategory === "all" ? allItems : allItems.filter(a => a.category === activeCategory);
  const videos = allItems.filter(a => a.type === "video");

  const openNew = () => { setForm(DEFAULT_FORM); setEditData(null); setShowForm(true); };
  const openEdit = (t) => { setForm({ ...DEFAULT_FORM, ...t }); setEditData(t); setShowForm(true); };

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
    if (!t.id || t.id?.startsWith("b")) return; // can't delete built-in
    if (confirm(`Hapus "${t.title}"?`)) {
      await base44.entities.TutorialContent.delete(t.id);
      qc.invalidateQueries({ queryKey: ["tutorials"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold">Pusat Informasi Sulcata</h1>
          <p className="text-muted-foreground mt-1">Panduan lengkap, artikel, & video merawat Sulcata</p>
        </div>
        {isAdmin && (
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Tambah Konten</Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: "Total Artikel", count: allItems.filter(a => a.type === "artikel").length, color: "text-primary bg-primary/10" },
          { icon: PlayCircle, label: "Video Tutorial", count: videos.length, color: "text-red-600 bg-red-50" },
          { icon: Leaf, label: "Panduan Pakan", count: allItems.filter(a => a.category === "pakan").length, color: "text-green-600 bg-green-50" },
          { icon: Heart, label: "Panduan Kesehatan", count: allItems.filter(a => a.category === "kesehatan").length, color: "text-pink-600 bg-pink-50" },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mx-auto mb-2`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="panduan">Panduan & Artikel</TabsTrigger>
          <TabsTrigger value="video">Video Tutorial</TabsTrigger>
        </TabsList>

        <TabsContent value="panduan" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${activeCategory === cat.id ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary"}`}>
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(item => (
              <Card key={item.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group" onClick={() => setSelected(item)}>
                <div className="relative overflow-hidden">
                  {item.image_url || item.image ? (
                    <img src={item.image_url || item.image} alt={item.title} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-40 bg-muted/50 flex items-center justify-center">
                      {item.type === "video" ? <PlayCircle className="w-12 h-12 text-muted-foreground/40" /> : <BookOpen className="w-12 h-12 text-muted-foreground/40" />}
                    </div>
                  )}
                  {item.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <PlayCircle className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  )}
                  {item.is_published === false && isAdmin && (
                    <div className="absolute top-2 right-2"><Badge className="bg-gray-800 text-white text-[10px]">Draft</Badge></div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Badge className={`text-[10px] ${item.type === "video" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                      {item.type === "video" ? "🎬 Video" : "📄 Artikel"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{item.category}</Badge>
                  </div>
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h3>
                  {item.summary && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{item.summary}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <button className="flex items-center gap-1 text-xs text-primary font-medium">
                      {item.type === "video" ? "Tonton" : "Baca"} <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && !item.id?.startsWith("b") && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="video" className="mt-4">
          {videos.length === 0 ? (
            <Card className="py-20 text-center text-muted-foreground">
              <PlayCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada video tutorial</p>
              {isAdmin && <Button size="sm" className="mt-3" onClick={openNew}>Tambah Video</Button>}
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {videos.map(item => (
                <Card key={item.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group" onClick={() => setSelected(item)}>
                  <div className="relative">
                    {item.image_url || item.image ? (
                      <img src={item.image_url || item.image} alt={item.title} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-slate-800 flex items-center justify-center">
                        <PlayCircle className="w-16 h-16 text-white/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <PlayCircle className="w-8 h-8 text-red-600" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <Badge variant="outline" className="text-[10px] capitalize mb-2">{item.category}</Badge>
                    <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">{item.title}</h3>
                    {item.summary && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{item.summary}</p>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">Informasi bersifat umum. Untuk kondisi medis serius, selalu konsultasikan dengan dokter hewan yang berpengalaman.</p>
        </div>
      </Card>

      <ContentModal item={selected} onClose={() => setSelected(null)} />

      {/* Form tambah/edit konten */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editData ? "Edit Konten" : "Tambah Konten"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium mb-1 block">Judul *</label>
                <Input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} placeholder="Judul konten..." />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Tipe</label>
                <Select value={form.type} onValueChange={v => setForm(p=>({...p,type:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="artikel">📄 Artikel</SelectItem>
                    <SelectItem value="video">🎬 Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Kategori</label>
                <Select value={form.category} onValueChange={v => setForm(p=>({...p,category:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["dasar","pakan","kandang","kesehatan","breeding","lainnya"].map(c=>(
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.type === "video" && (
              <div>
                <label className="text-xs font-medium mb-1 block">URL Video / Link YouTube *</label>
                <Input value={form.video_url} onChange={e=>setForm(p=>({...p,video_url:e.target.value}))} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
            )}
            <div>
              <label className="text-xs font-medium mb-1 block">URL Gambar Thumbnail</label>
              <Input value={form.image_url} onChange={e=>setForm(p=>({...p,image_url:e.target.value}))} placeholder="https://... (URL gambar)" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Ringkasan</label>
              <Textarea value={form.summary} onChange={e=>setForm(p=>({...p,summary:e.target.value}))} className="resize-none h-16 text-sm" placeholder="Ringkasan singkat..." />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Isi Konten</label>
              <Textarea value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} className="resize-none h-32 text-sm" placeholder="Isi artikel / deskripsi video..." />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.is_published} onCheckedChange={v=>setForm(p=>({...p,is_published:v}))} />
              Tampilkan ke semua pengguna
            </label>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={()=>setShowForm(false)}>Batal</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving||!form.title.trim()}>{saving?"Menyimpan...":"Simpan"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}