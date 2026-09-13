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
      "",
      "  • KOSONG BERARTI KOSONG. Bila sesuatu tidak terbaca, isi dengan STRING KOSONG \"\".",
      "    JANGAN menulis kata 'tidak terbaca', 'tidak disebutkan', 'tidak ada', '-', atau 'N/A'.",
      "    Kalimat semacam itu tersimpan sebagai isi kolom dan terbaca seolah-olah data,",
      "    lalu muncul di layar sebagai nama pemasok bernama 'Tidak terbaca'.",
      "",
      "  • kota = KOTA/DAERAH ASAL PENJUAL, satu nama tempat saja.",
      "    Daftar kota tujuan kirim ('siap kirim Kediri, Nganjuk, Madiun, …') BUKAN kota penjual —",
      "    itu area jangkauan, taruh di catatan. Nama patokan seperti 'GOR Begadung' boleh",
      "    dipakai hanya bila memang tidak ada nama kota.",
      "",
      "  • SATU POSTINGAN = SATU LEAD. Nama grup Facebook di bagian atas tangkapan layar",
      "    BUKAN penjual. Jangan membuat lead terpisah untuk nama grup; itu milik kolom sumber.",
      "",
      "  • Mengaku tidak tahu lebih berguna daripada menebak: nomor yang salah ketik membuat",
      "    orang menghubungi orang lain, dan itu baru ketahuan setelah pesannya terkirim.",
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

    // Kalimat pengganti yang kadang tetap ditulis AI meski sudah dilarang di
    // prompt. Dibersihkan di sini juga, karena satu lapis larangan saja
    // ternyata tidak cukup: percobaan pertama menghasilkan pemasok bernama
    // "Tidak terbaca" dan harga "tidak disebutkan" yang tersimpan apa adanya.
    const KOSONG = /^(tidak\s+(terbaca|disebutkan|ada|diketahui)|n\/?a|-+|\?+|null|none)$/i;
    const bersih = (v: any) => {
      const t = String(v || "").trim();
      return KOSONG.test(t) ? "" : t;
    };

    const leads = (hasil?.leads || []).map((l: any) => {
      const mentah = String(l.hp_mentah || "").trim();
      const rapi = normalizePhone(mentah);
      const kategori = KATEGORI_SAH.includes(String(l.kategori)) ? l.kategori : "sayur_pakan";
      return {
        nama: bersih(l.nama),
        hp_whatsapp: rapi,
        hp_mentah: mentah,
        // Dibedakan supaya layar bisa berkata "nomornya terbaca tapi tidak sah"
        // alih-alih diam-diam menampilkan kolom kosong.
        nomor_terbaca: mentah.length > 0,
        nomor_sah: rapi.length > 0,
        sudah_ada: rapi.length > 0 && nomorAda.has(rapi),
        kota: bersih(l.kota),
        kategori,
        yang_dijual: bersih(l.yang_dijual),
        harga_disebut: bersih(l.harga_disebut),
        sumber: bersih(l.sumber),
        tanggal_postingan: /^\d{4}-\d{2}-\d{2}$/.test(String(l.tanggal_postingan || ""))
          ? l.tanggal_postingan
          : "",
        catatan: bersih(l.catatan),
      };
    }).filter((l: any) => l.nama || l.nomor_terbaca);

    // Kembar DI DALAM satu pembacaan.
    //
    // Pemeriksaan `sudah_ada` di atas hanya membandingkan dengan lead yang
    // SUDAH tersimpan. Percobaan pertama menghasilkan dua lead dengan nomor
    // yang sama persis dari satu postingan — satu atas nama penjualnya, satu
    // lagi atas nama grup Facebook-nya. Keduanya lolos karena sama-sama baru.
    //
    // Yang dipertahankan adalah yang PALING LENGKAP, bukan yang pertama:
    // entri atas nama grup biasanya lebih miskin isinya.
    const terpakai = new Map<string, any>();
    const tunggal: any[] = [];
    const bobot = (l: any) =>
      [l.nama, l.kota, l.yang_dijual, l.harga_disebut, l.catatan].filter(Boolean).length;
    for (const l of leads) {
      if (!l.nomor_sah) { tunggal.push(l); continue; }
      const lama = terpakai.get(l.hp_whatsapp);
      if (!lama) {
        terpakai.set(l.hp_whatsapp, l);
        tunggal.push(l);
      } else if (bobot(l) > bobot(lama)) {
        Object.assign(lama, l);
      }
    }

    return Response.json({
      leads: tunggal,
      jumlah_gambar: fileUrls.length,
      tanpa_nomor: tunggal.filter((l: any) => !l.nomor_sah).length,
      kembar_dibuang: leads.length - tunggal.length,
    });
  } catch (e) {
    return Response.json(
      { error: (e as Error)?.message || "Gagal membaca tangkapan layar." },
      { status: 500 },
    );
  }
});
