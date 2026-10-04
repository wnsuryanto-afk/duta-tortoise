# Audit tata letak — 54 halaman, satu per satu

**4 Oktober 2026** · seluruh modul

---

## Dua pola yang muncul di mana-mana

Kelima puluh empat halaman diperiksa. Masalah yang Anda lingkari di beranda
ternyata bukan masalah beranda — ia ada di seluruh aplikasi:

| Temuan | Jumlah |
|---|---:|
| Halaman memajang angka ringkasan di kepala | 10 |
| …yang **bisa diklik** | **0** |
| Halaman memakai `<h1>` sendiri, bukan PageHeader | 32 dari 54 |

**Angka yang tidak bisa ditelusuri memindahkan pekerjaan ke orang yang
membacanya.** "Sakit 3" di kepala Daftar Kura memunculkan pertanyaan lalu
membiarkan orang mencari sendiri halaman jawabannya.

## Yang dikerjakan sekarang

### 1. Semua chip punya tujuan — 28 chip di 10 halaman

| Halaman | Chip | Menuju |
|---|---|---|
| Breeding & Telur | Menetas ≤7 hari · Telur diinkubasi · Batch aktif · Tingkat menetas | tab Telur · tab Telur · tab Pembiakan · tab Statistik |
| Daftar Kura | Sakit · Karantina · Aktif · Jantan:Betina | /health · tab Karantina · tab Kura · tab Kandang |
| Catatan Sakit | Sedang sakit · Kasus bulan ini · Total catatan | Daftar Kura · tab Catatan |
| Dashboard Stok | Kritis · Kedaluwarsa <30 hari · Nilai stok · Keluar bulan ini | /pembelian · /stok-unified · /stok-unified · tab Pengeluaran |
| Laporan Keuangan | Margin · Transaksi periode ini | tab Laba-Rugi · tab Semua |
| Kebersihan Kandang | Belum selesai | /sop |

Enam chip **sengaja tidak diberi tujuan**, dengan alasan tertulis di tempat
chipnya dibuat: "+10 poin untuk masukan yang ditindaklanjuti" adalah aturan,
bukan angka; "Belum dibaca", "Sudah dibayar", "Hari ini", "Selesai hari ini"
dan "Dari" rinciannya memang daftar tepat di bawah chip itu sendiri.

**Satu kesalahan saya sendiri, ditangkap penjaganya:** saya sempat menautkan
lima chip ke halaman mereka sendiri (`/notifications` dari halaman
Notifikasi). Tautan yang tidak membawa ke mana-mana persis jenis kebohongan
yang sedang dibereskan — kelimanya diganti alasan tertulis.

### 2. Yang mendesak naik ke depan, otomatis

`PageHeader` kini mengurutkan chip: `tone: "bad"` lalu `"warn"` lalu sisanya,
**stabil** — chip setingkat tetap pada urutan yang ditulis halamannya, dan
pada hari yang tenang susunannya persis seperti sebelumnya.

Ini aman karena di kesepuluh halaman itu `warn`/`bad` **selalu** dipasang
bersyarat (`sakit > 0 ? "warn" : "good"`). Jadi mengangkat keduanya sama
dengan mengangkat yang perlu dikerjakan, bukan sekadar mengurutkan warna.

`"good"` sengaja **tidak** dibedakan dari `"default"`: di sebagian halaman
"good" berarti "angkanya bagus" (margin positif), bukan "tidak ada yang perlu
dikerjakan" — mendorongnya ke belakang akan memindahkan margin ke ujung tanpa
alasan.

### 3. Ubin ringkasan jadi milik bersama

Yang dibuat untuk beranda kemarin dipindahkan ke `components/common/` dan
kini bisa dipakai halaman mana pun. Ia juga menerima `onKlik` untuk ubin yang
memindahkan tab di halaman yang sama — tombol sungguhan, bukan `div`
ber-onClick, supaya bisa dijangkau keyboard.

### 4. Stok & Gudang: halaman pertama yang dipindahkan

Dari `<h1>` sendiri ke PageHeader, dan keempat kartu angkanya jadi ubin yang
besarnya mengikuti isinya: "Stok kritis 0" mengecil sendiri, "Stok kritis 7"
melebar dan berwarna. Sebelumnya keempatnya selalu sebesar kartu yang sama,
jadi nol dan tujuh terbaca setara.

## Penjaganya: `cek-tataletak.mjs`

1. **Tiap chip punya tujuan** (`ke`, `onClick`, atau `tanpaTujuan: "alasan"`).
2. **Jumlah halaman ber-`<h1>` sendiri tidak boleh naik.** Sekarang **31**.

Soal nomor 2 — membereskan ketiga puluh satu sekaligus berarti menyentuh tiga
puluh satu berkas dalam satu kali, yang saya tolak bukan karena salah tetapi
karena **tidak bisa diperiksa**. Jadi utangnya dibekukan dan diturunkan
sedikit demi sedikit; angka di penjaganya ikut turun tiap kali satu halaman
dipindahkan.

Keduanya diuji merah dulu.

## Daftar lengkap — 54 halaman

