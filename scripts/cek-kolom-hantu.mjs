/**
 * cek-kolom-hantu.mjs — cari kolom yang DITULIS kode tapi tidak ada di skema
 * entity, dan karena itu dibuang diam-diam oleh Base44.
 *
 * Ini kelas bug yang paling sunyi di aplikasi ini: tidak ada error, tidak ada
 * peringatan build, tidak ada apa pun di layar. Barisnya tetap tersimpan,
 * hanya kolom itu yang hilang. Yang sudah ditemukan skrip ini:
 *
 *   ShoppingList.item_name       — kolom nama kedua yang isinya sudah lama
 *                                  tidak sinkron dengan item_sku di baris yang
 *                                  sama; sempat membuat saya menulis ulang 6
 *                                  baris belanja ke barang yang salah.
 *   ActivityLog.changes          — snapshot sebelum/sesudah pada catatan
 *                                  kematian kura, tidak pernah tersimpan.
 *   DiagnosisProtocol.images     — seluruh galeri foto penyakit: tombol
 *                                  "Setujui & Masukkan ke Panduan" tidak
 *                                  menyimpan apa pun, dan pemeriksa duplikat
 *                                  selalu membaca daftar kosong.
 *   UserProfile.tutorial_completed — penanda tur selesai yang kedua.
 *   CompanySettings.notes        — hasil deteksi duplikat stok.
 *
 * Pembaca skemanya ikut membaca satu tingkat objek di dalam array (mis.
 * items[].jumlah_pesan pada PembelianBarang), karena kode memang menulis
 * kolom-kolom itu sebagai kunci objek biasa. Sebelumnya semua nama itu
 * dilaporkan sebagai hantu dan harus dimaafkan satu per satu — daftar
 * pemaaf yang panjang membuat penjaga ini gampang dianggap berisik lalu
 * diabaikan, dan hantu yang sungguhan ikut lolos.
 *
 * KETERBATASAN: pengenalannya masih per NAMA, bukan per jalur. Kolom yang
 * hanya sah di dalam array tetap dianggap sah bila ditulis di tingkat atas
 * entity yang sama.
 *
 * ── TITIK BUTA YANG DITUTUP 13-09-2026 ─────────────────────────────
 *
 * Versi sebelumnya HANYA memeriksa objek yang ditulis langsung di dalam
 * tanda kurung create()/update(). Pemanggilan yang mengirim VARIABEL —
 * `Supplier.create(form)`, `Kasbon.create(kasbonData)` — dilewati tanpa
 * suara, dan itu 102 dari 488 pemanggilan (21%).
 *
 * Justru di situlah hantu paling sering bersembunyi, karena variabel itu
 * biasanya state formulir: satu objek besar yang kolomnya ditulis sekali di
 * useState lalu dikirim bulat-bulat. SupplierPage menyimpan `phone` dan
 * `whatsapp`; skema Supplier hanya punya `hp_whatsapp`. Nomor yang diketik
 * dibuang diam-diam, dan kartu supplier membaca `s.phone` yang juga tidak
 * ada — jadi nomornya tidak pernah tampil sekali pun.
 *
 * Sekarang, bila argumennya variabel, skrip mencari deklarasi objeknya di
 * berkas yang sama (`const x = {…}` atau `useState({…})`) dan memeriksa
 * kunci-kuncinya. Variabel yang deklarasinya tidak ketemu tetap dilewati —
 * dilaporkan di akhir sebagai "tidak terperiksa", supaya keterbatasannya
 * terlihat dan bukan disangka sudah aman.
 *
 * Jalankan:  node scripts/cek-kolom-hantu.mjs
 */
import fs from "fs";
import path from "path";

const BAWAAN = ["id", "created_date", "updated_date", "created_by", "created_by_id", "updated_by", "is_sample"];

// Nama kolom yang sah tapi bersarang di dalam array — jangan dilaporkan.
const DIMAAFKAN = new Set([
  "ActivityLog.field", "ActivityLog.label", "ActivityLog.old_value", "ActivityLog.new_value",
  "User.full_name",
]);

const skema = {};
for (const fn of fs.readdirSync("base44/entities")) {
  if (!fn.endsWith(".jsonc")) continue;
  const raw = fs.readFileSync(path.join("base44/entities", fn), "utf8").replace(/^\s*\/\/.*$/gm, "");
  let j;
  try { j = JSON.parse(raw); } catch { continue; }
  const props = j.properties || {};
  const nama = [...Object.keys(props), ...BAWAAN];
  // Satu tingkat ke dalam array: items[].nama_barang ditulis kode sebagai
  // kunci objek biasa, jadi namanya harus dihitung sah.
  for (const p of Object.values(props)) {
    const dalam = p?.items?.properties;
    if (dalam) nama.push(...Object.keys(dalam));
  }
  skema[fn.slice(0, -6)] = new Set(nama);
}

function berkas(dir, keluar = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", "scripts"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx|ts)$/.test(e.name)) keluar.push(p);
  }
  return keluar;
}

