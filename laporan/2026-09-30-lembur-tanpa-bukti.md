# Lembur yang dibayar tanpa bukti kerja

30 September 2026

## Aturannya

Sejak 30 Agustus 2026 berlaku aturan: lembur hanya dibayar bila ada tugas
yang tercatat **setelah jam selesai shift**. Alasannya ditulis di kodenya
sendiri:

> *"Tugas absensi bukan bukti kerja: mencentang 'Absensi jam pulang' pukul
> 16:15 hanya membuktikan bahwa orangnya mencentang absensi, bukan bahwa ia
> bekerja."*

Aturannya benar dan implementasinya benar. Yang salah: **ia tidak selalu
dijalankan.**

## Kejadiannya

23 September 2026, Angsolo pulang pukul **18:52**, shift selesai 16:00.
Tercatat lembur **3 jam — Rp 30.000**.

Checklist hari itu ADA dan berisi 12 tugas. Yang terakhir pukul **15:28**.
Tidak satu pun setelah jam 16:00.

Dijalankan dengan checklist aslinya, aturan itu menjawab:

```
  checklist ASLI (12 tugas, terakhir 15:28)
     ada bukti kerja setelah 16:00?  false
     lembur                          0 jam → tidak dibayar

  checklist = null (tidak sampai ke pemeriksa)
     ada bukti kerja setelah 16:00?  true
     lembur                          3 jam → DIBAYAR
```

Yang tersimpan: 3 jam. Jadi checklist-nya tidak sampai ke pemeriksa.

## Kenapa tidak sampai

`catatCheckOut` membaca ulang checklist bila pemanggil tidak membawanya.
Syaratnya:

```js
if (lemburKasar > 0 && harian === undefined) { ... baca dari basis data ... }
```

`KeeperDashboard` memuat checklist-nya begini:

```js
return all[0] || null;
```

**`null`, bukan `undefined`.** Jadi saat barisnya belum termuat, syarat
`=== undefined` tidak terpenuhi, pembacaan ulang dilewati, dan
`adaBuktiKerjaLembur(null)` menjawab *"tidak tahu"* — yang menurut aturannya
berarti dibayar.

Ini pola yang sudah berkali-kali muncul di aplikasi ini: **sebuah jaminan
yang hanya berlaku untuk satu bentuk masukan.** Penjaganya ada, benar, dan
dilewati oleh pemanggil yang kebetulan memakai `null`.

## Yang dikerjakan

Satu kata:

```js
if (lemburKasar > 0 && !harian) { ... }
```

Aturannya tidak berubah sedikit pun. Yang berubah: ia sekarang
benar-benar dijalankan.

**Akibatnya pada gaji:** lembur seperti 23 September tidak akan dibayar
lagi. Itu bukan aturan baru — itu aturan Anda sendiri yang selama ini
bocor. Kalau ternyata Anda memang ingin membayarnya, yang perlu diubah
aturannya, bukan ditambal kebocorannya.

## Yang saya TIDAK ubah

Satu hal lagi yang menurut saya keliru, tetapi menyangkut upah orang jadi
saya laporkan saja:

Bila seorang kiper **tidak punya checklist sama sekali** hari itu — nol
tugas tercatat — lalu pulang pukul 19:00, lemburnya tetap dibayar penuh.
Sebabnya sama: tidak ada data dianggap "tidak tahu", dan "tidak tahu"
berarti dibayar.

Menurut saya "nol tugas tercatat" bukan *tidak tahu* — itu justru tahu, dan
jawabannya tidak ada bukti kerja. Tapi mengubahnya berarti mengubah aturan
upah, dan itu keputusan Anda.

Hal serupa: kalau satu-satunya tugas setelah jam shift adalah centang
"Absensi jam pulang", saringan membuangnya, daftarnya jadi kosong, dan
kekosongan itu dibaca "tidak tahu" → **dibayar**. Jadi aturan yang dibuat
khusus supaya centang absensi tidak dihitung sebagai bukti, dalam kasus itu
justru membayar. Saat ini laten: kedua SOPTask absensi sudah `is_active:
false`, jadi tugas semacam itu tidak dibuat lagi.

## Penjaga

`cek-gaji.mjs` bertambah dua:

1. **Dua salinan, satu jawaban.** `jamLemburBerbukti` ada di
   `src/lib/weeklySalaryUtils.js` dan `base44/shared/otomatis.ts` —
   keduanya menulis OvertimeLog, dan OvertimeLog yang dibayar. Bentuk
   kodenya sengaja berbeda (TypeScript, backend memakai `jamDari()`), jadi
   `cek-kembar` yang membandingkan badan fungsi tidak bisa dipakai. Yang
   dijaga JAWABANNYA: keduanya dijalankan betulan atas enam kasus yang
   sama, termasuk kasus 23 September. Diuji hari ini: 14 kasus, **0
   perbedaan** — jadi tidak ada selisih yang sedang hidup.
2. **Pembacaan ulang tidak boleh dilewati.** Syarat `=== undefined`
   ditolak; harus `!harian`.

Keduanya sudah diuji bisa merah.

## Catatan

Baris OvertimeLog 23 September **tidak saya ubah**. Itu riwayat, dan
lemburnya sudah ikut terbayar di slip September.
