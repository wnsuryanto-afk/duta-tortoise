import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/**
 * Renders a QR code canvas for the given value (SKU).
 */
export default function QRCodeDisplay({ value, size = 128, className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    });
  }, [value, size]);

  if (!value) return null;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <canvas ref={canvasRef} className="rounded" />
      <p className="text-xs font-mono text-muted-foreground tracking-widest">{value}</p>
    </div>
  );
}