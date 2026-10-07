# Anakan di beranda — 15 ekor, dan tugas menjemur yang tidak pernah muncul

**7 Oktober 2026**

Pemilik: *"Saya share itu kura aktif, itu indukan, dan ada tambahan anakan. Ada
berapa? Dan tolong sambungkan ke modulnya."*

---

## 1. Jawabannya: 15 anakan — dan 135 bukan indukan

**135 sudah termasuk anakannya.** Angka "Kura di peternakan" menghitung semua
yang masih ada dan masih diurus — induk, remaja, tukik, yang sakit, yang
karantina. Rinciannya hari ini:

| | |
|---|---|
| **112** dewasa | di atas 6 tahun |
| **8** remaja | 1–6 tahun |
| **15** anakan | di bawah 1 tahun |
| **135** di peternakan | |

Kelima belas anakan itu menetas **8 Juli 2026** (14 ekor) dan **14 Juli 2026**
(1 ekor), semuanya di kandang Baby 1, nama BB-2026028 sampai BB-2026049, berat
40–75 gram. Umurnya tiga bulan.

Angka 135 **tidak saya ubah**, dan itu disengaja: ia dipakai menghitung biaya
per ekor dan pakan per ekor. Yang ditambahkan adalah **keterangan komposisinya
di bawah angkanya** — "112 dewasa · 8 remaja · 15 anakan" — supaya tidak ada
yang menjumlahkan 135 + 15 dan menyangka ada 150.

## 2. Ubin baru: Anakan

Ubin "Anakan" di beranda, bersebelahan dengan "Kura di peternakan". Ditekan,
ia membuka **Daftar Kura yang sudah tersaring anakan** — bukan daftar penuh
178 ekor yang harus disaring sendiri.

Supaya tautan itu benar-benar bekerja, `/tortoise?status=baby` sekarang dibaca
oleh halamannya. Sebelumnya halaman itu hanya membaca `?tab=`; parameter
`status` tidak pernah ada, jadi tautan apa pun ke saringan tertentu akan
membuka daftar lengkap — tetap terbuka, tetap tanpa galat, hanya daftar yang
salah. (Cacat persis itu sudah pernah ada di berkas yang sama: `?edit=` yang
tidak pernah dibaca.)

Angkanya **bertambah sendiri**. Ia dihitung dari daftar kura yang memang sudah
dimuat beranda, bukan dari angka tersimpan di mana pun — begitu satu tukik
dicatat menetas, ia ikut terhitung pada pemuatan berikutnya.

## 3. Yang ditemukan sambil menyambungkannya

Pertanyaan "apakah kura ini anakan" ternyata dijawab **tiga cara berbeda di
tiga berkas**, dan ketiganya memberi jawaban berbeda untuk data yang sama:

| Berkas | Aturannya | Jawabannya |
|---|---|---|
| `TugasHariIni` | `age_category === "baby" \|\| status === "baby"` | 15 |
| `TortoiseList` | `age_category === "baby" && status === "aktif"` | 15 |
| `GuidedHariIni` | `Tortoise.filter({ status: "baby" })` | **0** |

### Nol itu menyembunyikan tugas

`GuidedHariIni` memakai angka tersebut beberapa baris di bawahnya:

```js
const isJemur = (ts.title || "").toLowerCase().includes("jemur");
if (isJemur && babyCount === 0) return false;   // ← tugasnya dibuang
```

Jadi tugas **"Jemur matahari pagi — SEMUA BABY (07.00–09.00)"** tidak muncul di
layar kiper yang memakai alur terpandu — karena aplikasi mengira tidak ada
anakan. Ada 15, berumur tiga bulan, di kandang Baby 1.

Tidak ada galat. Tugasnya hanya tidak ada di sana.

**Sebabnya:** status `"baby"` sudah **tidak dipakai lagi**. Fungsi migrasi
`migrateBabyStatus` memindahkan semuanya ke `status: "aktif"` +
`age_category: "baby"`, dan hari ini **nol** kura berstatus "baby". Yang
menyaring status itu menyaring sesuatu yang sudah tidak ada.

### Dua pintu penetasan, dua bentuk data

Lebih dalam lagi: ada **dua** cara mencatat tukik menetas, dan keduanya menulis
bentuk yang berbeda.

