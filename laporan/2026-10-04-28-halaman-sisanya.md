# Dua puluh delapan halaman sisanya

**4 Oktober 2026** · penutup audit tata letak

---

## Hasil

| | Sebelum audit | Sekarang |
|---|---:|---:|
| Halaman memakai `PageHeader` | 20 | **52** |
| Halaman membuat judulnya sendiri | 32 | **0** |
| Dikecualikan dengan alasan tertulis | — | 2 |
| Chip yang punya tujuan | 0 | 36 |

Batas penjaganya kini **nol**: halaman baru yang membuat judulnya sendiri
**ditolak**, bukan sekadar dicatat.

## Dikerjakan bertahap, bukan sekaligus

Kemarin saya menolak membereskan ketiga puluh dua halaman dalam satu kali —
bukan karena salah, tetapi karena tidak bisa diperiksa. Jadi hari ini
dikerjakan berkelompok, dan angka penjaganya diturunkan tiap kali satu
kelompok selesai dan seluruh penjaga hijau:

```
32 → 28 → 24 → 19 → 15 → 10 → 6 → 0
```

Tiap turunan itu satu kelompok kecil dengan `eslint`, `cek-render` dan
`cek-tataletak` dijalankan sesudahnya.

Alasannya terbukti ada gunanya: pada kelompok terakhir, pembantu yang
menyisipkan baris `import` menaruhnya **di tengah pernyataan import
bertingkat** di `PengaturanWhatsAppPage.jsx` —

```js
import {
import PageHeader from "@/components/common/PageHeader";   // ← di sini
  ShieldCheck, Eye, EyeOff, …
} from "lucide-react";
```

Berkasnya berhenti bisa diurai. Ketahuan oleh `eslint` di kelompok itu juga,
bukan tiga kelompok kemudian, dan sisa halaman langsung disisir untuk
kerusakan yang sama (tidak ada).

## Dua halaman yang sengaja dibiarkan

Keduanya **bukan halaman biasa**, dan alasannya ditulis di dalam penjaganya
sendiri — pengecualian tanpa alasan adalah celah yang kelak dipakai halaman
yang tidak punya alasan.

**`ProfileSetupPage`** — layar penyiapan profil yang berjalan **sebelum
kerangka aplikasi ada**: satu kartu di tengah layar penuh, tanpa menu dan
tanpa kepala halaman. PageHeader di sana akan memasang kepala halaman untuk
halaman yang justru belum punya halaman.

**`TortoisePassport`** — lembar paspor yang **dicetak dan dibawa pembeli**.
Judulnya nama kuranya, di atas kertas. Kepala halaman bergradien dengan pola
daun bukan sesuatu yang pantas keluar dari printer.

## Yang ikut diperbaiki sambil jalan

**`BreedingDetailPage`** menyimpan salinan aturan PageHeader di komentarnya
sendiri — *"Tanpa `truncate`. Di lebar 390px baris ini menyisakan 115px untuk
judul yang butuh 211px… aturan yang sama sudah tertulis di
components/common/PageHeader.jsx."* Sekarang aturannya **datang** dari sana,
bukan ditulis ulang di sampingnya. Dua salinan aturan yang sama selalu
berakhir berselisih.

Beberapa halaman kehilangan ikon yang sebelumnya digambar tangan di sebelah
judul (`<Zap/>`, `<Printer/>`, `<Skull/>`, `<Stethoscope/>`); semuanya
dipasang kembali lewat prop `icon` PageHeader, jadi ukurannya, warnanya dan
jaraknya kini sama di seluruh aplikasi.

## Yang TIDAK diubah, dan kenapa

Halaman-halaman ini sekarang punya tempat untuk angka ringkasan, tetapi
**tidak semuanya diberi angka**. Memasang chip hanya karena tempatnya tersedia
akan mengulang kesalahan yang justru sedang dibereskan: angka yang tidak
menjawab pertanyaan siapa pun. Yang diberi angka hanya halaman yang memang
punya pertanyaan rutin — dan itu sudah dikerjakan di dua putaran sebelumnya.

## Hasil akhir

24 penjaga hijau, `npx vite build` lolos, 96 komponen merender tanpa error.
Tidak ada data yang diubah; seluruh perubahan ada di susunan layar.
