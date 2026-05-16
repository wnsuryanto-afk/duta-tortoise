import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, PlayCircle, ChevronRight, Shell, Leaf, Droplets, Thermometer, Heart, Baby, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATEGORIES = [
  { id: "all", label: "Semua" },
  { id: "dasar", label: "Dasar" },
  { id: "pakan", label: "Pakan" },
  { id: "kandang", label: "Kandang" },
  { id: "kesehatan", label: "Kesehatan" },
  { id: "breeding", label: "Breeding" },
];

const ARTICLES = [
  {
    id: 1,
    category: "dasar",
    title: "Mengenal Sulcata (African Spurred Tortoise)",
    summary: "Sulcata adalah kura-kura darat terbesar ketiga di dunia. Asli dari padang pasir Sub-Sahara Afrika, mereka bisa hidup hingga 70–100 tahun dengan perawatan yang tepat.",
    image: "https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?w=600&q=80",
    content: `Sulcata (Centrochelys sulcata) atau African Spurred Tortoise adalah salah satu spesies kura-kura darat paling populer di dunia. Mereka memiliki karakteristik khas berupa taji (spurs) di kaki belakang mereka.

**Fakta Penting:**
• Bisa tumbuh hingga 90 cm dan berat 100 kg lebih
• Hidup hingga 70–100 tahun
• Asli dari wilayah kering Sub-Sahara Afrika
• Aktif di siang hari (diurnal)
• Herbivora sejati — HANYA makan tumbuhan

**Tips Pemilik Baru:**
Sulcata bukan hewan peliharaan biasa. Mereka membutuhkan komitmen jangka panjang dan ruang yang sangat besar saat dewasa. Pastikan Anda siap sebelum memelihara.`,
    type: "artikel",
    videoUrl: null,
  },
  {
    id: 2,
    category: "pakan",
    title: "Panduan Lengkap Pakan Sulcata",
    summary: "Sulcata adalah herbivora sejati. Diet yang tepat adalah kunci kesehatan dan umur panjang mereka. Pelajari apa yang boleh dan tidak boleh diberikan.",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80",
    content: `Diet Sulcata harus mengandung serat tinggi dan kalsium yang cukup.

**✅ Boleh Diberikan:**
• Rumput (timothy, orchard, bermuda) — makanan utama 70%
• Daun-daunan: daun singkong, daun pepaya, daun ketela
• Sayuran berdaun hijau gelap: sawi, bayam, kangkung
• Kaktus pir berduri (tanpa duri)
• Wortel, labu, ubi (sebagai camilan)

**❌ Jangan Diberikan:**
• Buah-buahan tinggi gula (apel, pisang, mangga terlalu banyak)
• Protein hewani
• Makanan olahan / roti / nasi
• Bayam merah berlebihan (tinggi oksalat)
• Bawang, bawang putih

**Suplemen:**
Tabur kalsium karbonat / cuttlebone di atas makanan 2-3x seminggu.`,
    type: "artikel",
    videoUrl: null,
  },
  {
    id: 3,
    category: "kandang",
    title: "Setup Kandang Sulcata yang Ideal",
    summary: "Kandang yang benar menentukan kesehatan Sulcata. Pelajari kebutuhan suhu, cahaya, tempat berlindung, dan ukuran kandang yang tepat.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    content: `**Ukuran Kandang:**
• Baby (< 500g): min. 60x120 cm
• Juvenile (0.5–5 kg): min. 1x2 meter
• Adult (> 5 kg): kandang outdoor minimal 10-20 m²

**Suhu:**
• Siang hari (basking area): 38–45°C
• Siang hari (cool area): 24–28°C
• Malam hari: minimal 18°C (pakai heat lamp jika perlu)

**Pencahayaan:**
• UVB 10.0 atau 12% wajib untuk indoor — 12 jam/hari
• Sinar matahari langsung lebih baik
• Ganti lampu UVB setiap 6 bulan

**Substrat:**
• Campuran 70% tanah / cocopeat + 30% pasir
• Kedalaman minimal 30 cm agar bisa menggali
• Hindari substrat lembab berlebihan

**Tempat Berlindung (Hide):**
• Harus ada hide yang cukup besar
• Tempatkan di area yang lebih hangat
• Berbentuk tertutup dan gelap`,
    type: "artikel",
    videoUrl: null,
  },
  {
    id: 4,
    category: "kesehatan",
    title: "Tanda-tanda Sulcata Sakit & Cara Penanganannya",
    summary: "Kenali tanda dini Sulcata yang sakit agar bisa ditangani lebih cepat. Dari respiratory infection hingga MBD dan parasit.",
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=80",
    content: `**Tanda Sulcata Tidak Sehat:**
• Tidak mau makan lebih dari 3 hari
• Mata tertutup atau bengkak
• Pilek — lendir dari hidung
• Nafas bunyi / menganga
• Berjalan miring atau tidak bisa berjalan
• Cangkang lembek atau tidak simetris
• Feses berair / berdarah

**Penyakit Umum:**

🔴 MBD (Metabolic Bone Disease)
Penyebab: kurang kalsium & UVB
Gejala: cangkang lembek, deformitas
Pencegahan: suplementasi kalsium + UVB cukup

🔴 Respiratory Infection (RI)
Penyebab: terlalu dingin / lembab
Gejala: nafas bunyi, ingus, mulut terbuka
Penanganan: naikkan suhu, bawa ke vet

🔴 Pyramiding Berlebihan
Penyebab: pertumbuhan terlalu cepat, kurang kelembaban
Pencegahan: soak rutin, diet seimbang

**Soak (Mandi):**
Rendam di air hangat sedalam setengah badan, 15-20 menit, 2-3x seminggu untuk baby, 1x seminggu untuk adult.`,
    type: "artikel",
    videoUrl: null,
  },
  {
    id: 5,
    category: "breeding",
    title: "Panduan Breeding Sulcata",
    summary: "Proses breeding Sulcata memerlukan persiapan matang. Mulai dari pemilihan indukan, proses kawin, inkubasi telur, hingga merawat baby sulcata.",
    image: "https://images.unsplash.com/photo-1550159930-40066082a4fc?w=600&q=80",
    content: `**Syarat Indukan:**
• Jantan: min. 5-6 tahun, berat 8-10 kg+
• Betina: min. 8-10 tahun, berat 15 kg+ (lebih besar lebih baik)
• Keduanya sehat dan proven (diutamakan)

**Proses Kawin:**
• Musim kawin: akhir musim hujan (Maret–Juni di Indonesia)
• Jantan akan mengejar betina dan mengeluarkan suara
• Proses bisa berlangsung beberapa minggu

**Bertelur:**
• Betina akan menggali lubang 30–60 cm
• Jumlah telur: 15–30 butir per clutch
• Betina bisa bertelur 2–5 kali per tahun

**Inkubasi:**
• Suhu: 28–32°C (suhu menentukan jenis kelamin)
• Kelembaban: 70–80%
• Durasi: 90–120 hari
• Media: vermiculite + air (ratio 1:1 berat)

**Baby Sulcata:**
• Jangan langsung disatukan dengan yang besar
• Soak setiap hari selama 15 menit
• Suhu lebih hangat dari adult (30-32°C)
• Diet: rumput muda + daun lunak`,
    type: "artikel",
    videoUrl: null,
  },
  {
    id: 6,
    category: "dasar",
    title: "Video: Cara Menimbang & Mengukur Sulcata",
    summary: "Tutorial lengkap cara menimbang berat dan mengukur panjang cangkang Sulcata. Monitoring pertumbuhan yang rutin sangat penting untuk kesehatan.",
    image: "https://images.unsplash.com/photo-1596094520349-9f3e3f2e1e44?w=600&q=80",
    content: `Monitoring pertumbuhan adalah salah satu cara terpenting untuk memantau kesehatan Sulcata Anda.

**Alat yang Dibutuhkan:**
• Timbangan digital (min. akurasi 1 gram untuk baby)
• Penggaris / caliper untuk panjang cangkang
• Buku catatan / aplikasi (seperti Sulcata Farm Manager ini)

**Cara Menimbang:**
1. Letakkan timbangan di permukaan rata
2. Tare/nol-kan timbangan
3. Letakkan kura-kura dengan tenang
4. Catat berat saat angka stabil

**Cara Mengukur Cangkang (SCL - Straight Carapace Length):**
1. Gunakan penggaris lurus
2. Ukur dari ujung depan ke ujung belakang cangkang (bukan mengikuti lekukan)
3. Catat dalam cm

**Frekuensi:**
• Baby (< 1 tahun): setiap minggu
• Juvenile (1-3 tahun): setiap 2 minggu  
• Adult (> 3 tahun): setiap bulan`,
    type: "video",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: 7,
    category: "kesehatan",
    title: "Jadwal Perawatan Rutin Sulcata",
    summary: "Checklist perawatan harian, mingguan, bulanan, dan tahunan untuk memastikan Sulcata Anda selalu dalam kondisi prima.",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80",
    content: `**📅 Perawatan Harian:**
• ✅ Berikan makan segar (ganti sisa kemarin)
• ✅ Cek suhu kandang pagi & sore
• ✅ Pastikan lampu UVB menyala
• ✅ Cek kondisi umum (aktif, responsif)
• ✅ Bersihkan kotoran di kandang

**📅 Perawatan Mingguan:**
• ✅ Soak / mandi hangat 15-20 menit
• ✅ Timbang berat (untuk baby)
• ✅ Bersihkan kandang menyeluruh
• ✅ Cek stok pakan dan suplemen

**📅 Perawatan Bulanan:**
• ✅ Timbang & ukur cangkang (adult)
• ✅ Foto dokumentasi kondisi
• ✅ Cek kondisi cangkang (luka, jamur)
• ✅ Cek kuku — potong jika perlu
• ✅ Evaluasi pertumbuhan

**📅 Perawatan Tahunan:**
• ✅ Pemeriksaan vet lengkap
• ✅ Cek parasit (fecal test)
• ✅ Ganti lampu UVB
• ✅ Evaluasi ukuran kandang`,
    type: "artikel",
    videoUrl: null,
  },
  {
    id: 8,
    category: "pakan",
    title: "Video: Menanam Pakan Sulcata Sendiri",
    summary: "Hemat biaya pakan dengan menanam sendiri rumput dan sayuran favorit Sulcata. Tutorial lengkap dari persiapan media tanam hingga panen.",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80",
    content: `Menanam pakan sendiri adalah cara terbaik untuk memastikan kualitas dan keamanan pakan Sulcata Anda.

**🌱 Tanaman Prioritas:**

**Rumput-rumputan:**
• Rumput Gajah Mini (Pennisetum purpureum)
• Rumput Odot
• Rumput Timothy (untuk pot indoor)

**Daun-daunan:**
• Daun Kelor (Moringa) — super food untuk Sulcata
• Daun Pepaya
• Daun Singkong
• Daun Ubi Jalar

**Kaktus:**
• Kaktus Pir Berduri (Opuntia)
• Mudah tumbuh, tidak perlu banyak air

**Tips Menanam:**
1. Gunakan pot besar atau bedeng tanpa pestisida
2. Gunakan pupuk organik / kompos saja
3. Siram secukupnya
4. Panen secara bergilir agar terus tersedia
5. Cuci bersih sebelum diberikan ke Sulcata`,
    type: "video",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
];

const TYPE_COLORS = {
  artikel: "bg-blue-100 text-blue-700",
  video: "bg-red-100 text-red-700",
};

function ArticleModal({ article, onClose }) {
  if (!article) return null;
  return (
    <Dialog open={!!article} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg leading-snug pr-4">{article.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {article.type === "video" && article.videoUrl ? (
            <div className="rounded-xl overflow-hidden aspect-video bg-black">
              <iframe
                src={article.videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={article.title}
              />
            </div>
          ) : (
            <img src={article.image} alt={article.title} className="w-full h-48 object-cover rounded-xl" />
          )}
          <div className="flex items-center gap-2">
            <Badge className={TYPE_COLORS[article.type]}>
              {article.type === "video" ? "🎬 Video" : "📄 Artikel"}
            </Badge>
            <Badge variant="outline" className="capitalize">{article.category}</Badge>
          </div>
          <div className="prose prose-sm max-w-none text-sm text-foreground leading-relaxed whitespace-pre-line">
            {article.content.split('\n').map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-bold mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
              }
              if (line.startsWith('• ') || line.startsWith('✅ ') || line.startsWith('❌ ') || line.startsWith('🔴 ')) {
                return <p key={i} className="ml-2">{line}</p>;
              }
              if (line.trim() === '') return <br key={i} />;
              return <p key={i}>{line}</p>;
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InfoPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = activeCategory === "all"
    ? ARTICLES
    : ARTICLES.filter((a) => a.category === activeCategory);

  const videos = ARTICLES.filter((a) => a.type === "video");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Pusat Informasi Sulcata</h1>
        <p className="text-muted-foreground mt-1">Panduan lengkap memelihara Sulcata dengan baik dan benar</p>
      </div>

      {/* Featured Video Banner */}
      <Card className="overflow-hidden bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <PlayCircle className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-semibold text-lg">Video Tutorial Tersedia</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {videos.length} video tutorial cara merawat, memberi makan, dan memelihara Sulcata
            </p>
          </div>
          <button
            onClick={() => setActiveCategory("all")}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Lihat Semua <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Shell, label: "Artikel", count: ARTICLES.filter(a => a.type === "artikel").length, color: "text-primary bg-primary/10" },
          { icon: PlayCircle, label: "Video", count: ARTICLES.filter(a => a.type === "video").length, color: "text-red-600 bg-red-50" },
          { icon: Leaf, label: "Panduan Pakan", count: ARTICLES.filter(a => a.category === "pakan").length, color: "text-green-600 bg-green-50" },
          { icon: Heart, label: "Panduan Kesehatan", count: ARTICLES.filter(a => a.category === "kesehatan").length, color: "text-pink-600 bg-pink-50" },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mx-auto mb-2`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filter Kategori */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid Konten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((article) => (
          <Card
            key={article.id}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 group"
            onClick={() => setSelected(article)}
          >
            <div className="relative overflow-hidden">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {article.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <PlayCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
              )}
              <div className="absolute top-2 left-2">
                <Badge className={`${TYPE_COLORS[article.type]} text-[10px] shadow-sm`}>
                  {article.type === "video" ? "🎬 Video" : "📄 Artikel"}
                </Badge>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Badge variant="outline" className="text-[10px] capitalize">{article.category}</Badge>
              </div>
              <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {article.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                {article.summary}
              </p>
              <button className="mt-3 flex items-center gap-1 text-xs text-primary font-medium hover:gap-2 transition-all">
                {article.type === "video" ? "Tonton Video" : "Baca Selengkapnya"} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Disclaimer */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Catatan Penting</p>
            <p className="text-xs text-yellow-700 mt-1">
              Informasi dalam panduan ini bersifat umum. Untuk kondisi medis serius, selalu konsultasikan dengan dokter hewan yang berpengalaman menangani reptil.
            </p>
          </div>
        </div>
      </Card>

      <ArticleModal article={selected} onClose={() => setSelected(null)} />
    </div>
  );
}