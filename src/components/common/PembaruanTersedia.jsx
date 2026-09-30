import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { bundelSaatIni, bundelTerbit, adaVersiBaru } from "@/lib/versiAplikasi";

/**
 * PembaruanTersedia — bilah kecil yang muncul ketika aplikasi yang sedang
 * dibuka sudah ketinggalan dari yang terbit.
 *
 * Latar belakangnya ada di lib/versiAplikasi.js. Ringkasnya: sebuah HP
 * menampilkan daftar kandang yang sudah tiga hari usang, tanpa satu pun
 * petunjuk di layar, dan yang terbaca oleh pemakainya adalah "datanya
 * hilang".
 *
 * ── Kenapa tidak memuat ulang sendiri ───────────────────────────────
 *
 * Karena yang paling sering membuka aplikasi ini adalah kiper yang sedang
 * berdiri di depan kandang, kadang di tengah mengisi formulir atau
 * menunggu foto terunggah. Memuat ulang tanpa diminta akan membuang
 * pekerjaan yang belum tersimpan — dan justru pada orang yang paling
 * sulit mengulanginya. Jadi: diberitahu, tombolnya disediakan, waktunya
 * mereka yang pilih.
 *
 * ── Kapan diperiksa ─────────────────────────────────────────────────
 *
 * Sekali saat dibuka, lalu tiap kali tab kembali terlihat, lalu tiap 15
 * menit. Pemeriksaannya satu permintaan kecil ke halaman awal. Begitu
 * versinya terdeteksi baru, pemeriksaan BERHENTI — tidak ada gunanya
 * terus bertanya setelah jawabannya diketahui, dan sinyal di kandang
 * tidak untuk diboroskan.
 */
const JEDA_MS = 15 * 60 * 1000;

export default function PembaruanTersedia() {
  const [ada, setAda] = useState(false);

  useEffect(() => {
    // Di server pengembangan tidak ada bundel ber-hash, jadi tidak ada yang
    // bisa dibandingkan — dan itu bukan kegagalan, hanya "tidak berlaku".
    const sekarang = bundelSaatIni();
    if (!sekarang) return undefined;

    let berhenti = false;
    const ac = new AbortController();

    const periksa = async () => {
      if (berhenti) return;
      try {
        const terbit = await bundelTerbit(ac.signal);
        if (!berhenti && adaVersiBaru(sekarang, terbit)) {
          setAda(true);
          berhenti = true;
          ac.abort();
        }
      } catch {
        // Sinyal buruk di kandang adalah keadaan biasa. Diam.
      }
    };

    periksa();
    const jam = setInterval(periksa, JEDA_MS);
    const saatTerlihat = () => {
      if (document.visibilityState === "visible") periksa();
    };
    document.addEventListener("visibilitychange", saatTerlihat);

    return () => {
      berhenti = true;
      ac.abort();
      clearInterval(jam);
      document.removeEventListener("visibilitychange", saatTerlihat);
    };
  }, []);

  if (!ada) return null;

  return (
    <div
      role="status"
      /* Ditaruh di ATAS bilah menu bawah (`bottom-20`), bukan menempel di
         dasar layar: di HP, dasar layar sudah ditempati menu, dan bilah
         yang menimpanya menutupi tombol yang dipakai tiap hari. */
      className="fixed left-1/2 -translate-x-1/2 bottom-20 sm:bottom-6 z-40 w-[min(92vw,26rem)]
                 rounded-xl border border-primary/30 bg-card shadow-modal
                 px-3.5 py-2.5 flex items-center gap-3 animate-fade-in"
    >
      <RefreshCw className="w-4 h-4 text-primary flex-shrink-0" />
      <p className="text-xs text-foreground leading-snug flex-1 min-w-0">
        <span className="font-semibold">Ada versi baru.</span>{" "}
        Layar ini masih memakai versi lama — isinya bisa tertinggal.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg
                   bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition"
      >
        Muat ulang
      </button>
    </div>
  );
}
