# Layar putih yang hampir tidak ketahuan

**4 Oktober 2026** · lanjutan audit tata letak

---

## Yang terjadi

Sesudah memindahkan 32 kepala halaman kemarin, yang memeriksanya **hanya
eslint** — dan eslint tahu kodenya *sah*, bukan bahwa halamannya *mau
tampil*. Satu prop yang tidak ditutup atau satu variabel yang pindah ruang
lingkup lolos begitu saja.

Jadi keduapuluh enam halaman itu dimasukkan ke penjaga render. Hasilnya:
**seluruh 122 kasus gagal**, dengan satu pesan yang sama —

```
sessionStorage is not defined
```

Dugaan pertama saya: kekurangan penjaganya, karena Node memang tidak punya
`sessionStorage`. Ternyata bukan.

## Cacat sungguhan: satu baris di jalur paling kritis

Dua penyedia membungkus **seluruh** aplikasi, dan keduanya membaca
penyimpanan peramban **di dalam `useState`** — yaitu saat render pertama:

```js
// ThemeProvider
const [theme] = useState(() => localStorage.getItem("duta_theme") || "light");

// ViewAsProvider
const [viewAsRole] = useState(() => sessionStorage.getItem(SESSION_KEY) || null);
```

Kalau pembacaan itu melempar, **tidak ada satu layar pun yang terbentuk.**
Bukan pesan kesalahan, bukan layar kosong yang bisa dijelaskan: layar putih,
tanpa petunjuk apa pun.

Dan keduanya memang bisa melempar. **Di peramban yang data situsnya
diblokir, menyentuh `localStorage` saja sudah melempar `SecurityError`** —
bukan mengembalikan null. Kiper membuka aplikasi ini dari ponsel masing
masing, dan satu setelan privasi yang tidak pernah kita lihat cukup untuk
membuat aplikasinya tidak bisa dibuka sama sekali.

Peluangnya kecil. Akibatnya total, dan tanpa jejak untuk ditelusuri.

## Yang diperbaiki

`lib/simpananAman.js` — satu pembungkus untuk keduanya, yang mengembalikan
`null` alih-alih melempar, dan yang juga menangkap lemparan **saat menyentuh
propertinya**, bukan hanya saat memanggil `getItem`.

Yang hilang kalau penyimpanannya memang tidak bisa dipakai: tema kembali ke
terang tiap muat ulang, dan "Lihat Sebagai" lupa perannya. Keduanya bisa
diterima. Layar putih tidak.

## Penjaganya

`cek-tataletak.mjs` bertambah bagian ketiga: **ThemeContext dan ViewAsContext
tidak boleh menyentuh `localStorage`/`sessionStorage` langsung.** Ditempatkan
di penjaga tata letak karena inilah lapisan terluar tata letak aplikasi —
kalau ia gagal, tidak ada tata letak sama sekali. Diuji merah.

Penjaga render juga kini memasang `ViewAsProvider`, sehingga halaman yang
memanggil `useViewAs()` bisa dirender. Penjaga yang menolak halaman karena
kekurangan dirinya sendiri akan membuat orang berhenti menambahkan halaman ke
sana.

## Dan verifikasi yang jadi tujuan awalnya

**122 komponen merender tanpa error** — naik dari 96, dengan keduapuluh enam
halaman yang kepala halamannya dipindahkan kemarin ikut di dalamnya. Tidak
ada satu pun yang rusak oleh pemindahan itu.

Dua pembacaan penyimpanan lain yang tidak dibungkus masih ada
(`lib/tourContext.jsx`, beberapa komponen), tetapi tidak satu pun berada di
`useState` penyedia akar: lemparan di sana mematikan satu penangan atau satu
kartu, bukan seluruh aplikasi. Dicatat, tidak diubah.

24 penjaga hijau, `npx vite build` lolos.
