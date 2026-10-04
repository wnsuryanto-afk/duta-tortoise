# Ringkasan beranda ditata ulang

**4 Oktober 2026** · beranda Owner

---

## Yang ada sebelumnya

Lima pil seragam berbaris di kepala beranda:

> 🐢 Kura di peternakan **136** · ❤️ Sakit **0** · 🥚 Telur aktif **232** ·
> 💲 Laba 2026 **Rp 41.243.901** · ⚠️ Perlu perhatian **23**

Tiga hal yang salah dengan susunan itu:

1. **Semuanya sama besar.** "Perlu perhatian 23" — dua puluh tiga hal yang
   menunggu dikerjakan — berdiri setara dengan "Sakit 0", yang artinya tidak
   ada yang perlu dikerjakan sama sekali.
2. **Tidak satu pun bisa diklik.** Angka yang menimbulkan pertanyaan tetapi
   tidak bisa ditelusuri hanya memindahkan pekerjaan ke orang yang
   membacanya: ia harus mencari sendiri halamannya.
3. **Tidak menyebut penetasan.** Pemilik baru tahu ada telur yang mau
   menetas kalau kebetulan membuka halaman Breeding.

## Aturan besar-kecilnya

Besarnya ditentukan **isi angkanya**, bukan jenis ubinnya. Kabar buruk yang
bernilai nol adalah kabar baik, dan kabar baik tidak perlu tempat besar:

| Tingkat | Kapan | Bentuknya |
|---|---|---|
| **mendesak** | perlu dikerjakan hari ini | dua kolom, angka besar, berwarna |
| **biasa** | keadaan yang perlu diketahui | satu kolom |
| **tenang** | kabar buruk yang nilainya 0 | satu kolom, redup, bertanda ✓ |

Urutannya mengikuti tingkat itu, jadi yang menuntut tindakan selalu ada di
kiri atas — tempat mata jatuh lebih dulu. Pada hari yang tenang, "Kura sakit"
dan "Perlu perhatian" **mengecil sendiri** dan angka keadaan naik ke depan.

## Tujuan tiap ubin

| Ubin | Menuju |
|---|---|
| Kura di peternakan | `/tortoise` |
| Telur aktif | `/breeding` |
| Laba 2026 | `/finance` |
| Kura sakit | `/health` |
| Perlu perhatian | `#perlu-perhatian` — daftar lengkapnya di halaman yang sama |
| Clutch perlu dipantau | `/breeding?tab=telur` |

"Perlu perhatian" sengaja **tidak** membawa keluar beranda: daftarnya sudah
ada beberapa layar di bawah, dan memindahkan orang ke halaman lain untuk
membaca sesuatu yang ada di halaman ini adalah perjalanan yang sia-sia.
Jangkarnya dipasang sebagai `<a href="#…">` biasa, bukan `<Link>` — React
Router tidak menggulir ke jangkar, jadi `<Link to="#…">` hanya akan mengubah
alamat sementara halamannya diam di tempat. Ubin yang terlihat bisa diklik
tetapi tidak melakukan apa-apa persis jenis cacat yang sedang dibereskan di
beranda ini.

## Ubin baru: clutch yang perlu dipantau

Muncul **hanya kalau memang ada**, dengan tiga tingkat desakan:

> ⏱ **Clutch perlu dipantau — 3 clutch**
> 1 lewat perkiraan · 2 sedang menetas — terdekat C23

- **lewat perkiraan** — jendela menetasnya sudah terlampaui; ada yang perlu
  **diperiksa**, bukan ditunggu. Ini yang paling mendesak.
- **sedang menetas** — jendelanya terbuka hari ini.
- **dalam 7 hari** — waktunya bersiap.

Ubin yang berbunyi "0 clutch segera menetas" sepanjang sepuluh bulan dalam
setahun mengajari orang untuk berhenti membacanya — dan ia akan tetap tidak
terbaca pada hari ia akhirnya berisi. Jadi ia diam sampai ada isinya.

Hari ini masih diam: penetasan pertama diperkirakan **31 Oktober** (C23, yang
bertelur 12 Agustus). Ubin ini akan menyala sekitar **24 Oktober**.

## Penjagaannya

`cek-ronda.mjs` bertambah **5 kasus clutch mendesak** memakai jendela
menetas yang sungguhan, pada lima tanggal berbeda sepanjang musim penetasan,
plus pemeriksaan bahwa clutch berstatus "selesai" tidak ikut ditagih — kalau
ikut, beranda akan menagih penetasan yang sudah dicatat berbulan-bulan lalu,
tiap hari, selamanya.

Dua dari lima angka harapan saya **salah pada percobaan pertama**: saya lupa
jendela A31 dan A47 saling bertumpang tindih dengan C23. Kodenya benar,
ujinya yang saya perbaiki.

`cek-render` dan `cek-lebar` naik dari 94 ke **96 komponen**: hari ramai (ada
kura sakit, ada tagihan, ada clutch mau menetas) dan hari tenang, keduanya
lolos di layar 360px.

23 penjaga hijau, `npx vite build` lolos.
