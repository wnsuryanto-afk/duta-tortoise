# Kandang N tidak dikunjungi selama dua hari

Dicatat 28 September 2026.

## Apa yang terjadi

Pada 27 September, N1–N3 digabung menjadi kandang **N** (28 kura): ketiganya
diarsipkan, N dibuat, dan `ronda_harian` dinyalakan pada N.

Perubahan datanya benar. Tetapi kode yang MEMBACA `ronda_harian` baru sampai
ke aplikasi pada **28 September pukul 11:31**, saat Publish ditekan. Selama
jeda itu aplikasi masih menjalankan daftar kandang yang ditulis mati di kode —
daftar yang menyebut N1, N2, N3 dan tidak mengenal N.

Akibatnya, begitu N1–N3 diarsipkan:

| Tanggal | Kandang yang tercatat dikunjungi |
|---|---|
| 23–26 Sep | 14 kandang, termasuk N1, N2, N3 |
| **27 Sep** | **10 kandang** — N1/N2/N3 hilang, N tidak muncul |
| **28 Sep** | **11 kandang** — masih tanpa N |

`MaintenanceLog` untuk `enclosure_name: "N"`: **nol baris, sejak kandangnya
dibuat.**

Dua puluh delapan kura tidak punya satu pun catatan kunjungan selama dua hari.

## Ini persis yang diperingatkan, dan tetap terjadi

Catatan commit 27 September sudah menyebutnya:

> "menggabungkan N1-N3 menjadi N membuat 28 kura HILANG dari ronda harian:
> ubinnya tidak muncul, pakan dan kebersihannya tidak punya jalur pencatatan,
> dan tidak ada satu pun catatan MaintenanceLog untuk kandang N sampai kodenya
> diubah lalu **dibangun ulang**."

Kolom `ronda_harian` dibuat justru supaya penggabungan berikutnya berlaku
seketika tanpa menyentuh kode. Yang tidak diperhitungkan: kode PEMBACA kolom
itu sendiri belum sampai ke aplikasi. Perubahan yang digerakkan data tetap
menunggu satu kali penerbitan — dan penerbitan itu tertunda sebelas hari.

## Berapa yang terlewat

Kura N hampir pasti tetap diberi makan dan dibersihkan — yang hilang catatannya,
bukan pekerjaannya. Ubin N berbobot 3.

| | |
|---|---|
| 27 Sep (Minggu) | 15 × 3 = 45 poin |
| 28 Sep (Senin) | 23 × 3 = 69 poin |
| **Total** | **114 poin ≈ Rp 8.550** |

Tidak dibayarkan mundur dan tidak ditulis sebagai catatan perawatan baru —
data historis tidak diubah.

## Pelajarannya

Perubahan yang digerakkan data (`ronda_harian`, `bobot_poin`, `catat_pakan`,
`di_ubin_kandang`) hanya berlaku seketika SETELAH kode pembacanya hidup di
aplikasi. Sebelum itu, mengubah datanya saja bisa membuat keadaan lebih buruk
daripada tidak mengubah apa pun: N1–N3 sudah hilang dari daftar lama,
sementara N belum ada di daftar baru.

Urutan yang benar: **terbitkan kodenya dulu, baru ubah datanya.** Bukan
sebaliknya.

## Yang perlu dipantau

Mulai 29 September, kandang **N** dan keempat kandang **Bonsai** harus muncul
di catatan harian. Kalau setelah sehari penuh masih belum ada baris
`enclosure_name: "N"`, berarti aplikasi di HP kiper masih menyajikan bundel
lama dan perlu dimuat ulang paksa.
