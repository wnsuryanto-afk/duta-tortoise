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
  "Kura-kura jalannya pelan, tapi tidak pernah balik arah. Semangat hari ini! 🐢",
  "Pagi yang baik dimulai dari niat yang baik. Selamat bekerja!",
  "Kura-kura di sini umurnya bisa 70 tahun — kamu sedang merawat makhluk yang akan hidup lebih lama dari kita semua. Keren, kan?",
  "Tidak ada pekerjaan kecil. Tempat minum yang bersih hari ini bisa menyelamatkan satu nyawa.",
  "Pelan tapi rapi lebih baik daripada cepat tapi terlewat. 🐢",
  "Semangat pagi! Hari ini ada 143 kura yang menunggu sarapan darimu.",
  "Kerja yang tulus selalu kelihatan hasilnya. Selamat pagi!",
  "Sulcata bisa hidup di gurun karena sabar. Kita juga bisa sabar hari ini. 💪",
  "Rezeki tidak pernah salah alamat. Semangat kerjanya!",
  "Sedikit lebih teliti hari ini, banyak masalah hilang besok.",
  "Kura tidak bisa bilang terima kasih, tapi mereka sehat karena kamu. Itu terima kasihnya.",
  "Hari baru, kesempatan baru. Ayo mulai! ☀️",
  "Yang rutin itu membosankan, tapi yang rutin juga yang bikin farm ini hidup. Terima kasih ya.",
  "Kerja rapi itu bukan bakat, tapi kebiasaan. Dan kamu sedang membangunnya.",
  "Semangat! Jangan lupa minum air, jangan cuma kura yang direndam. 😄",
  "Kalau capek, istirahat sebentar itu boleh. Yang penting jangan berhenti.",
  "Hari ini kita rawat mereka, besok mereka jadi kebanggaan farm ini.",
  "Kerja bagus bukan yang paling cepat, tapi yang paling bisa dipercaya.",
  "Selamat pagi! Semoga hari ini lancar dan tidak ada kura yang ngambek. 🐢",
  "Sekecil apa pun tugasnya, ada kura yang bergantung padanya.",
  "Setiap hari kamu datang, farm ini jadi lebih baik sedikit demi sedikit.",
  "Yang penting bukan seberapa banyak, tapi seberapa benar. Semangat!",
  "Pagi ini cerah untuk berjemur — kura senang, kita juga senang. ☀️",
  "Jangan lupa senyum, biar kuranya ikut semangat. 😊",
  "Orang yang bisa dipercaya itu langka. Jadilah yang langka itu.",
  "Kerja hari ini adalah tabungan untuk hari esok. Semangat!",
  "Kandang bersih, kura sehat, hati tenang. Ayo mulai!",
  "Sabar seperti kura, tekun seperti semut. Bisa! 🐢",
  "Terima kasih sudah datang tepat waktu. Itu bukan hal kecil.",
  "Hari ini coba satu hal lebih baik dari kemarin. Cuma satu, cukup.",
  "Kalau ada yang aneh dengan kuranya, jangan diam — laporkan. Kamu matanya farm ini.",
  "Semangat pagi! Semoga rezekinya lancar seperti air kolam azolla. 💧",
  "Yang kamu kerjakan hari ini akan terlihat hasilnya bulan depan. Sabar ya.",
  "Bekerja dengan hati itu kelihatan, bahkan dari foto. 📸",
  "Selamat pagi, pahlawan kura! 🦸",
  "Kerja keras itu biasa, kerja teliti itu luar biasa.",
  "Jangan buru-buru. Kura saja santai, tapi sampai juga. 🐢",
  "Hari ini kamu bagian penting dari farm ini. Terima kasih.",
  "Kalau ada yang sulit, bilang. Tidak ada yang kerja sendirian di sini.",
  "Semangat! Sisa hari ini masih panjang, tapi kamu pasti bisa.",
];

const SATURDAY_QUOTES = [
  "Sabtu ceria — hari gajian! Terima kasih untuk kerja kerasnya minggu ini. 💰",
  "Selamat hari Sabtu! Kerja keras seminggu, hari ini waktunya panen. 🎉",
  "Sabtu! Semangat sedikit lagi, akhir minggu sudah di depan mata.",
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