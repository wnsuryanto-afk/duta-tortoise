import { kunciTugas } from "@/lib/kunciTugas";

/**
 * fotoBuktiTugas.js — foto bukti dibaca dari DUA tempat, bukan satu.
 *
 * ── Kejadian yang melahirkannya ─────────────────────────────────────────────
 *
 * 20 Nov 2026 dilaporkan: "keeper tidak bisa memfoto di SOP-nya hari ini."
 *
 * Yang diukur dari data hari itu dan sepuluh hari sebelumnya:
 *
 *   · 110 tugas bertanda WAJIB FOTO diselesaikan antara 10–20 Nov 2026;
 *   · 61 di antaranya tersimpan di DailyChecklist TANPA photo_url;
 *   · tetapi di MaintenanceLog, foto untuk tugas-tugas itu ADA — lengkap,
 *     dengan jam dan tautan berkasnya.
 *
 * Contohnya 20 Nov 2026: "Pakan adabra (Aldabra) - pagi" pukul 09:00 dan
 * "Cuci rumput / sayuran rempesan (pagi)" pukul 08:12, keduanya punya foto di
 * MaintenanceLog dan keduanya kosong di checklist yang dilihat penyetuju.
 *
 * Jadi kipernya MEMANG memfoto. Fotonya tersimpan. Yang gagal adalah
 * penyalinannya ke DailyChecklist — dan layar persetujuan hanya membaca
 * salinan itu. Dari sisi kiper: sudah difoto, tetap dibilang tidak ada foto.
 *
 * ── Kenapa salinannya gagal ─────────────────────────────────────────────────
 *
 * `syncPhotoToChecklist` menambal satu baris lalu menulis ULANG seluruh
 * larik `completed_tasks`. Ia berlomba dengan dua penulis lain atas larik yang
 * sama: automasi server yang membuat barisnya, dan `syncAIVerification` yang
 * menempelkan hasil AI. Siapa pun yang membaca lebih dulu lalu menulis
 * belakangan akan menghapus tulisan yang lain. Ditambah lagi pemanggilnya
 * tidak pernah menunggu hasilnya dan menelan galatnya.
 *
 * Bukti lombanya ada di data: sepuluh dari 61 baris itu punya
 * `ai_status: "selesai"` tanpa `photo_url`. AI hanya berjalan kalau ada foto,
 * jadi fotonya pernah ada di baris itu lalu tertimpa.
 *
 * ── Yang dikerjakan berkas ini ──────────────────────────────────────────────
 *
 * Penulisnya diperbaiki terpisah (menunggu sinkronisasi foto selesai sebelum
 * AI dijalankan, dan rentang coba-ulangnya diperpanjang). Tetapi memperbaiki
 * penulis tidak mengembalikan 61 foto yang sudah telanjur tidak tersalin,
 * dan tidak menolong bila lombanya lolos sekali lagi.
 *
 * Jadi SISI BACA yang dibuat tidak bergantung pada salinan itu: bila
 * `completed_tasks[].photo_url` kosong, fotonya diambil dari MaintenanceLog —
 * sumber yang ditulis langsung, sekali, tanpa lomba. Catatan lama ikut pulih
 * tanpa satu pun baris data diubah.
 *
 * MaintenanceLog adalah SUMBER; DailyChecklist adalah SALINAN. Yang membaca
 * foto bukti memakai berkas ini, bukan salinannya langsung.
 */

/** Kunci satu foto bukti: siapa, hari apa, tugas yang mana. */
export function kunciFoto(email, tanggal, judul, kandang) {
  const orang = (email || "").toString().trim().toLowerCase();
  const hari = (tanggal || "").toString().trim();
  return `${orang}__${hari}__${kunciTugas(judul, kandang)}`;
}

/**
 * Peta foto dari MaintenanceLog.
 *
 * Bila beberapa baris cocok ke kunci yang sama, yang PUNYA foto menang; di
 * antara yang sama-sama berfoto, yang jamnya paling akhir menang. Tanpa
 * aturan itu, satu baris tanpa foto yang kebetulan terbaca belakangan akan
 * menutupi baris berfoto — persis kegagalan yang sedang diperbaiki.
 */
export function petaFotoLog(logs = []) {
  const peta = new Map();
  for (const l of logs || []) {
    if (!l) continue;
    const kunci = kunciFoto(l.done_by_email, l.period_key, l.item_label, l.enclosure_name);
    const foto = (l.photo_url || "").toString().trim();
    const jam = (l.done_at || "").toString().trim();
    const lama = peta.get(kunci);
    if (!lama) { peta.set(kunci, { photo_url: foto, done_at: jam }); continue; }
    if (!foto) continue;
    if (!lama.photo_url || jam > (lama.done_at || "")) peta.set(kunci, { photo_url: foto, done_at: jam });
  }
  return peta;
}

/**
 * Satu baris completed_tasks dengan fotonya dilengkapi dari peta.
 *
 * Yang sudah punya foto TIDAK disentuh: salinan di checklist boleh berbeda
 * (mis. foto diganti lewat layar persetujuan), dan yang ada di sana adalah
 * yang sengaja ditaruh di sana.
 */
export function lengkapiFotoTugas(tugas, email, tanggal, peta) {
  if (!tugas) return tugas;
  if ((tugas.photo_url || "").toString().trim()) return tugas;
  const temu = peta?.get(kunciFoto(email, tanggal, tugas.task_title, tugas.notes));
  if (!temu || !temu.photo_url) return tugas;
  return {
    ...tugas,
    photo_url: temu.photo_url,
    photo_taken_at: tugas.photo_taken_at || temu.done_at || "",
    foto_dari_log: true,
  };
}

/** Satu checklist dengan seluruh foto bukti yang hilang dilengkapi dari peta. */
export function lengkapiFotoChecklist(checklist, peta) {
  if (!checklist || !peta || peta.size === 0) return checklist;
  const tugas = checklist.completed_tasks;
  if (!Array.isArray(tugas) || tugas.length === 0) return checklist;
  let berubah = false;
  const baru = tugas.map((t) => {
    const hasil = lengkapiFotoTugas(t, checklist.employee_email, checklist.date, peta);
    if (hasil !== t) berubah = true;
    return hasil;
  });
  return berubah ? { ...checklist, completed_tasks: baru } : checklist;
}

/** Daftar checklist yang fotonya sudah dilengkapi dari daftar MaintenanceLog. */
export function lengkapiFotoDaftar(checklists = [], logs = []) {
  const peta = petaFotoLog(logs);
  if (peta.size === 0) return checklists || [];
  return (checklists || []).map((c) => lengkapiFotoChecklist(c, peta));
}

/** Berapa baris yang fotonya datang dari log — untuk diukur, bukan ditebak. */
export function hitungFotoDariLog(checklists = []) {
  let n = 0;
  for (const c of checklists || []) {
    for (const t of c?.completed_tasks || []) if (t?.foto_dari_log) n++;
  }
  return n;
}
