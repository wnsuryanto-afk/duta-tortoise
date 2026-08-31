/**
 * cek-unggah.mjs — cari UploadFile yang dikirimi Blob, bukan File.
 *
 * Base44 menyusun berkas unggahan lewat FormData. Blob hasil canvas tidak
 * punya nama berkas, dan FormData menyerahkannya sebagai objek kosong —
 * server menolak dengan:
 *
 *   Invalid payload: 'file' field is an empty object.
 *   If you're using files, use Content-Type: multipart/form-data in headers
 *
 * Kenapa ini butuh penjaga sendiri: dua dari tiga pemakainya
 * (InvoiceVisionUpload dan ExpiryVisionScan) membungkus unggahannya dengan
 * `catch { /* opsional *\/ }`. Jadi tidak ada error di layar, tidak ada
 * apa pun di log — lampiran fotonya hanya tidak pernah ada. Baru ketahuan
 * saat layar ketiga (TerimaDariScreenshot) tidak menelan errornya dan
 * lima screenshot Shopee sungguhan gagal diunggah.
 *
 * Aturannya satu: yang masuk ke UploadFile harus punya nama berkas.
 * fileToCompressedBase64 mengembalikan `.file` untuk itu; `.blob` hanya
 * untuk dipakai di dalam browser.
 *
 * Jalankan:  node scripts/cek-unggah.mjs
 */
import fs from "fs";
import path from "path";

function berkas(dir, keluar = []) {
  for (const nama of fs.readdirSync(dir)) {
    const p = path.join(dir, nama);
    if (fs.statSync(p).isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx|ts|tsx)$/.test(nama)) keluar.push(p);
  }
  return keluar;
}

const temuan = [];
for (const p of berkas("src")) {
  const isi = fs.readFileSync(p, "utf8");
  isi.split("\n").forEach((baris, i) => {
    // UploadFile({ file: <apa pun>.blob })
    if (/UploadFile\s*\(\s*\{[^}]*file\s*:\s*[A-Za-z_$][\w$]*(\?)?\.blob\b/.test(baris)) {
      temuan.push(`${p}:${i + 1}  ${baris.trim().slice(0, 120)}`);
    }
  });
}

if (temuan.length === 0) {
  console.log("Tidak ada UploadFile yang dikirimi blob.");
  process.exit(0);
}

console.log("UPLOADFILE DIKIRIMI BLOB — akan ditolak server sebagai objek kosong:\n");
for (const t of temuan) console.log("  " + t);
console.log("\nPakai berkas ber-nama (mis. img.file dari fileToCompressedBase64), bukan .blob.");
process.exit(1);