/** Ambil objek literal yang benar-benar jadi argumen create()/update(). */
function blokArgumen(s, i) {
  let kurung = 1, kurawal = 0, mulai = null;
  for (let j = i; j < Math.min(i + 4000, s.length); j++) {
    const c = s[j];
    if (c === "(") kurung++;
    else if (c === ")") { kurung--; if (kurung === 0) return mulai === null ? null : s.slice(mulai, j); }
    else if (c === "{") { if (kurawal === 0 && mulai === null) mulai = j; kurawal++; }
    else if (c === "}") kurawal--;
    else if (c === ";" && kurawal === 0) return null;
  }
  return null;
}

/** Ambil isi objek literal yang seimbang mulai dari '{' di indeks i. */
function objekDari(s, i) {
  let dalam = 0;
  for (let j = i; j < Math.min(i + 4000, s.length); j++) {
    if (s[j] === "{") dalam++;
    else if (s[j] === "}") { dalam--; if (dalam === 0) return s.slice(i, j + 1); }
  }
  return null;
}

/**
 * Cari deklarasi objek sebuah variabel, DI ATAS titik pemanggilan.
 * Menangani dua bentuk yang benar-benar dipakai di aplikasi ini:
 *   const x = { … }
 *   const [x, setX] = useState(supplier || { … })   ← state formulir
 *
 * Yang diambil adalah deklarasi TERDEKAT sebelum pemanggilan, bukan yang
 * pertama di berkas. Itu penting: satu berkas sering memuat beberapa
 * komponen yang masing-masing punya `form` sendiri. HRPage punya dua —
 * satu menulis WarningLetter, satu menulis TrainingLog. Mengambil yang
 * pertama membuat skrip ini melaporkan enam kolom WarningLetter sebagai
 * hantu milik TrainingLog: enam temuan yang semuanya palsu.
 *
 * Penjaga yang berisik lebih buruk daripada tidak ada penjaga — orang
 * belajar mengabaikannya, lalu hantu yang sungguhan ikut terlewat.
 */
function objekVariabel(s, nama, sebelum) {
  const pola = [
    new RegExp(`const\\s+${nama}\\s*=\\s*\\{`, "g"),
    new RegExp(`const\\s+\\[\\s*${nama}\\s*,[^\\]]*\\]\\s*=\\s*useState\\([^{]{0,60}\\{`, "g"),
    new RegExp(`let\\s+${nama}\\s*=\\s*\\{`, "g"),
  ];
  let terbaik = -1;
  for (const re of pola) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) {
      if (m.index < sebelum && m.index > terbaik) terbaik = m.index;
    }
  }
  if (terbaik === -1) return null;
  const buka = s.indexOf("{", terbaik);
  return buka === -1 ? null : objekDari(s, buka);
}

const hantu = new Map();
const takTerperiksa = new Map();
for (const p of berkas(".")) {
  const s = fs.readFileSync(p, "utf8");
  for (const m of s.matchAll(/entities\.(\w+)\.(create|update|bulkCreate)\s*\(/g)) {
    const ent = m[1];
    if (!skema[ent]) continue;
    let blok = blokArgumen(s, m.index + m[0].length);

    // Argumennya variabel, bukan objek tertulis: telusuri deklarasinya.
    if (!blok) {
      const ekor = s.slice(m.index + m[0].length, m.index + m[0].length + 160);
      const argv = m[2] === "update"
        ? /^[^,]*,\s*([A-Za-z_$][\w$]*)\s*\)/.exec(ekor)
        : /^\s*([A-Za-z_$][\w$]*)\s*\)/.exec(ekor);
      if (argv) {
        blok = objekVariabel(s, argv[1], m.index);
        if (!blok) {
          const kunci = `${ent} ← ${argv[1]}`;
          if (!takTerperiksa.has(kunci)) takTerperiksa.set(kunci, new Set());
          takTerperiksa.get(kunci).add(p);
        }
      }
    }
    if (!blok) continue;

    for (const km of blok.matchAll(/(?:^|[{,])\s*(\w+)\s*:/g)) {
      const k = km[1];
      const kunci = `${ent}.${k}`;
      if (skema[ent].has(k) || k === k.toUpperCase() || DIMAAFKAN.has(kunci)) continue;
      if (!hantu.has(kunci)) hantu.set(kunci, new Set());
      hantu.get(kunci).add(p);
    }
  }
}

if (takTerperiksa.size > 0) {
  console.log(
    `Catatan: ${takTerperiksa.size} pemanggilan mengirim variabel yang deklarasinya\n` +
    `tidak ditemukan di berkas yang sama — kolomnya TIDAK diperiksa:`,
  );
  for (const [k, v] of [...takTerperiksa].sort()) {
    console.log(`  ${k}  (${[...v][0]}${v.size > 1 ? ` +${v.size - 1}` : ""})`);
  }
  console.log("");
}

if (hantu.size === 0) {
  console.log(`Tidak ada kolom hantu (${Object.keys(skema).length} entity diperiksa).`);
  process.exit(0);
}
console.error("KOLOM DITULIS TAPI TIDAK ADA DI SKEMA — datanya dibuang diam-diam:\n");
for (const [k, v] of [...hantu].sort()) console.error(`  ${k}\n      ${[...v].sort().join("\n      ")}`);
console.error("\nPeriksa dulu apakah kolom ini bersarang di dalam array yang sah sebelum memperbaiki.");
process.exit(1);
