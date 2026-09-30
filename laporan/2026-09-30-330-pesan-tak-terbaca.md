# 330 pesan untuk kiper yang tidak pernah terbaca

**30 September 2026** — ditemukan sambil menyederhanakan menu area ORANG.
Sudah diperbaiki. **Tidak ada data historis yang diubah.**

---

## Ringkasnya

Sejak Mei 2026 aplikasi ini memotret hasil kerja kiper, mengirimnya ke AI,
dan menyimpan pujian serta saran perbaikan untuk orang yang mengerjakannya.
Dihitung dari 199 baris `DailyChecklist`:

| Kolom | Jumlah | Untuk Soleh | Untuk Angsolo |
|---|---:|---:|---:|
| `ai_apresiasi` | 170 | 106 | 64 |
| `ai_saran` | 160 | 101 | 59 |
| `owner_note` | 0 | — | — |

**330 pesan tertulis untuk dua orang. Tidak satu pun pernah bisa dibaca
orang yang dituju.** Yang terakhir dibuat hari ini juga.

Bukan satu cacat, tapi dua — bertumpuk, dan masing-masing cukup untuk
membuat fiturnya sunyi total.

---

## Cacat satu — pintunya tidak ada

Halaman `/catatan-saran` terdaftar di menu area ORANG dengan section
`"catatan-saran"`.

Section itu **tidak ada di satu pun daftar `NAV_ACCESS`**. Jadi
`canAccess(role, "catatan-saran")` mengembalikan `false` untuk setiap
peran — owner sekalipun. Dan keduanya, `HubPage` maupun `CommandPalette`,
menyaring dengan `canAccess`. Artinya pintunya tidak pernah muncul: tidak
di menu, tidak di Ctrl+K.

Dicari juga di seluruh kode: **tidak ada satu tautan pun** ke halaman itu.
Satu-satunya cara membukanya adalah mengetik URL-nya secara manual.

Lapisan kedua dari cacat yang sama: halaman itu diparkir di **area ORANG**
— area yang memang tidak bisa dibuka kiper — padahal isinya disaring
`employee_email: user.email`, yaitu milik kiper sendiri. Layar kiper, di
area pemilik, dengan kunci yang tidak ada.

---

## Cacat dua — ambangnya memakai skala yang salah

Cacat ini tidak akan ketemu dengan membaca kode saja. Setelah pintunya
dibuka dan diuji di peramban dengan data berbentuk seperti data nyata,
tabnya **masih** menampilkan "Belum ada catatan".

Prompt yang meminta angka keyakinan ke AI tidak pernah menyebut skalanya,
dan skema responsnya hanya `{ type: "number" }`. Jadi modelnya menjawab
dengan skala yang ia pilih sendiri, berganti-ganti. Nilai unik yang
benar-benar tersimpan:

```
164 nilai <= 1    0.3  0.4  0.5  0.6  0.7  0.75  0.8  0.85  0.9  0.95  1
  6 nilai  > 1    10  95  100
```

Sementara **seluruh** sisi baca menganggapnya persen 0–100 — begitu juga
keterangan kolomnya sendiri: *"Tingkat keyakinan AI (0-100)"*.

Tidak ada yang error. Angkanya hanya jadi masuk akal terbalik:

| Kode | Maksudnya | Yang terjadi untuk 0.95 |
|---|---|---|
| `keyakinan >= 60` | tampilkan apresiasi & saran | **tidak pernah benar** |
| `ai_confidence < 70` | tandai "perlu diperiksa" | **selalu benar** |
| `keyakinan {nilai}%` | tampilkan "95%" | tampil **"0.95%"** |

Yang lolos ambang tampil hanya baris yang punya `owner_note` — dan
`owner_note` ada **nol**. Jadi kalaupun pintunya terbuka sejak dulu,
isinya tetap kosong selamanya.

Cacat kedua ini juga berarti **setiap tugas tampak meragukan bagi
penyetuju**, karena penanda "perlu diperiksa" selalu menyala.

