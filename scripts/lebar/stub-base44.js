// Pengganti @/api/base44Client untuk pengujian tata letak: tidak menyentuh
// jaringan sama sekali. Setiap entity menjawab daftar kosong.
export const BATAS_AMBIL = 2000;
const kosong = () => Promise.resolve([]);
const entity = new Proxy({}, { get: (_, k) =>
  k === "schema" ? () => Promise.resolve({}) : kosong });
const entities = new Proxy({}, { get: () => entity });
export const base44 = {
  entities,
  auth: { me: () => Promise.resolve(null), logout: kosong },
  integrations: new Proxy({}, { get: () => new Proxy({}, { get: () => kosong }) }),
  functions: new Proxy({}, { get: () => kosong }),
  asServiceRole: { entities },
};
export default base44;
