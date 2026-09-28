import { ListChecks, Check } from "lucide-react";

/**
 * SeksiPerluDitindak — satu tempat untuk semua kartu penagih.
 *
 * ── Masalah yang diperbaiki ────────────────────────────────────────────────
 *
 * Beranda pemilik sempat punya TUJUH kartu penagih, dan letaknya terpecah:
 * tiga di atas Ringkasan Pagi (persetujuan menggantung, hari tanpa checklist,
 * bonus belum dibayar) dan empat di bawahnya (SOP terkunci, kura perlu
 * diperiksa, peringatan kluster penyakit, kepatuhan SOP). Urutan bacanya jadi
 * tagihan → ringkasan → tagihan lagi, masing-masing dengan bingkai, ikon, dan
 * bantalan sendiri. Di layar 390px itu tujuh kali menggulir sebelum sampai ke
 * angka yang dicari.
 *
 * Yang lebih menyesatkan: di bawahnya masih ada bagian berjudul "Perlu
 * Perhatianmu". Jadi ada delapan tempat berbeda yang semuanya mengaku sebagai
 * hal yang perlu ditindak.
 *
 * Sekarang ketujuhnya berdiri di dalam satu bingkai berjudul, berurutan dari
 * yang paling menghentikan pekerjaan sampai yang paling bisa menunggu.
 *
 * ── Kenapa kosongnya diurus oleh CSS, bukan JavaScript ─────────────────────
 *
 * Tiap kartu penagih sudah tahu sendiri kapan ia tidak punya isi — semuanya
 * `return null`. Yang tidak diketahui induknya adalah apakah ketujuhnya
 * kebetulan kosong bersamaan; menanyakan itu berarti menjalankan ulang tujuh
 * kueri dan tujuh perhitungan di sini, lalu menjaga dua salinan aturan yang
 * sama tetap sepakat. Itu persis pola "dua penulis satu angka" yang berulang
 * kali jadi sumber bug di aplikasi ini.
 *
 * Maka yang dipakai fakta yang sudah ada: kalau ketujuh anaknya mengembalikan
 * null, wadahnya benar-benar tidak punya simpul anak satu pun, jadi `:empty`
 * cocok. Pembungkus luarlah yang memutuskan mana yang tampil — seksinya, atau
 * satu baris "tidak ada yang tertunda".
 *
 * Kalau `:has()` tidak didukung peramban, keduanya ikut tampil bersama
 * kartunya — kurang rapi, tapi tidak ada yang hilang atau salah. Itu
 * kegagalan yang bisa diterima. (Chrome 105+, Safari 15.4+, Firefox 121+;
 * ponsel Android yang dipakai di kandang jauh di atas itu.)
 */
export default function SeksiPerluDitindak({ children }) {
  return (
    <div
      className={[
        "space-y-3",
        // Wadahnya kosong → seksinya disembunyikan.
        "[&:has(.penagih-isi:empty)>section]:hidden",
        // Wadahnya BERISI → baris "semua beres" yang disembunyikan.
        "[&:not(:has(.penagih-isi:empty))>p]:hidden",
      ].join(" ")}
    >
      <section className="rounded-2xl border border-border bg-card/40 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-4 h-4 text-primary flex-shrink-0" />
          <h2 className="text-sm font-semibold">Perlu ditindak</h2>
        </div>
        {/* Tidak boleh ada apa pun di dalam div ini selain kartu penagihnya —
            satu spasi pun membuat `:empty` tidak lagi cocok dan seksinya
            tampil kosong selamanya. JSX membuang baris yang isinya hanya
            spasi, jadi susunan di pemanggilnya aman. */}
        <div className="penagih-isi space-y-3">{children}</div>
      </section>

      {/* Tidak adanya tagihan itu sendiri kabar. Satu baris, bukan tujuh
          kartu yang menghilang tanpa jejak. */}
      <p className="flex items-center gap-2 text-xs text-accent bg-accent/10 border border-accent/25 rounded-xl px-3 py-2">
        <Check className="w-3.5 h-3.5 flex-shrink-0" />
        Tidak ada yang tertunda hari ini.
      </p>
    </div>
  );
}
