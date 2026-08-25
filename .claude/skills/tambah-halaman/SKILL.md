---
name: tambah-halaman
description: Menambah halaman baru ke aplikasi Duta Tortoise secara lengkap — file halaman, rute di App.jsx, entri navigasi, dan hak akses per role. Gunakan saat diminta membuat halaman/menu/fitur baru yang punya layar sendiri.
---

# Menambah halaman baru

Halaman baru **tidak selesai** hanya dengan membuat file `.jsx`. Ada 4 tempat
yang harus disentuh. Melewatkan salah satunya = halaman tidak muncul atau
tidak bisa diakses siapa pun.

## Kumpulkan dulu

Sebelum menulis kode, pastikan tahu:

- **Nama halaman** (bahasa Indonesia, untuk menu) — mis. "Catatan Vaksin"
- **Path rute** — mis. `/catatan-vaksin`
- **`section` id** — mis. `catatan-vaksin` (dipakai untuk hak akses)
- **Area** — salah satu dari: `kura`, `operasional`, `gudang`, `keuangan`,
  `tim`, `pengaturan` (lihat `NAV_SECTIONS` di `src/lib/navigation.js`)
- **Role mana yang boleh** membuka, dan boleh create/edit/delete
- **Entity** yang dibaca/ditulis

Kalau ada yang belum jelas dan pilihannya mengubah hasil, tanyakan dulu —
jangan menebak `section` atau daftar role.

## Langkah

### 1. Buat file halaman

`src/pages/<Nama>Page.jsx`. Salin pola dari halaman sejenis yang sudah ada
(mis. `src/pages/HealthList.jsx` untuk halaman daftar + form).

Kerangka wajib:

```jsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getPerms } from "@/lib/permissions";

export default function CatatanVaksinPage() {
  const qc = useQueryClient();
  const { user, role } = useCurrentUser();
  const perms = getPerms(role, "catatan-vaksin");   // section id

  const { data = [], isLoading } = useQuery({
    queryKey: ["VaccineRecord"],
    queryFn: () => base44.entities.VaccineRecord.list(),
  });

  // ... UI pakai @/components/ui/*
}
```

### 2. Daftarkan rute di `src/App.jsx`

Tambah import statis di blok import halaman, lalu tambah `<Route>` di dalam
`<Route element={<AppLayout />}>`:

```jsx
import CatatanVaksinPage from '@/pages/CatatanVaksinPage';
// ...
<Route path="/catatan-vaksin" element={<CatatanVaksinPage />} />
```

### 3. Tambah ke navigasi — `src/lib/navigation.js`

Sisipkan ke `items` pada area yang sesuai di `NAV_SECTIONS`. Jangan bikin
daftar menu baru di tempat lain; file ini sumber tunggal untuk Sidebar,
HubPage, dan CommandPalette.

```js
{ path: "/catatan-vaksin", section: "catatan-vaksin", label: "Catatan Vaksin",
  icon: Syringe, desc: "Riwayat vaksinasi per kura" },
```

Impor ikonnya dari `lucide-react` di blok import atas file.

### 4. Atur hak akses — `src/lib/permissions.js`

Dua hal, keduanya wajib:

a. Tambahkan string `section` ke array `NAV_ACCESS` untuk **setiap role** yang
   boleh melihat menu ini.

b. Tambahkan entri di `PAGE_PERMISSIONS` per role:

```js
"catatan-vaksin": { canCreate: true, canEdit: true, canDelete: false,
                    canViewPrice: false, canViewSales: false },
```

Role yang tidak didaftarkan otomatis dapat semua-`false` lewat fallback di
`getPerms`, tapi tetap tulis eksplisit untuk role yang memang dipakai.

### 5. Verifikasi

```bash
npm run lint && npm run build
```

Lalu laporkan ke user: role mana saja yang sekarang bisa melihat halaman itu
dan aksi apa yang mereka punya.

## Checklist akhir

- [ ] File halaman dibuat, pakai `getPerms` untuk kontrol tombol aksi
- [ ] Rute ada di `App.jsx` (import + `<Route>`)
- [ ] Entri di `NAV_SECTIONS` (`navigation.js`) dengan `section` yang benar
- [ ] `section` masuk `NAV_ACCESS` untuk role yang berhak
- [ ] Entri di `PAGE_PERMISSIONS` per role
- [ ] `npm run lint` dan `npm run build` bersih
