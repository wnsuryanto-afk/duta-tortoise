import { useState, useEffect } from "react";
import QRCode from "qrcode";

/**
 * EggQRPreview — pratinjau QR kecil untuk kartu pembiakan.
 * QR berisi "BREED:<id>" — dipindai membuka rincian pembiakan.
 */
export default function EggQRPreview({ id, size = 56 }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(`BREED:${id}`, {
      width: size * 2, margin: 1, color: { dark: "#14532d", light: "#ffffff" },
    })
      .then((u) => { if (active) setUrl(u); })
      .catch(() => {});
    return () => { active = false; };
  }, [id, size]);

  if (!url) {
    return <div style={{ width: size, height: size }} className="bg-muted/40 rounded animate-pulse flex-shrink-0" />;
  }
  return <img src={url} width={size} height={size} alt="QR telur" className="rounded border border-green-200 flex-shrink-0" />;
}