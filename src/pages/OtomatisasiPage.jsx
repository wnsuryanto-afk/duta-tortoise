/**
 * OtomatisasiPage — satu tempat menyalakan dan menguji seluruh otomatisasi.
 *
 * Kenapa halaman ini ada: 18 fungsi otomatis dipasang dalam keadaan MATI, dan
 * saklarnya hidup di entitas AutomationSettings. Tanpa halaman ini, menyalakan
 * satu saklar berarti mengedit data mentah lewat dashboard — mudah salah ketik,
 * dan tidak ada tempat menjelaskan apa yang sebenarnya akan berjalan.
 *
 * Tiga hal yang sengaja ditonjolkan di sini, karena ketiganya pernah membuat
 * otomatisasi "menyala" tapi tidak pernah benar-benar jalan:
 *
 *   1. Saklar menyala TIDAK berarti berjalan. Fungsi baru berjalan bila
 *      penjadwal Base44 memanggilnya. Peringatan itu dipasang di paling atas,
 *      bukan di catatan kaki.
 *   2. Sebagian otomatisasi butuh data yang harus diisi manusia lebih dulu
 *      (kebutuhan harian pakan, bahan per task, SKU). Prasyarat itu ditulis di
 *      kartunya masing-masing, bukan disembunyikan di dokumentasi.
 *   3. Tombol "Uji sekarang" memanggil fungsinya langsung dan menampilkan
 *      jawabannya apa adanya — termasuk saat ia menjawab "dilewati, saklar
 *      mati". Menguji sebelum menjadwalkan jauh lebih murah daripada menunggu
 *      besok pagi dan menebak kenapa tidak terjadi apa-apa.
 */
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle, Save, Play, Loader2, Clock, CheckCircle2,
  Zap, ClipboardCheck, Package, HeartPulse, Wallet, MessageSquare, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/useCurrentUser";
import AccessDenied from "@/components/common/AccessDenied";

/**
 * Daftar otomatisasi. Satu sumber kebenaran untuk halaman ini — menambah
 * otomatisasi baru cukup menambah satu baris di sini.
 *
 * kode      : penanda yang dipakai di audit & serah terima
 * fn        : nama backend function
 * saklar    : field boolean di AutomationSettings
 * jadwal    : saran jadwal untuk penjadwal Base44
 * prasyarat : data yang harus diisi manusia dulu (kosong = langsung berguna)
 * params    : field yang bisa disetel dari sini
 * jejak     : field penanda "terakhir jalan"
 */
