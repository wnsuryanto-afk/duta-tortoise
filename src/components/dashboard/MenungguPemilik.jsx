import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PenLine } from "lucide-react";
import { base44, BATAS_AMBIL } from "@/api/base44Client";
import { hanyaLaporan } from "@/lib/laporan";
import { JENDELA_SURUT } from "@/lib/jendelaSurut";

/**
 * MenungguPemilik — yang macet menunggu TANDA TANGAN pemiliknya sendiri.
 *
 * ── Kenapa ini yang mengisi ruang itu ───────────────────────────────────
 *
 * Pada 11 Okt 2026 pemiliknya melingkari sisa ruang kosong di kepala beranda
 * dan bertanya apa yang penting untuk ditaruh di sana. Jawabannya tidak perlu
 * dikarang: daftar "Perlu perhatian" yang sudah ada memuat kura sakit, stok
 * menipis, dan catatan yang saling bertentangan — semuanya hal yang bisa
 * dikerjakan SIAPA SAJA. Tidak satu pun barisnya menyebut hal yang hanya
 * bisa diselesaikan pemiliknya.
 *
 * Padahal hari itu ada dua, dan keduanya uang milik tim:
 *
 *   · 210 catatan Inisiatif 28 Jul – 6 Okt masih bernilai nol. Tombol
 *     pembayarannya ada di Pengaturan Sistem, tiga layar jauhnya, dan tidak
 *     ada apa pun di beranda yang menyebutkannya. Ia sudah menunggu sejak
 *     7 Oktober.
 *   · 2 slip gaji September masih "draft" — belum terbit, jadi belum bisa
 *     dibayar.
 *
 * Keduanya tidak rusak, tidak memunculkan galat, dan tidak akan pernah
 * mengeluh. Pekerjaan yang menunggu diam-diam seperti itulah yang paling
 * lama tertunda, karena satu-satunya yang bisa mengingatkan adalah layar.
 *
 * ── Kenapa ia menghilang saat kosong ────────────────────────────────────
 *
 * Panel yang berbunyi "0 menunggu" sepanjang sebelas bulan mengajari orang
 * berhenti membacanya, dan ia akan tetap tidak terbaca pada hari ia akhirnya
 * berisi. Sama seperti ubin "clutch perlu dipantau" di bawahnya: muncul
 * hanya kalau memang ada.
 */

/** Antrean yang menunggu pemilik, dari data yang sudah diambil. Murni. */
export function susunAntrean({ slip = [], inisiatif = 0, checklist = [] } = {}) {
  const baris = [];

  /*
    Inisiatif surut didahulukan karena ia yang paling lama menunggu DAN
    paling tidak terlihat: dua yang lain punya halamannya sendiri di menu,
    yang ini terkubur di Pengaturan Sistem.
  */
  if (inisiatif > 0) {
    baris.push({
      kunci: "surut",
      ke: "/system-maintenance",
      jumlah: inisiatif,
      satuan: "catatan Inisiatif",
      kata: "belum dinilai — masih bernilai nol poin",
    });
  }

  /*
    Draft dan approved dihitung terpisah karena yang dituntut berbeda:
    draft perlu DITERBITKAN, approved perlu DIBAYAR. Satu angka gabungan
    akan menyuruh orang membuka halamannya untuk tahu mana yang mana.
  */
  const draft = slip.filter((s) => s.status === "draft").length;
  const disetujui = slip.filter((s) => s.status === "approved").length;
  if (draft > 0) {
    baris.push({ kunci: "draft", ke: "/salary-slip", jumlah: draft, satuan: "slip gaji", kata: "masih draft — belum terbit" });
  }
  if (disetujui > 0) {
    baris.push({ kunci: "bayar", ke: "/salary-slip", jumlah: disetujui, satuan: "slip gaji", kata: "sudah disetujui — belum dibayar" });
  }

  if (checklist.length > 0) {
    baris.push({
      kunci: "poin",
      ke: "/approval-poin",
      jumlah: checklist.length,
      satuan: "checklist",
      kata: "menunggu persetujuan poin",
    });
  }

  return baris;
}

