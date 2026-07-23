// ── Label Kotak Telur utilities ──────────────────────────────────

export function generateKodeLabel(maleCode, femaleCode, tgl) {
  if (!maleCode || !femaleCode || !tgl) return "";
  const d = new Date(tgl);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `K-${dd}${mm}${yy}-${maleCode}-${femaleCode}`;
}

export function buildLabelHTML({ maleCode, femaleCode, maleEnclosure, femaleEnclosure, tglBertelur, eggCount, inkubatorName, kode, qrDataUrl }) {
  const d = new Date(tglBertelur);
  const tglStr = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  const hatchD = new Date(d.getTime() + 90 * 86400000);
  const hatch = hatchD.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const qrImg = qrDataUrl ? `<img src="${qrDataUrl}" width="78" height="78" style="display:block" />` : "";
  return `
<div style="width:380px;font-family:'Segoe UI',Arial,sans-serif;background:linear-gradient(135deg,#f0fdf4,#fefce8);border-radius:14px;border:2px solid #16a34a;overflow:hidden">
  <div style="background:linear-gradient(90deg,#15803d,#16a34a,#22c55e);padding:9px 13px;display:flex;align-items:center;gap:9px">
    <div style="font-size:26px;line-height:1">🐢</div>
    <div style="flex:1">
      <div style="font-weight:800;font-size:14px;color:#fff;letter-spacing:.5px">DUTA TORTOISE</div>
      <div style="font-size:8px;color:#bbf7d0;margin-top:1px">Sulcata Breeding Farm · Probolinggo</div>
    </div>
    <div style="text-align:right">
      <div style="background:rgba(255,255,255,.2);border-radius:20px;padding:2px 9px;font-size:7px;color:#fff;font-weight:bold">📦 ${inkubatorName || "—"}</div>
      <div style="font-size:7px;color:#d1fae5;margin-top:3px">${tglStr}</div>
    </div>
  </div>
  <div style="background:#fef08a;border-bottom:1.5px dashed #ca8a04;padding:4px 13px;display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:7px;color:#78350f;font-weight:600">🔖 KODE KOPLING</div>
    <div style="font-weight:800;font-size:11px;color:#78350f;letter-spacing:.5px">${kode}</div>
  </div>
  <div style="display:flex;padding:9px 13px;gap:9px;align-items:flex-start">
    <div style="flex:1">
      <div style="display:flex;gap:5px;margin-bottom:7px">
        <div style="flex:1;background:linear-gradient(135deg,#dbeafe,#eff6ff);border-radius:9px;padding:5px 7px;border:1.5px solid #93c5fd">
          <div style="font-size:7px;color:#1d4ed8;font-weight:700;text-transform:uppercase">♂ Jantan</div>
          <div style="font-size:18px;font-weight:900;color:#1e3a8a;line-height:1.1">${maleCode || "—"}</div>
          <div style="font-size:7px;color:#3b82f6">📍 ${maleEnclosure || "—"}</div>
        </div>
        <div style="display:flex;align-items:center;font-size:13px">💕</div>
        <div style="flex:1;background:linear-gradient(135deg,#fce7f3,#fff1f2);border-radius:9px;padding:5px 7px;border:1.5px solid #f9a8d4">
          <div style="font-size:7px;color:#be123c;font-weight:700;text-transform:uppercase">♀ Betina</div>
          <div style="font-size:18px;font-weight:900;color:#881337;line-height:1.1">${femaleCode || "—"}</div>
          <div style="font-size:7px;color:#f43f5e">📍 ${femaleEnclosure || "—"}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">
        <div style="background:#fef9c3;border-radius:6px;padding:3px 5px"><div style="font-size:6px;color:#94a3b8">🥚 Jumlah Telur</div><div style="font-size:8px;font-weight:700;color:#713f12">${eggCount ? eggCount + " butir" : "—"}</div></div>
        <div style="background:#f0fdf4;border-radius:6px;padding:3px 5px"><div style="font-size:6px;color:#94a3b8">📅 Tgl Bertelur</div><div style="font-size:8px;font-weight:700;color:#14532d">${tglStr}</div></div>
        <div style="background:#fff7ed;border-radius:6px;padding:3px 5px"><div style="font-size:6px;color:#94a3b8">🐣 Est. Menetas</div><div style="font-size:8px;font-weight:700;color:#7c2d12">${hatch}</div></div>
        <div style="background:#f0f9ff;border-radius:6px;padding:3px 5px"><div style="font-size:6px;color:#94a3b8">🌡 Status</div><div style="font-size:8px;font-weight:700;color:#0c4a6e">Inkubasi 🔄</div></div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0">
      <div style="background:#fff;border-radius:9px;padding:4px;border:2px solid #16a34a">${qrImg}</div>
      <div style="background:#15803d;color:#fff;border-radius:20px;padding:2px 7px;font-size:7px;font-weight:700">F2 · Captive-bred</div>
      <div style="font-size:6px;color:#6b7280;text-align:center;line-height:1.3">Scan untuk<br>info kura</div>
    </div>
  </div>
  <div style="background:linear-gradient(90deg,#15803d,#16a34a);padding:4px 13px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:7px;color:#bbf7d0">🌿 Sulcata geochelone sulcata</div>
    <div style="font-size:7px;color:#bbf7d0">dutatortoises.com</div>
  </div>
</div>`;
}

export async function downloadLabel({ maleCode, femaleCode, maleEnclosure, femaleEnclosure, tglBertelur, eggCount, inkubatorName }) {
  try {
    const kode = generateKodeLabel(maleCode, femaleCode, tglBertelur);
    if (!kode) return;
    const QRCode = await import("qrcode");
    const qrDataUrl = await new Promise((res, rej) => {
      QRCode.toDataURL(kode, { width: 200, margin: 2, color: { dark: "#166534", light: "#ffffff" } },
        (err, url) => err ? rej(err) : res(url));
    });
    const html = buildLabelHTML({ maleCode, femaleCode, maleEnclosure, femaleEnclosure, tglBertelur, eggCount, inkubatorName, kode, qrDataUrl });
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
    container.innerHTML = html;
    document.body.appendChild(container);
    const h2c = await import("html2canvas");
    const canvas = await h2c.default(container.firstElementChild, { scale: 3, useCORS: true, backgroundColor: null, logging: false });
    document.body.removeChild(container);
    const link = document.createElement("a");
    link.download = `Label-${kode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (e) {
    console.error("Label download error:", e);
  }
}
