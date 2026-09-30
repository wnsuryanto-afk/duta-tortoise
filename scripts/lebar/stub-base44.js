// Pengganti @/api/base44Client untuk pengujian tata letak: tidak menyentuh
// jaringan sama sekali. Setiap entity menjawab daftar kosong.
export const BATAS_AMBIL = 2000;
const kosong = () => Promise.resolve([]);
const entity = new Proxy({}, { get: (_, k) =>
  k === "schema" ? () => Promise.resolve({}) : kosong });
const entities = new Proxy({}, { get: () => entity });
/*
 * Pengguna uji berperan OWNER.
 *
 * Sebelumnya `auth.me()` menjawab null, dan akibatnya setiap layar
 * pengelolaan jatuh ke <AccessDenied /> — sebuah kartu satu paragraf.
 * Penjaga tata letak lalu mengukur kartu itu, bukan layar yang sebenarnya,
 * dan melaporkan "tidak ada yang terpotong" tanpa pernah melihat satu pun
 * tabel gaji, tab, atau kartu ringkasan.
 *
 * Owner dipilih karena ia melihat PALING BANYAK: layar yang muat untuk owner
 * hampir pasti muat untuk peran lain, yang isinya lebih sedikit.
 */
const PENGGUNA_UJI = {
  id: "uji-owner",
  email: "uji@duta-tortoise.test",
  full_name: "Pengguna Uji",
  role: "owner",
};

export const base44 = {
  entities,
  auth: { me: () => Promise.resolve(PENGGUNA_UJI), logout: kosong },
  integrations: new Proxy({}, { get: () => new Proxy({}, { get: () => kosong }) }),
  functions: new Proxy({}, { get: () => kosong }),
  asServiceRole: { entities },
};
export default base44;