Supaya tidak ada yang kelewatan. Urut abjad; **tebal** = masih perlu
dipindahkan, dengan prioritas di kolom terakhir.

| Halaman | Baris | Keadaan | Prioritas |
|---|---:|---|---|
| ActivityLogPage | 421 | **h1 sendiri** | sedang |
| AlatKerjaPage | 271 | PageHeader, tanpa angka | rendah |
| ApprovalPoinPage | 21 | PageHeader, tanpa angka | — |
| BreedingAndEggs | 1126 | PageHeader + 4 chip ✓ | selesai |
| BreedingDetailPage | 135 | **h1 sendiri** | rendah |
| BreedingPlannerPage | 513 | PageHeader, tanpa angka | **tinggi** |
| CatatBiayaPage | 349 | **h1 sendiri** | sedang |
| DaftarBelanjaPage | 169 | PageHeader, tanpa angka | sedang |
| DailyTaskTemplatePage | 210 | **h1 sendiri** | rendah (tidak dipakai) |
| Dashboard | 239 | PageHeader ✓ (ubin) | selesai |
| DashboardStokPage | 314 | PageHeader + 4 chip ✓ | selesai |
| DeathRecordsPage | 432 | **h1 sendiri** | sedang |
| EditProfilePage | 372 | **h1 sendiri** | rendah |
| FinancePage | 594 | PageHeader + 2 chip ✓ | selesai |
| HealthList | 391 | PageHeader + 3 chip ✓ | selesai |
| HRPage | 509 | **h1 sendiri** | **tinggi** |
| HubPage | 78 | **h1 sendiri** | rendah |
| IncompleteDataPage | 318 | **h1 sendiri** | sedang |
| InfoPage | 565 | **h1 sendiri** | rendah |
| KritikSaranPage | 471 | PageHeader + 2 chip ✓ | selesai |
| LayarTimPage | 341 | **h1 sendiri** | **tinggi** |
| MaintenanceSchedulePage | 353 | PageHeader + 2 chip ✓ | selesai |
| NotificationsPage | 331 | PageHeader + 2 chip ✓ | selesai |
| OAuthConsent | 240 | tanpa judul halaman | — (layar izin) |
| OtomatisasiPage | 608 | **h1 sendiri** | rendah |
| PakanHarianPage | 166 | PageHeader + 2 chip ✓ | selesai |
| PanduanPakanPage | 193 | **h1 sendiri** | rendah |
| PanduanPenyakitDetailPage | 230 | **h1 sendiri** | rendah |
| PembelianPage | 1219 | **h1 sendiri** | **tinggi** |
| PengaturanPoinPage | 289 | **h1 sendiri** | rendah |
| PengaturanWhatsAppPage | 1340 | **h1 sendiri** | rendah |
| PettyCashPage | 451 | PageHeader, tanpa angka | sedang |
| PrinterConfigPage | 706 | **h1 sendiri** | rendah |
| ProfileSetupPage | 289 | **h1 sendiri** | rendah |
| RekapPoinGajiPage | 612 | **h1 sendiri** | **tinggi** |
| RempesanPage | 259 | PageHeader, tanpa angka | sedang |
| RiwayatKlusterPage | 73 | **h1 sendiri** | rendah |
| SalarySlipPage | 351 | PageHeader + 3 chip ✓ | selesai |
| SalesList | 473 | PageHeader, tanpa angka | **tinggi** |
| SOPPage | 143 | PageHeader, tanpa angka | **tinggi** |
| StockPredictionPage | 253 | **h1 sendiri** | rendah |
| SupplierPage | 349 | **h1 sendiri** | rendah (belum dipakai) |
| SystemMaintenancePage | 332 | **h1 sendiri** | rendah |
| TemuanFotoPage | 366 | **h1 sendiri** | sedang |
| TermConditionSOPPage | 49 | **h1 sendiri** | rendah |
| TortoiseLabelPage | 233 | **h1 sendiri** | rendah |
| TortoiseList | 1053 | PageHeader + 4 chip ✓ | selesai |
| TortoisePassport | 393 | **h1 sendiri** | rendah (lembar cetak) |
| TreatmentPage | 936 | PageHeader, tanpa angka | **tinggi** |
| UnifiedStokPage | 209 | PageHeader + ubin ✓ | selesai |
| UserDetailPage | 673 | tanpa judul halaman | sedang |
| UserManagement | 300 | **h1 sendiri** | sedang |
| VetContactPage | 494 | **h1 sendiri** | rendah |
| WhatsAppLogPage | 216 | **h1 sendiri** | rendah |

### Antrean berikutnya (prioritas tinggi, 7 halaman)

`SOPPage` dan `LayarTimPage` (dibuka tiap hari oleh tim), `PembelianPage`,
`RekapPoinGajiPage` dan `SalesList` (uang), `TreatmentPage` dan
`BreedingPlannerPage` (keputusan indukan). Ketujuhnya punya angka yang layak
diangkat ke kepala halaman; sekarang tidak satu pun punya.

## Hasil

24 penjaga hijau (naik satu), `npx vite build` lolos. Tidak ada data yang
diubah.
