/**
 * cek-boolean.mjs — kolom boolean tidak boleh diisi hasil `&&` / `||`.
 *
 * ── Cacat yang melahirkannya ─────────────────────────────────────────
 *
 * EditProfilePage menghitung `is_complete` begini:
 *
 *     const isComplete = formData.is_complete === true || (
 *       formData.hp_whatsapp && formData.join_date
 *     );
 *
 * Dalam JavaScript `a || b` TIDAK mengembalikan true/false — ia
 * mengembalikan salah satu operandnya. Bila bagian pertama salah dan dua
 * sisanya terisi, nilainya adalah `formData.join_date` sendiri: sebuah teks
 * "2026-05-01", masuk ke kolom yang skemanya `boolean`.
 *
 * Itu tidak akan pernah terlihat sebagai error, karena setiap pembacanya
 * memakai perbandingan KETAT:
 *
 *     IncompleteProfileBanner  profile?.is_complete === true
 *     AppLayout                profile?.is_complete === true
 *     getBestProfile           p.is_complete === true
 *     profilUser               p.is_complete === true
 *     userProfileUpsert        p.is_complete === true
 *
 * "2026-05-01" tidak sama dengan true di satu pun dari lima tempat itu.
 * Orangnya menekan Simpan, melihat tanda centang hijau, dan spanduk "profil
 * belum lengkap" tetap menempel selamanya.
 *
 * ── Aturannya ────────────────────────────────────────────────────────
 *
 * Nilai untuk kolom bertipe `boolean` yang memuat `&&` atau `||` harus
 * dibungkus `Boolean(...)` atau `!!`, ATAU seluruh operandnya sudah
 * berupa perbandingan (`===`, `!==`, `>=`, …) / literal true-false.
 *
 * Variabel yang tidak bisa ditelusuri TIDAK dituduh — dilaporkan terpisah
 * sebagai "tidak terperiksa", supaya keterbatasannya kelihatan alih-alih
 * menyamar jadi jaminan.
 *
 * Jalankan:  node scripts/cek-boolean.mjs
 *            RINCI=1 node scripts/cek-boolean.mjs   (daftar yang tak terperiksa)
 */
import fs from "node:fs";
import path from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();

/* ── Kolom bertipe boolean, per entity ─────────────────────────────── */

const booleanPerEntity = new Map();
const dirEntity = path.join(AKAR, "base44/entities");
for (const nama of fs.readdirSync(dirEntity)) {
  if (!nama.endsWith(".jsonc")) continue;
  const ent = nama.replace(/\.jsonc$/, "");
  let skema;
  try {
    skema = JSON.parse(fs.readFileSync(path.join(dirEntity, nama), "utf8").replace(/^\s*\/\/.*$/gm, ""));
  } catch { continue; }
  const kolom = new Set();
  for (const [k, v] of Object.entries(skema.properties || {})) {
    if (v && v.type === "boolean") kolom.add(k);
  }
  if (kolom.size) booleanPerEntity.set(ent, kolom);
}

/* ── Berkas sumber ─────────────────────────────────────────────────── */

function berkas(dir, keluar = []) {
  for (const n of fs.readdirSync(dir)) {
    if (n === "node_modules" || n === ".git") continue;
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx|ts|tsx)$/.test(n)) keluar.push(p);
  }
  return keluar;
}

/** Isi `{...}` mulai dari posisi kurung bukanya. */
function objekDari(s, i) {
  let dalam = 0;
  for (let j = i; j < Math.min(i + 8000, s.length); j++) {
    if (s[j] === "{") dalam++;
    else if (s[j] === "}") { dalam--; if (dalam === 0) return s.slice(i + 1, j); }
  }
  return null;
}

