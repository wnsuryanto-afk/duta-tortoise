import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { normalizePhone } from "../../shared/whatsapp.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";

/**
 * bacaLeadSupplier — baca tangkapan layar postingan Facebook, keluarkan calon
 * pemasok beserta nomor WhatsApp-nya.
 *
 * ── Kenapa nomornya dinormalkan DI SINI, bukan di layar ──
 *
 * Nomor di postingan Facebook ditulis dengan segala cara: "0812-3456-7890",
 * "+62 812 3456 7890", "62812.3456.7890", "wa 081234567890", bahkan
 * "0812 3456 789O" dengan huruf O. Tombol WhatsApp hanya bisa dibuka kalau
 * nomornya berbentuk 62xxxxxxxxx tanpa tanda baca.
 *
 * Kalau normalisasinya ditaruh di layar, tiap layar yang menampilkan lead
 * harus mengulang aturan yang sama — dan di aplikasi ini hal itu SUDAH
 * terjadi pada nomor pembeli: lima tempat menulis
 * `.replace(/\D/g,"").replace(/^0/,"62")` sendiri-sendiri, dan semuanya gagal
 * pada nomor yang diawali "8" tanpa nol. Jadi nomornya dibereskan sekali, di
 * sini, memakai normalizePhone yang sama dengan pengirim WhatsApp.
 *
 * ── Kenapa harga disimpan sebagai TEKS ──
 *
 * Postingan menulis harga sebagai "15rb/ikat", "nego", "mulai 8.000", atau
 * "harga grosir chat aja". Memaksanya jadi angka berarti menebak, dan tebakan
 * harga adalah tebakan yang paling mahal. Angka yang bisa dibandingkan
 * diisi belakangan oleh orangnya di kolom `penawaran`, setelah benar-benar
 * ditanyakan.
 */

const SKEMA = {
  type: "object",
  properties: {
    leads: {
      type: "array",
      description: "Satu entri per calon pemasok. Satu tangkapan layar bisa memuat lebih dari satu postingan.",
      items: {
        type: "object",
        properties: {
          nama: { type: "string", description: "Nama orang atau toko yang memposting" },
          hp_mentah: { type: "string", description: "Nomor apa adanya seperti tertulis, termasuk tanda baca. Kosongkan bila tidak ada." },
          kota: { type: "string", description: "Kota/kecamatan bila disebut" },
          yang_dijual: { type: "string", description: "Barang yang ditawarkan, ringkas" },
          harga_disebut: { type: "string", description: "Harga apa adanya sebagai teks, mis. '15rb/ikat' atau 'nego'" },
          kategori: {
            type: "string",
            description: "Salah satu: sayur_pakan, obat_vitamin, alat_kandang, kura_telur, lainnya",
          },
          sumber: { type: "string", description: "Nama grup/halaman Facebook bila terbaca" },
          tanggal_postingan: { type: "string", description: "YYYY-MM-DD bila terbaca, selain itu kosong" },
          catatan: { type: "string", description: "Keterangan lain yang berguna: minimal order, cara kirim, jadwal panen" },
        },
      },
    },
  },
};

const KATEGORI_SAH = ["sayur_pakan", "obat_vitamin", "alat_kandang", "kura_telur", "lainnya"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUrls: string[] = Array.isArray(body.file_urls) ? body.file_urls.slice(0, 8) : [];
    if (fileUrls.length === 0) {
      return Response.json({ error: "Tidak ada tangkapan layar yang dikirim." }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    const prompt = [
      "Anda membaca tangkapan layar postingan grup jual-beli Facebook berbahasa Indonesia.",
      "Peternakan ini mencari PEMASOK — terutama sayur dan pakan segar, tapi juga obat/vitamin,",
      "alat kandang, dan kura/telur.",
      "",
      fileUrls.length > 1
        ? "Gambar-gambar ini BISA berisi postingan yang berbeda. Kembalikan satu entri per postingan, jangan digabung."
        : "Satu gambar bisa memuat lebih dari satu postingan. Kembalikan satu entri per postingan.",
      "",
      "ATURAN:",
      "  • Salin nomor telepon APA ADANYA ke hp_mentah, lengkap dengan tanda baca dan spasi.",
      "    JANGAN merapikan, JANGAN menambah kode negara. Perapian dilakukan di luar Anda.",
      "  • Bila di gambar tidak ada nomor sama sekali, kosongkan hp_mentah. Jangan mengarang.",
      "  • harga_disebut diisi TEKS apa adanya ('15rb/ikat', 'nego', 'mulai 8.000'), bukan angka.",
      "  • kategori diisi salah satu dari: " + KATEGORI_SAH.join(", ") + ".",
      "    Pilih 'lainnya' bila tidak jelas — menebak kategori membuat lead hilang dari penyaring.",
      "  • Yang tidak terbaca dikosongkan. Mengaku tidak tahu lebih berguna daripada menebak:",
      "    nomor yang salah ketik membuat orang menghubungi orang lain, dan itu baru ketahuan",
      "    setelah pesannya terkirim.",
    ].join("\n");

    const hasil = await svc.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrls,
      response_json_schema: SKEMA,
    });

    // Lead yang sudah ada, untuk menandai nomor kembar sebelum disimpan.
    let nomorAda = new Set<string>();
    try {
      const lama = await svc.entities.SupplierLead.filter({}, "-created_date", BATAS_AMBIL);
      nomorAda = new Set((lama || []).map((l: any) => String(l.hp_whatsapp || "")).filter(Boolean));
    } catch {
      // Tanpa daftar lama, lead tetap boleh dibaca — hanya tanda kembarnya hilang.
    }

    const leads = (hasil?.leads || []).map((l: any) => {
      const mentah = String(l.hp_mentah || "").trim();
      const rapi = normalizePhone(mentah);
      const kategori = KATEGORI_SAH.includes(String(l.kategori)) ? l.kategori : "sayur_pakan";
      return {
        nama: String(l.nama || "").trim(),
        hp_whatsapp: rapi,
        hp_mentah: mentah,
        // Dibedakan supaya layar bisa berkata "nomornya terbaca tapi tidak sah"
        // alih-alih diam-diam menampilkan kolom kosong.
        nomor_terbaca: mentah.length > 0,
        nomor_sah: rapi.length > 0,
        sudah_ada: rapi.length > 0 && nomorAda.has(rapi),
        kota: String(l.kota || "").trim(),
        kategori,
        yang_dijual: String(l.yang_dijual || "").trim(),
        harga_disebut: String(l.harga_disebut || "").trim(),
        sumber: String(l.sumber || "").trim(),
        tanggal_postingan: /^\d{4}-\d{2}-\d{2}$/.test(String(l.tanggal_postingan || ""))
          ? l.tanggal_postingan
          : "",
        catatan: String(l.catatan || "").trim(),
      };
    }).filter((l: any) => l.nama || l.nomor_terbaca);

    return Response.json({
      leads,
      jumlah_gambar: fileUrls.length,
      tanpa_nomor: leads.filter((l: any) => !l.nomor_sah).length,
    });
  } catch (e) {
    return Response.json(
      { error: (e as Error)?.message || "Gagal membaca tangkapan layar." },
      { status: 500 },
    );
  }
});
