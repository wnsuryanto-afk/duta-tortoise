import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { bundelSaatIni, bundelTerbit, adaVersiBaru, bolehMuatUlangOtomatis } from "@/lib/versiAplikasi";

/**
 * PembaruanTersedia — bilah kecil yang muncul ketika aplikasi yang sedang
 * dibuka sudah ketinggalan dari yang terbit.
 *
 * Latar belakangnya ada di lib/versiAplikasi.js. Ringkasnya: sebuah HP
 * menampilkan daftar kandang yang sudah tiga hari usang, tanpa satu pun
 * petunjuk di layar, dan yang terbaca oleh pemakainya adalah "datanya
 * hilang".
 *
 * ── Memuat ulang sendiri, TAPI hanya saat aman ──────────────────────
 *
 * Versi pertama berkas ini menolak memuat ulang sendiri sama sekali,
 * dengan alasan yang benar: yang paling sering membuka aplikasi ini
 * adalah kiper yang sedang berdiri di depan kandang, kadang di tengah
 * mengisi formulir atau menunggu foto terunggah. Memuat ulang tanpa
 * diminta akan membuang pekerjaan yang belum tersimpan — justru pada
 * orang yang paling sulit mengulanginya.
 *
 * Alasan itu tetap berlaku, tetapi ia hanya berlaku DI TENGAH PEKERJAAN.
 * Pada detik-detik pertama sesudah aplikasi dibuka belum ada apa pun yang
 * bisa hilang — dan justru itulah saat ketertinggalan paling mahal,
 * karena daftar kerja sehari penuh baru saja dibaca dari bundel yang
 * usang.
 *
 * Harga dari menunggu dibuktikan sendiri oleh aplikasi ini: sebuah HP
 * menampilkan daftar kandang dari sebelum 27-09-2026 selama LIMA HARI.
 * Selama itu empat kandang Bonsai berisi 36 kura tidak punya satu pun
 * ubin untuk dicentang — pakan dan kebersihannya tidak punya jalur
 * pencatatan sama sekali. Bilah yang sopan dan menunggu tidak cukup
 * untuk hal yang merusak daftar kerja sehari penuh.
 *
 * Jadi sekarang: bila versi baru terdeteksi dalam JEDA_AMAN pertama
 * sesudah aplikasi dibuka, DAN pemakainya belum menyentuh apa pun, muat
 * ulang sendiri. Lewat dari itu — atau kalau sudah ada yang disentuh —
 * kembali ke perilaku lama: diberitahu, tombolnya disediakan, waktunya
 * mereka yang pilih.
 *
 * Penjaga putaran: sekali per sesi peramban. Kalau bundel barunya
 * ternyata rusak dan ikut menganggap dirinya usang, aplikasi ini tidak
 * boleh memuat ulang tanpa henti di tangan orang yang sedang bekerja.
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

/** Satu kali per sesi peramban — penjaga terhadap putaran muat-ulang. */
const KUNCI_SESI = "pembaruan-muat-ulang-otomatis";

function sudahPernahOtomatis() {
  try {
    return sessionStorage.getItem(KUNCI_SESI) === "1";
  } catch {
    // Mode penyamaran / penyimpanan diblokir: anggap sudah pernah, supaya
    // ketidakpastian jatuh ke sisi yang TIDAK memuat ulang berulang kali.
    return true;
  }
}

function tandaiOtomatis() {
  try {
    sessionStorage.setItem(KUNCI_SESI, "1");
  } catch {
    /* tidak bisa menandai — bilahnya tetap muncul sebagai cadangan */
  }
}

export default function PembaruanTersedia() {
  const [ada, setAda] = useState(false);

  useEffect(() => {
    // Di server pengembangan tidak ada bundel ber-hash, jadi tidak ada yang
    // bisa dibandingkan — dan itu bukan kegagalan, hanya "tidak berlaku".
    const sekarang = bundelSaatIni();
    if (!sekarang) return undefined;

    let berhenti = false;
    const ac = new AbortController();
    const dibuka = Date.now();

    // Apa pun yang menandakan pemakainya sudah mulai bekerja. Sesudah ini
    // memuat ulang sendiri tidak lagi aman, berapa pun umur halamannya.
    let tersentuh = false;
    const tandai = () => { tersentuh = true; };
    const SENTUHAN = ["pointerdown", "keydown", "input", "submit"];
    SENTUHAN.forEach((e) => window.addEventListener(e, tandai, { passive: true, capture: true }));

    const masihAman = () =>
      bolehMuatUlangOtomatis({
        tersentuh,
        umurMs: Date.now() - dibuka,
        sudahPernah: sudahPernahOtomatis(),
      });

    const periksa = async () => {
      if (berhenti) return;
      try {
        const terbit = await bundelTerbit(ac.signal);
        if (!berhenti && adaVersiBaru(sekarang, terbit)) {
          berhenti = true;
          ac.abort();
          if (masihAman()) {
            tandaiOtomatis();
            window.location.reload();
            return;
          }
          setAda(true);
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
      SENTUHAN.forEach((e) => window.removeEventListener(e, tandai, { capture: true }));
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
