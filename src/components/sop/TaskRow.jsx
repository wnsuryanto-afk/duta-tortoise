/**
 * Baris tugas pada Jadwal Kerja Harian.
 *
 * Dipisahkan dari TugasHariIni.jsx: keduanya komponen presentasi murni yang
 * menerima seluruh datanya lewat props dan tidak menyentuh state layar induk,
 * sehingga berkas layar tidak perlu ikut terbaca saat mengubah tampilan baris.
 */
import { useState, useEffect, useRef } from "react";
import { Clock, Camera, Star, RefreshCw } from "lucide-react";
import AICatatanCard from "./AICatatanCard";
import PhotoPreviewModal from "./PhotoPreviewModal";

export default function TaskRow({ task, idx, isChecked, lockedInfo, isAbsensi, isSaving, attendance, photoUrl, uploadingPhoto, photoSaved, teamWho, showTeam, requirePhoto, isUkurRotasi, isTimbangBaby, onCheck, onUkurCheck, onTimbangBabyCheck, onPhotoUpload, onPhotoCheck, onPhotoNotes, photoNotes, aiSaran, aiSaranEnabled, getCooldownRemaining }) {
  const isIstirahat = task.noCheck;
  const poin = task.points || 0;
  const cameraRef = useRef(null);
  const photoReceivedRef = useRef(false); // deteksi batal ambil foto kamera
  const [showPhoto, setShowPhoto] = useState(false);
  const [notice, setNotice] = useState(null); // keterangan tertempel di kartu ≥5 dtk
  const [pulse, setPulse] = useState(false); // penegasan singkat saat menekan kartu yang sudah dikerjakan
  const [saveError, setSaveError] = useState(false); // gagal simpan → tombol Coba Lagi
  const [cooldownLeft, setCooldownLeft] = useState(0); // hitungan mundur jeda antar tugas
  const noticeTimer = useRef(null);
  const cooldownTimer = useRef(null);

  // Hitungan mundur jeda — menetap di kartu sampai habis
  const startCooldownNotice = (secs) => {
    setCooldownLeft(secs);
    setSaveError(false);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldownLeft(s => {
        if (s <= 1) { clearInterval(cooldownTimer.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };
  useEffect(() => () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); }, []);
  const isLocked = !!lockedInfo;
  const lockedLabel = lockedInfo
    ? (lockedInfo.kind === "done"
        ? `Sudah dikerjakan ${lockedInfo.name}${lockedInfo.time ? ` jam ${lockedInfo.time}` : ""}`
        : `Ditugaskan ke ${lockedInfo.name}`)
    : "";

  const showNotice = (text) => {
    setNotice({ text, id: Date.now() });
    setSaveError(false);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 6000);
  };

  const openCameraForTask = () => {
    photoReceivedRef.current = false;
    const onWinFocus = () => {
      window.removeEventListener('focus', onWinFocus);
      setTimeout(() => {
        if (!photoReceivedRef.current) {
          showNotice("Foto belum diambil. Tugas ini wajib foto sebelum bisa dicentang. Ketuk tombol kamera untuk mencoba lagi.");
        }
      }, 600);
    };
    window.addEventListener('focus', onWinFocus);
    cameraRef.current?.click();
  };

  const handleClick = async () => {
    // Tidak ada penolakan diam — setiap kasus memunculkan keterangan tertempel di kartu
    if (isAbsensi) { showNotice("Absen dilakukan lewat tombol Check In / Check Out di bagian atas halaman, bukan dari daftar ini."); return; }
    if (isIstirahat) { showNotice("Ini baris penanda waktu istirahat, bukan tugas yang perlu dicentang."); return; }
    if (isSaving) { showNotice("Sedang menyimpan, tunggu sebentar..."); return; }
    if (isLocked) {
      // Penegasan singkat: kedipkan keterangan "sudah dikerjakan" sesaat
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);
      return;
    }
    // Jeda minimum 60 detik antar tugas — kecuali uncheck (isChecked) / absensi / istirahat
    if (!isChecked) {
      const remaining = getCooldownRemaining ? getCooldownRemaining() : 0;
      if (remaining > 0) { startCooldownNotice(remaining); return; }
    }
    if (saveError) setSaveError(false);
    if (isTimbangBaby && !isChecked) { onTimbangBabyCheck(); return; }
    if (isUkurRotasi && !isChecked) { onUkurCheck(); return; }
    if (requirePhoto && !isChecked) {
      openCameraForTask();
      return;
    }
    const ok = await onCheck();
    if (!ok) setSaveError(true);
  };

  const retryCheck = async () => {
    setSaveError(false);
    const remaining = getCooldownRemaining ? getCooldownRemaining() : 0;
    if (remaining > 0) { startCooldownNotice(remaining); return; }
    if (requirePhoto) { openCameraForTask(); return; }
    const ok = await onCheck();
    if (!ok) setSaveError(true);
  };

  return (
    <div className={`rounded-2xl border-2 transition-all ${
      isIstirahat ? "border-gray-100 bg-gray-50 opacity-60"
      : isLocked ? "border-gray-300 bg-gray-100"
      : isChecked ? "border-green-300 bg-green-50"
      : task.terlambat ? "border-red-300 bg-red-50"
      : "border-gray-100 bg-white"
    } shadow-sm`}>
      <div className={`flex items-start gap-3 p-3.5 ${!isIstirahat && !isAbsensi && !isLocked ? "cursor-pointer active:scale-[0.99]" : ""}`} onClick={handleClick}>
        <span className="text-xs font-bold text-gray-400 w-5 text-center pt-0.5 flex-shrink-0">{idx + 1}</span>
        <span className="text-lg flex-shrink-0 leading-none">{task.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className={`text-sm font-semibold ${isChecked || isLocked ? "line-through text-gray-400" : "text-gray-800"}`}>{task.label}</p>
            {requirePhoto && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">📷 Wajib Foto</span>
            )}
            {task.terlambat && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white flex-shrink-0 animate-pulse">⏰ Terlambat</span>
            )}
            {task.badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${task.badgeColor}`}>{task.badge}</span>}
            {!isIstirahat && !isAbsensi && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">+{poin} poin</span>
            )}
            {!isIstirahat && !isAbsensi && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 flex-shrink-0 inline-flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> Jeda 60 dtk
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" /> {task.waktu}</span>
            {task.keterangan && <span className="text-xs text-gray-400">· {task.keterangan}</span>}
          </div>

          {isLocked && (
            <p className={`mt-1 text-[11px] font-medium flex items-center gap-1 ${pulse ? "text-blue-700 scale-[1.02]" : "text-gray-500"} transition-all`}>
              <CheckCircle2 className={`w-3 h-3 ${pulse ? "text-blue-500" : "text-gray-400"}`} /> {lockedLabel}
            </p>
          )}

          {isAbsensi && (
            <p className="text-xs mt-1 font-medium">
              {task.id === "abs_masuk"
                ? attendance?.check_in ? <span className="text-green-600">✓ Masuk {attendance.check_in}</span> : <span className="text-gray-400">Belum check in</span>
                : attendance?.check_out ? <span className="text-green-600">✓ Pulang {attendance.check_out}</span> : <span className="text-gray-400">Belum check out</span>
              }
            </p>
          )}

          {/* Keterangan tertempel (absensi/istirahat/sedang-menyimpan/foto-batal) — menetap ≥5 dtk, bukan toast sekilas */}
          {notice && (
            <div className="mt-1.5 p-2 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-1.5 animate-fade-in">
              <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-blue-700 leading-snug">{notice.text}</p>
            </div>
          )}

          {/* Jeda antar tugas — hitungan mundur yang menetap di kartu sampai habis */}
          {cooldownLeft > 0 && (
            <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-300 flex items-start gap-1.5 animate-fade-in">
              <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
              <p className="text-[11px] font-semibold text-amber-700 leading-snug">
                Tunggu <span className="text-amber-800">{cooldownLeft} detik</span> lagi. Satu tugas butuh waktu untuk dikerjakan.
              </p>
            </div>
          )}

          {/* Gagal simpan (sinyal buruk/error jaringan) → keterangan + tombol Coba Lagi */}
          {saveError && (
            <div className="mt-1.5 p-2 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 animate-fade-in">
              <p className="text-[11px] font-medium text-red-700 leading-snug flex-1">Gagal menyimpan — cek sinyal, lalu coba lagi.</p>
              <button onClick={(e) => { e.stopPropagation(); retryCheck(); }} className="flex-shrink-0 text-[11px] font-bold text-red-700 bg-white border border-red-300 rounded-lg px-2.5 py-1 active:scale-95 transition-all flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Coba Lagi
              </button>
            </div>
          )}

          {/* Photo thumbnail — clickable to enlarge */}
          {photoUrl && (
            <div className="mt-1.5 flex items-start gap-2" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowPhoto(true)} className="block flex-shrink-0">
                <img src={photoUrl} alt="Dokumentasi" className="w-16 h-12 rounded-lg object-cover border border-green-200 hover:opacity-80 transition-opacity" />
              </button>
              <input
                type="text"
                placeholder="Catatan foto (opsional)..."
                defaultValue={photoNotes}
                onBlur={e => { if (e.target.value !== photoNotes) onPhotoNotes(e.target.value); }}
                className="flex-1 min-w-0 h-8 text-xs rounded-lg border border-gray-200 px-2 bg-gray-50/50 focus:bg-white focus:border-blue-300 outline-none"
              />
            </div>
          )}
          {showPhoto && (
            <PhotoPreviewModal open={showPhoto} onClose={() => setShowPhoto(false)} photoUrl={photoUrl} taskTitle={task.label} />
          )}

          {/* Umpan balik visual foto: menyimpan / tersimpan */}
          {(uploadingPhoto || (isSaving && requirePhoto && !isChecked)) && (
            <p className="mt-1 text-[11px] text-blue-600 font-medium flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan foto...
            </p>
          )}
          {photoSaved && (
            <p className="mt-1 text-[11px] text-green-600 font-semibold flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-3 h-3" /> Foto tersimpan ✓
            </p>
          )}

          {/* AI Catatan untuk keeper — apresiasi + saran (bukan penilaian teknis) */}
          <AICatatanCard aiSaran={aiSaran} enabled={aiSaranEnabled} />

          {/* Team view */}
          {showTeam && teamWho.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {teamWho.map((w, i) => (
                <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{w.name} {w.time}</span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {/* Tombol kamera jelas terlihat untuk tugas wajib foto — terpisah dari area centang */}
          {requirePhoto && !isIstirahat && !isAbsensi && !isLocked && (
            <button
              onClick={(e) => { e.stopPropagation(); openCameraForTask(); }}
              disabled={isSaving || uploadingPhoto}
              className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border-2 transition-all active:scale-95 disabled:opacity-50 ${
                isChecked ? "border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
                : "border-red-300 text-red-600 bg-red-50 hover:bg-red-100"
              }`}
            >
              {(uploadingPhoto || (isSaving && requirePhoto)) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              {isChecked ? "Ganti" : "Foto"}
            </button>
          )}
          {/* Optional photo button (non-require_photo, checked, no photo yet) — camera or gallery */}
          {!requirePhoto && !isIstirahat && !isAbsensi && !isLocked && isChecked && !photoUrl && (
            <label className={`w-7 h-7 rounded-xl border-2 border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all ${uploadingPhoto ? "opacity-50" : ""}`}>
              {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" /> : <Camera className="w-3.5 h-3.5 text-gray-400" />}
              <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) onPhotoUpload(e.target.files[0]); e.target.value = ""; }} className="hidden" />
            </label>
          )}

          {/* Checkbox */}
          {!isIstirahat && (
            <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
              isChecked || isLocked ? "bg-green-500 border-green-500"
              : isAbsensi ? "border-gray-200 bg-gray-50"
              : requirePhoto ? "border-red-300 hover:border-red-400"
              : "border-gray-300 hover:border-green-400"
            } ${(isSaving || isLocked) ? "opacity-60" : ""}`} onClick={e => { e.stopPropagation(); if (!isIstirahat && !isAbsensi && !isSaving && !isLocked) handleClick(); }}>
              {(isChecked || isLocked) ? <CheckCircle2 className="w-4 h-4 text-white" /> : null}
            </div>
          )}
        </div>
      </div>

      {/* Hidden camera input for require_photo tasks (camera only, no gallery) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          photoReceivedRef.current = true; // kamera ditutup DENGAN foto → fokus handler tidak akan salah baca
          const ok = await onPhotoCheck(f);
          if (!ok) setSaveError(true);
        }}
      />
    </div>
  );
}

// ── Extra Task Row ──
export function ExtraTaskRow({ log, showTeamView, user, onApprove }) {
  const [poinInput, setPoinInput] = useState("10");
  const isAdmin = ["owner", "admin", "manajer", "kepala_feeder"].includes(user?.role);
  const isPending = log.approval_status === "pending" || !log.approval_status;
  const isApproved = log.approval_status === "approved";

  return (
    <div className={`rounded-2xl border-2 shadow-sm ${isApproved ? "border-green-300 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <span className="text-lg leading-none">📌</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800">{log.item_label}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Tambahan</span>
              {isApproved && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Approved +{log.poin_earned}p</span>}
              {isPending && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Menunggu Approval</span>}
            </div>
            {log.extra_description && <p className="text-xs text-gray-500 mt-0.5">{log.extra_description}</p>}
            <p className="text-xs text-gray-400 mt-0.5">oleh {log.done_by} · {log.done_at}</p>
            {log.photo_url && <img src={log.photo_url} alt="Foto" className="w-16 h-12 rounded-lg object-cover border mt-1.5" />}
          </div>

          {isApproved && (
            <div className="flex items-center gap-1 text-green-600">
              <Star className="w-4 h-4 fill-green-500" />
              <span className="text-sm font-bold">+{log.poin_earned}</span>
            </div>
          )}
        </div>

        {/* Approval actions for admin */}
        {showTeamView && isAdmin && isPending && (
          <div className="mt-3 pt-3 border-t border-amber-200 flex items-center gap-2">
            <input type="number" value={poinInput} onChange={e => setPoinInput(e.target.value)} className="w-16 h-8 rounded-lg border border-gray-300 text-center text-sm" min="0" max="100" />
            <span className="text-xs text-gray-500">poin</span>
            <button onClick={() => onApprove(log, parseInt(poinInput) || 0)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700">
              <Check className="w-3 h-3" /> Approve
            </button>
            <button onClick={() => onApprove(log, 0)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300">
              <X className="w-3 h-3" /> Tolak
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
