import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTour, resetTutorialLocally, markTutorialCompletedInDB } from "@/lib/tourContext";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  PlayCircle, HelpCircle, MessageSquare, Phone, Mail,
  RefreshCw, ClipboardList, Bot, ChevronRight, Save, Printer,
  Usb, Network, Wifi, AlertTriangle, CheckCircle2
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
  const { triggerWelcome, startTour } = useTour();
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
          onClick={() => {
            // Reset flag tutorial lalu tampilkan welcome
            resetTutorialLocally();
            // Reset DB flag
            if (user?.email) {
              import("@/api/base44Client").then(({ base44 }) => {
                base44.entities.UserProfile.filter({ user_email: user.email }).then(profiles => {
                  if (profiles[0]) {
                    base44.entities.UserProfile.update(profiles[0].id, { tutorial_completed: false, tour_completed: false, tour_skipped: false });
                  }
                });
              });
            }
            triggerWelcome();
          }}
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

      {/* Section: XPrinter XP-4208 Setup */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Printer className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">Setup XPrinter XP-420B</h2>
        </div>

        {/* Specs box */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
          <p className="font-semibold text-sm text-primary mb-2">📋 Spesifikasi XP-420B / XP-480B</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground/70">
            {[
              ["Resolusi", "203 DPI"],
              ["Print Width", "max 108mm (4 inch)"],
              ["Print Speed", "127mm/s"],
              ["Interface Standard", "USB"],
              ["Interface Opsional", "LAN (Ethernet), Bluetooth, WiFi"],
              ["Paper Type", "Thermal direct (label roll)"],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-1.5">
                <span className="font-medium text-foreground/60 flex-shrink-0">{k}:</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
            ⚠️ Varian standard XP-420B hanya USB. LAN/WiFi/Bluetooth adalah opsi tambahan saat pembelian — cek spesifikasi unit Anda.
          </p>
        </div>

        {/* Identify port */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="font-semibold text-sm text-amber-800 mb-2">🔍 Langkah 1: Identifikasi Port Printer</p>
          <p className="text-xs text-amber-700 leading-relaxed mb-2">
            Lihat bagian belakang printer XP-420B. Cek port yang ada:
          </p>
          <ul className="space-y-1.5 text-xs text-amber-700">
            <li className="flex items-center gap-2"><Usb className="w-3.5 h-3.5 flex-shrink-0" /> <strong>Hanya USB</strong> → ikuti Mode USB (paling mudah)</li>
            <li className="flex items-center gap-2"><Network className="w-3.5 h-3.5 flex-shrink-0" /> <strong>Ada port RJ45</strong> (kotak besar, seperti kabel internet) → bisa pakai Mode LAN</li>
            <li className="flex items-center gap-2"><Wifi className="w-3.5 h-3.5 flex-shrink-0" /> <strong>Ada antena/lampu WiFi</strong> → bisa pakai Mode WiFi</li>
          </ul>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Accordion type="single" collapsible className="divide-y">
            <AccordionItem value="usb-setup" className="px-5">
              <AccordionTrigger className="text-sm font-medium text-left py-4 hover:no-underline">
                <span className="flex items-center gap-2"><Usb className="w-4 h-4 text-blue-600" /> 🔌 Setup Mode USB (Paling Mudah)</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 space-y-2">
                <ol className="space-y-2 list-decimal ml-4">
                  <li>Download driver <strong>XP-420B / XP-480B</strong> dari <strong>xprinter.net</strong> (cari "XP-420B driver")</li>
                  <li>Install driver di komputer (Windows/Mac)</li>
                  <li>Hubungkan printer via kabel USB ke komputer</li>
                  <li>Test print dari Windows: <em>Control Panel → Devices and Printers → klik kanan → Print Test Page</em></li>
                  <li>Di app: buka <strong>Pengaturan → Konfigurasi Printer → Tambah Printer → Mode USB</strong></li>
                  <li>Set sebagai Default, selesai!</li>
                </ol>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Saat mencetak dari app, dialog print browser akan terbuka. Pilih printer XP-4208 dan klik Print.
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="lan-setup" className="px-5">
              <AccordionTrigger className="text-sm font-medium text-left py-4 hover:no-underline">
                <span className="flex items-center gap-2"><Network className="w-4 h-4 text-green-600" /> 🔗 Setup Mode LAN (Kabel Ethernet)</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 space-y-2">
                <ol className="space-y-2 list-decimal ml-4">
                  <li>Hubungkan printer ke router via kabel ethernet (RJ45)</li>
                  <li>Download <strong>XPrinter Diagnostic Tool</strong> dari xprinter.net (cari "XP-420B diagnostic")</li>
                  <li>Set IP statis di printer (contoh: 192.168.1.200)</li>
                  <li>Install <strong>Print Bridge</strong> di komputer yang selalu menyala di jaringan yang sama</li>
                  <li>Rekomendasi bridge: <em>PrintNode, RawBT, atau custom Node.js bridge</em></li>
                  <li>Di app: buka <strong>Pengaturan → Konfigurasi Printer → Mode LAN</strong></li>
                  <li>Masukkan IP address dan port 9100, lalu Tes Koneksi</li>
                </ol>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Browser tidak bisa langsung mengirim data ke port TCP. Print Bridge diperlukan sebagai perantara.
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="wifi-setup" className="px-5">
              <AccordionTrigger className="text-sm font-medium text-left py-4 hover:no-underline">
                <span className="flex items-center gap-2"><Wifi className="w-4 h-4 text-purple-600" /> 📶 Setup Mode WiFi (Nirkabel)</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 space-y-2">
                <ol className="space-y-2 list-decimal ml-4">
                  <li>Aktifkan WiFi di printer (lihat manual printer)</li>
                  <li>Connect printer ke WiFi rumah via <strong>XPrinter mobile app</strong></li>
                  <li>Catat IP yang diberikan router (atau set IP statis di pengaturan DHCP router)</li>
                  <li>Lanjut seperti Setup Mode LAN dari langkah 4 ke atas</li>
                </ol>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700 flex items-start gap-2">
                  <Wifi className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Pastikan komputer yang menjalankan Print Bridge terhubung ke WiFi yang sama dengan printer.
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="troubleshoot" className="px-5">
              <AccordionTrigger className="text-sm font-medium text-left py-4 hover:no-underline">
                <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> ⚠️ Troubleshooting Umum</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                <div className="space-y-2">
                  {[
                    ["Print kosong / putih", "Cek thermal paper tidak terbalik (sisi glossy menghadap ke bawah/head)"],
                    ["Tidak terdeteksi di komputer", "Restart printer dan router, coba kabel USB lain"],
                    ["Hasil print buram", "Naikkan print density di Konfigurasi Printer (setting 10–13)"],
                    ["Print miring / label tidak sejajar", "Kalibrasi label: tahan tombol FEED saat menyalakan printer"],
                    ["IP berubah setiap restart", "Set IP statis di pengaturan DHCP reservation di router"],
                    ["Print Bridge error", "Pastikan firewall komputer mengizinkan port 9100"],
                  ].map(([problem, solution], i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="font-semibold text-foreground/80 flex-shrink-0 w-44">• {problem}</span>
                      <span className="text-muted-foreground">→ {solution}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
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