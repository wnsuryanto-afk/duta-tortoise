/**
 * MotivasiHarianCard — kartu sapaan hangat + kalimat motivasi acak.
 * Muncul setelah keeper/kepala_feeder check-in.
 * Acak per HARI per ORANG (tidak sama 2 hari berturut untuk orang yang sama).
 * Hari Sabtu: kalimat khusus bertema gajian.
 * Kartu besar bisa ditutup → kalimat tetap terlihat kecil sepanjang hari.
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { format } from "date-fns";
import { X } from "lucide-react";

const REGULAR_QUOTES = [
  "Hari baru, semangat baru. Ayo buat hari ini berarti! ☀️",
  "Orang jujur tidurnya nyenyak. Itu kekayaan yang tidak bisa dibeli.",
  "Rezeki itu ikut kerja keras dan niat baik. Semangat pagi!",
  "Sedikit demi sedikit, lama-lama jadi bukit. Menabung itu seru kalau dijalani.",
  "Kerja yang beres itu tanda karakter, bukan cuma tanda rajin.",
  "Semangat! Hari ini kesempatan baru untuk jadi lebih baik dari kemarin.",
  "Uang habis bisa dicari lagi, nama baik hilang susah kembalinya.",
  "Yang penting bukan seberapa cepat, tapi seberapa jujur. 💪",
  "Selamat pagi! Awali dengan senyum, lanjutkan dengan semangat. 😊",
  "Orang yang bisa dipercaya selalu punya tempat di mana pun ia bekerja.",
  "Tunda beli yang tidak perlu, nanti kaget sendiri lihat tabungan. 💰",
  "Kerja itu ibadah, hasilnya berkah. Semangat hari ini!",
  "Hebat itu bukan yang tidak pernah salah, tapi yang berani mengaku salah.",
  "Semangat! Setiap keringat hari ini ada nilainya.",
  "Disiplin hari ini, santai di hari tua. Ayo!",
  "Jangan bandingkan hidupmu dengan orang lain. Bandingkan dengan dirimu kemarin.",
  "Pagi yang ceria bikin kerja terasa ringan. Semangat! ☀️",
  "Sedikit menahan hari ini, banyak bersyukur nanti.",
  "Kualitas kerja itu tanda tangan kita. Tanda tangani dengan bangga.",
  "Semangat pagi! Hari ini kamu bisa lebih baik lagi. 🔥",
  "Yang dikerjakan dengan hati, hasilnya beda. Percaya deh.",
  "Kalau ada yang salah, bilang apa adanya. Itu bukan lemah, itu berani.",
  "Menabung Rp 10 ribu sehari = Rp 3,6 juta setahun. Coba deh! 💰",
  "Semangat! Orang sukses juga mulai dari hari biasa seperti ini.",
  "Kerja rapi bukan untuk dilihat orang, tapi supaya kita tenang.",
  "Tepat waktu itu bentuk hormat pada diri sendiri. Terima kasih ya!",
  "Hari ini cerah, hati juga harus cerah. 😄",
  "Jangan remehkan hal kecil. Yang besar juga mulai dari kecil.",
  "Semangat! Rezeki tidak pernah tertukar.",
  "Integritas itu: tetap benar walau tidak ada yang melihat.",
  "Punya uang itu enak, punya tabungan itu tenang. 💵",
  "Semangat pagi! Yang penting mulai, nanti juga selesai.",
  "Hidup itu seperti kerja: yang tekun biasanya yang sampai.",
  "Terima kasih sudah datang hari ini. Kehadiranmu berarti.",
  "Belajar hal baru hari ini, walau cuma satu. Itu sudah untung.",
  "Semangat! Jangan lupa istirahat dan minum air ya. 💧",
  "Orang baik selalu punya jalan. Teruskan kebaikanmu.",
  "Hemat bukan pelit — hemat itu punya rencana. 💰",
  "Kalau capek, pelan-pelan saja. Yang penting jangan menyerah.",
  "Semangat! Hari ini pasti ada hal baik yang menunggu.",
  "Kerja keras memang capek, tapi menyesal lebih capek.",
  "Sopan itu murah, tapi harganya mahal di mata orang.",
  "Semangat pagi! Kamu lebih kuat dari yang kamu kira. 💪",
  "Yang penting bukan mulai paling awal, tapi tidak berhenti di tengah.",
  "Simpan sedikit dari setiap penghasilan. Diri kita yang besok pasti berterima kasih.",
  "Ceria itu menular. Ayo tularkan hari ini! 😊",
  "Bekerja dengan jujur bikin hati ringan. Selamat pagi!",
  "Semangat! Setiap hari adalah tabungan menuju hidup yang lebih baik.",
  "Jadilah orang yang kalau tidak ada, dicari. 🙌",
  "Hari ini kita usaha, hasilnya kita syukuri. Semangat!",
];

const SATURDAY_QUOTES = [
  "Sabtu ceria — hari gajian! Terima kasih untuk kerja kerasnya minggu ini. 💰",
  "Selamat hari Sabtu! Kerja keras seminggu, hari ini waktunya panen. 🎉",
  "Sabtu! Jangan lupa sisihkan sedikit untuk tabungan ya. 😉",
  "Gajian itu hasil, bukan hadiah. Kamu pantas mendapatkannya! 🙌",
];

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getMotivasiQuote(dateStr, email) {
  const date = new Date(dateStr + "T00:00:00");
  const isSat = date.getDay() === 6;
  const pool = isSat ? SATURDAY_QUOTES : REGULAR_QUOTES;

  const hash = simpleHash(dateStr + email);
  let idx = hash % pool.length;

  // Cek hari kemarin — jika kalimatnya sama, geser 1
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = format(yesterday, "yyyy-MM-dd");
  const yIsSat = yesterday.getDay() === 6;
  const yPool = yIsSat ? SATURDAY_QUOTES : REGULAR_QUOTES;
  const yIdx = simpleHash(yStr + email) % yPool.length;

  if (pool[idx] === yPool[yIdx] && pool.length > 1) {
    idx = (idx + 1) % pool.length;
  }

  return pool[idx];
}

export default function MotivasiHarianCard() {
  const { user } = useCurrentUser();
  const today = format(new Date(), "yyyy-MM-dd");
  const storageKey = `motivasi_dismissed_${today}_${user?.email || ""}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { setDismissed(localStorage.getItem(storageKey) === "true"); } catch {}
  }, [storageKey]);

  const { data: todayAttendance } = useQuery({
    queryKey: ["attendance-today", user?.email, today],
    queryFn: async () => {
      const res = await base44.entities.Attendance.filter({ employee_email: user.email, date: today });
      return res[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 60 * 1000,
  });

  // Hanya tampil jika sudah check-in
  if (!todayAttendance?.check_in) return null;

  const quote = getMotivasiQuote(today, user?.email || "");
  const firstName = (user?.full_name || user?.email || "").split(" ")[0];

  const handleClose = () => {
    try { localStorage.setItem(storageKey, "true"); } catch {}
    setDismissed(true);
  };

  // Mode kecil (sudah ditutup) — tetap terlihat sepanjang hari
  if (dismissed) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
        <span className="text-base flex-shrink-0">💬</span>
        <p className="text-xs text-amber-800 flex-1 leading-snug">{quote}</p>
      </div>
    );
  }

  // Mode besar (baru check-in)
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200 p-5 shadow-sm animate-fade-in">
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 text-amber-400 hover:text-amber-700 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex items-start gap-3.5 pr-8">
        <div className="text-4xl flex-shrink-0 leading-none mt-0.5">🌅</div>
        <div>
          <h2 className="text-xl font-heading font-bold text-amber-900">
            Selamat pagi, {firstName}! 👋
          </h2>
          <p className="text-sm text-amber-800 mt-2 leading-relaxed">
            {quote}
          </p>
        </div>
      </div>
    </div>
  );
}