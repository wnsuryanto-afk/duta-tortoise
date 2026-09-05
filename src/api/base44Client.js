import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const klienAsli = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

/*
 * ── KENAPA ADA PEMBUNGKUS DI BAWAH INI ──────────────────────────────────
 *
 * SDK Base44 memakai limit BAWAAN 50 baris kalau argumen `limit` tidak
 * diisi (lihat node_modules/@base44/sdk/dist/modules/entities.types.d.ts:
 * "Defaults to 50"). Tidak ada error, tidak ada tanda apa pun — data ke-51
 * dan seterusnya hilang diam-diam.
 *
 * Di aplikasi ini ada 200+ pemanggilan .list()/.filter() tanpa limit.
 * Entitas yang sudah lewat 50 baris: Attendance, DailyChecklist, Tortoise
 * (178), SOPTask, MaintenanceLog (>2000), WarehouseItem (129),
 * MeasurementHistory. Artinya halaman gaji, rekap poin, dan dashboard
 * membaca potongan data lalu menghitung seolah itu data lengkap.
 *
 * Memperbaiki 200 tempat satu per satu berarti 200 kesempatan lupa lagi.
 * Jadi diperbaiki di SATU tempat: setiap .list()/.filter() yang tidak
 * menyebut limit otomatis memakai BATAS_AMBIL.
 *
 * Kalau perlu limit lain, tulis eksplisit — nilai eksplisit selalu menang.
 *
 * Batas SDK adalah 5.000 baris per permintaan, jadi BATAS_AMBIL tidak
 * boleh melebihi itu.
 */
export const BATAS_AMBIL = 2000;

// Kalau hasil pas menyentuh batas, kemungkinan besar data terpotong.
// Diam-diam salah lebih berbahaya daripada berisik, jadi kita berisik.
function peringatkanBilaMentok(nama, metode, hasil) {
  if (Array.isArray(hasil) && hasil.length >= BATAS_AMBIL) {
    console.warn(
      `[batas-ambil] ${nama}.${metode}() mengembalikan ${hasil.length} baris ` +
      `— pas di batas ${BATAS_AMBIL}. Data kemungkinan TERPOTONG. ` +
      `Persempit filter atau tulis limit eksplisit.`
    );
  }
  return hasil;
}

function bungkusEntitas(nama, entitas) {
  return new Proxy(entitas, {
    get(target, prop, receiver) {
      const asli = Reflect.get(target, prop, receiver);
      if (typeof asli !== 'function') return asli;

      if (prop === 'list') {
        return (sort, limit, skip, fields) =>
          asli.call(target, sort, limit ?? BATAS_AMBIL, skip, fields)
            .then((h) => peringatkanBilaMentok(nama, 'list', h));
      }
      if (prop === 'filter') {
        return (query, sort, limit, skip, fields) =>
          asli.call(target, query, sort, limit ?? BATAS_AMBIL, skip, fields)
            .then((h) => peringatkanBilaMentok(nama, 'filter', h));
      }
      return asli.bind(target);
    },
  });
}

const simpanan = new Map();
const entitasAman = new Proxy(klienAsli.entities, {
  get(target, prop, receiver) {
    const asli = Reflect.get(target, prop, receiver);
    if (typeof prop !== 'string' || !asli || typeof asli !== 'object') return asli;
    if (!simpanan.has(prop)) simpanan.set(prop, bungkusEntitas(prop, asli));
    return simpanan.get(prop);
  },
});

export const base44 = new Proxy(klienAsli, {
  get(target, prop, receiver) {
    if (prop === 'entities') return entitasAman;
    const nilai = Reflect.get(target, prop, receiver);
    return typeof nilai === 'function' ? nilai.bind(target) : nilai;
  },
});
