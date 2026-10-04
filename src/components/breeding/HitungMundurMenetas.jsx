import { hitungMundur } from "@/lib/hitungMundur";

/**
 * Angka besar di sisi kanan kartu clutch: berapa hari lagi menetas.
 *
 * Satu komponen untuk DUA tab. Tab "Telur & Inkubasi" sudah punya hitung
 * mundur ini, ditulis langsung di dalam JSX halaman; tab "Pembiakan" —
 * yang dibuka sehari-hari — tidak punya sama sekali. Yang dipindahkan ke
 * sini bukan cuma tampilannya, tetapi juga aturannya (lihat
 * lib/hitungMundur.js), supaya kedua tab tidak bisa menjawab berbeda untuk
 * clutch yang sama.
 *
 * @param breeding  satu catatan Breeding
 * @param hariIni   acuan hari (diisi penguji; bawaannya hari ini)
 * @param kontras   true saat berdiri di atas latar merah penuh (header tab
 *                  Telur & Inkubasi saat masa menetas) — warnanya dibalik
 *                  jadi putih, karena merah di atas merah tidak terbaca.
 */
export default function HitungMundurMenetas({ breeding, hariIni, kontras = false, tanggalSelesai = null }) {
  const m = hitungMundur(breeding, hariIni || new Date());
  if (!m) return null;

  if (kontras) {
    // Di atas latar merah penuh semuanya putih; warnanya sudah disampaikan
    // oleh latarnya sendiri.
    return (
      <div className="flex-shrink-0 text-center min-w-[72px] text-white">
        <div className="text-2xl leading-none">{m.jenis === "masa" ? "🚨" : "🥚"}</div>
        <div className="text-xs font-bold mt-0.5">
          {m.jenis === "masa" ? "Menetas!" : `${m.hari} hari`}
        </div>
      </div>
    );
  }

  if (m.jenis === "selesai" || m.jenis === "menetas") {
    return (
      <div className="flex-shrink-0 text-center min-w-[72px]">
        <div className="text-xl leading-none">✅</div>
        <div className="text-[10px] font-semibold leading-tight text-green-700">
          {m.jenis === "selesai" ? "Selesai" : "Menetas"}
        </div>
        {tanggalSelesai && <div className="text-[9px] text-muted-foreground">{tanggalSelesai}</div>}
      </div>
    );
  }

  if (m.jenis === "gagal") {
    return (
      <div className="flex-shrink-0 text-center min-w-[72px]">
        <div className="text-xl leading-none">❌</div>
        <div className="text-[10px] font-semibold leading-tight text-muted-foreground">Gagal</div>
      </div>
    );
  }

  const warna =
    m.nada === "merah" ? "text-red-600" :
    m.nada === "oranye" ? "text-orange-500" :
    m.nada === "hijau" ? "text-green-600" : "text-muted-foreground";

  /*
   * Tiga keadaan, tiga kalimat — dan angkanya SELALU berarti hal yang
   * sama dengan kalimat tepat di bawahnya. Hitung mundur yang menampilkan
   * "12" tanpa menyebut 12 apa adalah sumber salah baca yang paling murah
   * dihindari.
   */
  const bawah =
    m.jenis === "menuju" ? "hari lagi" :
    m.jenis === "masa" ? (m.hari === null ? "masa menetas" : "hari tersisa") :
    "hari lewat";

  const atas =
    m.jenis === "menuju" ? "perkiraan menetas" :
    m.jenis === "masa" ? "🚨 masa menetas" :
    "⚠️ lewat perkiraan";

  return (
    <div className="flex-shrink-0 text-center min-w-[76px]">
      <div className="text-[9px] text-muted-foreground font-medium leading-tight">{atas}</div>
      {m.hari === null ? (
        <div className={`font-black leading-none ${warna} text-2xl mt-0.5`}>🚨</div>
      ) : (
        <div className={`font-black leading-none ${warna} tabular-nums mt-0.5`} style={{ fontSize: "2rem" }}>
          {m.hari}
        </div>
      )}
      <div className="text-[10px] text-muted-foreground font-medium leading-tight">{bawah}</div>
    </div>
  );
}
