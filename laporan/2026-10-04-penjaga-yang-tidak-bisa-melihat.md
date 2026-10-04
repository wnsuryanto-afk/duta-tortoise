# Penjaga yang hijau karena tidak bisa melihat kodenya

**4 Oktober 2026** · lima penjaga, 13 berkas · diperbaiki

---

## Temuan utama

Lima penjaga membuang komentar dengan satu baris yang sama sebelum memeriksa
kode:

```js
s.replace(/\/\*[\s\S]*?\*\//g, "")
```

Baris itu tidak tahu apa-apa soal tanda kutip. Satu atribut yang ada di hampir
setiap formulir unggah foto memuat tanda komentar **di dalam teks**:

```jsx
<input type="file" accept="image/*" ... />
```

Pengupas itu membaca `/*` di situ sebagai awal komentar, lalu menghapus semua
kode sesudahnya sampai ketemu penutup komentar berikutnya — yang bisa ratusan
baris kemudian.

**Diukur: 13 berkas, 13.799 karakter kode nyata, tidak pernah dilihat kelima
penjaga itu.**

| Karakter hilang | Berkas |
|---:|---|
| 6.456 | `src/pages/EditProfilePage.jsx` |
| 2.985 | `src/components/breeding/HatchDialog.jsx` |
| 999 | `src/components/tortoise/TortoisePhotoGallery.jsx` |
| 605 | `src/components/incidental/IncidentalTaskForm.jsx` |
| 605 | `src/components/incidental/IncidentalTaskUsulanForm.jsx` |
| 559 | `src/components/health/HealthForm.jsx` |
| 455 | `src/components/tortoise/DeathRecordModal.jsx` |
| 373 | `src/components/breeding/BreedingForm.jsx` |
| … | 5 berkas lagi |

`EditProfilePage.jsx` kehilangan tiga perempat isinya. Di `HatchDialog.jsx`
yang hilang persis mencakup payload `babyData` dan pemanggilan
`Tortoise.bulkCreate` — jadi `cek-modeuji.mjs` melaporkan *"semua pencatatan
menghormati Mode Uji"* tanpa pernah melihat keduanya.

Penjaga yang hijau karena tidak bisa melihat kodenya lebih buruk daripada
tidak ada penjaga: ia memberi rasa aman yang tidak dibayar apa pun, dan tidak
ada yang akan memeriksanya lagi **justru karena** hijau.

### Yang diperbaiki

Satu pengupas untuk semua, `scripts/lib/kupasKomentar.mjs`, yang melewati
teks berkutip (tunggal, ganda, backtick) dan literal regex. Tanpa bagian
regex, pola seperti `/https?:\/\//` akan terbaca sebagai komentar baris pada
`//` terakhirnya.

Satu efek samping yang ikut terbetulkan: **nomor baris di laporan penjaga**.
Pengupas lama ikut menelan baris baru di dalam komentar, jadi nomornya
meleset sejauh panjang komentar — `cek-modeuji` menunjuk
`HatchDialog.jsx:131` untuk pemanggilan yang sebenarnya ada di baris 265.
Sekarang baris barunya dipertahankan, dan nomornya tepat.

Penjaga barunya, `cek-penjaga.mjs`, menolak skrip mana pun yang mengupas
komentar sendiri, dan menguji delapan bentuk yang mudah salah — termasuk
pembagian biasa (`10 / 2`), supaya penanganan regex tidak kebablasan ke arah
sebaliknya.

## Temuan kedua: `bulkCreate` tidak pernah dicari

`cek-modeuji.mjs` mencari `entities.X.create(` — pola yang **tidak** cocok
dengan `bulkCreate(`. Satu-satunya pemakainya hari ini menulis `Tortoise`,
tabel yang memang tidak punya kolom `is_test_data`, jadi tidak ada yang
bocor. Tapi lubangnya nyata, dan justru `bulkCreate` yang menulis **banyak
baris sekaligus**.

Sekarang dicari juga, dan payloadnya ditelusuri ke deklarasinya. Yang tidak
terbaca dilaporkan apa adanya ("isi payloadnya tidak terbaca") alih-alih
dianggap aman.

## Temuan ketiga: dua kolom yang hilang saat bayi menetas

`HatchDialog` — satu-satunya layar yang membuat kura baru — menyiapkan dua
nilai di formulirnya lalu membuangnya sebelum menyimpan.

**`enclosure_id` tidak ikut dikirim.** Formulirnya mengisi nomor kandang di
tiap baris bayi, lalu payloadnya hanya memuat `enclosure` (namanya).
Akibatnya tercatat di data: **14 dari 16 bayi hidup di "Baby 1" punya
`enclosure_id: null`**. Kura yang punya nomor mengikuti pergantian nama
kandang dengan sendirinya; yang tidak punya harus ditulis ulang satu per satu.
Dua yang punya nomornya (BB-2026048, BB-2026049) mendapatkannya dari formulir
data kura belakangan, bukan dari sini.

**Fotonya ditulis ke `photo_url`, bukan `photos`.** `photo_url` bukan kolom
Tortoise — skemanya hanya punya `photos` (larik), dan **nol dari 178 baris**
memakainya. Kartu kura punya cadangan yang membacanya, jadi fotonya tetap
tampil… sampai ada foto kedua. Begitu `PhotoProgressPanel` menambah satu foto,
`photos` jadi berisi, cadangan di kartu berhenti menyala, dan foto hari
pertama bayi itu hilang dari semua layar — padahal justru itu titik awal
catatan pertumbuhannya.

Sekarang fotonya masuk ke `photos` dengan bentuk yang sama persis dengan 546
foto yang sudah ada, membawa berat dan panjangnya, sehingga grafik
pertumbuhan di `PhotoProgressPanel` dimulai dari hari pertama.

`cek-kolom-hantu.mjs` sekarang menelusuri payload yang dibangun lewat
`.map(x => ({...}))` — bentuk yang dipakai `babyData` — jadi kolom semacam
`photo_url` ketahuan sendiri lain kali. Diuji merah dulu.

## Koreksi atas sesuatu yang pernah saya tulis

`cek-kolom-hantu.mjs` menyatakan kolom di luar skema "dibuang diam-diam oleh
Base44". **Itu melebihi yang bisa dibuktikan.** Keempat baris `SalaryConfig`
memuat `salary_type`, `payment_period`, `shift_start` dan `shift_end` —
tidak satu pun ada di skemanya, dan keempatnya tetap terbaca dari basis data.

Apakah **tulisan baru** ke kolom tak terdaftar juga bertahan tidak saya uji,
karena mengujinya berarti menulis ke data sungguhan. Yang pasti, dan itu
sudah cukup: kolom di luar skema tidak terlihat oleh apa pun yang bekerja
dari skema — penjaga, laporan, ekspor. Entah nilainya hilang atau tersimpan
di tempat yang tidak pernah dilihat siapa pun, keduanya sama-sama cacat.
Kalimat di penjaganya sudah diperbaiki.

## Hasil

22 penjaga hijau (naik satu), `npx vite build` lolos. Tidak ada data historis
yang diubah.
