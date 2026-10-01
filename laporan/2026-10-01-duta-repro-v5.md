# Duta Repro v5 — dari 12 bahan menjadi 5

1 Oktober 2026

## Yang diubah

### LANGKAH 1 — batch jadi
`VIT-REP00` → **"RACIKAN Duta Repro v5 (batch jadi)"**, minimum 3.000 g,
catatan diganti dengan komposisi v5 lengkap.

### LANGKAH 2 — delapan bahan dibuang dari resep
Semuanya `is_mandatory: false`, `minimum_stock: 0`, catatan diawali
*"TIDAK DIPAKAI di resep v5 (per 1 Okt 2026). Habiskan stok sisa, jangan
beli lagi."* **Stok fisik tidak disentuh sama sekali.**

| SKU | Bahan | Stok (tetap) |
|---|---|---|
| VIT-REP04 | Fermipan | 1.000 g |
| VIT-REP05 | Fenugreek | 6.000 g |
| VIT-REP06 | Tepung kedelai | 21.000 g |
| VIT-REP08 | Dextrose | 7.200 g |
| VIT-REP09 | Maltodextrin | 13.000 g |
| VIT-REP10 | Asam folat | 5 g |
| VIT-REP11 | Jahe bubuk | 1.150 g |
| VIT-REP12 | Kunyit bubuk | 2.000 g |

### LANGKAH 3 — bahan baru dan minimum baru
- **`VIT-REP20` Tepung hijauan kering giling** — dibuat baru, min 12.000 g
- `VIT-REP07` Kalsium karbonat → min **5.500**
- `VIT-REP03` Moringa → min **4.400**
- `VIT-REP01` Vitamin E 50% → min **160**
- `VIT-REP02` Vitamin D3 → min **10**

### LANGKAH 4 — SOP
- SOPTask pemberian diganti judul & deskripsinya ke takaran v5
- SOPTask baru mingguan: cek cuttlebone semua kandang betina (5 poin)
- SOPTask baru bulanan: kalibrasi sendok takar (5 poin)

## Tiga tempat instruksi tidak bisa dijalankan apa adanya

**1. `SOPTask.category` tidak punya `"peralatan"`.** Enum-nya hanya
`pakan, kebersihan, pemeriksaan, breeding, administrasi, suplemen,
perawatan, lainnya`. Dipakai `pemeriksaan` untuk cek cuttlebone dan
`suplemen` untuk kalibrasi sendok.

**2. `WarehouseItem` mewajibkan `purchase_price`.** Tidak disebut di
instruksi; diisi `0` daripada mengarang harga.

**3. `ALT-0210` TIDAK dibuat — cuttlebone sudah ada.** `VIT-0110`
"Tulang Sotong / Cuttlebone" sudah ada sejak 30 Agustus dengan stok
berjalan 2 pcs, dan catatannya bahkan sudah menyebut *"bisa juga dipakai
untuk betina indukan"*. Membuat record kedua akan membelah hitungan stok
benda fisik yang sama — pertanyaan "ada cuttlebone atau tidak" jadi punya
dua jawaban. Yang dilakukan: `VIT-0110` dinamai ulang, minimumnya
dinaikkan 2 → 20, catatannya memuat alasan v5.

## Yang TIDAK disebut instruksi tetapi wajib diubah

### Resepnya sendiri masih v4

`PelletRecipe` "DUTA REPRO" masih berisi **12 bahan v4**. Itu record yang
benar-benar memproduksi dan **memotong stok**. Dibiarkan, menekan
"Produksi" akan memotong fermipan, dextrose, maltodextrin, kedelai,
fenugreek, jahe, kunyit, asam folat — justru kedelapan bahan yang v5
buang — dan tidak memotong tepung hijauan sama sekali.

Diganti ke lima bahan v5, lengkap dengan enam langkah meracik dan
pengenceran dua tahap.

### Jadwal asam folat: penandanya jadi keliru

