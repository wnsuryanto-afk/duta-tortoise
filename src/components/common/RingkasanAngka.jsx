import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { kisiWadahRapat } from "@/lib/kisiWadah";

/**
 * RingkasanAngka — angka kepala halaman, disusun menurut DESAKANNYA.
 *
 * Lahir di beranda Owner, lalu dipindahkan ke common/ karena masalah yang
 * diselesaikannya ada di SELURUH aplikasi: disurvei 4 Okt 2026, sepuluh
 * halaman memajang angka ringkasan dan TIDAK SATU PUN bisa diklik.
 *
 * ── Yang diganti ─────────────────────────────────────────────────────────
 *
 * Sebelumnya kelimanya pil seragam yang berbaris: "Kura di peternakan 136",
 * "Sakit 0", "Telur aktif 232", "Laba 2026 …", "Perlu perhatian 23".
 * Semuanya sama besar, sama warnanya, dan tidak satu pun bisa diklik — jadi
 * "Perlu perhatian 23" berdiri setara dengan "Sakit 0", dan membacanya tidak
 * membawa ke mana-mana.
 *
 * ── Aturan besar-kecilnya ────────────────────────────────────────────────
 *
 * Besarnya ditentukan oleh ISI angkanya, bukan oleh jenis ubinnya. Kabar
 * buruk yang bernilai nol adalah kabar baik, dan kabar baik tidak perlu
 * tempat besar:
 *
 *   mendesak  perlu dikerjakan hari ini     dua kolom, angka besar, berwarna
 *   biasa     keadaan yang perlu diketahui  satu kolom
 *   tenang    kabar buruk yang nilainya 0   satu kolom, redup, bertanda ✓
 *
 * Urutannya mengikuti tingkat itu, jadi yang menuntut tindakan selalu ada di
 * kiri atas — tempat mata jatuh lebih dulu.
 *
 * Setiap ubin menuju halamannya sendiri. Ubin tanpa tujuan tidak dibuat:
 * angka yang menimbulkan pertanyaan tetapi tidak bisa ditelusuri hanya
 * memindahkan pekerjaan ke orang yang membacanya.
 */

const NADA = {
  mendesak: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  bahaya: "border-destructive/40 bg-destructive/10 text-destructive",
  baik: "border-accent/30 bg-accent/10 text-accent",
  biasa: "border-border bg-card/70 text-foreground",
  tenang: "border-border bg-muted/30 text-muted-foreground",
};

function Ubin({ ke, onKlik, ikon: Ikon, label, nilai, sub, nada = "biasa", lebar = false }) {
  const isi = (
    <>
      <div className="flex items-start gap-1.5 min-w-0">
        {Ikon && <Ikon className="w-3.5 h-3.5 flex-shrink-0 opacity-80 mt-px" />}
        {/*
          Dulu `truncate`: satu baris, sisanya dipotong. Di kolom sempit itu
          menyisakan satu huruf — "Nilai stok" jadi "N…", "Pergerakan hari ini"
          jadi "P…". Label yang tinggal satu huruf bukan label.
          Sekarang ia boleh turun ke baris kedua; yang dibatasi jumlah
          barisnya, bukan lebarnya.
        */}
        <span className="text-[11px] font-medium opacity-80 leading-tight line-clamp-2">{label}</span>
      </div>
      {/*
        Angkanya tidak boleh patah di tengah. "Rp 9.455.201" yang pecah jadi
        "Rp" lalu "9.455.201", dan "+65 / -0" jadi "+65" lalu "/ -0", terbaca
        seperti dua hal.
      */}
      <div className={cn("font-bold tabular-nums leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis", lebar ? "text-xl" : "text-base")}>
        {nilai}
      </div>
      {sub && <div className="text-[10px] opacity-75 leading-tight mt-0.5 line-clamp-2">{sub}</div>}
    </>
  );

  const kelas = cn(
    "block rounded-xl border px-3 py-2 text-left transition-all",
    "hover:-translate-y-0.5 hover:shadow-card",
    lebar && "col-span-2",
    NADA[nada] || NADA.biasa,
  );

  /*
    Tujuan yang diawali "#" dipasang sebagai <a> biasa, bukan <Link>.

    React Router tidak menggulir ke jangkar: <Link to="#perlu-perhatian">
    hanya mengubah alamat dan halamannya diam di tempat. Ubin yang terlihat
    bisa diklik tetapi tidak melakukan apa-apa persis jenis cacat yang sedang
    dibereskan di beranda ini. Peramban menangani jangkar sendiri, jadi
    serahkan padanya.
  */
  if (ke && String(ke).startsWith("#")) {
    return <a href={ke} className={kelas}>{isi}</a>;
  }

  /*
    Sebagian ubin tidak pergi ke mana-mana — ia memindahkan tab di halaman
    yang sama. Itu tetap tujuan yang sah, dan tombol sungguhan (bukan div
    ber-onClick) supaya bisa dijangkau keyboard.
  */
  if (!ke) {
    return (
      <button type="button" onClick={onKlik} disabled={!onKlik} className={cn(kelas, !onKlik && "cursor-default hover:translate-y-0 hover:shadow-none")}>
        {isi}
      </button>
    );
  }

  return <Link to={ke} className={kelas}>{isi}</Link>;
}

/**
 * @param ubin daftar { kunci, ke | onKlik, ikon, label, nilai, sub, nada, tingkat }
 *             tingkat: "mendesak" | "biasa" | "tenang"
 */
export default function RingkasanAngka({ ubin = [] }) {
  const urutan = { mendesak: 0, biasa: 1, tenang: 2 };
  const terurut = [...ubin].sort(
    (a, b) => (urutan[a.tingkat] ?? 1) - (urutan[b.tingkat] ?? 1),
  );

  if (terurut.length === 0) return null;

  return (
    /*
      Kolomnya dihitung dari lebar WADAH, bukan dari lebar layar.

      Sebelumnya: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4. Titik henti
      Tailwind membaca lebar LAYAR, sedangkan ubin ini hidup di dalam kepala
      halaman yang lebarnya bisa jauh lebih sempit daripada layarnya — di
      panel pratinjau iPad, layar terbaca "lg" sementara wadahnya hanya
      selebar ponsel. Hasilnya empat kolom selebar 150px: label terpangkas
      jadi satu huruf dan angkanya patah dua baris.

      `auto-fit` + `minmax` tidak punya titik henti sama sekali; ia membagi
      ruang yang BENAR-BENAR ada, berapa pun lebar layarnya.

      `grid-auto-flow: dense` menutup lubangnya. Ubin mendesak memakai dua
      kolom, jadi pada jumlah kolom ganjil selalu tersisa satu petak yang
      tidak muat diisi ubin mendesak berikutnya — itulah ruang kosong besar
      di sebelah "Stok kritis" pada 5 Okt 2026. Dengan `dense`, ubin satu
      kolom mundur mengisinya.
    */
    <div
      className="grid gap-2 mt-4"
      style={kisiWadahRapat(170)}
    >
      {terurut.map(({ kunci, tingkat, ...sisa }) => (
        <Ubin key={kunci} lebar={tingkat === "mendesak"} {...sisa} />
      ))}
    </div>
  );
}