const GRUP = [
  {
    id: "harian",
    label: "Pekerjaan harian & poin",
    icon: ClipboardCheck,
    blurb: "Yang menghapus rutinitas sore Anda.",
    items: [
      {
        kode: "A1", fn: "autoApprovePoin", saklar: "auto_approve_enabled",
        nama: "Approve poin otomatis",
        isi: "Checklist yang tepat waktu dan lolos AI disetujui sendiri. Yang mencurigakan tetap menunggu Anda — fungsi ini tidak pernah menolak.",
        jadwal: "tiap jam",
        jejak: null,
        params: [
          { field: "auto_approve_max_points", label: "Poin maksimal wajar", tipe: "number", bantu: "Di atas ini selalu diperiksa manusia" },
          { field: "auto_approve_tunda_menit", label: "Tunggu (menit)", tipe: "number", bantu: "Jeda sebelum disetujui, beri waktu Anda melihat dulu" },
        ],
        saklarTambahan: [
          { field: "auto_approve_wajib_foto_lolos_ai", label: "Tahan bila ada foto ditolak AI" },
          { field: "auto_approve_tahan_tanpa_foto", label: "Tahan bila task wajib-foto dicentang tanpa foto" },
        ],
      },
      {
        kode: "A3", fn: "autoAttendance", saklar: "auto_attendance_enabled",
        nama: "Absensi dari jam centang",
        isi: "Jam datang & pulang diisi dari centang task pertama dan terakhir. Entri manual tidak pernah ditimpa.",
        jadwal: "tiap jam",
        jejak: null,
        params: [
          { field: "shift_start", label: "Jam mulai shift", tipe: "text", bantu: "HH:mm WIB — untuk hitung keterlambatan" },
          { field: "shift_end", label: "Jam selesai shift", tipe: "text", bantu: "HH:mm WIB — untuk hitung lembur" },
        ],
        catatan: "Setelah ini jalan, dua SOP task \"Absensi jam masuk/pulang\" (5 poin) boleh dinonaktifkan.",
      },
      {
        kode: "A4", fn: "eskalasiChecklist", saklar: "eskalasi_enabled",
        nama: "Pengingat bertingkat",
        isi: "Checklist belum masuk → karyawan dulu, lalu kepala feeder, baru Anda. Bila semua sudah mengisi, tidak ada pesan sama sekali.",
        jadwal: "tiap jam",
        jejak: "eskalasi_terakhir",
        params: [
          { field: "eskalasi_jam_keeper", label: "Ke karyawan", tipe: "text", bantu: "HH:mm WIB" },
          { field: "eskalasi_jam_kepala", label: "Ke kepala feeder", tipe: "text", bantu: "HH:mm WIB" },
          { field: "eskalasi_jam_owner", label: "Ke owner", tipe: "text", bantu: "HH:mm WIB" },
        ],
      },
    ],
  },
  {
    id: "stok",
    label: "Stok & belanja",
    icon: Package,
    blurb: "Yang membuat angka stok bisa dipercaya.",
    items: [
      {
        kode: "A7", fn: "belanjaOtomatis", saklar: "belanja_otomatis_enabled",
        nama: "Daftar belanja terisi sendiri",
        isi: "Item yang sisanya menipis masuk daftar belanja otomatis. Membeli tetap keputusan manusia.",
        jadwal: "1× per hari",
        jejak: "belanja_terakhir",
        prasyarat: "Isi kebutuhan harian (daily_ideal) tiap item pakan. Tanpa itu hanya stok minimum yang terbaca, dan peringatan sisa-hari tetap mati.",
        params: [
          { field: "belanja_ambang_hari", label: "Ambang sisa (hari)", tipe: "number", bantu: "Masuk daftar bila sisa di bawah ini" },
        ],
      },
      {
        kode: "A6", fn: "potongStokPakan", saklar: "potong_stok_pakan_enabled",
        nama: "Stok berkurang saat task dicentang",
        isi: "Menghapus pencatatan pakan manual yang tidak pernah diisi. Hanya checklist yang sudah disetujui yang memotong stok.",
        jadwal: "tiap jam",
        jejak: null,
        prasyarat: "Isi \"pakan_terpakai\" di tiap SOP task (SKU + jumlah sekali kerja). Selama kosong, fungsi ini tidak memotong apa pun.",
      },
      {
        kode: "A9", fn: "kunciBahanSOP", saklar: "kunci_sop_stok_enabled",
        nama: "Kunci task yang bahannya habis",
        isi: "Task dengan bahan kosong ditandai tidak bisa dikerjakan, dan keeper melihat alasannya. Terbuka sendiri begitu stok terisi.",
        jadwal: "tiap jam",
        jejak: "kunci_sop_terakhir",
        prasyarat: "Isi \"required_skus\" di SOP task yang butuh bahan. Task tanpa SKU dilaporkan terpisah, bukan diam-diam dilewati.",
      },
      {
        kode: "B3", fn: "gabungBarangKembar", saklar: null,
        nama: "Gabung barang kembar",
        isi: "Menggabungkan barang yang terdaftar dua kali, setelah memindahkan seluruh riwayat yang menunjuk padanya. Uji dulu — bawaannya hanya melapor, tidak mengubah apa pun.",
        jadwal: "dipanggil manual",
        jejak: null,
        catatan: "Duplikat dengan satuan berbeda (karung vs kg) tidak pernah digabung otomatis — itu keputusan Anda.",
      },
    ],
  },
  {
    id: "kesehatan",
    label: "Kesehatan & breeding",
    icon: HeartPulse,
    blurb: "Yang menangkap masalah sebelum terlihat.",
    items: [
      {
        kode: "A11", fn: "anomaliBerat", saklar: "anomali_berat_enabled",
        nama: "Deteksi turun berat & stagnan",
        isi: "Membandingkan hasil timbang dengan riwayat kura itu sendiri. Turun berat adalah tanda paling awal yang bisa dilihat tanpa dokter.",
        jadwal: "1× per hari",
        jejak: "anomali_terakhir",
        params: [
          { field: "anomali_turun_persen", label: "Ambang turun (%)", tipe: "number" },
          { field: "anomali_stagnan_hari", label: "Stagnan (hari)", tipe: "number", bantu: "Hanya untuk yang masih seharusnya tumbuh" },
        ],
      },
      {
        kode: "C4", fn: "deteksiPenyakitFoto", saklar: "deteksi_penyakit_enabled",
        nama: "Baca tanda penyakit dari foto rutin",
        isi: "Memakai ulang foto bukti kerja yang sudah masuk tiap hari — tanpa kerja tambahan bagi keeper. Hasilnya temuan untuk diperiksa, bukan diagnosis.",
        jadwal: "1× per hari",
        jejak: "deteksi_penyakit_terakhir",
        params: [
          { field: "deteksi_penyakit_maks_foto", label: "Maks foto/hari", tipe: "number", bantu: "Penahan biaya AI" },
        ],
      },
      {
        kode: "A10", fn: "pengingatInkubator", saklar: "inkubator_reminder_enabled",
        nama: "Pengingat inkubator saat ada telur",
        isi: "Menyala sendiri selama ada clutch berstatus inkubasi, berhenti sendiri setelah menetas.",
        jadwal: "tiap jam",
        jejak: "inkubator_terakhir",
        params: [
          { field: "inkubator_jam", label: "Jam pengingat", tipe: "text", bantu: "HH:mm WIB" },
        ],
      },
    ],
  },
  {
    id: "uang",
    label: "Uang & laporan",
    icon: Wallet,
    blurb: "Angka yang datang sendiri, keputusan tetap milik Anda.",
    items: [
      {
        kode: "A5", fn: "siapkanSlipMingguan", saklar: "siapkan_slip_enabled",
        nama: "Siapkan angka slip mingguan",
        isi: "Hari hadir, poin, lembur, dan rempesan seluruh karyawan dihitung untuk minggu yang baru selesai, lalu dikirim ke WhatsApp Anda sebagai angka BRUTO.",
        jadwal: "1× per hari",
        jejak: "siapkan_slip_terakhir",
        catatan: "Sengaja tidak menerbitkan slip: potongan kasbon adalah keputusan sadar milik Anda. Cocokkan dulu dengan satu periode yang dihitung manual sebelum dipercaya.",
        params: [
          { field: "siapkan_slip_hari", label: "Hari kirim (0=Minggu)", tipe: "number" },
        ],
      },
      {
        kode: "A13", fn: "laporanBiayaBulanan", saklar: "laporan_biaya_enabled",
        nama: "Laporan biaya per ekor",
        isi: "Terbit tiap awal bulan lengkap dengan perbandingan bulan lalu — biaya per ekor baru berguna sebagai tren.",
        jadwal: "1× per hari",
        jejak: "laporan_biaya_terakhir",
        params: [
          { field: "laporan_biaya_tanggal", label: "Tanggal kirim", tipe: "number" },
        ],
      },
      {
        kode: "C8", fn: "estimasiNilaiKura", saklar: "estimasi_nilai_enabled",
        nama: "Perkiraan nilai jual per ekor",
        isi: "Dihitung dari harga penjualan Anda sendiri (median per gram), bukan angka pasar karangan.",
        jadwal: "1× per hari",
        jejak: "estimasi_nilai_terakhir",
        prasyarat: "Butuh minimal 3 penjualan yang mencatat harga DAN berat kura. Di bawah itu ia menolak menghitung dan memberi tahu apa yang kurang.",
      },
    ],
  },
  {
    id: "kabar",
    label: "Kabar & kebersihan data",
    icon: MessageSquare,
    blurb: "Yang mengurangi pesan, bukan menambah.",
    items: [
      {
        kode: "A14", fn: "ringkasanPenyimpangan", saklar: "ringkasan_penyimpangan_enabled",
        nama: "Laporan khusus penyimpangan",
        isi: "Berhenti mengirim laporan \"semua normal\". Yang masuk hanya yang menyimpang — dan bila tidak ada, tidak ada pesan sama sekali.",
        jadwal: "tiap jam",
        jejak: "ringkasan_penyimpangan_terakhir",
        params: [
          { field: "ringkasan_penyimpangan_jam", label: "Jam kirim", tipe: "text", bantu: "HH:mm WIB" },
        ],
        saklarTambahan: [
          { field: "ringkasan_penyimpangan_diam_bila_aman", label: "Diam bila tidak ada penyimpangan" },
        ],
      },
      {
        kode: "C1", fn: "kepalaFeederDigital", saklar: "kepala_feeder_digital_enabled",
        nama: "Perintah kerja pagi dari AI",
        isi: "Menyusun prioritas pagi dari keadaan kemarin — tugas tertinggal, kura sakit, bahan habis — bukan template tetap. Bila AI gagal, tetap terkirim sebagai daftar biasa.",
        jadwal: "tiap jam",
        jejak: "kepala_feeder_digital_terakhir",
        prasyarat: "Grup WhatsApp PAGI harus sudah diisi di Pengaturan WhatsApp.",
        params: [
          { field: "kepala_feeder_digital_jam", label: "Jam kirim", tipe: "text", bantu: "HH:mm WIB — sebelum ringkasan pagi biasa" },
        ],
      },
      {
        kode: "C10", fn: "terimaPesanWhatsApp", saklar: "wa_masuk_enabled",
        nama: "Terima laporan lewat WhatsApp",
        isi: "Pesan masuk dikenali AI, diteruskan ke Anda dengan teks aslinya, pengirim dibalas otomatis. Nomor tak dikenal diabaikan.",
        jadwal: "webhook, bukan jadwal",
        jejak: null,
        prasyarat: "Arahkan webhook pesan masuk di dashboard Fonnte ke URL fungsi terimaPesanWhatsApp.",
        catatan: "Belum menulis langsung ke catatan kesehatan/stok — teks bebas terlalu mudah salah dan sulit ditelusuri.",
      },
      {
        kode: "A12", fn: "higieneData", saklar: "higiene_data_enabled",
        nama: "Kebersihan data mingguan",
        isi: "Daftar data yang perlu dirapikan, dikirim ke admin — bukan ke Anda.",
        jadwal: "1× per hari",
        jejak: "higiene_terakhir",
        params: [
          { field: "higiene_hari", label: "Hari kirim (0=Minggu)", tipe: "number" },
        ],
      },
      {
        kode: "A15", fn: "arsipNotifikasi", saklar: "arsip_notif_enabled",
        nama: "Arsip notifikasi lama",
        isi: "Menyisakan yang terbaru dari tiap judul yang berulang, mengarsipkan sisanya. Tidak ada yang dihapus.",
        jadwal: "1× per hari",
        jejak: "arsip_notif_terakhir",
        params: [
          { field: "arsip_notif_umur_hari", label: "Umur arsip (hari)", tipe: "number" },
        ],
      },
    ],
  },
];