/** Pasangan `kunci: nilai` pada kedalaman teratas saja. */
function pasangan(isi) {
  const hasil = [];
  let dalam = 0, mulai = 0;
  const potong = [];
  for (let i = 0; i < isi.length; i++) {
    const c = isi[i];
    if ("{[(".includes(c)) dalam++;
    else if ("}])".includes(c)) dalam--;
    else if (c === "," && dalam === 0) { potong.push(isi.slice(mulai, i)); mulai = i + 1; }
  }
  potong.push(isi.slice(mulai));
  for (const bagian of potong) {
    const m = bagian.match(/^\s*["']?([A-Za-z_$][\w$]*)["']?\s*:\s*([\s\S]+)$/);
    if (m) hasil.push([m[1], m[2].trim()]);
  }
  return hasil;
}

/**
 * Apakah ekspresi ini pasti menghasilkan true/false?
 *
 * Yang menentukan adalah operator TERLUAR, bukan operator mana pun yang
 * kebetulan ada di dalam teksnya. `(a.total || 0) + 1 > 1` memuat `||`,
 * tetapi `||`-nya ada di dalam kurung — yang terluar adalah `>`, jadi
 * hasilnya boleh. Penjaga yang hanya mencari "ada || di suatu tempat" akan
 * menuduhnya, dan tuduhan palsu membuat penjaganya dimatikan orang.
 */
const BANDING = /===|!==|==|!=|>=|<=|>|<|\binstanceof\b/;

/** Posisi operator `&&` / `||` / `??` yang berada di LUAR kurung dan teks. */
function pisahLogika(e) {
  const batas = [];
  let dalam = 0;
  for (let i = 0; i < e.length; i++) {
    const c = e[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c; i++;
      while (i < e.length && e[i] !== q) { if (e[i] === "\\") i++; i++; }
      continue;
    }
    if ("([{".includes(c)) dalam++;
    else if (")]}".includes(c)) dalam--;
    else if (dalam === 0 && (e.startsWith("&&", i) || e.startsWith("||", i) || e.startsWith("??", i))) { batas.push(i); i++; }
  }
  if (batas.length === 0) return null;
  const bagian = [];
  let mulai = 0;
  for (const b of batas) { bagian.push(e.slice(mulai, b)); mulai = b + 2; }
  bagian.push(e.slice(mulai));
  return bagian;
}

/** Buang kurung terluar bila ia membungkus seluruh ekspresi. */
function kupasKurung(e) {
  let t = e.trim();
  while (t.startsWith("(") && t.endsWith(")")) {
    let dalam = 0, utuh = true;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === "(") dalam++;
      else if (t[i] === ")") { dalam--; if (dalam === 0 && i < t.length - 1) { utuh = false; break; } }
    }
    if (!utuh) break;
    t = t.slice(1, -1).trim();
  }
  return t;
}

/**
 * Apakah satu OPERAND menghasilkan true/false?
 *
 * `x.require_photo` dianggap boolean karena `require_photo` memang kolom
 * boolean di skema — bukan tebakan, melainkan pembacaan skema yang sama
 * yang dipakai penjaga ini. Sebaliknya `formData.join_date` TIDAK: skema
 * menyebutnya tanggal, dan itulah yang membedakan cacat sungguhan dari
 * `t.require_photo || false` yang baik-baik saja.
 */