Jadwal "Folavit (Asam Folat) Harian (Betina)" bertanda
`nonaktif_bila_racikan_ada: true` — artinya *"racikan sudah membawa
folat, jadi jadwal ini mundur"*.

Pada v4 itu benar. **Pada v5 itu keliru: racikan v5 tidak mengandung
folat sama sekali.** Dibiarkan hidup dengan penanda itu, betina kehilangan
folat justru ketika racikan tersedia — tanpa satu pun error.

v5 menyebut asam folat langsung di daftar bahan yang dibuang karena tidak
punya dasar bukti. Jadi jadwalnya **dimatikan**, dan **penandanya ikut
dicabut** supaya alasan yang keliru tidak tertinggal di data.

### Jadwal kalsium: angkanya v4

Catatannya menyebut *"racikan memberi 5 g kalsium per betina per hari"* —
v5 memberi **3,75 g**. Diperbarui, dan ditambahi hal yang berubah artinya:
kalsium v5 **sengaja** tidak cukup untuk induk 45–50 kg yang bertelur,
karena batasnya ditentukan betina terkecil. Kekurangannya ditutup
cuttlebone, bukan dengan menaikkan jadwal ini.

### Daftar belanja

- **Fermipan dibatalkan** — v5 tidak memakai ragi. Satu dari tiga
  penghalang produksi hilang dengan sendirinya.
- **Vitamin E 110 → 160 g** (v5 pakai 150, v4 hanya 101)
- **Tepung hijauan ditambahkan**, 12.000 g — dengan catatan bahwa mungkin
  tidak perlu dibeli sama sekali kalau rumput odot sudah ditanam sendiri
- **Cuttlebone ditambahkan**, 20 pcs

## Bisa diracik sekarang?

**Belum.** Tertahan tiga bahan:

| Bahan | Butuh | Stok |
|---|---|---|
| Tepung hijauan VIT-REP20 | 11.398 g | 0 |
| Vitamin E 50% VIT-REP01 | 150 g | 0 |
| Vitamin D3 VIT-REP02 | 2,5 g | 0 |

Sembilan bahan v4 yang dulu menghalangi kini tidak relevan lagi.

## Penjagaan yang ditambahkan

Resep ini punya satu bahaya khas: **Vitamin D3 hanya 0,0119% dari
adonan.** Mengetik 25 g alih-alih 2,5 melipatgandakan dosisnya sepuluh
kali — dan hanya menggeser jumlah adonan **0,110%**, di bawah ambang
kewajaran mana pun. Pemeriksaan "jumlahnya cocok atau tidak" **tidak
menangkapnya**, justru karena bahannya mikro.

Jadi layar resep sekarang menampilkan **berapa yang benar-benar masuk ke
satu ekor sehari** untuk tiap bahan:

```
          Tepung hijauan      54,2749%     8,14 g
          Kalsium karbonat    24,9994%     3,75 g
          Moringa             19,9995%     3,00 g
          Vitamin E 50%        0,7143%     0,11 g
  ⚠ MIKRO Vitamin D3           0,0119%     1,79 mg
```

Kelima angka cocok persis dengan tabel di dokumen v5. Salah ketik yang
tak terlihat di daftar bahan menjadi terlihat di angka dosis: 17,84 mg
alih-alih 1,79 mg.

`cek-ronda.mjs` menguji kelima bahan terhadap angka resmi v5, dan sudah
diuji bisa merah: D3 digeser 10× → dua temuan; penanda mikro dilumpuhkan
→ pengenceran bertingkat tidak lagi diingatkan.

## Catatan

Anda pernah berpesan jangan menambah SOPTask baru. LANGKAH 4 meminta dua;
keduanya mingguan dan bulanan (≈0,2 tugas/hari), jadi beban hariannya
hampir nol. Dijalankan, tetapi disebut supaya Anda sadar.

Stok fisik tidak ada yang dinolkan. Catatan asli pada jadwal kalsium dan
folat dipertahankan utuh di bawah keterangan baru.
