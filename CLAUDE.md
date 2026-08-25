# Duta Tortoise — Panduan untuk Claude Code

Aplikasi manajemen peternakan kura-kura sulcata (Duta Tortoise). Dibangun di
**Base44** (React + Vite). Repo ini tersinkron dua arah dengan Base44 Builder:
setiap push ke repo terpantul ke Builder, dan sebaliknya.

> **Baca file ini dulu sebelum menjelajah kode.** Isinya sudah merangkum
> struktur, konvensi, dan lokasi hal-hal penting. Jangan `grep` seluruh `src/`
> untuk pertanyaan yang jawabannya sudah ada di sini.

---

## Perintah

| Tujuan | Perintah |
| --- | --- |
| Jalankan dev server | `npm run dev` |
| Build produksi | `npm run build` |
| Lint (wajib sebelum commit) | `npm run lint` |
| Perbaiki lint otomatis | `npm run lint:fix` |
| Cek tipe | `npm run typecheck` |

Belum ada test suite. **Verifikasi perubahan dengan `npm run lint` + `npm run build`.**

---

## Arsitektur

```
src/
  api/base44Client.js   → satu-satunya klien Base44. Semua data lewat sini.
  pages/                → 74 halaman, satu file per rute (PascalCase + "Page")
  components/           → dikelompokkan per domain (sop/, breeding/, health/, ...)
  components/ui/        → shadcn/ui. JANGAN diedit manual, ini generated.
  lib/                  → utilitas, context, hooks lintas-domain
  hooks/                → hooks React yang berdiri sendiri
base44/entities/        → 69 skema entity (.jsonc) = definisi database
```

**Alur data**: `base44` client → TanStack Query (`useQuery`/`useQueryClient`) →
komponen. Tidak ada Redux/Zustand. Cache di-invalidate lewat `queryClient`.

**Routing**: semua rute didaftarkan manual di `src/App.jsx` di dalam
`<Route element={<AppLayout />}>`. Import statis, tidak ada lazy-loading.

---

## Tiga sumber kebenaran tunggal (JANGAN dibuat duplikatnya)

1. **`src/lib/navigation.js`** — struktur menu. Sidebar, HubPage, dan
   CommandPalette semuanya membaca dari sini. Jangan bikin daftar menu
   terpisah di file lain.
2. **`src/lib/permissions.js`** — hak akses. Berisi `NAV_ACCESS` (menu apa
   yang terlihat per role) dan `PAGE_PERMISSIONS` (aksi apa yang boleh per
   role per section). Akses lewat `getPerms(role, section)`.
3. **`base44/entities/*.jsonc`** — skema data. Kalau bentuk data berubah,
   file inilah yang diubah, bukan sekadar kode pemakainya.

---

## Role & hak akses

Enam role: `owner`, `admin`, `manajer`, `kepala_feeder`, `keeper`, `investor`.

- Level 1 — **owner**: akses penuh.
- Level 2 — **admin** & **manajer**: hampir sama dengan owner, tanpa
  system-maintenance dan sebagian keuangan.
- Level 3 — **keeper** & **kepala_feeder**: pekerja lapangan, akses terbatas.
- **investor**: read-only.

Pola standar di dalam halaman:

```jsx
const { user, role } = useCurrentUser();       // dari @/lib/useCurrentUser
const perms = getPerms(role, "health");        // dari @/lib/permissions
{perms.canCreate && <Button>Tambah</Button>}
```

Setiap halaman baru **wajib** punya `section` di `NAV_ACCESS` dan
`PAGE_PERMISSIONS`, kalau tidak halaman itu tidak akan muncul untuk siapa pun.

---

## Konvensi kode

- **Bahasa**: UI, label, komentar, dan nama domain pakai **bahasa Indonesia**.
  Nama variabel/fungsi boleh Inggris. Ikuti gaya file di sekitarnya.
- **Import alias**: selalu `@/` (bukan path relatif panjang). Contoh:
  `import { base44 } from "@/api/base44Client"`.
- **Komponen UI**: pakai `@/components/ui/*` (shadcn). Jangan pasang library
  UI baru.
- **Ikon**: `lucide-react`.
- **Tanggal**: `date-fns` dengan locale `id`. Ada helper `@/lib/safeDate` dan
  `@/lib/formatIndonesian` — pakai itu, jangan format manual.
- **Toast**: `sonner` / `react-hot-toast` sudah terpasang.
- **Styling**: Tailwind. Warna lewat token tema (`bg-muted`,
  `text-muted-foreground`), bukan hex mentah, supaya dark mode ikut jalan.

---

## Utilitas yang sudah ada (cek dulu sebelum bikin baru)

`src/lib/` sudah berisi banyak helper domain. Yang sering dipakai:

| Kebutuhan | File |
| --- | --- |
| User & role saat ini | `useCurrentUser.js` |
| Hak akses | `permissions.js` |
| Pengaturan perusahaan | `useCompanySettings.js` |
| Format tanggal/angka Indonesia | `formatIndonesian.js`, `safeDate.js` |
| Catat aktivitas | `logActivity.js` |
| Ekspor data / ZIP | `exportUtils.js`, `zipDownload.js` |
| Label & QR | `labelUtils.js`, `skuUtils.js` |
| Kompresi gambar | `useImageCompression.js` |
| Perhitungan gaji mingguan | `weeklySalaryUtils.js` |
| Breeding | `breedingUtils.js`, `breedingCalendarUtils.js` |
| Kluster penyakit | `diseaseClusterUtils.js` |

---

## Hal yang perlu diwaspadai

- **`components/stock/` vs `components/stok/`** — dua folder berbeda yang
  keduanya dipakai. `stock/` = gudang/inventori umum, `stok/` = tab-tab
  halaman `UnifiedStokPage`. Jangan tertukar, jangan digabung tanpa diminta.
- **File raksasa.** Beberapa file 40–68 KB (`GuidedHariIni.jsx`,
  `TugasHariIni.jsx`, `OwnerDashboard.jsx`, `TortoiseList.jsx`). Membaca satu
  file penuh bisa habis belasan ribu token. **Baca per bagian**
  (`sed -n '1,120p'`) atau `grep -n` dulu untuk cari fungsi yang dituju.
- **`src/components/ui/`** generated shadcn — jangan diedit tangan.
- **`src/backups/`** berisi snapshot JSON, bukan kode aktif.
- `s2.cjs` dan `scan.cjs` di root adalah skrip pemindai sekali-pakai, bukan
  bagian dari build.

---

## Cara hemat token saat bekerja di repo ini

1. Mulai dari file ini, bukan dari `find`/`grep` menyeluruh.
2. Untuk menambah halaman atau entity, pakai skill di `.claude/skills/` —
   langkah-langkahnya sudah pasti, tidak perlu ditemukan ulang tiap sesi.
3. Sebut nama file secara spesifik dalam permintaan
   ("ubah `src/pages/HealthList.jsx`"), jangan biarkan Claude mencari.
4. Satu tugas satu sesi. Sesi panjang lintas-domain membuat konteks
   menumpuk tanpa guna.
5. Untuk file besar, minta perubahan pada fungsi tertentu, bukan
   "rapikan file ini".