const URUTAN_SARAN = ["A15", "A3", "A12", "A14", "A4", "A1"];

export default function OtomatisasiPage() {
  const { role } = useCurrentUser();
  const qc = useQueryClient();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ujiId, setUjiId] = useState(null);
  const [hasilUji, setHasilUji] = useState({});

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["automation-settings"],
    queryFn: () => base44.entities.AutomationSettings.filter({ setting_key: "main" }),
    staleTime: 30 * 1000,
  });
  const record = records[0] || null;

  // Record-nya dibuat sendiri saat fungsi pertama dipanggil. Bila halaman ini
  // dibuka lebih dulu, kita mulai dari draf kosong supaya owner tetap bisa
  // menyalakan sesuatu — penyimpanan pertama yang membuat recordnya.
  useEffect(() => {
    if (draft || isLoading) return;
    setDraft(record ? { ...record } : { setting_key: "main" });
  }, [record, draft, isLoading]);

  const berubah = useMemo(() => {
    if (!draft) return false;
    if (!record) return Object.keys(draft).length > 1;
    return Object.keys(draft).some((k) => draft[k] !== record[k]);
  }, [draft, record]);

  const jumlahNyala = useMemo(() => {
    if (!draft) return 0;
    return GRUP.flatMap((g) => g.items).filter((it) => it.saklar && draft[it.saklar] === true).length;
  }, [draft]);

  if (role && role !== "owner") {
    return <AccessDenied message="Hanya Owner yang dapat mengubah otomatisasi." />;
  }

  const set = (field, nilai) => setDraft((p) => ({ ...p, [field]: nilai }));

  const simpan = async () => {
    setSaving(true);
    try {
      if (record) {
        const patch = {};
        Object.keys(draft).forEach((k) => {
          if (draft[k] !== record[k]) patch[k] = draft[k];
        });
        await base44.entities.AutomationSettings.update(record.id, {
          ...patch,
          updated_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.AutomationSettings.create({
          ...draft,
          setting_key: "main",
          updated_at: new Date().toISOString(),
        });
      }
      await qc.invalidateQueries({ queryKey: ["automation-settings"] });
      setDraft(null);
      toast.success("Pengaturan tersimpan");
    } catch (e) {
      toast.error("Gagal menyimpan: " + (e?.message || "coba lagi"));
    }
    setSaving(false);
  };

  const uji = async (item) => {
    setUjiId(item.fn);
    try {
      const res = await base44.functions.invoke(item.fn);
      setHasilUji((p) => ({ ...p, [item.fn]: res.data }));
    } catch (e) {
      setHasilUji((p) => ({
        ...p,
        [item.fn]: { error: e?.response?.data?.error || e?.message || "gagal memanggil fungsi" },
      }));
    }
    setUjiId(null);
  };

  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat pengaturan...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-5 pb-28">
      {/* Judul */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-500" /> Otomatisasi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {jumlahNyala} dari {GRUP.flatMap((g) => g.items).filter((i) => i.saklar).length} otomatisasi menyala.
        </p>
      </div>

      {/* Peringatan yang paling sering bikin salah paham */}
      <Card className="p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1.5">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Saklar menyala belum berarti berjalan.
            </p>
            <p className="text-amber-800 dark:text-amber-300">
              Fungsi baru berjalan bila <strong>penjadwal Base44</strong> memanggilnya — diatur dari dashboard app,
              tidak dari halaman ini. Semua fungsi menjaga jamnya sendiri dalam WIB, jadi aman dijadwalkan
              tiap jam sesuai saran di tiap kartu.
            </p>
            <p className="text-amber-800 dark:text-amber-300">
              Urutan menyalakan yang disarankan: {URUTAN_SARAN.join(" → ")} — dari yang paling tidak berisiko
              (tidak menyentuh uang maupun poin) ke yang paling perlu diawasi.
            </p>
          </div>
        </div>
      </Card>

      {GRUP.map((grup) => {
        const Icon = grup.icon;
        return (
          <div key={grup.id} className="space-y-3">
            <div className="flex items-baseline gap-2 pt-2">
              <Icon className="w-4 h-4 text-muted-foreground translate-y-0.5" />
              <h2 className="text-sm font-bold uppercase tracking-wide">{grup.label}</h2>
              <span className="text-xs text-muted-foreground">{grup.blurb}</span>
            </div>

            {grup.items.map((item) => {
              const nyala = item.saklar ? draft[item.saklar] === true : null;
              const jejak = item.jejak ? draft[item.jejak] : null;
              const hasil = hasilUji[item.fn];
              return (
                <Card key={item.fn} className={`p-4 ${nyala ? "border-green-300" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {item.kode}
                        </span>
                        <h3 className="font-semibold text-[15px]">{item.nama}</h3>
                        {nyala && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" /> Menyala
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1.5">{item.isi}</p>

                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Jadwal disarankan: <strong>{item.jadwal}</strong></span>
                        <span className="font-mono ml-1 px-1.5 py-0.5 rounded bg-muted">{item.fn}</span>
                      </div>

                      {jejak && (
                        <p className="text-[11px] text-muted-foreground mt-1">Terakhir jalan: {jejak}</p>
                      )}

                      {item.prasyarat && (
                        <div className="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-[12px] text-blue-800 dark:text-blue-300">
                          <strong>Perlu diisi dulu:</strong> {item.prasyarat}
                        </div>
                      )}
                      {item.catatan && (
                        <p className="mt-2 text-[12px] text-muted-foreground italic">{item.catatan}</p>
                      )}
                    </div>

                    {item.saklar && (
                      <Switch
                        checked={nyala}
                        onCheckedChange={(v) => set(item.saklar, v)}
                        className="flex-shrink-0 mt-1"
                      />
                    )}
                  </div>

                  {/* Parameter */}
                  {(item.params?.length || item.saklarTambahan?.length) && (
                    <div className="mt-3 pt-3 border-t space-y-2.5">
                      {item.params?.length > 0 && (
                        <div className="grid gap-2.5 sm:grid-cols-3">
                          {item.params.map((p) => (
                            <div key={p.field}>
                              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                                {p.label}
                              </label>
                              <Input
                                value={draft[p.field] ?? ""}
                                onChange={(e) =>
                                  set(p.field, p.tipe === "number" ? Number(e.target.value) : e.target.value)
                                }
                                type={p.tipe === "number" ? "number" : "text"}
                                className="h-8 text-sm"
                              />
                              {p.bantu && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">{p.bantu}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {item.saklarTambahan?.map((s) => (
                        <label key={s.field} className="flex items-center gap-2.5 cursor-pointer">
                          <Switch
                            checked={draft[s.field] !== false}
                            onCheckedChange={(v) => set(s.field, v)}
                          />
                          <span className="text-[13px]">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Uji */}
                  <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => uji(item)}
                      disabled={ujiId === item.fn}
                      className="h-8 text-xs"
                    >
                      {ujiId === item.fn ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menjalankan...</>
                      ) : (
                        <><Play className="w-3.5 h-3.5 mr-1.5" /> Uji sekarang</>
                      )}
                    </Button>
                    <span className="text-[11px] text-muted-foreground">
                      Memanggil fungsinya sekali dan menampilkan jawabannya apa adanya.
                    </span>
                  </div>

                  {hasil && (
                    <pre className="mt-2 p-2.5 rounded-lg bg-muted text-[11px] overflow-x-auto max-h-56 font-mono">
                      {JSON.stringify(hasil, null, 2)}
                    </pre>
                  )}
                </Card>
              );
            })}
          </div>
        );
      })}

      <Card className="p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-[13px] text-muted-foreground">
          Otomatisasi yang memakai AI: perintah kerja pagi (C1), deteksi penyakit dari foto (C4),
          pesan WhatsApp masuk (C10), dan lapor pakai suara. Nyalakan satu per satu, jangan serentak —
          pemakaian harian terlihat di halaman Log WhatsApp.
        </p>
      </Card>

      {/* Bilah simpan */}
      {berubah && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 z-40">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Ada perubahan yang belum disimpan.</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDraft(record ? { ...record } : { setting_key: "main" })}>
                Batalkan
              </Button>
              <Button size="sm" onClick={simpan} disabled={saving}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Menyimpan...</>
                ) : (
                  <><Save className="w-4 h-4 mr-1.5" /> Simpan</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
