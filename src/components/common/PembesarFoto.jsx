import { useState, useEffect, useCallback } from "react";
import TortoisePhotoLightbox from "@/components/tortoise/TortoisePhotoLightbox";
import { bolehDiperbesar } from "@/lib/fotoBisaDiperbesar";

/**
 * PembesarFoto — satu penangkap klik untuk SELURUH gambar di aplikasi.
 *
 * ── Kenapa satu, bukan 95 ─────────────────────────────────────────────────
 *
 * Ada 95 tempat yang menampilkan gambar. Memasang "bisa diklik" satu per satu
 * berarti 95 kesempatan untuk kelewatan, dan yang kelewatan baru ketahuan saat
 * ada yang mencoba mengetuknya lalu tidak terjadi apa-apa — persis keluhan
 * 5 Okt 2026 tentang foto clutch di halaman Breeding.
 *
 * Komponen ini dipasang SEKALI di akar aplikasi dan mendengarkan klik di
 * tingkat dokumen. Keputusan "boleh diperbesar atau tidak" ada di
 * lib/fotoBisaDiperbesar.js supaya bisa diuji tanpa menjalankan aplikasinya.
 *
 * ── Kenapa memakai viewer kura, bukan dialog baru ─────────────────────────
 *
 * TortoisePhotoLightbox sudah menyelesaikan bagian yang sulit: `object-contain`
 * sehingga foto setinggi apa pun MUAT TANPA TERPOTONG, cubit/ketuk-dua-kali
 * untuk memperbesar, geser, dan tombol unduh. Dialog foto SOP yang lama
 * memakai `max-w-md` dengan gambar `w-full` — foto tegak terpotong di layar
 * kecil. Satu viewer untuk semuanya berarti tidak ada lagi versi yang
 * tertinggal.
 */
export default function PembesarFoto({ children }) {
  const [foto, setFoto] = useState(null);

  const tutup = useCallback(() => setFoto(null), []);

  useEffect(() => {
    // Fase tangkap: keputusannya diambil sebelum penangan klik milik komponen
    // lain berjalan, supaya `stopPropagation` di bawah benar-benar berarti.
    const onKlik = (e) => {
      const img = e.target?.closest?.("img");
      if (!bolehDiperbesar(img)) return;
      e.preventDefault();
      e.stopPropagation();
      setFoto({ url: img.getAttribute("src"), alt: img.getAttribute("alt") || "" });
    };
    document.addEventListener("click", onKlik, true);
    return () => document.removeEventListener("click", onKlik, true);
  }, []);

  return (
    <>
      {/*
        Petunjuk bahwa gambarnya bisa diketuk. Ditulis sebagai satu aturan CSS,
        bukan kelas di 95 tempat — alasannya sama dengan penangkap kliknya.
        Gambar di dalam elemen yang bisa ditekan sengaja TIDAK diberi petunjuk,
        karena memang bukan gambarnya yang menanggapi ketukan di situ.
      */}
      <style>{`
        img:not([data-zoom="off"]):not([data-pembesar-foto] img) { cursor: zoom-in; }
        button img, a[href] img, [role="button"] img, label img, summary img { cursor: inherit; }
        button img[data-zoom="on"], a[href] img[data-zoom="on"],
        [role="button"] img[data-zoom="on"], label img[data-zoom="on"] { cursor: zoom-in; }
      `}</style>
      {children}
      {foto && (
        <div data-pembesar-foto>
          <TortoisePhotoLightbox
            photos={[{ url: foto.url }]}
            startIndex={0}
            tortoiseCode=""
            tortoiseName={foto.alt || "foto"}
            onClose={tutup}
          />
        </div>
      )}
    </>
  );
}