| Pintu | Yang ditulis |
|---|---|
| `EggGrid` (per telur) | `status: "aktif"`, `age_category: "baby"` ✓ |
| `HatchDialog` (satu clutch sekaligus) | `status: "baby"` ✗ bentuk lama |

Jadi tukik berikutnya — clutch pertama diperkirakan menetas **31 Oktober** —
akan berbentuk berbeda tergantung tombol mana yang ditekan kiper. Yang lewat
HatchDialog tidak akan terbaca sebagai kura aktif oleh layar penjualan maupun
oleh `aktifSehat()`, dan tidak terbaca oleh saringan yang memakai
`age_category`.

Keduanya sekarang memakai tetapan yang sama (`TANDA_ANAKAN`), jadi tidak bisa
melenceng lagi tanpa penjaga berbunyi.

## 4. Satu aturan: `src/lib/anakanKura.js`

**Umurnya, bukan kolomnya.** Aturannya memakai `golonganUmur()` yang sudah ada
— dihitung dari `birth_date`, dan hanya jatuh ke kolom `age_category` bila
tanggal lahirnya kosong. Dua akibat yang memang diinginkan:

- tukik baru terhitung begitu dicatat, lewat pintu mana pun, karena keduanya
  mengisi tanggal lahir;
- **tukik 8 Juli 2026 berhenti terhitung anakan pada 8 Juli 2027, sendiri.**
  Kolom `age_category` tidak pernah dihitung ulang sejak ditulis saat menetas;
  yang memakainya sebagai sumber akan menghitung kura sepuluh tahun sebagai
  anakan.

Yang sudah terjual, mati, atau diarsipkan tentu saja tidak ikut.

Dipakai di empat tempat sekarang: ubin beranda, saringan Daftar Kura, hitungan
anakan di alur terpandu, dan tetapan pembuatan tukik di kedua pintu penetasan.

## 5. Penjaga

**`cek-ronda` — 12 bentuk kura nyata:** tukik EggGrid, tukik bentuk lama
HatchDialog, tukik tanpa tanggal lahir, tukik terjual/mati/diarsipkan, kura
2 tahun yang kolomnya masih "baby", indukan 2010 tanpa `age_category`, remaja
2021, tukik yang sedang sakit, dan data kosong. Ditambah komposisi peternakan
(135 + yang sudah terjual) dan kalimatnya.

Diuji-merah empat kali:

| Yang dirusak | Yang berbunyi |
|---|---|
| aturan kembali memakai kolom, bukan umur | tukik HatchDialog hilang; kura 2 tahun terhitung anakan |
| saringan "masih di peternakan" dihapus | tukik terjual, mati, dan diarsipkan ikut terhitung |
| `TANDA_ANAKAN` kembali ke `status: "baby"` | bentuk tetapannya salah |
| bagian nol ikut ditulis di kalimat komposisi | "0 remaja" muncul |

**`cek-tataletak` — sambungannya:** ubin "anakan" ada di beranda, menautkan ke
`/tortoise?status=baby`, halaman itu benar-benar membaca `?status=`, dan kedua
pintu penetasan memakai `TANDA_ANAKAN` tanpa `status: "baby"`. Keempatnya
diuji-merah satu per satu.

Yang dijaga di situ bukan keberadaan ubinnya, melainkan **sambungannya**: kalau
salah satu ujungnya putus, tautannya tetap bisa diklik dan tetap membuka
daftar — hanya daftar yang salah, tanpa galat dan tanpa tanda apa pun.

---

**Pemeriksaan akhir:** 27 penjaga lolos, eslint 0 error / 101 peringatan,
`npx vite build` selesai tanpa galat.

## Yang masih menunggu Anda

Dari percakapan sebelumnya, belum berubah:

1. **Publish**, lalu Pengaturan Sistem → "Bayar poin Inisiatif surut" → *Lihat
   dulu* → *Bayarkan sekarang*; sesudahnya tekan Update pada slip September.
2. Sembilan tugas yang tidak pernah dikerjakan dalam 15 hari — mana yang mau
   dimatikan?
3. Dua transaksi ganda 4 Oktober masih perlu Anda hapus lewat `/catat-biaya`.
