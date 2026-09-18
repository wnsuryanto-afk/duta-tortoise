/**
 * Satu definisi: berapa persen tugas terjadwal yang benar-benar dikerjakan.
 *
 * ── KENAPA BERKAS INI ADA (18-09-2026) ─────────────────────────────
 *
 * Sampai hari ini ada DUA kepatuhan di aplikasi ini, dan keduanya menjawab
 * pertanyaan yang sama dengan angka berbeda:
 *
 *   Beranda  — mencocokkan `MaintenanceLog.item_id` dengan `sop_<id_task>`.
 *   WhatsApp — mencocokkan JUDUL task dengan `DailyChecklist.completed_tasks[].task_title`.
 *
 * Pencocokan judul rusak dengan cara yang tidak menimbulkan error sama sekali:
 * mengganti nama task memutus pasangannya diam-diam, dan task yang memang
 * tidak pernah dicatat lewat checklist — kebersihan per kandang, rotasi
 * timbang — selamanya masuk daftar "belum selesai" di grup WhatsApp yang
 * dibaca kipernya sendiri. Itu tuduhan harian yang tidak dimaksudkan siapa
 * pun, dan cara tercepat membuat kiper berhenti membaca pesan itu.
 *
 * Yang dipakai sekarang satu: MaintenanceLog + item_id, sama seperti beranda.
 *
 * Kembarannya di frontend ada di src/lib/kepatuhanSOP.js. Kalau salah satu
 * diubah, ubah keduanya — Deno tidak bisa mengimpor src/. Penjaga
 * scripts/cek-kembar.mjs membandingkan badan fungsinya.
 *
 * `terjadwalPada` sengaja TIDAK diulang di sini: ia sudah tinggal di
 * ../shared/jadwalSOP.ts, dan versi backend memakai getUTC* supaya zona waktu
 * server tidak menggeser hari.
 */
import { masukLaporan } from "./laporan.ts";
import { terjadwalPada } from "./jadwalSOP.ts";

export type TugasKepatuhan = {
  id?: string;
  title?: string;
  is_active?: boolean;
  frequency?: string;
  weekly_days?: number[];
  monthly_dates?: number[];
  bulan_aktif?: number[];
  di_ubin_kandang?: boolean;
  di_luar_persen?: boolean;
  terkunci_bahan?: boolean;
};

export type HasilKepatuhan = {
  tanggal: string;
  selesai: number;
  terjadwal: number;
  persen: number | null;
  kandangSelesai: number;
  kandangTotal: number;
};

/**
 * Tugas yang HARI ITU benar-benar dituntut dari tim.
 *
 * Tiga hal dikeluarkan, dan masing-masing punya alasan yang sudah dibayar
 * mahal sekali:
 *
 *   di_ubin_kandang — dikerjakan di layar Kandang, dicatat sebagai
 *     `kebersihan_kandang_<kode>`, bukan `sop_<id>`. Dihitung terpisah.
 *
 *   di_luar_persen — task WADAH yang isinya berubah tiap hari. Rotasi timbang
 *     mekar jadi baris `ukur_rotasi_<id_kura>` dan bisa NOL baris pada hari
 *     tanpa kura yang perlu ditimbang. Sebelum ditandai, ia tercatat gagal 14
 *     dari 14 hari — termasuk pada hari yang jawaban benarnya "tidak ada yang
 *     perlu ditimbang" — dan menekan angka kepatuhan 5 poin setiap hari.
 *
 *   terkunci_bahan — bahannya nol. Menuntut pekerjaan yang bahannya tidak ada
 *     lalu menurunkan angka karenanya adalah menghukum tim untuk keadaan
 *     gudang.
 */
export function tugasWajib(sopTasks: TugasKepatuhan[] = [], tanggal: string): TugasKepatuhan[] {
  return (sopTasks || []).filter(
    (t) =>
      t.di_ubin_kandang !== true &&
      t.di_luar_persen !== true &&
      t.terkunci_bahan !== true &&
      terjadwalPada(t, tanggal),
  );
}

/** id task yang punya log `sop_<id>` sah pada tanggal itu. */
export function idSelesaiPada(logs: any[] = [], tanggal: string): Set<string> {
  return new Set(
    (logs || [])
      .filter((l: any) => l?.period_key === tanggal && masukLaporan(l))
      .map((l: any) => String(l?.item_id || ""))
      .filter((id: string) => id.startsWith("sop_"))
      .map((id: string) => id.slice(4)),
  );
}

/** Tugas yang hari itu dituntut tetapi tidak ada log-nya. */
export function tugasBelum(
  sopTasks: TugasKepatuhan[] = [],
  logs: any[] = [],
  tanggal: string,
): TugasKepatuhan[] {
  const sudah = idSelesaiPada(logs, tanggal);
  return tugasWajib(sopTasks, tanggal).filter((t) => !sudah.has(String(t.id)));
}

/**
 * Kepatuhan satu hari — dua angka, bukan satu.
 *
 * Godaan terbesarnya adalah melebur tugas harian dan kebersihan kandang jadi
 * satu persen yang rapi. Itu menyembunyikan tebakan: keduanya dicatat dengan
 * penanda yang berbeda, dan satu angka rapi yang separuhnya tebakan lebih
 * berbahaya daripada dua angka jujur.
 */
export function kepatuhanHari(
  tanggal: string,
  sopTasks: TugasKepatuhan[] = [],
  logs: any[] = [],
  jumlahKandang = 0,
): HasilKepatuhan {
  const wajib = tugasWajib(sopTasks, tanggal);
  const idSelesai = idSelesaiPada(logs, tanggal);
  const selesai = wajib.filter((t) => idSelesai.has(String(t.id))).length;

  const kandangSelesai = new Set(
    (logs || [])
      .filter((l: any) => l?.period_key === tanggal && masukLaporan(l))
      .map((l: any) => String(l?.item_id || ""))
      .filter((id: string) => id.startsWith("kebersihan_kandang_")),
  ).size;

  // Kandang dituntut bila ADA tugas ubin yang terjadwal hari itu. Sejak D12
  // satu ubin mencakup beberapa tugas dengan jadwal berbeda: kebersihan
  // Senin-Sabtu, pemberian pakan tiap hari. Jadi Minggu tetap menuntut
  // kunjungan kandang meski tanpa pembersihan.
  const adaTugasUbin = (sopTasks || []).some(
    (t) => t.di_ubin_kandang === true && terjadwalPada(t, tanggal),
  );

  return {
    tanggal,
    selesai,
    terjadwal: wajib.length,
    persen: wajib.length > 0 ? Math.round((selesai / wajib.length) * 100) : null,
    kandangSelesai,
    kandangTotal: adaTugasUbin ? jumlahKandang : 0,
  };
}

/**
 * Lantai target kepatuhan.
 *
 * SATU angka untuk seluruh aplikasi. Kembarannya di frontend adalah
 * AMBANG_BAIK di src/lib/kepatuhanSOP.js; kalau lantainya diubah, ubah
 * keduanya. Ditetapkan Iwan 18-09-2026 di 85% sebagai LANTAI TETAP — bukan
 * rata-rata bergerak, yang akan mengejar ekornya sendiri dan bisa naik tanpa
 * satu pun pekerjaan tambahan.
 */
export const AMBANG_BAIK = 85;
