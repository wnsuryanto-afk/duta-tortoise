# Rp 100.000 tercatat lunas tanpa pernah ditahan

1 Oktober 2026 — hari gajian

## Keadaan pagi ini

Slip September sudah terbit untuk keduanya, berstatus `draft`:

| | Ali | Soleh |
|---|---|---|
| Hari hadir | 28 | 27 |
| Bonus poin | Rp 263.750 | Rp 259.600 |
| Bonus pekan penuh | Rp 140.000 | Rp 70.000 |
| Lembur | Rp 85.000 | Rp 30.000 |
| **Potongan kasbon** | **Rp 0** | Rp 0 |
| **Diterima** | **Rp 2.448.750** | Rp 2.249.600 |

Soleh memang tidak punya kasbon berjalan, jadi Rp 0 benar untuknya.

**Ali punya.** Dan slipnya memotong Rp 0.

## Yang tidak cocok

Riwayat kasbon Ali berisi ini:

```
30-09-2026   Rp 100.000   lewat slip 6abcf758…
```

Slip `6abcf758…` adalah slip September Ali. Slip itu sendiri sekarang
berbunyi `kasbon_deduction: 0`.

**Riwayat kasbon menyatakan Ali sudah membayar Rp 100.000 lewat slip itu,
sementara slip itu tidak menahan apa pun.** Yang benar-benar menahan uang
adalah slipnya. Jadi kalau slip ini dibayar apa adanya hari ini, Ali
menerima Rp 100.000 lebih banyak dan kasbonnya tetap tercatat berkurang
Rp 100.000.

Tidak ada error. Tidak ada angka yang terlihat janggal. Kedua angka
masing-masing masuk akal; yang tidak masuk akal hubungan di antara
keduanya.

## Kenapa terjadi

`hitungKasbon` punya penjaga anti-potong-dua-kali:

> *"Kasbon yang potongannya sudah tercatat untuk periode ini dilewati —
> tanpa pemeriksaan ini, membuka layar gaji dua kali bisa memotong dua
> kali."*

Penjaganya benar untuk slip **baru**. Salah untuk slip yang **itu-itu
juga**.

Urutannya:

1. Slip September terbit → potongan Rp 100.000 → riwayat kasbon mencatat
   Rp 100.000 atas nama slip itu.
2. Slipnya dihitung ulang (tombol "Update" / "Generate Semua").
3. Riwayat sudah berisi catatan untuk 2026-09 → kasbonnya **dilewati** →
   `potongan` nol → slip diperbarui jadi `kasbon_deduction: 0`.

Penjaga yang dibuat supaya tidak memotong dua kali, malah membuat
potongannya nol.

## Yang dikerjakan

Potongan yang **sudah tercatat** untuk periode ini sekarang dikembalikan
apa adanya, bukan diganti nol. Slipnya tetap menampilkan angka yang sama,
dan tidak ada catatan kedua yang dibuat: `idDipotong` sengaja dibiarkan
kosong, dan `patchPotongan` memang sudah menolak mencatat slip yang sama
dua kali.

Jadi kedua kesalahan dijawab sekaligus — bukan yang satu dengan menukar
yang lain.

## Yang perlu Anda lakukan

1. **Tekan Publish.**
2. Buka **Gaji → Terbitkan**, tekan **Update** pada slip Ali.
3. Potongannya kembali **Rp 100.000**, dan yang diterima kembali
   **Rp 2.348.750**.

**Jangan bayar slip Ali sebelum langkah 2.** Kalau dibayar sekarang, Ali
menerima Rp 100.000 lebih banyak sementara kasbonnya tetap tercatat
berkurang.

Slipnya **tidak saya perbaiki dengan tangan.** Perbaikannya ada di
kodenya, dan menekan Update akan membuktikannya sendiri — itu lebih
berguna daripada saya menyunting satu baris gaji dan Anda harus percaya
begitu saja.

## Penjaga

`cek-gaji.mjs` sekarang menguji KEDUA arah sebagai pasangan:

```
  slip yang dihitung ulang tetap memotong yang sudah tercatat   100.000
  ...dan tidak mencatat potongan kedua                          idDipotong kosong
```

Memisahkan keduanya persis yang membuat Rp 100.000 ini hilang. Menjawab
salah satu saja menghasilkan satu dari dua cacat: memotong dua kali, atau
memotong nol sambil mencatat lunas.

Keduanya sudah diuji bisa merah.

## Catatan

Riwayat kasbon tidak diubah. Baris Rp 100.000 tanggal 30 September tetap
apa adanya — begitu slipnya dihitung ulang, slip dan riwayat kembali
menyebut angka yang sama.
