# Mode Uji bocor di 29 tempat

30 September 2026

## Janjinya

Layar pemilih Mode Uji menuliskan janjinya sendiri: data yang tersimpan
selama mode itu menyala "ditandai `is_test_data` agar tidak masuk
laporan/hitung poin".

## Kenyataannya

Janji itu hanya ditepati oleh layar yang ingat menyertakan `...testModeTag`
pada payloadnya. Tidak ada satu pun mekanisme yang memaksa.

Dari sekitar 40 tempat di aplikasi yang membuat baris baru pada tabel yang
punya kolom `is_test_data`, **29 tidak menandai apa pun.**

Dan `is_test_data` punya nilai bawaan `false`. Jadi yang lupa bukan sekadar
kehilangan penanda — barisnya tersimpan bertanda **"BUKAN data uji"**, tidak
bisa dibedakan dari data sungguhan oleh laporan mana pun, selamanya. Tidak
ada error, tidak ada angka yang terlihat janggal, tidak ada cara
membersihkannya kemudian.

## Yang paling merugikan

| Layar | Yang tersimpan sebagai data nyata |
|---|---|
| `SakitFormDialog`, `SakitFromTemuanDialog` | catatan sakit dari layar KIPER — layar yang justru paling sering dibuka pemilik saat mencoba aplikasi sebagai kiper |
| `KeeperDashboard` (check-in) | kehadiran. Tombol check-out di layar yang **sama** sudah menandai; check-in tidak. Satu sesi percobaan meninggalkan baris absensi yang separuhnya bertanda uji dan separuhnya tidak |
| `PanelKasbon`, `PayrollPage` (lembur) | kasbon dan jam lembur — keduanya berujung pada uang yang dibayarkan |
| `PembelianPage`, `PecahBatchDialog`, `AmbilBarangScan` | pembelian dan pergerakan stok gudang |
| `TortoiseForm` | kura baru |

## Pola yang berulang

Cacat pada `KeeperDashboard` adalah bentuk yang sudah tiga kali muncul hari
ini: **jaminan yang ada di satu pintu, dan tidak ada di pintu sebelahnya.**
Layar Terpandu memanggil `catatCheckIn` dengan `tandaUji`; Dasbor Kiper
memanggil fungsi yang sama tanpa. Dua tombol, satu tabel, satu berbeda.

Memindahkan pencatatan ke `src/lib` — yang selama ini adalah cara
menyembuhkan pola itu — ternyata bisa **memperburuknya**. Setiap fungsi di
sana memberi `tandaUji` nilai bawaan kosong, karena tanpa itu satu pemanggil
yang belum disesuaikan akan melempar error. Harganya: pemanggil yang lupa
tidak terlihat. Fungsinya jalan, barisnya tersimpan, penandanya hilang
diam-diam. Jebakan yang sama, berpindah satu lapis ke atas.

## Yang dikerjakan

29 tempat diperbaiki. Empat fungsi di `src/lib` (`tandaiSembuh`,
`catatTidakMakan`, `catatMakanLagi`, `catatPerawatanHarian`) sekarang
meneruskan penanda, dan enam pemanggilnya mengirimkannya.

Satu perkecualian sengaja: saat catatan kesehatan dihapus dan obatnya
dikembalikan ke gudang, penandanya diambil dari **catatan yang dihapus**,
bukan dari Mode Uji yang sedang menyala. Pergerakan stok itu membatalkan
pemakaian yang dulu dicatat; ia harus berpasangan dengan baris aslinya.
Kalau tidak, salah satunya masuk laporan sendirian dan stok gudang bergeser
tanpa sebab yang terlihat.

## Supaya tidak terulang

`scripts/cek-modeuji.mjs`, penjaga ke-17. Memeriksa dua hal:

1. Tiap `entities.X.create({...})` pada tabel bertanda harus memuat
   penandanya di payload literalnya.
2. Tiap fungsi `src/lib` yang **meneruskan** `tandaUji` harus benar-benar
   dikirimi `tandaUji` oleh setiap pemanggilnya — supaya nilai bawaan kosong
   tidak diam-diam memulangkan cacat yang sama.

Bagian kedua langsung menemukan dua cacat yang belum ketahuan: check-in di
Dasbor Kiper, dan pengembalian obat di Rekam Kesehatan.

Berkas yang memang tidak boleh menandai boleh didaftarkan di `DIKECUALIKAN`,
tetapi **wajib menuliskan alasannya**. Aturan itu sudah membuktikan dirinya
sendiri: `src/lib/absensi.js` terdaftar di situ dengan alasan "dipanggil
otomatisasi server". Alasannya keliru — ia dipanggil manusia dari dua layar
kiper. Menuliskan alasan adalah yang membuat kekeliruan itu terbaca.

## Catatan

Tidak ada data historis yang diubah. Baris yang sudah telanjur tersimpan
tanpa penanda tetap seperti apa adanya — tidak ada cara mengetahui mana di
antaranya yang sebenarnya percobaan.
