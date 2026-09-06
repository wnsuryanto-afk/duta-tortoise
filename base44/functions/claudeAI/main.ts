import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

async function callClaude(apiKey, systemPrompt, userMessage, images = []) {
  // Kompatibel dengan kode lama: string base64 tunggal → array berisi satu elemen.
  let imgs = Array.isArray(images) ? images : (images ? [images] : []);
  imgs = imgs.filter(Boolean).slice(0, 5);

  const content = [];
  for (const img of imgs) {
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img } });
  }
  let finalMsg = userMessage;
  if (imgs.length > 1) {
    finalMsg = `CATATAN PENTING: Gambar-gambar berikut adalah beberapa sudut atau beberapa halaman dari objek yang SAMA, bukan objek yang berbeda. Gabungkan seluruh informasinya menjadi SATU kesimpulan, jangan menganalisis satu per satu.\n\n${userMessage}`;
  }
  content.push({ type: "text", text: finalMsg });

  const messages = [{ role: "user", content }];
  const body = { model: CLAUDE_MODEL, max_tokens: 2048, system: systemPrompt, messages };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Claude API error");
  return data.content[0]?.text || "";
}

function normalizeImages(payload) {
  const arr = Array.isArray(payload?.images) ? payload.images : (payload?.imageBase64 ? [payload.imageBase64] : []);
  return arr.filter(Boolean);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const apiKey = Deno.env.get("CLAUDE_API_KEY");
    if (!apiKey) return Response.json({ error: "CLAUDE_API_KEY not set" }, { status: 500 });

    const { mode, payload } = await req.json();

    // ── 1. HEALTH CONSULTANT ──────────────────────────────────────────────────
    if (mode === "health_consult") {
      const { symptoms, tortoiseName } = payload;
      const allImgs = normalizeImages(payload);
      const imgs = allImgs.slice(0, 5);
      const truncated = allImgs.length - imgs.length;
      const systemPrompt = `Kamu adalah konsultan kesehatan reptil khususnya kura-kura darat sulcata dan kura-kura darat lainnya. Analisis gejala yang diberikan, berikan kemungkinan penyebab, tingkat keparahan (ringan/sedang/berat), dan rekomendasi penanganan awal step by step. Bila disertakan beberapa gambar, gambar-gambar tersebut adalah beberapa sudut dari kura-kura yang SAMA (mis. tampak atas, tampak bawah, dan bagian yang bermasalah dari dekat) — gunakan seluruhnya untuk SATU penilaian. Gunakan bahasa Indonesia yang mudah dipahami peternak awam. Selalu akhiri dengan saran konsultasi dokter hewan untuk kasus sedang dan berat. Format respons dalam JSON dengan field: severity (ringan/sedang/berat), causes (array string), treatment_steps (array string), vet_advice (string), summary (string ringkasan 1 kalimat).`;
      const userMsg = `Kura-kura: ${tortoiseName || "tidak diketahui"}\nGejala: ${symptoms}`;
      const raw = await callClaude(apiKey, systemPrompt, userMsg, imgs);
      let result;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { severity: "sedang", summary: raw, causes: [], treatment_steps: [], vet_advice: "" };
      } catch {
        result = { severity: "sedang", summary: raw, causes: [], treatment_steps: [], vet_advice: "" };
      }
      return Response.json({ result, catatan_gambar: truncated > 0 ? `${truncated} foto diabaikan (maksimal 5 foto per analisis).` : undefined });
    }

    // ── 2. SALES CONTENT GENERATOR ────────────────────────────────────────────
    if (mode === "sales_content") {
      const { tortoise, platforms } = payload;
      const tortoiseInfo = `Nama: ${tortoise.name}, Morph: ${tortoise.morph || "-"}, Shell: ${tortoise.shell_type || "-"}, Berat: ${tortoise.weight_grams || "-"}g, Panjang: ${tortoise.shell_length_cm || "-"}cm, Status: ${tortoise.status || "-"}, Tags: ${(tortoise.tags || []).join(", ") || "-"}`;

      const prompts = {
        Instagram: `Buat caption penjualan kura-kura sulcata yang estetik, menarik, dengan 15-20 hashtag relevan reptil Indonesia. Gaya: fun tapi informatif.`,
        TikTok: `Buat script caption TikTok singkat dan catchy untuk video kura-kura sulcata. Maksimal 150 kata. Sertakan hook di kalimat pertama.`,
        Tokopedia: `Buat deskripsi produk marketplace Tokopedia yang lengkap, informatif, dan SEO-friendly untuk kura-kura sulcata. Sertakan spesifikasi lengkap, keunggulan, dan cara perawatan singkat.`,
        Shopee: `Buat deskripsi produk marketplace Shopee yang lengkap, informatif, dan SEO-friendly untuk kura-kura sulcata. Sertakan spesifikasi lengkap, keunggulan, dan cara perawatan singkat.`,
        WhatsApp: `Buat pesan penawaran WhatsApp yang singkat, personal, dan persuasif. Maksimal 100 kata.`,
      };

      const results = {};
      await Promise.all(platforms.map(async (platform) => {
        const sys = prompts[platform] || prompts.WhatsApp;
        results[platform] = await callClaude(apiKey, sys, `Data kura-kura: ${tortoiseInfo}`);
      }));
      return Response.json({ results });
    }

    // ── 3. INTERNAL CHATBOT ──────────────────────────────────────────────────
    if (mode === "chat") {
      const { message, context } = payload;
      const systemPrompt = `Kamu adalah asisten internal peternakan kura-kura darat Duta Tortoise. Kamu membantu owner, admin, dan manajer menjawab pertanyaan operasional berdasarkan data yang diberikan. Jawab dalam bahasa Indonesia, singkat dan langsung ke poin. Jika data tidak tersedia, katakan dengan jujur.`;
      const fullMsg = context ? `[DATA KONTEKS]\n${context}\n\n[PERTANYAAN]\n${message}` : message;
      const answer = await callClaude(apiKey, systemPrompt, fullMsg);
      return Response.json({ answer });
    }

    // ── 4. WA OFFER GENERATOR ────────────────────────────────────────────────
    if (mode === "wa_offer") {
      const { buyer, recentTortoises } = payload;
      const sys = `Buat pesan penawaran WhatsApp yang singkat, personal, dan persuasif untuk pembeli kura-kura. Maksimal 100 kata. Bahasa Indonesia casual dan ramah.`;
      const userMsg = `Pembeli: ${buyer.name}, Kota: ${buyer.city || "-"}, Morph favorit: ${buyer.favorite_morph || "-"}, Budget: ${buyer.budget_range || "-"}, Terakhir beli: ${buyer.last_purchase_date || "-"}. Stok tersedia: ${recentTortoises || "-"}`;
      const answer = await callClaude(apiKey, sys, userMsg);
      return Response.json({ answer });
    }

    // ── 5. BACA INVOICE (AI Vision) ───────────────────────────────────────────
    if (mode === "baca_invoice") {
      const allImgs = normalizeImages(payload);
      const imgs = allImgs.slice(0, 5);
      const truncated = allImgs.length - imgs.length;
      const systemPrompt = `Kamu pembaca invoice/nota belanja. Baca gambar screenshot invoice marketplace (Tokopedia, Shopee, Lazada) atau nota toko. Gambar bisa berupa beberapa halaman atau beberapa tangkapan layar dari SATU invoice yang sama (mis. bagian atas dan bagian bawah yang terpotong saat di-scroll) — gabungkan menjadi SATU hasil JSON, jangan hasilkan beberapa invoice terpisah. Bila ternyata gambar berisi invoice yang berbeda-beda, kembalikan array berisi beberapa invoice: [{"toko":...,"tanggal":...,...}]. Kembalikan JSON MURNI tanpa penjelasan apa pun dan tanpa pagar kode markdown. Struktur satu invoice: {"toko":"nama penjual","tanggal":"YYYY-MM-DD","total":angka,"ongkir":angka,"diskon":angka,"items":[{"nama":"nama barang","qty":angka,"satuan":"kg/gram/pcs/botol/strip","harga_satuan":angka,"subtotal":angka}]}. Semua harga dalam Rupiah sebagai angka bulat tanpa titis atau koma. Bila suatu nilai tidak terbaca, isi null, JANGAN mengarang. Bila gambar bukan invoice, kembalikan {"error":"bukan invoice"}.`;
      const raw = await callClaude(apiKey, systemPrompt, "Baca invoice ini dan kembalikan JSON saja.", imgs);
      let result;
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        result = m ? JSON.parse(m[0]) : { error: "Gagal membaca" };
      } catch { result = { error: "Gagal membaca" }; }
      return Response.json({ result, catatan_gambar: truncated > 0 ? `${truncated} foto diabaikan (maksimal 5 foto per analisis).` : undefined });
    }

    // ── 6. BACA KADALUARSA (AI Vision) ────────────────────────────────────────
    if (mode === "baca_kadaluarsa") {
      const allImgs = normalizeImages(payload);
      const imgs = allImgs.slice(0, 5);
      const truncated = allImgs.length - imgs.length;
      const systemPrompt = `Kamu pembaca kemasan obat/vitamin. Baca foto kemasan dan kembalikan JSON MURNI tanpa penjelasan dan tanpa markdown: {"expired_date":"YYYY-MM-DD","batch_number":"kode batch bila ada","nama_produk":"nama yang terbaca","keyakinan":"tinggi/sedang/rendah"}. Gambar bisa berupa beberapa sisi kemasan yang sama — ambil tanggal kadaluarsa dan nomor batch dari sisi mana pun yang paling jelas terbaca. Tanggal kadaluarsa di kemasan Indonesia sering ditulis MM/YYYY atau "EXP 03/28". Bila hanya bulan dan tahun yang tertulis, pakai tanggal terakhir bulan itu (YYYY-MM-28/30/31 sesuai bulan). Bila tidak terbaca jelas, isi null dan keyakinan "rendah". JANGAN menebak.`;
      const raw = await callClaude(apiKey, systemPrompt, "Baca tanggal kadaluarsa dan batch kemasan ini, kembalikan JSON saja.", imgs);
      let result;
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        result = m ? JSON.parse(m[0]) : { error: "Gagal membaca" };
      } catch { result = { error: "Gagal membaca" }; }
      return Response.json({ result, catatan_gambar: truncated > 0 ? `${truncated} foto diabaikan (maksimal 5 foto per analisis).` : undefined });
    }

    return Response.json({ error: "Unknown mode" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});