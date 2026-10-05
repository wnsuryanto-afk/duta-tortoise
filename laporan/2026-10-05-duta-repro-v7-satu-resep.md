# Duta Repro v7 FINAL — satu resep, bukan enam

**5 Oktober 2026**

Pemilik mengirim dokumen *"Duta Repro — review resep awal & formulasi final"*
dan memintanya dipakai: **"pakai satu supaya ndak bingung"**.

---

## Yang ada di modul sebelumnya: enam resep berjejer sama rata

| Resep | Keadaan |
|---|---|
| DUTA REPRO v5 (5 bahan, batch 21 kg) | aktif |
| ARSIP — DUTA REPRO v4 (12 bahan) | nonaktif |
| ARSIP — Vitamin Reproduksi generasi PERTAMA (12 bahan) | nonaktif |
| DUTA DAILY BOOST — kapsul harian | nonaktif |
| DUTA HERBAL BOOST — kapsul betina | nonaktif |
| DUTA FEMALE PLUS — kapsul betina | nonaktif |

Keenamnya tampil sejajar di layar Resep. Resep yang salah diracik bukan
kesalahan ketik: ia menghasilkan **28 kg bubuk yang diberikan ke 93 betina
selama sebulan**.

## v5 → v7 FINAL

| | v5 | **v7 FINAL** |
|---|---|---|
| Bahan | 5 | **4** |
| Dosis per ekor/hari | 15 g | **10 g (1 sdm peres)** |
| Batch | 21 kg | **28 kg** |
| Umur simpan | 15 hari | **30 hari** |
| Meracik per bulan | 2× | **1×** |
| Kalsium per ekor/hari | 1.560 mg | 1.360 mg |
| Vitamin D3 per ekor/hari | 179 IU | 164 IU |
| Vitamin E aktif per ekor/hari | 53,6 mg | 26,8 mg |
| Biaya per ekor/hari | Rp 168 | **Rp 136** (Rp 38 bila hijauan digiling sendiri) |

Komposisi v7, batch 28 kg = 2.800 dosis = 30 hari untuk 93 betina:

| Bahan | Gram | % | Per 1 sdm |
|---|---|---|---|
| Tepung hijauan kering giling — VIT-REP20 | 18.325,4 | 65,45 | 6,54 g |
| Kalsium karbonat — VIT-REP07 | 9.520 | 34,00 | 3,40 g |
| Vitamin E asetat 50% — VIT-REP01 | 150 | 0,536 | 0,05 g |
| Vitamin D3 100.000 IU/g — VIT-REP02 | 4,6 | 0,0164 | 1,64 mg |
| **TOTAL** | **28.000** | **100** | **10,00 g** |

**Moringa dibuang** dari resep. Stok 16 kg yang ada sebaiknya dihabiskan
pelan-pelan sebagai pakan tambahan, bukan dibuang.

Ini juga menjawab pertanyaan yang saya ajukan berkali-kali tanpa jawaban —
isi tepung hijauan. Dokumennya menetapkannya: **rumput kebun dikeringkan lalu
digiling halus**; alternatif beli pelet alfalfa digiling; **bukan dedak**.

## Satu cacat yang ikut ketahuan: dosis ditulis mati di layar

```js
const h = periksaResep(r, 15);
...
<span>Per 15 g (satu ekor sehari)</span>
```

Angka **15** ditulis mati di layar Resep dan dipakai untuk **setiap** resep.
Kolom itu justru dipasang untuk menangkap salah takar pada bahan mikro — dan
ia sendiri menampilkan angka yang salah:

- untuk v7 (10 g) semua angkanya **50% terlalu tinggi**;
- untuk resep kapsul (0,3 g) **50× meleset**.

Dosis adalah milik resepnya. Kolom **`dosis_gram`** ditambahkan ke entity
`PelletRecipe` dan diisi untuk keenam resep (v7 = 10, arsip v4 & generasi
pertama = 15, kapsul = 0,6 / 0,7 / 0,3). Layar membacanya dari situ; bila
kolomnya kosong ia mengatakannya, bukan mengarang 15.

## Arsipnya tidak saya hapus — dan itu bukan kelalaian

Saya **tidak bisa menghapus record**: tidak ada alat hapus di perkakas saya,
dan API platform menolak aplikasi ini dengan `auth_required`.

Tetapi menghapusnya juga bukan hal yang jelas benar. Angka resep lama adalah
satu-satunya catatan **kenapa resep sekarang begini**, dan catatan itu pernah
hilang sekali: record v4 ditimpa saat migrasi ke v5, sehingga "resep
sebelumnya isinya apa" tidak bisa dijawab sampai seseorang menyusunnya ulang
dari dokumen.

Yang saya lakukan: layar Resep sekarang menampilkan **hanya resep yang
dipakai**. Yang diarsipkan ada di balik satu baris —
*"Lihat 5 resep arsip (tidak boleh diracik)"*. Hitungan di tab pun ikut:
**Daftar Resep (1)**.

Kalau Anda tetap ingin recordnya lenyap, hapusnya lewat tombol hapus di layar
Resep — tombol itu sudah ada untuk admin/owner.

## Penjaga

`cek-ronda.mjs` menguji resep terhadap **tabel resmi dokumennya**: persentase
tiap bahan, gram per dosis, dan sekarang juga kandungan per ekor per hari yang
dibandingkan dengan rentang rujukan — kalsium 1.360 mg, D3 164 IU, vitamin E
aktif 26,8 mg.

Tetap diuji: salah ketik D3 sepuluh kali lipat (4,6 g → 46 g) hanya menggeser
jumlah adonan **0,148%**, jadi pemeriksaan keseimbangan menganggapnya wajar —
yang harus berteriak adalah angka per dosisnya, dan penjaganya memastikan
keduanya: bahwa keseimbangannya memang tetap "wajar", dan bahwa dosisnya
memang berubah jadi ~16,4 mg.

Diuji merah dua arah: mengubah tepung hijauan, dan mengetik D3 sepuluh kali
lipat.