---

## Yang dikerjakan

**`src/lib/keyakinanAI.js`** — satu cara membaca kolom ini.
`persenKeyakinan()` menormalkan apa pun skalanya ke 0–100;
`layakTampil()` untuk ambang tampil. Dipakai di keempat sisi baca.

**Sisi tulis diperbaiki juga.** Promptnya kini meminta *"BILANGAN BULAT 0
sampai 100 … JANGAN memakai pecahan 0–1"*, skema responsnya diberi
`description` yang sama, dan nilainya dinormalkan sebelum disimpan —
karena permintaan pada model bukan jaminan.

**Dinormalkan saat dibaca, bukan datanya diperbaiki.** 164 baris lama
tetap berisi pecahan. Tidak ada satu baris data pun yang disentuh.

**Halamannya jadi tab "Catatan untuk Saya" di SOP & Tugas** — layar yang
memang dibuka kiper tiap pagi. Tanpa penjaga peran, karena isinya sudah
disaring per email. Tidak ada pintu menu baru yang ditambahkan.

### Satu titik yang memang tidak bisa dipastikan

Nilai tepat `1` ambigu: bisa 1% atau 100%. Dibaca **100%**, karena ia
muncul berdampingan dengan 0.95 dan 0.9 di data yang sama — modelnya
sedang memakai skala pecahan saat itu. Pilihan yang disengaja, ditulis apa
adanya di komentarnya, bukan kelalaian.

---

## Penjaga baru

`scripts/cek-keyakinan.mjs`, sudah terdaftar di `cek-semua`. Dua bagian:

1. **Jawabannya**, atas 14 nilai yang benar-benar tersimpan, dinyatakan
   sebagai selisih sebelum/sesudah: dengan kode lama **tidak satu pun**
   dari 11 nilai pecahan lolos ambang tampil dan **semua 11** ditandai
   perlu diperiksa; dengan kode baru 8 lolos dan hanya 4 ditandai.
2. **Bentuknya** — memindai `src/` untuk perbandingan langsung
   `ai_confidence` terhadap angka, supaya polanya tidak menyelinap kembali
   lewat berkas baru.

Penjaganya diuji dengan memasang ulang kemunduran aslinya: ia
menangkapnya dan menyebut nomor barisnya.

---

## Yang perlu diputuskan pemilik

**`owner_note` ada nol.** Kolomnya ada, layarnya ada, dan sekarang
tampilannya bekerja — tapi belum pernah dipakai. Mungkin justru karena
hasilnya tidak pernah kelihatan. Sekarang kalau pemilik menulis catatan
untuk seorang kiper, kiper itu akan membacanya di tab "Catatan untuk
Saya". Dibiarkan apa adanya; ini bukan cacat, ini pilihan pemakaian.

---

## Pola yang pantas dicurigai lain kali

**Satu angka, dua skala, nol error.** Kedua cacat di sini tidak melempar
apa pun: yang pertama menyembunyikan pintu, yang kedua menyaring habis
isinya. Keduanya lolos eslint, lolos `vite build`, dan lolos mata — dan
keduanya baru ketahuan setelah layarnya benar-benar dibuka di peramban
dengan data berbentuk seperti data nyata.

Pola lain yang muncul lagi di sini: **section menu yang tidak ada di
`NAV_ACCESS`**. Pintu yang tidak bisa dibuka siapa pun tidak meninggalkan
keluhan — ia hanya tidak pernah diklik.

Itu juga sudah dijaga sekarang: `scripts/cek-pintu.mjs` memeriksa bahwa
setiap `section` di `navigation.js` dimiliki setidaknya satu peran, dan
bahwa setiap `path` punya `<Route>`-nya di `App.jsx`. Per hari ini: 50
pintu, 7 peran, semuanya bisa dibuka. Penjaganya diuji dengan memasang
ulang pintu `/catatan-saran` yang asli — ia menyebutnya dengan nama.
