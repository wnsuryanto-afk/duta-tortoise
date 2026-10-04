# Telur per tahun, dan hitung mundur yang dirapikan

**4 Oktober 2026** · Breeding & Telur

---

## 1. Telur per tahun

Tab **Statistik** sekarang dibuka oleh kartu **"Telur per tahun"**:

> **2026** — **304 butir**
> 14 clutch · 9 induk · 232 masih dierami · 49 menetas dari 72 (68,1%)
>
> **2025** — *Belum ada catatan*
> Kosong bukan berarti tidak ada yang bertelur — bisa juga pencatatannya belum dimulai.

### Kenapa 2025 tidak ditulis "0 butir"

Ini keputusan yang saya ambil dengan sengaja, dan perlu Anda tahu alasannya.

Catatan pembiakan paling awal di aplikasi ini **dibuat 17 Mei 2026**
(di-backdate ke 9 Maret). Tidak ada satu pun catatan sebelum itu. Jadi angka
yang benar untuk 2025 bukan nol telur — melainkan **tidak ada datanya**.

"2025: 0 butir" akan terbaca sebagai setahun penuh tanpa seekor pun induk
bertelur, dan itu kesimpulan yang salah tentang kebun Anda. Barisnya tetap
muncul (Anda memang menanyakannya), tetapi dengan kalimatnya sendiri.

Dengan alasan yang sama, **selisih antar-tahun tidak dihitung** kalau tahun
pembandingnya kosong. "+304 butir dibanding 2025" bukan pertumbuhan — itu
hanya tanda kapan pencatatan dimulai. Begitu 2027 tiba dan 2026 punya
catatan penuh, selisihnya muncul sendiri dengan panah naik/turun.

### Dua hal kecil yang diputuskan

**Tahun diambil dari tanggal bertelur, bukan `season_year`.** Keduanya
sejalan di data hari ini (keempat belas clutch: 2026), tetapi `season_year`
adalah label yang diketik sedangkan `egg_laying_date` adalah kejadiannya.
Label bisa salah ketik. `season_year` tetap jadi cadangan untuk clutch yang
tanggalnya belum diisi.

**Tahunnya dipotong dari teks, bukan lewat `new Date`.** Alasan yang sama
dengan saringan bulan: `new Date("2026-01-01")` dibaca tengah malam UTC, dan
di zona waktu barat Greenwich tanggal itu jatuh ke 31 Desember tahun
sebelumnya — clutch pertama tiap tahun akan terhitung di tahun yang salah.
Diuji di tiga zona waktu.

### Satu catatan tentang angkanya

Rekap ini membaca **seluruh** catatan pembiakan, bukan yang sedang disaring
kotak pencarian atau pilihan bulan. "Berapa telur tahun ini" adalah
pertanyaan tentang kebun, bukan tentang satu induk yang kebetulan dicari.

## 2. Hitung mundur dirapikan

Bentuk pertamanya tiga baris menumpuk — keterangan kecil di atas, angka besar
di tengah, satuan di bawah — dengan huruf 9px yang di ponsel hanya jadi
bintik abu-abu. Keterangan atasnya ("perkiraan menetas") juga mengulang baris
yang sudah ada di kartu yang sama: *"Estimasi menetas: 21 Des s/d 15 Jan
2027"*.

Sekarang **satu kotak berbingkai, dua baris**:

```
┌──────────┐
│  78 hari │   ← angka besar + satuan, satu baris
│lagi menetas│ ← keterangan
└──────────┘
```

- Warnanya pindah dari huruf ke **kotak** (bingkai + latar tipis), jadi
  mendesaknya terbaca sebelum angkanya sempat dibaca. Hijau >30 hari, oranye
  ≤30, merah ≤7.
- "Menuju" dan "lewat perkiraan" memakai bentuk yang sama persis — angka,
  kata "hari", keterangan — supaya keduanya terbaca dengan satu kebiasaan
  mata. Yang membedakan hanya kata dan warnanya.
- Lebarnya dipatok 84px supaya kolom angkanya lurus dari kartu ke kartu.
- Punya warna gelap sendiri, jadi tidak lagi memakai warna terang di tema
  gelap.

## Penjagaannya

`cek-ronda.mjs` bertambah **2 kasus rekap tahunan** plus lima pemeriksaan
lain: urutan terbaru dulu, selisih yang tidak boleh dihitung terhadap tahun
kosong, clutch 1 Januari, dan cadangan `season_year`. Ketiganya diuji merah
dulu — termasuk versi `new Date`, yang gagal hanya di zona waktu barat.

`cek-render` dan `cek-lebar` naik dari 91 ke **94 komponen**: tiga keadaan
rekap tahunan (2026 vs 2025 kosong, dua tahun sama-sama berisi, dan tanpa
catatan sama sekali), semuanya lolos di layar 360px.

23 penjaga hijau, `npx vite build` lolos.
