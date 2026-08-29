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
