import { hitungMundur } from "@/lib/hitungMundur";

/**
 * Hitung mundur menetas — kotak kecil di sisi kanan kartu clutch.
 *
 * Satu komponen untuk DUA tab. Tab "Telur & Inkubasi" sudah punya hitung
 * mundur ini, ditulis langsung di dalam JSX halaman; tab "Pembiakan" — yang
 * dibuka sehari-hari — tidak punya sama sekali. Yang dipindahkan ke sini
 * bukan cuma tampilannya, tetapi juga aturannya (lihat lib/hitungMundur.js),
 * supaya kedua tab tidak bisa menjawab berbeda untuk clutch yang sama.
 *
 * ── Dirapikan 4 Okt 2026 ─────────────────────────────────────────────────
 *
 * Bentuk pertamanya tiga baris menumpuk: keterangan kecil di atas, angka
 * besar di tengah, satuan di bawah — dengan huruf 9px yang di ponsel hanya
 * jadi bintik abu-abu. Keterangan atasnya ("perkiraan menetas") juga
 * mengulang baris yang sudah ada di kartu yang sama: "Estimasi menetas:
 * 21 Des s/d 15 Jan 2027".
 *
 * Sekarang satu kotak berbingkai, DUA baris: angka + satuan hari di baris
 * pertama, keterangan di baris kedua. Warnanya pindah dari huruf ke kotak,
 * jadi mendesaknya terbaca sebelum angkanya sempat dibaca.
 *
 * @param breeding  satu catatan Breeding
 * @param hariIni   acuan hari (diisi penguji; bawaannya hari ini)
 * @param kontras   true saat berdiri di atas latar merah penuh (header tab
 *                  Telur & Inkubasi saat masa menetas) — bingkai dan huruf
 *                  jadi putih, karena merah di atas merah tidak terbaca.
 */

const NADA = {
  hijau: "border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400",
  oranye: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-400",
  merah: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400",
  netral: "border-border bg-muted/40 text-muted-foreground",
};

function Kotak({ children, kelas }) {
  return (
    <div className={`flex-shrink-0 w-[84px] rounded-xl border px-2 py-1.5 text-center ${kelas}`}>
      {children}
    </div>
  );
}

export default function HitungMundurMenetas({ breeding, hariIni, kontras = false, tanggalSelesai = null }) {
  const m = hitungMundur(breeding, hariIni || new Date());
  if (!m) return null;

  // Di atas latar merah penuh warnanya sudah disampaikan latarnya sendiri.
  const kelas = kontras ? "border-white/70 bg-white/10 text-white" : NADA[m.nada] || NADA.netral;

  if (m.jenis === "selesai" || m.jenis === "menetas") {
    return (
      <Kotak kelas={kontras ? "border-white/70 bg-white/10 text-white" : NADA.hijau}>
        <div className="text-lg leading-none">✅</div>
        <div className="text-[11px] font-semibold leading-tight mt-0.5">
          {m.jenis === "selesai" ? "Selesai" : "Menetas"}
        </div>
        {tanggalSelesai && <div className="text-[10px] opacity-70 leading-tight">{tanggalSelesai}</div>}
      </Kotak>
    );
  }

  if (m.jenis === "gagal") {
    return (
      <Kotak kelas={NADA.netral}>
        <div className="text-lg leading-none">❌</div>
        <div className="text-[11px] font-semibold leading-tight mt-0.5">Gagal</div>
      </Kotak>
    );
  }

  if (m.jenis === "masa") {
    return (
      <Kotak kelas={kelas}>
        <div className="text-lg leading-none">🚨</div>
        <div className="text-[11px] font-bold leading-tight mt-0.5">Masa menetas</div>
        {m.hari !== null && (
          <div className="text-[10px] opacity-80 leading-tight tabular-nums">sisa {m.hari} hari</div>
        )}
      </Kotak>
    );
  }

  /*
   * "menuju" dan "lewat" memakai bentuk yang sama supaya keduanya terbaca
   * dengan satu kebiasaan mata: angka besar lalu kata "hari", keterangan di
   * bawahnya. Yang membedakan hanya kata itu dan warnanya.
   */
  return (
    <Kotak kelas={kelas}>
      <div className="flex items-baseline justify-center gap-1 leading-none">
        <span className="text-2xl font-black tabular-nums">{m.hari}</span>
        <span className="text-[11px] font-semibold">hari</span>
      </div>
      <div className="text-[10px] opacity-80 leading-tight mt-0.5">
        {m.jenis === "menuju" ? "lagi menetas" : "lewat perkiraan"}
      </div>
    </Kotak>
  );
}
