---
name: tambah-entity
description: Menambah atau mengubah entity (skema data) Base44 di Duta Tortoise, termasuk konvensi field, enum, dan cara memakainya dari React. Gunakan saat diminta menambah tabel/data baru, menambah kolom, atau mengubah bentuk data.
---

# Menambah / mengubah entity Base44

Skema data tinggal di `base44/entities/<Nama>.jsonc` — **satu file per
entity, 69 entity saat ini**. File inilah definisi database-nya. Mengubah
kode React tanpa mengubah skema tidak akan menambah field apa pun.

## Konvensi penamaan

- Nama file & properti `"name"` sama persis, **PascalCase, tunggal**:
  `HealthRecord.jsonc` → `"name": "HealthRecord"`.
- Nama field: `snake_case` atau `camelCase` — **ikuti entity terdekat yang
  sedomain**, jangan campur dalam satu file.
- Setiap field wajib punya `"description"` berbahasa Indonesia. Deskripsi ini
  yang dibaca Base44 Builder dan sesi Claude berikutnya, jadi tulis yang jelas.

## Bentuk file

```jsonc
{
  "name": "VaccineRecord",
  "type": "object",
  "properties": {
    "tortoise_id": {
      "type": "string",
      "description": "ID kura yang divaksin"
    },
    "vaccine_type": {
      "type": "string",
      "enum": ["rabies", "cacing", "lainnya"],
      "default": "lainnya",
      "description": "Jenis vaksin"
    },
    "date": {
      "type": "string",
      "format": "date",
      "description": "Tanggal vaksinasi"
    },
    "dosage_ml": {
      "type": "number",
      "default": 0,
      "description": "Dosis dalam mililiter"
    },
    "notes": {
      "type": "string",
      "description": "Catatan tambahan"
    }
  },
  "required": ["tortoise_id", "date"]
}
```

Aturan yang konsisten dipakai di repo ini:

- Setiap field enum **wajib** punya `default`, supaya data lama tidak jadi
  `undefined` saat field baru ditambahkan.
- Relasi disimpan sebagai `string` berisi id entity lain (mis. `tortoise_id`),
  bukan objek bersarang.
- Tanggal: `"type": "string"` + `"format": "date"` (atau `date-time`).
- `required` diisi seminimal mungkin — field yang ditambahkan belakangan
  jangan dijadikan `required`, karena record lama tidak memilikinya.

## Menambah field ke entity yang sudah ada

Ini kasus paling sering, dan paling berisiko:

1. Tambahkan field ke `properties` dengan `default` yang aman.
2. **Jangan** masukkan ke `required`.
3. Cari pemakainya: `grep -rn "NamaEntity" src --include=*.jsx -l`
4. Pastikan kode yang membaca field baru tahan terhadap record lama yang
   belum punya field itu (`?? default`, bukan asumsi ada).

## Memakainya dari React

Lewat klien tunggal `@/api/base44Client`, dibungkus TanStack Query:

```jsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const qc = useQueryClient();

const { data = [] } = useQuery({
  queryKey: ["VaccineRecord"],
  queryFn: () => base44.entities.VaccineRecord.list(),
});

// Tulis, lalu invalidate cache-nya
await base44.entities.VaccineRecord.create({ tortoise_id, date });
qc.invalidateQueries({ queryKey: ["VaccineRecord"] });
```

`queryKey` konvensinya = nama entity. Kalau berfilter, tambahkan sebagai
elemen kedua: `["VaccineRecord", tortoiseId]`.

## Verifikasi

```bash
npm run lint && npm run build
```

Skema itu sendiri tidak diverifikasi build — periksa manual bahwa JSONC-nya
valid dan `"name"` cocok dengan nama file.

## Checklist

- [ ] File `base44/entities/<Nama>.jsonc` dibuat/diubah
- [ ] `"name"` sama dengan nama file, PascalCase tunggal
- [ ] Semua field punya `description` bahasa Indonesia
- [ ] Enum punya `default`; field baru tidak masuk `required`
- [ ] Pemakai di `src/` sudah tahan record lama
- [ ] `invalidateQueries` dipanggil setelah setiap create/update/delete
