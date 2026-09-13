import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizePhone } from "@/lib/normalizePhone";
import { cn } from "@/lib/utils";

/**
 * TombolWhatsApp — SATU definisi "buka chat WhatsApp ke nomor ini".
 *
 * ── Kenapa komponen ini ada ──
 *
 * Sebelum ini, lima tempat membangun tautan wa.me sendiri-sendiri, semuanya
 * dengan baris yang sama:
 *
 *     (nomor || "").replace(/\D/g, "").replace(/^0/, "62")
 *
 * Baris itu benar untuk "0812…" dan untuk "62812…", tapi DIAM-DIAM SALAH
 * untuk nomor yang ditulis tanpa nol di depan — "812 3456 7890", bentuk yang
 * lazim di postingan jual-beli. Hasilnya "8123456789", dan wa.me membuka
 * nomor yang bukan siapa-siapa. Tidak ada error; yang terjadi hanya pesan
 * tidak pernah sampai, dan itu baru disadari saat menunggu balasan yang tak
 * kunjung datang.
 *
 * Aplikasi ini sudah punya jawabannya di src/lib/normalizePhone.js — yang
 * juga memvalidasi panjang nomor. Komponen ini memakainya, dan sekaligus
 * menutup satu lubang lagi: bila nomornya TIDAK SAH, tombolnya tidak
 * ditampilkan sebagai tombol mati yang bisa diklik, melainkan sebagai
 * keterangan bahwa nomornya belum benar.
 *
 * @param {string} nomor    nomor mentah dalam bentuk apa pun
 * @param {string} pesan    teks pembuka (opsional)
 * @param {string} label    tulisan tombol
 */
export default function TombolWhatsApp({
  nomor,
  pesan = "",
  label = "WhatsApp",
  size = "sm",
  variant = "outline",
  className,
}) {
  const { isValid, waUrl, display } = normalizePhone(nomor);

  if (!isValid) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] text-muted-foreground",
          className,
        )}
        title={nomor ? `Nomor tidak sah: ${nomor}` : "Belum ada nomor"}
      >
        <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
        {nomor ? "Nomor belum benar" : "Belum ada nomor"}
      </span>
    );
  }

  const url = pesan ? `${waUrl}?text=${encodeURIComponent(pesan)}` : waUrl;

  return (
    <Button
      asChild
      size={size}
      variant={variant}
      className={cn("gap-1.5", className)}
      title={`Chat WhatsApp ke ${display}`}
    >
      <a href={url} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="w-3.5 h-3.5" />
        {label}
      </a>
    </Button>
  );
}
