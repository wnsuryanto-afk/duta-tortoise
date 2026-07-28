import { base44 } from "@/api/base44Client";

const PH_ENC = new Set(["", "tugas harian", "suplemen", "tugas_harian"]);
const normEnc = (e) => {
  const v = (e || "").toString().trim().toLowerCase();
  return PH_ENC.has(v) ? "" : v;
};
const normTitle = (t) => (t || "").toString().trim().toLowerCase();
const dedupKey = (title, enc) => `${normTitle(title)}__${normEnc(enc)}`;

/**
 * Deteksi usia foto dari file.lastModified (pengganti ringan EXIF DateTimeOriginal).
 * Banyak HP menghapus EXIF saat kompresi/upload, jadi lastModified adalah fallback terbaik.
 * Jika selisih > 2 jam dari waktu unggah → tandai "foto lama".
 */
export function detectPhotoAge(file) {
  if (!file || !file.lastModified) return { available: false, warning: null };
  try {
    const captureTime = new Date(file.lastModified);
    if (isNaN(captureTime.getTime())) return { available: false, warning: null };
    const now = new Date();
    const diffHours = (now - captureTime) / (1000 * 60 * 60);
    if (diffHours > 2) {
      return {
        available: true,
        warning: `Foto berusia ${Math.round(diffHours)} jam (kemungkinan bukan diambil saat itu)`,
      };
    }
    return { available: true, warning: null };
  } catch {
    return { available: false, warning: null };
  }
}

/**
 * Bandingkan jam unggah foto dengan deadline_time task.
 * Jika selisih > 3 jam → tandai "di luar jam tugas".
 */
export function checkDeadlineTime(deadlineTime, uploadTime) {
  if (!deadlineTime || !uploadTime) return null;
  try {
    const parts = deadlineTime.split(":").map(Number);
    const dh = parts[0];
    if (isNaN(dh)) return null;
    const uploadHour = uploadTime.getHours();
    const diff = Math.abs(uploadHour - dh);
    if (diff > 3) {
      const uploadStr = String(uploadHour).padStart(2, "0") + ":" + String(uploadTime.getMinutes()).padStart(2, "0");
      return `Di luar jam tugas (tugas: ${deadlineTime}, foto: ${uploadStr})`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * AI Vision: periksa foto + berikan apresiasi, saran membangun, dan temuan untuk owner.
 * Hanya dipanggil untuk task require_photo=true.
 * Gaya bahasa: hangat & sopan, seperti rekan kerja senior yang membantu.
 */
export async function verifyPhotoWithAI(photoUrl, taskTitle, taskDescription) {
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Anda adalah rekan kerja senior yang membantu meninjau foto bukti pekerjaan. Foto ini diklaim sebagai bukti tugas: "${taskTitle}". Rincian tugas: ${taskDescription || "tidak ada deskripsi tambahan"}.

Tugas Anda:
1. Periksa apakah foto menunjukkan pekerjaan tersebut sudah dilakukan.
2. Berikan apresiasi singkat tentang yang sudah baik.
3. Berikan 1-2 saran praktis & sopan untuk perbaikan (atau kosongkan jika sudah bagus).
4. Catat temuan penting untuk owner (misal: kandang becek, tempat minum kosong, kura terlihat lesu) — kosongkan jika tidak ada.

Gaya bahasa: Bahasa Indonesia sehari-hari yang HANGAT dan SOPAN, seperti rekan kerja senior yang membantu — bukan atasan yang menegur. SELALU sebutkan dulu yang sudah baik, baru saran. Saran harus konkret & bisa langsung dikerjakan. Maksimal 2 kalimat.

DILARANG: menuduh, menyindir, kata kasar, membandingkan antar karyawan, menyebut soal poin atau gaji. Jika pekerjaan sudah bagus: cukup apresiasi, saran dikosongkan.

Jawab HANYA dengan JSON.`,
      file_urls: [photoUrl],
      response_json_schema: {
        type: "object",
        properties: {
          sesuai: { type: "boolean" },
          keyakinan: { type: "number" },
          apresiasi: { type: "string" },
          saran: { type: "string" },
          temuan_penting: { type: "string" },
        },
      },
    });
    return result;
  } catch (e) {
    console.error("AI verification error:", e);
    return null;
  }
}

/**
 * Sync hasil AI + peringatan waktu ke DailyChecklist.completed_tasks entry.
 * Retry dengan jeda jika entry belum ada (automation belum selesai).
 */
export async function syncAIVerification({ employeeEmail, date, taskTitle, enclosure, aiResult, ageWarning, timeWarning }) {
  const key = dedupKey(taskTitle, enclosure);

  const trySync = async () => {
    const lists = await base44.entities.DailyChecklist.filter({ employee_email: employeeEmail, date });
    if (!lists.length) return false;
    const checklist = lists[0];
    const tasks = (checklist.completed_tasks || []).slice();
    const idx = tasks.findIndex(t => dedupKey(t.task_title, t.notes) === key);
    if (idx === -1) return false;
    const updated = { ...tasks[idx] };
    if (aiResult) {
      updated.ai_verified = aiResult.sesuai;
      updated.ai_confidence = aiResult.keyakinan;
      updated.ai_apresiasi = aiResult.apresiasi;
      updated.ai_saran = aiResult.saran;
      updated.ai_temuan_penting = aiResult.temuan_penting;
    }
    if (ageWarning !== undefined) updated.photo_age_warning = ageWarning || "";
    if (timeWarning !== undefined) updated.photo_time_warning = timeWarning || "";
    tasks[idx] = updated;
    await base44.entities.DailyChecklist.update(checklist.id, { completed_tasks: tasks });
    return true;
  };

  if (await trySync()) return true;
  await new Promise(r => setTimeout(r, 2000));
  return trySync();
}

/**
 * Pipeline verifikasi foto lengkap — FIRE AND FORGET (non-blocking).
 * Dipanggil setelah foto tersimpan, tidak menunggu keeper.
 *
 * 1. Sync peringatan waktu (usia foto + jam tugas) segera
 * 2. Jalankan AI Vision (hanya untuk require_photo=true) di background
 * 3. Sync hasil AI ke checklist setelah selesai
 * 4. Panggil onSuggestionReady (untuk notifikasi lembut ke keeper)
 */
export function runPhotoVerificationInBackground({ photoUrl, task, user, today, ageWarning, timeWarning, onSuggestionReady }) {
  // Step 1: sync peringatan waktu segera
  syncAIVerification({
    employeeEmail: user.email,
    date: today,
    taskTitle: task.label,
    enclosure: "Tugas Harian",
    ageWarning,
    timeWarning,
  }).catch(() => {});

  // Step 2: AI Vision (hanya untuk require_photo=true, sekali per foto)
  if (task.require_photo) {
    verifyPhotoWithAI(photoUrl, task.label, task.keterangan)
      .then(aiResult => {
        if (aiResult) {
          return syncAIVerification({
            employeeEmail: user.email,
            date: today,
            taskTitle: task.label,
            enclosure: "Tugas Harian",
            aiResult,
          }).then(() => {
            if (onSuggestionReady) onSuggestionReady(aiResult);
          });
        }
      })
      .catch(() => {});
  }
}