function operandBoolean(e, namaBoolean) {
  const t = kupasKurung(e);
  if (t === "") return true;
  if (/^(true|false|undefined|null)$/.test(t)) return true;
  if (/^!/.test(t)) return true;
  if (/^Boolean\s*\(/.test(t)) return true;
  if (/^Array\.isArray\s*\(/.test(t)) return true;
  if (/\.(includes|some|every|has|test|startsWith|endsWith)\s*\(/.test(t)) return true;

  let dalam = 0, luar = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if ("([{".includes(c)) dalam++;
    else if (")]}".includes(c)) dalam--;
    else if (dalam === 0) luar += c;
  }
  if (BANDING.test(luar)) return true;

  // Pembacaan kolom yang skemanya memang boolean.
  const m = t.match(/([A-Za-z_$][\w$]*)\s*$/);
  if (m && namaBoolean.has(m[1])) return true;

  return false;
}

/**
 * Apakah ekspresi ini aman untuk kolom boolean?
 *
 * Penjaga ini HANYA mengurus satu jebakan: `a && b` dan `a || b` tidak
 * mengembalikan true/false, melainkan salah satu operandnya. Ekspresi tanpa
 * `&&` / `||` / `??` di tingkat terluar sengaja dibiarkan — memeriksanya
 * berarti menebak tipe setiap ekspresi JavaScript, dan tebakan yang meleset
 * membuat penjaganya berisik lalu dimatikan orang.
 */
function pastiBoolean(ekspr, namaBoolean) {
  const e = kupasKurung(ekspr);
  if (/^Boolean\s*\(/.test(e) || /^!/.test(e)) return true;
  const bagian = pisahLogika(e);
  if (!bagian) return true; // bukan jebakan yang dijaga di sini
  return bagian.every((b) => operandBoolean(b, namaBoolean));
}

/** Telusuri `const x = ...;` di berkas yang sama. */
function nilaiVariabel(s, nama, sebelum) {
  const re = new RegExp(`(?:const|let|var)\\s+${nama}\\s*=\\s*([\\s\\S]*?);`, "g");
  let terbaik = null, m;
  while ((m = re.exec(s))) {
    if (m.index < sebelum) terbaik = m[1];
  }
  return terbaik;
}

const temuan = [];
const takTerperiksa = [];
let diperiksa = 0;

/*
 * ── Kenapa yang dicari NAMA KOLOMNYA, bukan `entities.X.update(` ─────
 *
 * Versi pertama penjaga ini hanya memeriksa payload yang ditulis langsung
 * ke `entities.X.create({...})`. Dijalankan terhadap cacat yang
 * melahirkannya, ia HIJAU — karena tulisannya lewat dua lompatan:
 *
 *     EditProfilePage  updateMutation.mutate({ ...formData, is_complete })
 *     userProfileUpsert  base44.entities.UserProfile.update(best.id, dataToSave)
 *
 * Nama entity-nya ada di berkas lain, dan payloadnya sudah jadi variabel.
 * Penjaga yang tidak menangkap cacat yang melahirkannya bukan penjaga.
 *
 * Jadi yang dipakai adalah NAMA kolomnya. Nama-nama boolean di skema ini
 * khas (`is_complete`, `sudah_ditimbang`, `terkunci_bahan`, `label_dicetak`),
 * dan satu nama yang di satu entity boolean tidak pernah bertipe lain di
 * entity mana pun — itu diperiksa di bawah, dan nama yang bertabrakan tipe
 * dikeluarkan dari daftar.
 */
const tipePerNama = new Map();
for (const nama of fs.readdirSync(dirEntity)) {
  if (!nama.endsWith(".jsonc")) continue;
  let skema;
  try {
    skema = JSON.parse(fs.readFileSync(path.join(dirEntity, nama), "utf8").replace(/^\s*\/\/.*$/gm, ""));
  } catch { continue; }
  for (const [k, v] of Object.entries(skema.properties || {})) {
    if (!v || !v.type) continue;
    if (!tipePerNama.has(k)) tipePerNama.set(k, new Set());
    tipePerNama.get(k).add(v.type);
  }
}
const NAMA_BOOLEAN = new Set(
  [...tipePerNama.entries()]
    .filter(([, tipe]) => tipe.size === 1 && tipe.has("boolean"))
    .map(([k]) => k),
);

for (const p of [...berkas(path.join(AKAR, "src")), ...berkas(path.join(AKAR, "base44"))]) {
  const rel = path.relative(AKAR, p);
  const s = kupasKomentar(fs.readFileSync(p, "utf8"));

  for (const m of s.matchAll(/(?:^|[{,(])\s*(\w+)\s*:/g)) {
    const kunci = m[1];
    if (!NAMA_BOOLEAN.has(kunci)) continue;

    // Ambil nilainya: sampai koma atau kurung tutup pada kedalaman 0.
    let i = m.index + m[0].length;
    let dalam = 0, nilai = "";
    for (; i < s.length; i++) {
      const c = s[i];
      if (c === '"' || c === "'" || c === "`") {
        const q = c; nilai += c; i++;
        while (i < s.length && s[i] !== q) { if (s[i] === "\\") { nilai += s[i]; i++; } nilai += s[i]; i++; }
        nilai += s[i];
        continue;
      }
      if ("([{".includes(c)) dalam++;
      else if (")]}".includes(c)) { if (dalam === 0) break; dalam--; }
      else if (c === "," && dalam === 0) break;
      else if (c === "\n" && dalam === 0 && nilai.trim() && !/[?:+\-*/&|=<>,.]$/.test(nilai.trim())) break;
      nilai += c;
    }
    nilai = nilai.trim();
    if (!nilai) continue;
    diperiksa++;

    /*
     * Nama variabel ditelusuri LEBIH DULU.
     *
     * `is_complete: isComplete` tidak memuat `&&` apa pun, jadi memeriksanya
     * apa adanya membuat penjaga ini menjawab "bukan urusan saya" dan lewat —
     * persis cacat yang melahirkannya, yang memang berbentuk begitu. Yang
     * perlu diperiksa adalah isi variabelnya, bukan namanya.
     */
    let ekspr = nilai;
    if (/^[A-Za-z_$][\w$]*$/.test(nilai) && !/^(true|false|undefined|null)$/.test(nilai)) {
      const dari = nilaiVariabel(s, nilai, m.index);
      if (dari === null) {
        takTerperiksa.push(`${rel}  ${kunci} ← ${nilai}`);
        continue;
      }
      ekspr = dari;
    }
    if (pastiBoolean(ekspr, NAMA_BOOLEAN)) continue;

    const baris = s.slice(0, m.index).split("\n").length;
    temuan.push(
      `${rel}:${baris}  ${kunci} diisi nilai yang belum tentu boolean — ` +
      `operator terluarnya && / || mengembalikan salah satu operandnya:\n` +
      `      ${ekspr.replace(/\s+/g, " ").slice(0, 160)}`,
    );
  }
}

if (temuan.length) {
  console.error(
    `${temuan.length} kolom boolean diisi nilai yang belum tentu boolean.\n\n` +
    `Pembacanya memakai \`=== true\`, jadi nilai selain true/false akan ditolak\n` +
    `diam-diam. Bungkus dengan Boolean(...) atau !!.\n\n` +
    temuan.map((t) => "  " + t).join("\n") + "\n",
  );
  process.exit(1);
}
if (process.env.RINCI) console.log(takTerperiksa.slice(0, 200).join("\n"));
const catatan = takTerperiksa.length
  ? `; ${takTerperiksa.length} nilai dari variabel yang tidak ketemu deklarasinya — TIDAK diperiksa`
  : "";
console.log(`Kolom boolean diisi nilai boolean (${diperiksa} penulisan pada ${booleanPerEntity.size} entity${catatan}).`);
process.exit(0);
