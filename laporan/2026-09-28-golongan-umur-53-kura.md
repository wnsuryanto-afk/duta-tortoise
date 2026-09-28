# Sebelas kura muda di kandang E1 terlewat dari timbang rutin

**Lanjutan dari** `2026-09-28-53-panjang-cangkang.md`, atas permintaan pemilik:
periksa seluruh 53, bukan hanya dua ekor. **Tidak ada data yang diubah dalam
laporan ini.**

---

## Temuan pokok

Ke-55 kura berkolom `shell_length_cm` kosong juga berkolom **`age_category` kosong**
— semuanya, tanpa kecuali. Dua kolom hilang bersamaan pada himpunan yang sama
persis. Itu ciri impor 14 Mei 2026 yang memang tidak membawa kedua kolom itu,
bukan ciri penghapusan.

Akibatnya bukan sekadar profil tidak lengkap. `golonganRutin()` di
`src/lib/jadwalTimbang.js` memutuskan siapa yang masuk timbang rutin 14 hari:

```
age_category "baby"/"juvenile"  → rutin
ATAU shell_length_cm < 20 cm     → rutin
```

Kalau **keduanya kosong**, hasilnya `false` → diperlakukan sebagai kura dewasa →
sejak 17 September 2026 kura dewasa sehat tidak ditimbang rutin lagi → **keluar dari
jadwal sepenuhnya.**

---

## Kandang E1: sebelas kura muda, tidak ditimbang 443 hari

Seluruh isi kandang E1 yang berkolom kosong lahir 2020–2024 dan berbobot 1,6–10,6 kg.
Ini jelas kandang pembesaran, bukan kandang indukan.

| Kode | Spesies | Lahir | Umur | Berat | Terakhir ditimbang |
|---|---|---|---|---|---|
| **H3** | sulcata | 1 Jan 2024 | 2 th 9 bl | **1.600 g** | 12 Jul 2025 |
| **Red Foot - 02** | red foot | 1 Mei 2023 | 3 th 5 bl | **1.700 g** | 12 Jul 2025 |
| **F23** | sulcata | 1 Jan 2021 | 5 th 9 bl | 3.600 g | 12 Jul 2025 |
| **RD** (RD besar) | sulcata | 1 Jan 2021 | 5 th 9 bl | 3.600 g | 12 Jul 2025 |
| **HF1** | sulcata | 1 Jan 2021 | 5 th 9 bl | 4.540 g | 12 Jul 2025 |
| **HF6** | sulcata | 1 Jan 2021 | 5 th 9 bl | 7.100 g | 12 Jul 2025 |
| **F27** | sulcata | 1 Jan 2020 | 6 th 9 bl | 8.700 g | 12 Jul 2025 |
| **F25** | sulcata | 1 Jan 2020 | 6 th 9 bl | 8.900 g | 12 Jul 2025 |
| **F28** | sulcata | 1 Jan 2020 | 6 th 9 bl | 9.500 g | 12 Jul 2025 |
| **Yuwono** | sulcata | 1 Mei 2023 | 3 th 5 bl | 10.500 g | 12 Jul 2025 |
| **F29** | sulcata | 1 Jan 2020 | 6 th 9 bl | 10.600 g | 12 Jul 2025 |

**Semuanya 443 hari tanpa timbang.** Pada hewan yang masih tumbuh, itu rentang
yang membuat penurunan berat tidak mungkin ketahuan.

Dua yang paling mendesak — **H3 (1,6 kg, umur 2 th 9 bl)** dan **Red Foot - 02
(1,7 kg)** — bobotnya setara baby yang di kandang lain ditimbang tiap 14 hari.

---

## Sisanya: 42 kura, kemungkinan besar memang dewasa

Empat puluh dua sisanya lahir **2003–2013** (umur 13–23 tahun) dengan bobot
13,2–37,8 kg. Untuk sulcata, itu ukuran indukan. Golongan "dewasa" untuk mereka
kemungkinan besar benar, walau kolomnya kosong — jadi tidak masuk timbang rutin
memang sesuai keputusan 17 September.

Yang paling ringan di kelompok ini: B65 (13,2 kg, lahir 2010) dan B57 (14,4 kg,
lahir 2013). Keduanya jauh di atas ambang 20 cm, jadi tetap tergolong dewasa.

Dua ekor berstatus **mati** (B119, F14) tidak dihitung di mana pun.

---

## Yang saya sarankan, dan kenapa saya tidak mengerjakannya sendiri

Perbaikan paling murah bukan mengisi panjang cangkang, melainkan mengisi
**`age_category`** untuk sebelas kura E1. Alasannya:

- `age_category` bisa ditentukan dari tanggal lahir dan berat yang **sudah tercatat**
  — tidak perlu mengarang angka ukuran yang tidak pernah diukur.
- Mengisinya langsung mengembalikan kesebelasnya ke timbang rutin 14 hari.
- Panjang cangkangnya akan terisi **dengan sendirinya** pada penimbangan pertama,
  lewat automation `onMeasurementSaved` yang sudah terbukti bekerja.

Satu kolom terisi menyelesaikan dua masalah sekaligus.

Saya tidak mengerjakannya sendiri karena pembagian juvenile/dewasa pada rentang
3,6–10,6 kg adalah penilaian peternak, bukan penilaian yang layak diambil dari
tabel. H3 dan Red Foot - 02 hampir pasti juvenile; F27–F29 di 8,7–10,6 kg bisa
diperdebatkan. Yang memutuskan harus orang yang melihat hewannya.

---

## Tentang panjang cangkang yang dicari

Sudah diperiksa di tujuh tempat, semuanya kosong: kolom di `Tortoise`,
`MeasurementHistory` (dicari lewat id **dan** lewat nama), `Tortoise.photos[]`,
`NilaiKura` (entity-nya kosong total), `ActivityLog` (mencatat rinci tiap perubahan
sejak Agustus, tidak pernah menyebut kolom ini), dan berkas impor di repositori.

Dua tempat tidak terjangkau dari sini: **data checkpoint** dan **trash** Base44 —
keduanya menolak token ini. Menurut dokumentasi API-nya, endpoint itu hanya
menerima *personal API key* milik pengguna ber-akses editor.

Yang perlu diketahui sebelum membukanya: **retensi riwayat data Base44 hanya 7 hari
(paket Elite) sampai 30 hari.** Impor yang dipertanyakan terjadi 14 Mei 2026 —
lebih dari empat bulan lalu, jauh di luar jangkauan checkpoint mana pun.

Checkpoint hanya bisa menjawab satu pertanyaan yang lebih sempit: *apakah kolom ini
terhapus dalam 30 hari terakhir?* Pertanyaan itu sudah terjawab dari data hidup —
pembaruan massal 27 September 05:06:46.942 menyentuh 11 record kosong **dan** 20
record berisi, dan yang berisi tetap berisi.
