import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

async function callClaude(apiKey, systemPrompt, userMessage, imageBase64 = null) {
  const messages = [];
  const content = [];

  if (imageBase64) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: imageBase64 }
    });
  }
  content.push({ type: "text", text: userMessage });
  messages.push({ role: "user", content });

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  };

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
      const { symptoms, tortoiseName, imageBase64 } = payload;
      const systemPrompt = `Kamu adalah konsultan kesehatan reptil khususnya kura-kura darat sulcata dan kura-kura darat lainnya. Analisis gejala yang diberikan, berikan kemungkinan penyebab, tingkat keparahan (ringan/sedang/berat), dan rekomendasi penanganan awal step by step. Gunakan bahasa Indonesia yang mudah dipahami peternak awam. Selalu akhiri dengan saran konsultasi dokter hewan untuk kasus sedang dan berat. Format respons dalam JSON dengan field: severity (ringan/sedang/berat), causes (array string), treatment_steps (array string), vet_advice (string), summary (string ringkasan 1 kalimat).`;
      const userMsg = `Kura-kura: ${tortoiseName || "tidak diketahui"}\nGejala: ${symptoms}`;
      const raw = await callClaude(apiKey, systemPrompt, userMsg, imageBase64 || null);
      let result;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { severity: "sedang", summary: raw, causes: [], treatment_steps: [], vet_advice: "" };
      } catch {
        result = { severity: "sedang", summary: raw, causes: [], treatment_steps: [], vet_advice: "" };
      }
      return Response.json({ result });
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

    return Response.json({ error: "Unknown mode" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});