/**
 * Penggambarnya saja, tanpa kueri.
 *
 * Dipisah karena komponen yang menarik datanya sendiri tergambar KOSONG di
 * penjaga lebar — tidak ada backend di sana — jadi ia lolos pemeriksaan
 * tanpa satu huruf pun pernah diukur. Pelajaran dari TargetTahunanRingkas.
 */
export function PanelMenunggu({ antrean = [] }) {
  if (antrean.length === 0) return null;

  return (
    <div className="w-full md:w-52 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <PenLine className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Menunggu Anda</span>
      </div>

      <div className="mt-2 space-y-1.5">
        {antrean.map((b) => (
          <Link
            key={b.kunci}
            to={b.ke}
            className="block rounded-lg bg-card/70 px-2 py-1.5 hover:bg-card transition-colors"
          >
            <span className="block text-[11px] font-bold text-foreground tabular-nums leading-tight">
              {b.jumlah.toLocaleString("id-ID")} {b.satuan}
            </span>
            {/* Kalimatnya menyebut KEADAANNYA, bukan perintah. "Bayarkan
                sekarang" di sini akan berbohong: tombolnya ada di halaman
                tujuan, dan baris ini hanya mengantar. */}
            <span className="block text-[10px] text-muted-foreground leading-tight mt-0.5">{b.kata}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Yang dipasang di kepala beranda Owner.
 *
 * Ketiga kueri menyaring data uji dengan saringan yang sama seperti seluruh
 * permukaan laporan: checklist percobaan pemilik tidak boleh memunculkan
 * tagihan persetujuan untuk pekerjaan yang tidak pernah ada.
 */
export default function MenungguPemilik() {
  const { data: slip = [] } = useQuery({
    queryKey: ["menunggu-slip"],
    queryFn: async () => {
      /*
        Statusnya disaring di sisi layar, bukan lewat `$in`.

        `$gte` sudah terbukti dipakai di tiga tempat, `$in` belum pernah
        sekali pun — dan operator yang salah diam-diam mengembalikan
        SELURUH baris, bukan galat. Panel ini akan menghitung tujuh slip
        sebagai tujuh yang menunggu, termasuk yang sudah dibayar dan yang
        dibatalkan. Slipnya berjumlah belasan, jadi menyaringnya di sini
        tidak membeli apa pun yang sepadan dengan risiko itu.
      */
      const semua = await base44.entities.SalarySlip.filter({}, "-period", BATAS_AMBIL);
      return hanyaLaporan(semua).filter((s) => s.status === "draft" || s.status === "approved");
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: inisiatif = 0 } = useQuery({
    queryKey: ["menunggu-inisiatif", JENDELA_SURUT.dari, JENDELA_SURUT.sampai],
    queryFn: async () => {
      /*
        Disaring di sisi layar, sama persis seperti kartu di Pengaturan
        Sistem — keduanya harus menghitung himpunan yang SAMA. Angka di
        beranda yang berselisih dengan angka di halaman tujuannya membuat
        orang berhenti mempercayai keduanya.
      */
      const semua = await base44.entities.MaintenanceLog.filter(
        { is_extra: true, approval_status: "pending" },
        "-period_key",
        BATAS_AMBIL,
      );
      return (semua || []).filter((l) => {
        const hari = String(l?.period_key || "");
        return hari >= JENDELA_SURUT.dari && hari <= JENDELA_SURUT.sampai;
      }).length;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ["menunggu-checklist"],
    queryFn: () =>
      base44.entities.DailyChecklist
        .filter({ status: "submitted" }, "-date", BATAS_AMBIL)
        .then(hanyaLaporan),
    staleTime: 5 * 60 * 1000,
  });

  return <PanelMenunggu antrean={susunAntrean({ slip, inisiatif, checklist })} />;
}
