/**
 * Helper bersama untuk semua otomatisasi baru.
 *
 * Dua aturan yang dipegang seluruh modul ini:
 *
 * 1. **Semua waktu dihitung dalam WIB.** Penjadwal Base44 berjalan dalam UTC,
 *    jadi setiap fungsi menjaga jamnya sendiri dan boleh dipanggil kapan saja
 *    (pola yang sama dipakai sendDailySummary dan sendDailyApprovalReminder).
 * 2. **Semua saklar default MATI.** Fungsi yang saklarnya mati berhenti di
 *    baris pertama dan tidak menyentuh data apa pun.
 */

export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Waktu sekarang digeser ke WIB; baca komponennya dengan getUTC*(). */
export function wibNow(): Date {
  return new Date(Date.now() + WIB_OFFSET_MS);
}

/** Tanggal WIB "YYYY-MM-DD". */
export function wibTanggal(d: Date = wibNow()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Jam WIB "HH:mm". */
export function wibJam(d: Date = wibNow()): string {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Menit sejak tengah malam dari "HH:mm". */
export function keMenit(hm: string, bawaan = "00:00"): number {
  const [h, m] = String(hm || bawaan).split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** Menit WIB sekarang sejak tengah malam. */
export function menitSekarang(d: Date = wibNow()): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Tanggal WIB N hari lalu, "YYYY-MM-DD". */
export function tanggalMundur(hari: number, d: Date = wibNow()): string {
  return wibTanggal(new Date(d.getTime() - hari * 24 * 60 * 60 * 1000));
}

/**
 * SATU aturan lembur, kembaran dari `jamLembur` di src/lib/weeklySalaryUtils.js.
 *
 * Lembur = menit yang dilewati SETELAH jam selesai shift, dibulatkan ke 0,5 jam
 * terdekat. Bukan "jam kerja di atas 8": shift peternakan ini 07:00–16:00, yaitu
 * 9 jam, jadi ambang 8 jam memberi lembur kepada orang yang hanya menjalani
 * shift normalnya.
 */
export function jamLembur(jamPulang: string, jamSelesaiShift = "16:00"): number {
  const pulang = keMenit(jamPulang, "");
  const selesai = keMenit(jamSelesaiShift, "16:00");
  if (!/^\d{1,2}:\d{2}$/.test(String(jamPulang || "").trim())) return 0;
  if (pulang <= selesai) return 0;
  return Math.round(((pulang - selesai) / 60) * 2) / 2;
}

/**
 * Apakah lembur hari itu punya bukti kerja? Kembaran `adaBuktiKerjaLembur` di
 * src/lib/weeklySalaryUtils.js — lihat penjelasan lengkapnya di sana.
 *
 * Ringkasnya: ada tugas tercatat pada atau setelah jam selesai shift → ada
 * bukti. Ada tugas tercatat tetapi semuanya sebelum itu → tidak ada lembur.
 * Tidak ada satu pun tugas yang punya jam → aplikasi tidak tahu, dan tidak tahu
 * bukan alasan memotong upah orang.
 *
 * Tugas yang judulnya mengandung "absensi" tidak dihitung sebagai bukti:
 * mencentang "Absensi jam pulang" pukul 16:15 hanya membuktikan pencentangan.
 */
export function adaBuktiKerjaLembur(checklist: any, jamSelesaiShift = "16:00"): boolean {
  const tugas = Array.isArray(checklist?.completed_tasks) ? checklist.completed_tasks : [];
  const jam = tugas
    .filter((t: any) => !/absensi/i.test(String(t?.task_title || "")))
    .map((t: any) => jamDari(String(t?.recorded_at || t?.photo_taken_at || "")))
    .filter(Boolean);
  if (jam.length === 0) return true;
  const batas = keMenit(jamSelesaiShift, "16:00");
  return jam.some((j: string) => keMenit(j, "00:00") >= batas);
}

/** Lembur satu hari, sudah disaring oleh bukti kerja. */
export function jamLemburBerbukti(att: any, checklist: any): number {
  const shiftEnd = String(att?.shift_end || "16:00");
  const kasar = jamLembur(String(att?.check_out || ""), shiftEnd);
  if (kasar <= 0) return 0;
  return adaBuktiKerjaLembur(checklist, shiftEnd) ? kasar : 0;
}

/** Sudah lewat jam yang disetel (WIB)? */
export function sudahWaktunya(jamSetel: string, bawaan: string): boolean {
  return menitSekarang() >= keMenit(jamSetel || bawaan, bawaan);
}

/**
 * Ambil record AutomationSettings tunggal; buat dengan nilai bawaan bila belum ada.
 * Selalu mengembalikan objek (tidak pernah null) supaya pemanggil tidak perlu menjaga.
 */
export async function getOtomatis(base44: any): Promise<any> {
  const list = await base44.asServiceRole.entities.AutomationSettings.filter({
    setting_key: "main",
  });
  if (list && list.length > 0) return list[0];
  return await base44.asServiceRole.entities.AutomationSettings.create({
    setting_key: "main",
    updated_at: new Date().toISOString(),
    updated_by: "sistem",
  });
}

/** Simpan sebagian field AutomationSettings. Tidak pernah melempar error. */
export async function setOtomatis(base44: any, settings: any, patch: Record<string, unknown>) {
  try {
    await base44.asServiceRole.entities.AutomationSettings.update(settings.id, {
      ...patch,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // kegagalan menyimpan penanda tidak boleh menggagalkan pekerjaan utama
  }
}

/** Email semua user pada role tertentu (role "kicked" selalu diabaikan). */
export async function emailPerRole(base44: any, roles: string[]): Promise<string[]> {
  const users = await base44.asServiceRole.entities.User.list();
  return (users || [])
    .filter((u: any) => u.role && u.role !== "kicked" && roles.includes(u.role))
    .map((u: any) => u.email)
    .filter(Boolean);
}

/** User aktif pada role tertentu (objek lengkap). */
export async function userPerRole(base44: any, roles: string[]): Promise<any[]> {
  const users = await base44.asServiceRole.entities.User.list();
  return (users || []).filter((u: any) => u.role && u.role !== "kicked" && roles.includes(u.role));
}

/**
 * Buat notifikasi bila belum ada yang sama hari ini (anti-dobel).
 * Mengembalikan true bila benar-benar dibuat.
 */
export async function notifSekali(base44: any, data: any): Promise<boolean> {
  const hariIni = wibTanggal();
  try {
    const existing = await base44.asServiceRole.entities.Notification.filter({
      recipient_email: data.recipient_email,
      related_entity_id: data.related_entity_id,
    });
    const sudahAda = (existing || []).some((n: any) => {
      const ca = n.created_at || n.created_date || "";
      // created_at disimpan dalam UTC; bandingkan tanggal WIB-nya
      const caWib = ca ? wibTanggal(new Date(new Date(ca).getTime() + WIB_OFFSET_MS)) : "";
      return caWib === hariIni && !n.is_dismissed;
    });
    if (sudahAda) return false;
  } catch {
    // bila pengecekan gagal, lebih baik notifikasi tetap dibuat
  }
  await base44.asServiceRole.entities.Notification.create({
    is_read: false,
    is_dismissed: false,
    created_at: new Date().toISOString(),
    ...data,
  });
  return true;
}

/**
 * Ambil item_id MaintenanceLog dari task_id checklist.
 *
 * Bentuk task_id: "<email>__<jenis>__<item_id>__<tanggal>", mis.
 *   "angsolo98@gmail.com__tugas__sop_6a374c...__2026-08-29"
 *   "angsolo98@gmail.com__harian__kebersihan_kandang_N2__2026-08-29"
 */
export function itemIdDariTaskId(taskId: string): string {
  const p = String(taskId || "").split("__");
  return p.length >= 3 ? p[2] : "";
}

/**
 * Peta foto bukti kerja pada satu tanggal, dari MaintenanceLog.
 *
 * PENTING — kenapa fungsi ini ada:
 *
 * Foto bukti kerja disimpan di MaintenanceLog, dan hanya SEBAGIAN yang tersalin
 * ke DailyChecklist.completed_tasks[].photo_url. Contoh nyata 29 Agustus 2026:
 * 27 dari 29 log hari itu punya foto, tetapi di checklist Angsolo hanya 1 dari
 * 10 task yang photo_url-nya terisi.
 *
 * Membaca foto dari checklist saja karena itu menghasilkan tuduhan palsu
 * "dicentang tanpa foto" pada pekerjaan yang fotonya sebenarnya ada. Semua
 * pemeriksaan foto WAJIB lewat peta ini, bukan lewat checklist saja.
 *
 * Kunci peta: "<email>|<item_id>".
 */
export async function petaFotoHarian(base44: any, tanggal: string): Promise<Map<string, string>> {
  const peta = new Map<string, string>();
  try {
    const logs = await base44.asServiceRole.entities.MaintenanceLog.filter({ period_key: tanggal });
    for (const l of logs || []) {
      if (!l.photo_url || !l.item_id) continue;
      peta.set(`${l.done_by_email}|${l.item_id}`, l.photo_url);
    }
  } catch {
    // gagal baca log tidak boleh menggagalkan pemeriksaan — peta kosong berarti
    // pemanggil jatuh kembali ke photo_url di checklist
  }
  return peta;
}

/** Ambil ID SOPTask dari task_id checklist, mis. "...__sop_6a37...__2026-08-29". */
export function sopIdDariTaskId(taskId: string): string {
  const m = String(taskId || "").match(/sop_([A-Za-z0-9]{12,})/);
  return m ? m[1] : "";
}

/** "HH:mm" dari nilai yang mungkin "HH:mm" atau ISO date-time. */
export function jamDari(nilai: string): string {
  if (!nilai) return "";
  const s = String(nilai);
  if (/^\d{1,2}:\d{2}$/.test(s)) return s.padStart(5, "0");
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const w = new Date(d.getTime() + WIB_OFFSET_MS);
  return wibJam(w);
}
