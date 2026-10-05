import TortoisePhotoLightbox from "@/components/tortoise/TortoisePhotoLightbox";

/**
 * PhotoPreviewModal — foto bukti SOP, dilihat besar.
 *
 * Dulu komponen ini punya dialognya sendiri: `max-w-md` dengan gambar `w-full`.
 * Akibatnya foto TEGAK — dan foto bukti dari ponsel hampir selalu tegak —
 * melebihi tinggi layar lalu terpotong, tanpa cara memperbesar atau menggeser.
 *
 * Sekarang ia meneruskan ke viewer yang sama dengan seluruh aplikasi:
 * `object-contain` sehingga foto setinggi apa pun muat utuh, cubit untuk
 * memperbesar, geser, dan tombol unduh. Nama dan props-nya sengaja tidak
 * diubah supaya kedua pemanggilnya (SOPApproval, TugasHariIni) tidak ikut
 * disentuh.
 */
export default function PhotoPreviewModal({ open, onClose, photoUrl, taskTitle }) {
  if (!open || !photoUrl) return null;
  return (
    <div data-pembesar-foto>
      <TortoisePhotoLightbox
        photos={[{ url: photoUrl }]}
        startIndex={0}
        tortoiseCode=""
        tortoiseName={taskTitle || "bukti-foto"}
        onClose={onClose}
      />
    </div>
  );
}
