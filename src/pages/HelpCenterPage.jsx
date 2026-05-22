import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTour } from "@/lib/tourContext";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  PlayCircle, HelpCircle, MessageSquare, Phone, Mail,
  RefreshCw, ClipboardList, Bot, ChevronRight, Save
} from "lucide-react";
import PageTooltip from "@/components/tutorial/PageTooltip";
import { toast } from "sonner";

const VIDEOS = [
  { title: "Tambah Kura-kura Baru", desc: "Cara mendaftarkan kura-kura baru beserta data lengkapnya.", youtubeId: null },
  { title: "Cara Input Breeding & Telur", desc: "Merekam proses breeding dan monitoring inkubasi telur.", youtubeId: null },
  { title: "Cara Catat Penjualan", desc: "Mencatat transaksi penjualan dan mengelola data pembeli.", youtubeId: null },
  { title: "Cara Kelola Stok Gudang", desc: "Manajemen inventaris pakan, obat, dan perlengkapan kandang.", youtubeId: null },
  { title: "Cara Input Absensi Karyawan", desc: "Mencatat absensi harian dan memantau kehadiran tim.", youtubeId: null },
  { title: "Cara Baca Dashboard & Laporan", desc: "Memahami semua widget dan laporan di dashboard utama.", youtubeId: null },
];

const FAQS = [
  {
    q: "Bagaimana cara menambah kura-kura baru?",
    a: "Buka halaman 'Tortoise & Kandang', lalu klik tombol '+ Tambah Kura-kura' di pojok kanan atas. Isi formulir dengan data lengkap: nama, morph, jenis kelamin, sumber, dan kandang. Foto wajib diupload untuk melengkapi profil.",
  },
  {
    q: "Bagaimana cara mencatat telur menetas?",
    a: "Buka halaman 'Breeding & Telur', temukan record breeding yang bersangkutan, lalu klik tombol 'Update Menetas'. Isi jumlah telur yang berhasil menetas dan gagal. Status akan otomatis berubah menjadi 'Menetas'.",
  },
  {
    q: "Bagaimana cara melihat laporan gaji?",
    a: "Buka menu 'Gaji Bulanan' di grup SDM & KPI. Pilih bulan dan tahun yang diinginkan. Laporan akan menampilkan detail gaji setiap karyawan termasuk bonus, potongan, dan kasbon.",
  },
  {
    q: "Bagaimana cara menghubungkan marketplace?",
    a: "Buka menu 'Marketplace' di grup Pengaturan. Pilih platform (Tokopedia/Shopee), masukkan Shop ID dan API Key yang didapat dari dashboard seller masing-masing platform. Klik 'Hubungkan' untuk aktivasi.",
  },
  {
    q: "Apa itu badge ⚠️ pada data kura-kura?",
    a: "Badge ⚠️ menandakan data kura-kura tersebut belum lengkap — misalnya belum ada foto, berat badan, kandang, atau informasi penting lainnya. Klik badge tersebut untuk langsung membuka form edit dan melengkapi data.",
  },
  {
    q: "Bagaimana cara menggunakan AI Konsultan Kesehatan?",
    a: "Klik ikon 🤖 atau buka menu AI Assistant. Deskripsikan gejala atau kondisi kura-kura kamu dalam bahasa Indonesia. AI akan memberikan analisis dan rekomendasi penanganan awal berdasarkan database medis reptil.",
  },
  {
    q: "Bagaimana cara print label barcode?",
    a: "Buka halaman 'Gudang Gazebo', klik ikon barcode pada item yang ingin dicetak. Sebuah modal akan muncul dengan preview barcode. Klik 'Print Label' untuk mencetak, atau 'Download' untuk menyimpan sebagai gambar.",
  },
];

export default function HelpCenterPage() {
  const { triggerWelcome } = useTour();
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const isOwner = user?.role === "owner" || user?.role === "admin";

  const { data: profiles = [] } = useQuery({
    queryKey: ["user-profile", user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });
  const profile = profiles[0];

  const [waNumber, setWaNumber] = useState(profile?.emergency_contact || "");
  const [email, setEmail] = useState(profile?.user_email || "");

  const saveMutation = useMutation({
    mutationFn: () => {
      if (profile?.id) {
        return base44.entities.UserProfile.update(profile.id, { emergency_contact: waNumber });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(["user-profile"]);
      toast.success("Kontak support berhasil disimpan");
    },
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-bold">Bantuan & Tutorial</h1>
            <PageTooltip page="help-center" />
          </div>
          <p className="text-muted-foreground text-sm mt-1">Video panduan, FAQ, dan kontak support</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={triggerWelcome}
          className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
        >
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-primary group-hover:rotate-180 transition-transform duration-500" />
          </div>
          <div>
            <p className="font-semibold text-primary text-sm">Ulangi Tur Aplikasi</p>
            <p className="text-xs text-muted-foreground">Jalankan kembali onboarding tour dari awal</p>
          </div>
          <ChevronRight className="w-4 h-4 text-primary/40 ml-auto" />
        </button>
        <Link
          to="/"
          className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-700 text-sm">Lihat Checklist Awal</p>
            <p className="text-xs text-amber-600/70">Cek progres langkah pertamamu di dashboard</p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400 ml-auto" />
        </Link>
      </div>

      {/* Section A: Video Tutorial */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <PlayCircle className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">Video Tutorial</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VIDEOS.map((v, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
              {/* Thumbnail placeholder */}
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 h-32 flex items-center justify-center relative">
                <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center shadow-md">
                  <PlayCircle className="w-7 h-7 text-primary" />
                </div>
                <div className="absolute top-2 right-2 bg-primary/80 text-white text-[10px] px-2 py-0.5 rounded-full">
                  Segera Hadir
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm leading-tight">{v.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section B: FAQ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">Pertanyaan yang Sering Ditanya</h2>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <Accordion type="single" collapsible className="divide-y">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="px-5">
                <AccordionTrigger className="text-sm font-medium text-left py-4 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* Section C: Contact Support */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">Kontak Support</h2>
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-4">
          {isOwner && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-green-600" />
                    WhatsApp Admin
                  </Label>
                  <Input
                    placeholder="Contoh: 0812xxxxxxxx"
                    value={waNumber}
                    onChange={(e) => setWaNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    Email Support
                  </Label>
                  <Input
                    type="email"
                    placeholder="support@dutатortoise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Kontak
              </Button>
              <hr />
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {profile?.emergency_contact && (
              <a
                href={`https://wa.me/${profile.emergency_contact.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-50">
                  <Phone className="w-4 h-4" />
                  Chat WhatsApp Admin
                </Button>
              </a>
            )}
            <Link to="/info" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Chat dengan AI Assistant
              </Button>
            </Link>
          </div>

          {!isOwner && !profile?.emergency_contact && (
            <p className="text-xs text-muted-foreground">
              Kontak support belum diatur oleh admin. Gunakan fitur AI Assistant untuk bantuan cepat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}